import os
from aws_cdk import aws_ecr as ecr

DEV = dict(
    account="122996776073",   # flare-dev
    region="us-east-1"
)
PROD = dict(
    account="964725381206",   # flare-prod
    region="us-east-1"
)

ECR_REPO_NAME = "flare-backend"

IMAGE_TAG = os.getenv("IMAGE_TAG", "latest")

INGEST_QUERIES = {
    "dev":  "",
    "prod": """
concepts=http://en.wikipedia.org/wiki/Climate_change&pages=1-10
"""
}
