#!/usr/bin/env python3
"""
AWS Batch simulation runner for Upside.
Downloads PDB from S3, runs simulation, uploads results back to S3.

S3 Input: s3://{input_bucket}/{job_id}.pdb
S3 Output: s3://{output_bucket}/{job_id}-results/
  - {job_id}.run.up   (trajectory HDF5)
  - {job_id}.run.log  (simulation log)
  - {job_id}.vtf      (VMD visualization format)
"""

import argparse
import os
import shutil
import subprocess as sp
import sys
from pathlib import Path

import boto3
import tables

upside_path = os.environ.get("UPSIDE_HOME", "/upside")
sys.path.insert(0, os.path.join(upside_path, "py"))
import run_upside as ru


def download_from_s3(bucket: str, key: str, local_path: str):
    """Download a file from S3."""
    s3 = boto3.client("s3")
    s3.download_file(bucket, key, local_path)
    print(f"Downloaded s3://{bucket}/{key} to {local_path}")


def upload_to_s3(local_path: str, bucket: str, key: str):
    """Upload a file to S3."""
    s3 = boto3.client("s3")
    s3.upload_file(local_path, bucket, key)
    print(f"Uploaded {local_path} to s3://{bucket}/{key}")


def generate_vtf(h5_file: str, output_vtf: str):
    """Generate VTF file from trajectory for VMD visualization."""
    try:
        cmd = ["python", f"{upside_path}/py/extract_vtf.py", h5_file, output_vtf]
        print(f"Generating VTF: {' '.join(cmd)}")
        sp.check_call(cmd)
        return True
    except Exception as e:
        print(f"Warning: Failed to generate VTF file: {e}")
        try:
            with tables.open_file(h5_file, "r") as t:
                if hasattr(t.root, "input") and hasattr(t.root.input, "pos"):
                    n_atoms = t.root.input.pos.shape[0]

                    with open(output_vtf, "w") as f:
                        for i in range(n_atoms):
                            f.write(f"atom {i} radius 1.0 name CA\n")

                        for i in range(n_atoms - 1):
                            f.write(f"bond {i}:{i + 1}\n")

                        if hasattr(t.root, "output") and hasattr(t.root.output, "pos"):
                            pos = t.root.output.pos[:]
                            for frame in pos:
                                f.write("\ntimestep\n")
                                for coord in frame:
                                    f.write(
                                        f"{coord[0]:.3f} {coord[1]:.3f} {coord[2]:.3f}\n"
                                    )

                    print(f"Generated VTF file: {output_vtf}")
                    return True
        except Exception as e2:
            print(f"Warning: Alternative VTF generation also failed: {e2}")
        return False


