import os
import logging
import boto3
from requests_aws4auth import AWS4Auth
from opensearchpy import OpenSearch
from opensearchpy import RequestsHttpConnection
from elasticsearch import Elasticsearch
from .config import Settings

log = logging.getLogger(__name__)
region = os.getenv("AWS_REGION", "us-east-1")


def get_client():
    # ─── local dev (Docker) ────────────────────────────────
    if Settings.LOCAL:
        log.info("[OS] Local Elasticsearch client")
        return Elasticsearch(Settings.OPENSEARCH_ENDPOINT, verify_certs=False, request_timeout=30)

    # ─── Lambda / prod (OpenSearch + SigV4) ────────────────
    creds = boto3.Session().get_credentials().get_frozen_credentials()
    auth = AWS4Auth(creds.access_key, creds.secret_key,
                    region, "es", session_token=creds.token)

    log.info("[OS] OpenSearch client with SigV4")
    return OpenSearch(
        Settings.OPENSEARCH_ENDPOINT,
        http_auth=auth,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        timeout=30,
        max_retries=3,
        retry_on_timeout=True,
    )


es = get_client()
