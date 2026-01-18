from fastapi import APIRouter

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("/")
async def get_jobs():
    return {"jobs": []}

@router.post("/")
async def create_job():
    return {"message": "Job created"}
