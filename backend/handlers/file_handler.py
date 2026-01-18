from fastapi import APIRouter, HTTPException, UploadFile

from operators.file_operator import upload_file_to_s3

router = APIRouter(prefix="/file", tags=["file"])


@router.post("/upload")
async def upload_file(file: UploadFile):
    try:
        result = upload_file_to_s3(file.file, file.filename, file.content_type)
        return result
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
