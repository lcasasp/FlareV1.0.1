import os
import json
import gzip
import io
import uuid
import logging
import datetime
import boto3
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


def _export_snapshot(items: list) -> dict:
    """
    Write a gzip NDJSON snapshot of `items` to S3 if SNAPSHOT_BUCKET is set.
    The key is partitioned by dt=YYYY-MM-DD, uniquely named with timestamp+uuid.
    """
    bucket = os.getenv("SNAPSHOT_BUCKET")
    if not bucket:
        log.info("[snapshot] SNAPSHOT_BUCKET not set; skipping export")
        return {"skipped": True}

    s3 = boto3.client("s3")
    now = datetime.datetime.utcnow()
    dt = now.strftime("%Y-%m-%d")
    ts = now.strftime("%Y%m%dT%H%M%SZ")
    key = f"snapshots/dt={dt}/fetch-{ts}-{uuid.uuid4().hex[:8]}.json.gz"

    buf = io.BytesIO()
    gz = gzip.GzipFile(filename="", mode="wb", fileobj=buf)
    count = 0
    for obj in items or []:
        gz.write((json.dumps(obj, default=str) + "\n").encode("utf-8"))
        count += 1
    gz.close()
    buf.seek(0)

    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=buf.getvalue(),
        ContentType="application/json",
        ContentEncoding="gzip",
    )
    log.info("[snapshot] wrote %d items to s3://%s/%s", count, bucket, key)

    # Optionally kick a Glue crawler so Athena sees the new partition fast
    crawler = os.getenv("GLUE_CRAWLER_NAME")
    if crawler:
        try:
            boto3.client("glue").start_crawler(Name=crawler)
            log.info("[snapshot] started Glue crawler: %s", crawler)
        except Exception as e:
            log.warning(
                "[snapshot] could not start Glue crawler %s: %s", crawler, e)

    return {"bucket": bucket, "key": key, "count": count}


def _run_scheduled_ingest():
    """
    Runs all queries from INGEST_QUERIES and returns the list of documents
    that were indexed during this run (so we can snapshot them).
    """
    if not QUERY_LIST:
        return []

    all_items = []
    for qs in QUERY_LIST:
        params = parse_qs(qs, keep_blank_values=True)
        pages = params.get("pages", ["1-1"])[0]
        categories = params.get("categories", [None])[0]
        concepts = params.get("concepts", [])
        log.info("Ingest qs=%s", qs)
        items = handle_fetch_and_index(pages, categories, concepts)
        all_items.extend(items)
    return all_items


def lambda_handler(event, _ctx):
    """Handles both EventBridge and manual /fetch (dev-stage)."""
    path = event.get("rawPath", "")
    qs = parse_qs(event.get("rawQueryString", ""))

    # EventBridge scheduled run: no path, detail-type = Scheduled Event
    if not event.get("rawPath"):
        items = _run_scheduled_ingest()
        snap = _export_snapshot(items)
        return json_resp({"ingested": len(items), "snapshot": snap})

    # Manual endpoints (dev)
    if path == "/fetch":
        pages = qs.get("pages", ["1-1"])[0]
        categories = qs.get("categories", [None])[0]
        concepts = qs.get("concepts", [])
        items = handle_fetch_and_index(pages, categories, concepts)
        _export_snapshot(items)
        return json_resp(items)

    if path == "/es-index":
        return json_resp(handle_create_index())

    if path == "/delete_index":
        return json_resp(handle_delete_index())

    return json_resp({"error": "Not found"}, 404)
