from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth
from elasticsearch import Elasticsearch
import boto3
import os
import logging
from .config import Settings

region = os.environ.get("AWS_REGION", "us-east-1")
log = logging.getLogger(__name__)


def get_client():
    """
    Returns an Elasticsearch client for local, or OpenSearch client with AWS SigV4 for Lambda/remote.
    Logs which client is being used and AWS identity if possible.
    """
    if Settings.LOCAL:
        log.info("[OpenSearch] Using local Elasticsearch client (no AWS auth)")
        # Local: use regular Elasticsearch client (no auth, no SSL)
        return Elasticsearch(Settings.OPENSEARCH_ENDPOINT, verify_certs=False)
    else:
        # Lambda/remote: use OpenSearch client with AWS SigV4
        session = boto3.Session()
        creds = session.get_credentials()
        if creds is None:
            raise RuntimeError(
                "No AWS credentials found inside Lambda container")

        creds = creds.get_frozen_credentials()

        awsauth = AWS4Auth(
            creds.access_key,
            creds.secret_key,
            region,
            "es",
            session_token=creds.token,
        )

        return OpenSearch(
            Settings.OPENSEARCH_ENDPOINT,
            http_auth=awsauth,
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection
        )


es = get_client()
