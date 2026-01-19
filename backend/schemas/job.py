from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AdvancedParams(BaseModel):
    force_field: str = Field(default="ff_2.1", description="Force field version")
    hb_scale: float = Field(default=1.0, description="H-bond energy scale")
    env_scale: float = Field(default=1.0, description="Environment energy scale")
    rot_scale: float = Field(default=1.0, description="Rotamer energy scale")
    time_step: Optional[float] = Field(default=None, description="Integration time step")
    integrator: str = Field(default="verlet", description="Integrator type")
    dynamic_rotamer: bool = Field(default=True, description="Dynamic rotamer 1-body")

    enable_replica_exchange: bool = Field(default=False, description="Enable replica exchange")
    num_replicas: int = Field(default=8, description="Number of replicas")
    t_low: float = Field(default=0.8, description="Lowest temperature")
    t_high: float = Field(default=1.0, description="Highest temperature")
    replica_interval: int = Field(default=10, description="Exchange attempt frequency")


class JobCreate(BaseModel):
    original_filename: str = Field(..., description="Original filename for display")
    duration: int = Field(default=1000, ge=1, description="Simulation time units")
    temperature: float = Field(default=0.8, gt=0, description="Simulation temperature")
    frame_interval: int = Field(default=100, ge=1, description="Frame output frequency")
    seed: Optional[int] = Field(default=None, description="Random seed (optional)")
    advanced_params: Optional[AdvancedParams] = Field(default=None, description="Advanced parameters")


class JobSubmitResponse(BaseModel):
    job_id: UUID
    status: str
    created_at: datetime


JobStatusType = Literal["pending", "queued", "running", "completed", "failed"]


class JobStatus(BaseModel):
    status: JobStatusType


class JobParams(BaseModel):
    duration: int
    temperature: float
    frame_interval: int
    seed: Optional[int] = None
    advanced_params: Optional[dict] = None


class JobResults(BaseModel):
    residue_count: Optional[int] = None
    atom_count: Optional[int] = None
    frame_count: Optional[int] = None
    final_potential: Optional[float] = None
    final_rg: Optional[float] = None
    final_hbonds: Optional[int] = None


class JobListItem(BaseModel):
    job_id: UUID
    original_filename: str
    status: JobStatusType
    duration: int
    temperature: float
    created_at: datetime
    completed_at: Optional[datetime] = None


class JobList(BaseModel):
    jobs: list[JobListItem]


class JobDetail(BaseModel):
    job_id: UUID
    original_filename: str
    status: JobStatusType
    params: JobParams
    results: Optional[JobResults] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
