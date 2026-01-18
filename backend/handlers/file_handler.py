from fastapi import APIRouter, HTTPException, UploadFile

from operators.file_operator import upload_file_to_s3
from job_queue import enqueue_job

router = APIRouter(prefix="/file", tags=["file"])


@router.post("/upload")
async def upload_file(file: UploadFile):
    if not file.filename.endswith(".pdb"):
        raise HTTPException(status_code=400, detail="Only .pdb files are allowed")

    try:
        upload_file_to_s3(file.file, file.filename, file.content_type)

        job_id = await enqueue_job(filename=file.filename)

        return {"job_id": job_id, "status": "uploaded", "filename": file.filename}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
