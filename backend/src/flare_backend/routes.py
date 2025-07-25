from flask import jsonify, request    # used only by Flask version
from .opensearch_client import es
from .services import (
    build_search_query,
    fetch_events,
    extract_and_prepare_event_data,
    event_mapping,
)
from opensearchpy.helpers import bulk
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


def handle_get_articles():
    result = es.search(index="events", body={
        "_source": FIELDS,
        "query": {"match_all": {}},
        "sort": [{"socialScore": {"order": "desc"}}],
        "size": 1000
    })
    return [hit["_source"] for hit in result["hits"]["hits"]]


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
