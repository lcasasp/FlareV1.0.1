# Flare Backend

Python API that powers the Flare climate-news front-end.  
Runs **locally** with Flask + Elasticsearch in Docker and **in the cloud** as a
single AWS Lambda behind API Gateway (provisioned through CDK).

---

## 1. Directory layout

```
backend/
├── src/
│ ├── flare_backend/ # application package
│ │ ├── app_flask.py # local Flask entrypoint
│ │ ├── lambda_handler.py # AWS Lambda entrypoint
│ │ ├── routes.py # shared business logic
│ │ ├── opensearch_client.py
│ │ ├── services.py
│ │ └── config.py
│ └── requirements.txt
├── docker-compose.yml # dev stack (Flask + Elasticsearch)
└── Dockerfile.dev # image used by docker-compose
```

---

## 2. Environment variables

| Name                         | Purpose                                 | Default (local)         |
| ---------------------------- | --------------------------------------- | ----------------------- |
| `STAGE`                      | `local`, `dev`, `prod`                  | `local`                 |
| `OPENSEARCH_ENDPOINT`        | HTTP(S) URL to OpenSearch/Elasticsearch | `http://localhost:9200` |
| `ER_APIKEY` / `NEWS_API_KEY` | External data APIs                      | —                       |

Use `.env` file for local secrets.  
Docker Compose automatically loads it.

---

## 3. Running **locally**

```bash
cd backend
docker compose up --build
```

or if es already running: 

```
cd ./backend/src
python3 -m flare_backend.app_flask
```
