import json
import os
from typing import Any

import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
JOB_QUEUE = "simulation_jobs"

_redis_client: redis.Redis | None = None

async def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return _redis_client


async def enqueue_job(
    job_id: str,
    original_filename: str,
    duration: int = 1000,
    temperature: float = 0.8,
    frame_interval: int = 100,
    seed: int | None = None,
    advanced_params: dict[str, Any] | None = None,
) -> None:
    client = await get_redis()

    job_data = {
        "job_id": job_id,
        "original_filename": original_filename,
        "duration": duration,
        "temperature": temperature,
        "frame_interval": frame_interval,
        "seed": seed,
        "advanced_params": advanced_params or {},
    }

    await client.lpush(JOB_QUEUE, json.dumps(job_data))


async def get_jobs() -> list[dict]:
    client = await get_redis()
    jobs_raw = await client.lrange(JOB_QUEUE, 0, -1)
    return [json.loads(job) for job in jobs_raw]
