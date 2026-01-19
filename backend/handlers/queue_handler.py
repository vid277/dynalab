from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from job_queue import get_jobs

router = APIRouter(prefix="/queue", tags=["queue"])

templates = Jinja2Templates(directory=Path(__file__).parent.parent / "templates")


@router.get("/", response_class=HTMLResponse)
async def queue_viewer(request: Request):
    jobs = await get_jobs()
    return templates.TemplateResponse(request, "queue.html", {"jobs": jobs})


@router.get("/api")
async def queue_api():
    return await get_jobs()
