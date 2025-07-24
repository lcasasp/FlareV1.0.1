#!/bin/bash

set -e

# ---- CONFIG ----
DEV_PROFILE="flare-dev"
PROD_PROFILE="flare-prod"
DEV_REPO="122996776073.dkr.ecr.us-east-1.amazonaws.com/flare-backend"
PROD_REPO="964725381206.dkr.ecr.us-east-1.amazonaws.com/flare-backend"
IMAGE_NAME="flare-backend:latest"
DOCKERFILE="backend/Dockerfile"
BUILD_CONTEXT="backend/"

# ---- USAGE ----
if [[ "$1" != "dev" && "$1" != "prod" ]]; then
  echo "Usage: $0 [dev|prod]"
  exit 1
fi

if [[ "$1" == "dev" ]]; then
  PROFILE=$DEV_PROFILE
  REPO=$DEV_REPO
  STACK="FlareApiDev"
else
  PROFILE=$PROD_PROFILE
  REPO=$PROD_REPO
  STACK="FlareApiProd"
fi

echo "Using AWS profile: $PROFILE"
echo "Using ECR repo: $REPO"
echo "Using CDK stack: $STACK"

# ---- AUTHENTICATE ----
echo "Logging in to AWS SSO for profile $PROFILE..."
aws sso login --profile $PROFILE

echo "Logging in to ECR..."
aws ecr get-login-password --region us-east-1 --profile $PROFILE | docker login --username AWS --password-stdin $REPO

# ---- BUILD & PUSH ----
echo "Building Docker image..."
docker build -t $REPO:latest -f $DOCKERFILE $BUILD_CONTEXT
docker push $REPO:latest

# ---- DEPLOY ----
echo "Deploying CDK stack..."
cd infra
cdk deploy $STACK --require-approval never --profile $PROFILE
cd ..