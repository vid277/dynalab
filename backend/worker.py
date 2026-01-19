#!/usr/bin/env python3
import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone

import boto3
import redis.asyncio as redis
from dotenv import load_dotenv
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://dynalab:dynalab@localhost:5432/dynalab")
JOB_QUEUE = "simulation_jobs"
POLL_INTERVAL = 2
BATCH_CHECK_INTERVAL = 10
OUTPUT_BUCKET = os.getenv("S3_OUTPUT_BUCKET", "dynalab-run-results")

from operators.simulation_operator import get_batch_job_status, submit_simulation_job

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

from db.models import Job


async def get_redis_client() -> redis.Redis:
    return redis.from_url(REDIS_URL, decode_responses=True)


async def process_new_job(job_data: dict, db: AsyncSession) -> None:
    job_id = job_data["job_id"]
    print(f"[Worker] Processing new job: {job_id}")

    try:
        batch_job_id = submit_simulation_job(
            job_id=job_id,
            duration=job_data.get("duration", 1000),
            temperature=job_data.get("temperature", 0.8),
            frame_interval=job_data.get("frame_interval", 100),
            seed=job_data.get("seed"),
            advanced_params=job_data.get("advanced_params"),
        )

        await db.execute(
            update(Job)
            .where(Job.job_id == job_id)
            .values(
                aws_batch_job_id=batch_job_id,
                status="running",
                started_at=datetime.now(timezone.utc),
            )
        )

        await db.commit()

        print(f"[Worker] Job {job_id} submitted to AWS Batch: {batch_job_id}")

    except Exception as e:
        print(f"[Worker] Error submitting job {job_id}: {e}")
        await db.execute(update(Job).where(Job.job_id == job_id).values(status="failed", error_message=str(e)))
        await db.commit()


def parse_simulation_log(log_content: str) -> dict:
    results = {}

    atom_match = re.search(r"n_atom\s+(\d+)", log_content)
    if atom_match:
        results["atom_count"] = int(atom_match.group(1))
        results["residue_count"] = int(atom_match.group(1)) // 3

    frame_match = re.search(r"(\d+)\s*/\s*(\d+)\s+elapsed", log_content)
    if frame_match:
        results["frame_count"] = int(frame_match.group(2))

    potential_matches = re.findall(r"potential\s+(-?[\d.]+)", log_content, re.IGNORECASE)
    if potential_matches:
        results["final_potential"] = float(potential_matches[-1])

    rg_matches = re.findall(r"Rg\s+([\d.]+)\s*A", log_content)
    if rg_matches:
        results["final_rg"] = float(rg_matches[-1])

    hbond_matches = re.findall(r"([\d.]+)\s+hbonds", log_content, re.IGNORECASE)
    if hbond_matches:
        results["final_hbonds"] = int(float(hbond_matches[-1]))

    return results


async def fetch_and_parse_log(job_id: str) -> dict:
    try:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION", "us-east-2"),
        )

        log_key = f"{job_id}-results/{job_id}.run.log"
        response = s3_client.get_object(Bucket=OUTPUT_BUCKET, Key=log_key)
        log_content = response["Body"].read().decode("utf-8")

        return parse_simulation_log(log_content)
    except Exception as e:
        print(f"[Worker] Failed to fetch/parse log for job {job_id}: {e}")
        return {}


async def check_running_jobs(db: AsyncSession) -> None:
    result = await db.execute(select(Job).where(Job.status == "running").where(Job.aws_batch_job_id.isnot(None)))
    running_jobs = result.scalars().all()

    for job in running_jobs:
        try:
            batch_status = get_batch_job_status(job.aws_batch_job_id)
            mapped_status = batch_status.get("mapped_status", "unknown")

            if mapped_status == "completed":
                results = await fetch_and_parse_log(str(job.job_id))

                await db.execute(
                    update(Job)
                    .where(Job.job_id == job.job_id)
                    .values(
                        status="completed",
                        completed_at=datetime.now(timezone.utc),
                        residue_count=results.get("residue_count"),
                        atom_count=results.get("atom_count"),
                        frame_count=results.get("frame_count"),
                        final_potential=results.get("final_potential"),
                        final_rg=results.get("final_rg"),
                        final_hbonds=results.get("final_hbonds"),
                    )
                )

                await db.commit()
                print(f"[Worker] Job {job.job_id} completed")

            elif mapped_status == "failed":
                error_reason = batch_status.get("status_reason", "Unknown error")
                await db.execute(
                    update(Job)
                    .where(Job.job_id == job.job_id)
                    .values(
                        status="failed",
                        completed_at=datetime.now(timezone.utc),
                        error_message=error_reason,
                    )
                )

                await db.commit()
                print(f"[Worker] Job {job.job_id} failed: {error_reason}")

        except Exception as e:
            print(f"[Worker] Error checking job {job.job_id}: {e}")


async def main():
    print("[Worker] Starting background worker...")

    redis_client = await get_redis_client()
    last_batch_check = 0

    while True:
        async with async_session() as db:
            while True:
                job_json = await redis_client.rpop(JOB_QUEUE)
                if not job_json:
                    break

                try:
                    job_data = json.loads(job_json)
                    await process_new_job(job_data, db)

                except json.JSONDecodeError as e:
                    print(f"[Worker] Invalid job data: {e}")

                except Exception as e:
                    print(f"[Worker] Error processing job: {e}")

            current_time = asyncio.get_event_loop().time()

            if current_time - last_batch_check >= BATCH_CHECK_INTERVAL:
                await check_running_jobs(db)
                last_batch_check = current_time

        await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Worker] Shutting down...")
        sys.exit(0)
