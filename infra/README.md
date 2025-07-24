# Flare Infra (AWS CDK)

Infrastructure-as-code for the Flare backend. Creates:

- VPC (1 AZ, no NAT)
- Amazon OpenSearch **domain** (t3.small, 10 GiB EBS)
- Docker-based Lambda function from the backend image
- HTTP API Gateway v2 (proxy integration)
- Log groups & minimal IAM

Two identical stacks are generated:

| Stack          | Account      | Region    |
| -------------- | ------------ | --------- |
| `FlareApiDev`  | 222222222222 | us-west-2 |
| `FlareApiProd` | 333333333333 | us-west-2 |

---

## 1. Prerequisites

- CDK v2 (`npm i -g aws-cdk`)
- AWS CLI configured with credentials that can assume admin in both accounts
- An ECR repository **flare-backend** (one-time):

```bash
aws ecr create-repository --repository-name flare-backend
```

## 2. Deploy Flow

### 0. Build & push Docker image

from root:

```shell
docker buildx build --platform linux/arm64 -t flare-backend:latest -f backend/Dockerfile backend/
docker tag flare-backend:latest 123456789012.dkr.ecr.us-west-2.amazonaws.com/flare-backend:latest
docker push 123456789012.dkr.ecr.us-west-2.amazonaws.com/flare-backend:latest
```

### 1. Bootstrap CDK toolchain (once per account)

cd infra
cdk bootstrap aws://222222222222/us-west-2 # dev
cdk bootstrap aws://333333333333/us-west-2 # prod

### 2. Deploy dev

cdk deploy FlareApiDev --require-approval never

### 3. Deploy prod

cdk deploy FlareApiProd --require-approval admin

Note:
cdk deploy prints an API URL – put it in Vercel:

```
NEXT_PUBLIC_API_BASE=https://abcde12345.execute-api.us-west-2.amazonaws.com
```

---

## 3. Config Knobs

All cross-stage values live in constants.py:

```python
DEV  = dict(account="222222222222", region="us-west-2")
PROD = dict(account="333333333333", region="us-west-2")
ECR_REPO_NAME = "flare-backend"
IMAGE_TAG = "latest"
```

Change instance size, storage, or security-group rules directly in
flare_api_stack.py.

---

## 4. Destroying Stacks

```bash
cdk destroy FlareApiDev
cdk destroy FlareApiProd
```

(Remember: OpenSearch snapshots are not deleted automatically.)
