import json
import os
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Job
from job_queue import enqueue_job
from operators.file_operator import get_s3_client
from schemas.job import (
    AdvancedParams,
    JobDetail,
    JobList,
    JobListItem,
    JobParams,
    JobResults,
    JobStatus,
    JobSubmitResponse,
)

router = APIRouter(prefix="/jobs", tags=["jobs"])

INPUT_BUCKET = os.getenv("S3_BUCKET_NAME", "dynalab-pdb-files")
OUTPUT_BUCKET = os.getenv("S3_OUTPUT_BUCKET", "dynalab-run-results")


@router.post("", response_model=JobSubmitResponse)
async def create_job(
    pdb_file: UploadFile,
    original_filename: str = Form(...),
    duration: int = Form(default=1000),
    temperature: float = Form(default=0.8),
    frame_interval: int = Form(default=100),
    seed: int | None = Form(default=None),
    advanced_params: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not pdb_file.filename or not pdb_file.filename.endswith(".pdb"):
        raise HTTPException(status_code=400, detail="Only .pdb files are allowed")

    parsed_advanced = None

    if advanced_params:
        try:
            parsed_advanced = json.loads(advanced_params)
            AdvancedParams(**parsed_advanced)

        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid advanced_params: {e}")

    job = Job(
        original_filename=original_filename,
        duration=duration,
        temperature=temperature,
        frame_interval=frame_interval,
        seed=seed,
        advanced_params=parsed_advanced or {},
        status="pending",
    )

    db.add(job)

    await db.commit()
    await db.refresh(job)

    s3_key = f"{job.job_id}.pdb"

    try:
        s3_client = get_s3_client()

        s3_client.upload_fileobj(
            pdb_file.file,
            INPUT_BUCKET,
            s3_key,
            ExtraArgs={"ContentType": "chemical/x-pdb"},
        )

    except Exception as e:
        await db.delete(job)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to upload PDB file: {e}")

    await enqueue_job(
        job_id=str(job.job_id),
        original_filename=original_filename,
        duration=duration,
        temperature=temperature,
        frame_interval=frame_interval,
        seed=seed,
        advanced_params=parsed_advanced,
    )

    job.status = "queued"

    await db.commit()

    return JobSubmitResponse(
        job_id=job.job_id,
        status=job.status,
        created_at=job.created_at,
    )


@router.get("", response_model=JobList)
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).order_by(Job.created_at.desc()))
    jobs = result.scalars().all()

    return JobList(
        jobs=[
            JobListItem(
                job_id=job.job_id,
                original_filename=job.original_filename,
                status=job.status,
                duration=job.duration,
                temperature=job.temperature,
                created_at=job.created_at,
                completed_at=job.completed_at,
            )
            for job in jobs
        ]
    )


@router.get("/{job_id}", response_model=JobDetail)
async def get_job(job_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.job_id == job_id))
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    results = None

    if job.status == "completed":
        results = JobResults(
            residue_count=job.residue_count,
            atom_count=job.atom_count,
            frame_count=job.frame_count,
            final_potential=job.final_potential,
            final_rg=job.final_rg,
            final_hbonds=job.final_hbonds,
        )

    return JobDetail(
        job_id=job.job_id,
        original_filename=job.original_filename,
        status=job.status,
        params=JobParams(
            duration=job.duration,
            temperature=job.temperature,
            frame_interval=job.frame_interval,
            seed=job.seed,
            advanced_params=job.advanced_params,
        ),
        results=results,
        error_message=job.error_message,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
    )


@router.get("/{job_id}/status", response_model=JobStatus)
async def get_job_status(job_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job.status).where(Job.job_id == job_id))
    status = result.scalar_one_or_none()

    if not status:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatus(status=status)


@router.get("/{job_id}/download/{file_type}")
async def download_file(
    job_id: UUID,
    file_type: Literal["trajectory", "log", "vtf"],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.job_id == job_id))
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Job not completed yet")

    file_map = {
        "trajectory": f"{job_id}-results/{job_id}.run.up",
        "log": f"{job_id}-results/{job_id}.run.log",
        "vtf": f"{job_id}-results/{job_id}.vtf",
    }

    s3_key = file_map[file_type]

    try:
        s3_client = get_s3_client()

        presigned_url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": OUTPUT_BUCKET, "Key": s3_key},
            ExpiresIn=3600,
        )

        return RedirectResponse(url=presigned_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate download URL: {e}")
