from flask import jsonify, request    # used only by Flask version
from .opensearch_client import es
from .services import (
    build_search_query,
    fetch_events,
    extract_and_prepare_event_data,
    event_mapping,
)
from elasticsearch import helpers
import logging

log = logging.getLogger(__name__)

# ---------- Shared handlers ---------- #
def handle_get_articles():
    result = es.search(index="events", body={
        "query": {"match_all": {}},
        "sort": [{"socialScore": {"order": "desc"}}],
        "size": 1000
    })
    return [hit["_source"] for hit in result["hits"]["hits"]]

def handle_search_events(query: str):
    search_body = build_search_query(query)
    result = es.search(index="events", body=search_body)
    return result["hits"]["hits"]

def handle_fetch_and_index(pages, categories, concepts):
    start_page, end_page = map(int, pages.split("-"))
    if not es.indices.exists(index="events"):
        es.indices.create(index="events", ignore=400)

    events = fetch_events(categories, concepts, start_page, end_page)
    processed = extract_and_prepare_event_data(events)

    bulk = []
    uris_seen = set()
    for ev in processed:
        uri = ev["uri"]
        if uri in uris_seen:
            continue
        uris_seen.add(uri)
        bulk.append({"_index": "events", "_id": uri, "_source": ev})

    if bulk:
        helpers.bulk(es, bulk)
    return [b["_source"] for b in bulk]

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
