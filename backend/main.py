from fastapi import FastAPI

from handlers.job_handler import router as job_router

app = FastAPI()

app.include_router(job_router)

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