def run_simulation(
    pdb_file: str,
    output_dir: str,
    job_id: str,
    duration: int = 1000,
    temperature: float = 0.8,
    frame_interval: int = 100,
    seed: int = 42,
    force_field: str = "ff_2.1",
):
    """Run an upside simulation.

    Args:
        pdb_file: Path to input PDB file
        output_dir: Working directory for simulation
        job_id: Job UUID for naming output files
        duration: Simulation duration
        temperature: Simulation temperature
        frame_interval: Frame output frequency
        seed: Random seed
        force_field: Force field version (e.g., ff_2.1)

    Returns:
        Tuple of (trajectory_file, log_file, vtf_file) or None on failure
    """
    pdb_id = Path(pdb_file).stem
    input_dir = os.path.join(output_dir, "inputs")
    run_dir = os.path.join(output_dir, "outputs")
    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(run_dir, exist_ok=True)

    print("Step 1: Converting PDB to initial structure...")
    cmd = [
        "python",
        f"{upside_path}/py/PDB_to_initial_structure.py",
        pdb_file,
        f"{input_dir}/{pdb_id}",
        "--record-chain-breaks",
    ]
    print(f"Running: {' '.join(cmd)}")
    sp.check_call(cmd)

    print("Step 2: Configuring simulation...")
    param_dir_base = f"{upside_path}/parameters/"
    param_dir_common = param_dir_base + "common/"
    param_dir_ff = param_dir_base + force_field + "/"

    fasta = f"{input_dir}/{pdb_id}.fasta"
    config_base = f"{input_dir}/{pdb_id}.up"

    kwargs = dict(
        rama_library=param_dir_common + "rama.dat",
        rama_sheet_mix_energy=param_dir_ff + "sheet",
        reference_state_rama=param_dir_common + "rama_reference.pkl",
        hbond_energy=param_dir_ff + "hbond.h5",
        rotamer_placement=param_dir_ff + "sidechain.h5",
        dynamic_rotamer_1body=True,
        rotamer_interaction=param_dir_ff + "sidechain.h5",
        environment_potential=param_dir_ff + "environment.h5",
        bb_environment_potential=param_dir_ff + "bb_env.dat",
        chain_break_from_file=f"{input_dir}/{pdb_id}.chain_breaks",
        initial_structure=f"{input_dir}/{pdb_id}.initial.npy",
    )

    config_stdout = ru.upside_config(fasta, config_base, **kwargs)
    print(f"Config output: {config_stdout}")

    h5_file = f"{run_dir}/{job_id}.run.up"
    shutil.copyfile(config_base, h5_file)

    print(
        f"Step 4: Running simulation (duration={duration}, temp={temperature}, seed={seed})..."
    )
    log_file = f"{run_dir}/{job_id}.run.log"

    cmd = (
        f"{upside_path}/obj/upside "
        f"--duration {duration} "
        f"--frame-interval {frame_interval} "
        f"--temperature {temperature} "
        f"--seed {seed} "
        f"{h5_file}"
    )
    print(f"Running: {cmd}")

    with open(log_file, "w") as log:
        process = sp.Popen(cmd, shell=True, stdout=log, stderr=sp.STDOUT)
        process.wait()

    if process.returncode != 0:
        print(f"ERROR: Simulation failed with return code {process.returncode}")
        with open(log_file, "r") as f:
            print(f"Log contents:\n{f.read()}")
        return None

    print("Simulation completed successfully!")

    vtf_file = f"{run_dir}/{job_id}.vtf"
    generate_vtf(h5_file, vtf_file)

    return h5_file, log_file, vtf_file


def main():
    parser = argparse.ArgumentParser(
        description="Run Upside simulation from S3 PDB file"
    )
    parser.add_argument("--job-id", required=True, help="Job UUID")
    parser.add_argument(
        "--input-bucket", required=True, help="S3 bucket for input PDB files"
    )
    parser.add_argument(
        "--output-bucket", required=True, help="S3 bucket for output results"
    )
    parser.add_argument(
        "--duration", type=int, default=1000, help="Simulation duration"
    )
    parser.add_argument("--temperature", type=float, default=0.8, help="Temperature")
    parser.add_argument(
        "--frame-interval", type=int, default=100, help="Frame interval"
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--force-field", default="ff_2.1", help="Force field version")
    parser.add_argument(
        "--hb-scale", type=float, default=1.0, help="H-bond energy scale"
    )
    parser.add_argument(
        "--env-scale", type=float, default=1.0, help="Environment energy scale"
    )
    parser.add_argument(
        "--rot-scale", type=float, default=1.0, help="Rotamer energy scale"
    )

    args = parser.parse_args()

    work_dir = "/work"
    os.makedirs(work_dir, exist_ok=True)

    pdb_key = f"{args.job_id}.pdb"
    local_pdb = f"{work_dir}/{args.job_id}.pdb"

    print("Downloading PDB from S3...")
    download_from_s3(args.input_bucket, pdb_key, local_pdb)

    result = run_simulation(
        local_pdb,
        work_dir,
        job_id=args.job_id,
        duration=args.duration,
        temperature=args.temperature,
        frame_interval=args.frame_interval,
        seed=args.seed,
        force_field=args.force_field,
    )

    if result:
        h5_file, log_file, vtf_file = result

        output_prefix = f"{args.job_id}-results/"
        print("Uploading results to S3...")
        upload_to_s3(
            h5_file, args.output_bucket, f"{output_prefix}{args.job_id}.run.up"
        )
        upload_to_s3(
            log_file, args.output_bucket, f"{output_prefix}{args.job_id}.run.log"
        )

        if os.path.exists(vtf_file):
            upload_to_s3(
                vtf_file, args.output_bucket, f"{output_prefix}{args.job_id}.vtf"
            )

        print("Done!")
        return 0
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())
