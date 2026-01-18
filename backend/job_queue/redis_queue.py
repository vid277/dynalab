import json
import os
import uuid

import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
JOB_QUEUE = "jobs"

_redis_client: redis.Redis | None = None

async def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return _redis_client

async def enqueue_job(filename: str) -> str:
    client = await get_redis()
    job_id = str(uuid.uuid4())

    job_data = {
        "job_id": job_id,
        "filename": filename,
        "status": "uploaded",
    }

    await client.lpush(JOB_QUEUE, json.dumps(job_data))

    return job_id


async def get_all_jobs() -> list[dict]:
    client = await get_redis()
    jobs_raw = await client.lrange(JOB_QUEUE, 0, -1)

    jobs = [json.loads(job) for job in jobs_raw]

    return jobs
