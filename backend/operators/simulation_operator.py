import os

import boto3
from botocore.exceptions import ClientError

BATCH_JOB_QUEUE = os.getenv("AWS_BATCH_JOB_QUEUE", "upside-job-queue")
BATCH_JOB_DEFINITION = os.getenv("AWS_BATCH_JOB_DEFINITION", "upside-simulation-job")
INPUT_BUCKET = os.getenv("S3_BUCKET_NAME", "dynalab-pdb-files")
OUTPUT_BUCKET = os.getenv("S3_OUTPUT_BUCKET", "dynalab-run-results")


def get_batch_client():
    return boto3.client(
        "batch",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION", "us-east-2"),
    )


def submit_simulation_job(
    job_id: str,
    duration: int = 1000,
    temperature: float = 0.8,
    frame_interval: int = 100,
    seed: int | None = None,
    advanced_params: dict | None = None,
) -> str:
    batch_client = get_batch_client()

    command = [
        "python",
        "/upside/run_simulation.py",
        "--job-id",
        job_id,
        "--input-bucket",
        INPUT_BUCKET,
        "--output-bucket",
        OUTPUT_BUCKET,
        "--duration",
        str(duration),
        "--temperature",
        str(temperature),
        "--frame-interval",
        str(frame_interval),
    ]

    if seed is not None:
        command.extend(["--seed", str(seed)])

    if advanced_params:
        if advanced_params.get("force_field"):
            command.extend(["--force-field", advanced_params["force_field"]])
        if advanced_params.get("hb_scale"):
            command.extend(["--hb-scale", str(advanced_params["hb_scale"])])
        if advanced_params.get("env_scale"):
            command.extend(["--env-scale", str(advanced_params["env_scale"])])
        if advanced_params.get("rot_scale"):
            command.extend(["--rot-scale", str(advanced_params["rot_scale"])])

    try:
        response = batch_client.submit_job(
            jobName=f"upside-{job_id[:8]}",
            jobQueue=BATCH_JOB_QUEUE,
            jobDefinition=BATCH_JOB_DEFINITION,
            containerOverrides={
                "command": command,
                "environment": [
                    {"name": "OMP_NUM_THREADS", "value": "2"},
                ],
            },
        )

        return response["jobId"]
    except ClientError as e:
        raise RuntimeError(f"Failed to submit AWS Batch job: {e}")


def get_batch_job_status(batch_job_id: str) -> dict:
    batch_client = get_batch_client()

    try:
        response = batch_client.describe_jobs(jobs=[batch_job_id])

        if not response["jobs"]:
            return {"status": "unknown", "reason": "Job not found"}

        job = response["jobs"][0]
        status = job["status"]

        result = {
            "status": status,
            "status_reason": job.get("statusReason"),
        }

        status_map = {
            "SUBMITTED": "queued",
            "PENDING": "queued",
            "RUNNABLE": "queued",
            "STARTING": "running",
            "RUNNING": "running",
            "SUCCEEDED": "completed",
            "FAILED": "failed",
        }

        result["mapped_status"] = status_map.get(status, "unknown")

        return result

    except ClientError as e:
        raise RuntimeError(f"Failed to get batch job status: {e}")
