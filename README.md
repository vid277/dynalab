# Dynalab

Molecular dynamics simulation platform. Run protein folding simulations via a web interface.

## Organization
- **frontend/** - react app for submitting and viewing simulation jobs
- **backend/** - fastapi server + worker that handles job queue and talks to aws batch
- **upside/** - the actual molecular dynamics engine (c++ with python bindings)

## Getting started

### 1. Start local services
You need postgres and redis running locally. Easiest way:

```bash
cd backend
docker compose up -d
```

### 2. backend setup
```bash
cd backend
uv sync
```

This installs all python dependencies into a local `.venv`.

You'll need a `.env` file with your aws creds and other information:
```
DATABASE_URL=...
REDIS_URL=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
S3_OUTPUT_BUCKET=...
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

## Local Development

### Backend API Server

```bash
cd backend
uv run uvicorn main:app --reload
```

Runs on http://localhost:8000 by default.

### Backend Worker

```bash
cd backend
uv run python worker.py
```

This polls redis for new simulation jobs and submits them to AWS batch. Also checks on running jobs and updates their status when they complete.

### Frontend

```bash
cd frontend
npm run dev
```

Runs on http://localhost:5173. This is the whole (pretty simple) web ui for submitting simulations and viewing results.

## Typical dev workflow
1. `docker compose up -d` (in backend/)
2. run the api server in one terminal
3. run the worker in another terminal
4. run the frontend in a third terminal
5. go to http://localhost:5173
