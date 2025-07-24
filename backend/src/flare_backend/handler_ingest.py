import os
import logging
from urllib.parse import parse_qs
from .routes import (
    handle_fetch_and_index,
    handle_create_index,
    handle_delete_index,
)
from .util import json_resp

log = logging.getLogger(__name__)
log.setLevel(logging.INFO)

QUERY_LIST = [
    line.strip() for line in
    os.getenv("INGEST_QUERIES", "").splitlines()
    if line.strip()
]


def _run_scheduled_ingest():
    if not QUERY_LIST:
        return 0

    total = 0
    for qs in QUERY_LIST:
        params = parse_qs(qs, keep_blank_values=True)
        pages = params.get("pages", ["1-1"])[0]
        categories = params.get("categories", [None])[0]
        concepts = params.get("concepts", [])
        log.info("Ingest qs=%s", qs)
        total += len(handle_fetch_and_index(pages, categories, concepts))
    return total


def lambda_handler(event, _ctx):
    """Handles both EventBridge and manual /fetch (dev-stage)."""
    path = event.get("rawPath", "")
    qs = parse_qs(event.get("rawQueryString", ""))

    # EventBridge scheduled run: no path, detail-type = Scheduled Event
    if not event.get("rawPath"):
        ingested = _run_scheduled_ingest()
        return json_resp({"ingested": ingested})

    # Manual endpoints (dev)
    if path == "/fetch":
        pages = qs.get("pages", ["1-1"])[0]
        categories = qs.get("categories", [None])[0]
        concepts = qs.get("concepts", [])
        return json_resp(handle_fetch_and_index(pages, categories, concepts))

    if path == "/es-index":
        return json_resp(handle_create_index())

    if path == "/delete_index":
        return json_resp(handle_delete_index())

    return json_resp({"error": "Not found"}, 404)
