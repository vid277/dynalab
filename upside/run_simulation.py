#!/usr/bin/env python3
"""
AWS Batch simulation runner for Upside.
Downloads PDB from S3, runs simulation, uploads results back to S3.
"""

import os
import sys
import subprocess as sp
import argparse
import boto3
from pathlib import Path

# Add upside python path
upside_path = os.environ.get('UPSIDE_HOME', '/upside')
sys.path.insert(0, os.path.join(upside_path, 'py'))
import run_upside as ru

def download_from_s3(bucket: str, key: str, local_path: str):
    """Download a file from S3."""
    s3 = boto3.client('s3')
    s3.download_file(bucket, key, local_path)
    print(f"Downloaded s3://{bucket}/{key} to {local_path}")

def upload_to_s3(local_path: str, bucket: str, key: str):
    """Upload a file to S3."""
    s3 = boto3.client('s3')
    s3.upload_file(local_path, bucket, key)
    print(f"Uploaded {local_path} to s3://{bucket}/{key}")

def run_simulation(pdb_file: str, output_dir: str, duration: int = 1000,
                   temperature: float = 0.8, frame_interval: int = 100):
    """Run a short upside simulation."""

    pdb_id = Path(pdb_file).stem
    input_dir = os.path.join(output_dir, 'inputs')
    run_dir = os.path.join(output_dir, 'outputs')
    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(run_dir, exist_ok=True)

    # Step 1: Convert PDB to initial structure
    print("Step 1: Converting PDB to initial structure...")
    cmd = [
        "python", f"{upside_path}/py/PDB_to_initial_structure.py",
        pdb_file,
        f"{input_dir}/{pdb_id}",
        "--record-chain-breaks"
    ]
    print(f"Running: {' '.join(cmd)}")
    sp.check_call(cmd)

    # Step 2: Configure simulation
    print("Step 2: Configuring simulation...")
    param_dir_base = f"{upside_path}/parameters/"
    param_dir_common = param_dir_base + "common/"
    param_dir_ff = param_dir_base + "ff_2.1/"

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

    # Step 3: Prepare trajectory file
    h5_file = f"{run_dir}/{pdb_id}.run.up"
    import shutil
    shutil.copyfile(config_base, h5_file)

    # Step 4: Run simulation
    print(f"Step 3: Running simulation (duration={duration}, temp={temperature})...")
    log_file = f"{run_dir}/{pdb_id}.run.log"

    cmd = (
        f"{upside_path}/obj/upside "
        f"--duration {duration} "
        f"--frame-interval {frame_interval} "
        f"--temperature {temperature} "
        f"--seed 42 "
        f"{h5_file}"
    )
    print(f"Running: {cmd}")

    with open(log_file, 'w') as log:
        process = sp.Popen(cmd, shell=True, stdout=log, stderr=sp.STDOUT)
        process.wait()

    if process.returncode != 0:
        print(f"ERROR: Simulation failed with return code {process.returncode}")
        with open(log_file, 'r') as f:
            print(f"Log contents:\n{f.read()}")
        return None

    print("Simulation completed successfully!")
    return h5_file, log_file

def main():
    parser = argparse.ArgumentParser(description='Run Upside simulation from S3 PDB file')
    parser.add_argument('--bucket', required=True, help='S3 bucket name')
    parser.add_argument('--pdb-key', required=True, help='S3 key for PDB file')
    parser.add_argument('--output-prefix', default='results/', help='S3 prefix for output files')
    parser.add_argument('--duration', type=int, default=1000, help='Simulation duration')
    parser.add_argument('--temperature', type=float, default=0.8, help='Temperature')
    parser.add_argument('--frame-interval', type=int, default=100, help='Frame interval')

    args = parser.parse_args()

    work_dir = '/work'
    pdb_id = Path(args.pdb_key).stem
    local_pdb = f"{work_dir}/{pdb_id}.pdb"

    # Download PDB from S3
    print(f"Downloading PDB from S3...")
    download_from_s3(args.bucket, args.pdb_key, local_pdb)

    # Run simulation
    result = run_simulation(
        local_pdb, work_dir,
        duration=args.duration,
        temperature=args.temperature,
        frame_interval=args.frame_interval
    )

    if result:
        h5_file, log_file = result

        # Upload results to S3
        print("Uploading results to S3...")
        upload_to_s3(h5_file, args.bucket, f"{args.output_prefix}{pdb_id}.run.up")
        upload_to_s3(log_file, args.bucket, f"{args.output_prefix}{pdb_id}.run.log")

        print("Done!")
        return 0
    else:
        return 1

if __name__ == '__main__':
    sys.exit(main())
