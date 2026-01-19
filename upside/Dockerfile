# Production Dockerfile for AWS Batch
# Multi-stage build for smaller final image

ARG TARGETPLATFORM
ARG BUILDPLATFORM

# =============================================================================
# Build Stage
# =============================================================================
FROM --platform=$TARGETPLATFORM continuumio/miniconda3 AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    libhdf5-dev \
    libeigen3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install SSE2NEON for ARM64 compatibility
RUN git clone https://github.com/DLTcollab/sse2neon.git /tmp/sse2neon && \
    cp /tmp/sse2neon/sse2neon.h /usr/include/ && \
    rm -rf /tmp/sse2neon

# Copy source files
COPY src/ src/
COPY cmake/ cmake/
COPY parameters/ parameters/
COPY py/ py/

# Build upside
RUN mkdir -p obj && cd obj && \
    cmake ../src -DEIGEN3_INCLUDE_DIR=/usr/include/eigen3 && \
    make -j$(nproc)

# =============================================================================
# Runtime Stage
# =============================================================================
FROM --platform=$TARGETPLATFORM continuumio/miniconda3

WORKDIR /upside

# Install minimal runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libhdf5-103 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create a fresh conda environment to avoid conflicts with base packages
RUN conda create -y -n upside --override-channels -c conda-forge \
    python=3.11 numpy scipy && \
    conda clean --all --yes

# Install remaining packages in batches
RUN conda install -y -n upside --override-channels -c conda-forge \
    pandas pytables h5py && \
    conda clean --all --yes

RUN conda install -y -n upside --override-channels -c conda-forge \
    mdtraj prody boto3 && \
    conda clean --all --yes

# Make the upside environment the default
ENV PATH="/opt/conda/envs/upside/bin:${PATH}"
ENV CONDA_DEFAULT_ENV=upside

# Copy built artifacts from builder
COPY --from=builder /build/obj/upside obj/upside
COPY --from=builder /build/obj/libupside.so obj/libupside.so

# Copy parameters and Python scripts
COPY --from=builder /build/parameters/ parameters/
COPY --from=builder /build/py/ py/

# Copy simulation runner script
COPY run_simulation.py /upside/run_simulation.py
RUN chmod +x /upside/run_simulation.py

# Setup environment
ENV UPSIDE_HOME=/upside
ENV PATH="/upside/obj:/upside/py:${PATH}"
ENV PYTHONPATH="/upside/py:${PYTHONPATH}"

# Create working directory for jobs
RUN mkdir -p /work
WORKDIR /work

# No fixed entrypoint - allows running different commands
# For upside directly: docker run ... upside --help
# For simulation: docker run ... python /upside/run_simulation.py ...
