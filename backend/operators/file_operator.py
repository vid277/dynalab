import os

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


def get_s3_client():
    region = os.getenv("AWS_REGION", "us-east-2")
    return boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=region,
        endpoint_url=f"https://s3.{region}.amazonaws.com",
        config=Config(signature_version="s3v4"),
    )


def upload_file_to_s3(file, filename: str, content_type: str) -> dict:
    bucket_name = os.getenv("S3_BUCKET_NAME")

    if not bucket_name:
        raise ValueError("S3 bucket not configured")

    try:
        s3_client = get_s3_client()

        s3_client.upload_fileobj(
            file,
            bucket_name,
            filename,
            ExtraArgs={"ContentType": content_type},
        )

        return {
            "message": "File uploaded successfully",
            "filename": filename,
            "bucket": bucket_name,
        }
    except ClientError as e:
        raise RuntimeError(f"S3 upload failed: {e}")
