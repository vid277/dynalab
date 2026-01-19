import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from typing import List


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    jobs: Mapped["List[Job]"] = relationship("Job", back_populates="user")


class Job(Base):
    __tablename__ = "jobs"

    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="jobs")

    # Status tracking
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    aws_batch_job_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Basic simulation parameters
    duration: Mapped[int] = mapped_column(Integer, default=1000)
    temperature: Mapped[float] = mapped_column(Float, default=0.8)
    frame_interval: Mapped[int] = mapped_column(Integer, default=100)
    seed: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Advanced parameters
    advanced_params: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    # Results from simulation
    residue_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    atom_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    frame_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    final_potential: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    final_rg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    final_hbonds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Error tracking
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
