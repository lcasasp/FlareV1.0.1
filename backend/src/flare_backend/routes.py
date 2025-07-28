from flask import jsonify, request    # used only by Flask version
from .opensearch_client import es
from .services import (
    build_search_query,
    fetch_events,
    extract_and_prepare_event_data,
    event_mapping,
)
from opensearchpy.helpers import bulk
import base64
import json
import logging

log = logging.getLogger(__name__)

FIELDS = [
    "uri",
    "title.eng",
    "summary.eng",
    "images",
    "eventDate",
    "sentiment",
    "socialScore",
    "wgt",
    "totalArticleCount",
    "categories.label",
    "categories.wgt",
    "concepts.label.eng",
    "concepts.type",
    "concepts.location.lat",
    "concepts.location.long",
    "concepts.score",
    "location.label.eng",
    "location.lat",
    "location.long",
    "infoArticle.eng.url"
]

# ---------- Shared handlers ---------- #


def _encode_cursor(sort_values) -> str:
    try:
        return base64.urlsafe_b64encode(
            json.dumps(sort_values).encode("utf-8")
        ).decode("ascii")
    except Exception:
        return ""


def _decode_cursor(token: str):
    return json.loads(
        base64.urlsafe_b64decode(token.encode("ascii")).decode("utf-8")
    )


def handle_get_articles(limit=None, after=None):
    """
    When `limit` is not provided -> legacy behavior (return array of top 1000).
    When `limit` is provided -> return { items: [...], next: <cursor or null> }.
    Cursor encodes the OpenSearch `sort` values via base64(JSON).
    """
    # If called from Flask without explicit args, read from request.args
    if limit is None:
        try:
            limit = request.args.get("limit")
            after = request.args.get("after")
        except Exception:
            pass

    # ----- Legacy behavior: no limit -> return array of top 1000 -----
    if not limit:
        result = es.search(index="events", body={
            "_source": FIELDS,
            "query": {"match_all": {}},
            "sort": [
                {"socialScore": {"order": "desc"}},
                {"eventDate": {"order": "desc"}},  # stable tie-breaker
            ],
            "size": 1000
        })
        return [hit["_source"] for hit in result["hits"]["hits"]]

    # ----- Cursor mode -----
    limit_i = max(1, min(int(limit), 1000))
    body = {
        "_source": FIELDS,
        "query": {"match_all": {}},
        "sort": [
            {"socialScore": {"order": "desc"}},
            {"eventDate": {"order": "desc"}},
        ],
        "size": limit_i,
    }

    if after:
        try:
            decoded = json.loads(
                base64.urlsafe_b64decode(after.encode("ascii")).decode("utf-8")
            )
            body["search_after"] = decoded
        except Exception:
            # bad cursor -> ignore and start from beginning
            pass

    result = es.search(index="events", body=body)
    hits = result["hits"]["hits"]

    next_token = None
    if len(hits) == limit_i:
        sort_values = hits[-1].get("sort")
        if sort_values is not None:
            next_token = base64.urlsafe_b64encode(
                json.dumps(sort_values).encode("utf-8")
            ).decode("ascii")

    items = [h["_source"] for h in hits]
    return {"items": items, "next": next_token}


def handle_search_events(query: str):
    search_body = build_search_query(query)
    search_body["_source"] = FIELDS
    result = es.search(index="events", body=search_body)
    return [hit["_source"] for hit in result["hits"]["hits"]]


def handle_fetch_and_index(pages, categories, concepts):
    start_page, end_page = map(int, pages.split("-"))
    if not es.indices.exists(index="events"):
        es.indices.create(index="events", ignore=400)

    events = fetch_events(categories, concepts, start_page, end_page)
    processed = extract_and_prepare_event_data(events)

    bulk_list = []
    uris_seen = set()
    for ev in processed:
        uri = ev["uri"]
        if uri in uris_seen:
            continue
        uris_seen.add(uri)
        bulk_list.append({"_index": "events", "_id": uri, "_source": ev})

    if bulk_list:
        bulk(es, bulk_list)
    return [b["_source"] for b in bulk_list]


def handle_create_index():
    if not es.indices.exists(index="events"):
        es.indices.create(index="events", body=event_mapping)
        return {"message": "Index 'events' created"}
    return {"message": "Index already exists"}


def handle_delete_index():
    index = "events"
    if es.indices.exists(index=index):
        es.indices.delete(index=index)
        return {"message": f"Index '{index}' deleted"}
    return {"message": "Index not found"}
