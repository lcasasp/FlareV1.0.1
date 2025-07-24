import json
from urllib.parse import parse_qs

from .routes import (
    handle_get_articles, handle_search_events,
    handle_fetch_and_index, handle_create_index,
    handle_delete_index,
)


def _resp(body, status=200):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body)
    }


def lambda_handler(event, _ctx):
    print(">>> Lambda handler invoked")
    path = event.get("rawPath", "")
    method = event.get("requestContext", {}).get("http", {}).get("method")
    qs = parse_qs(event.get("rawQueryString", ""))

    try:
        if path == "/articles":
            return _resp(handle_get_articles())

        if path == "/search":
            q = qs.get("query", ["*"])[0]
            return _resp(handle_search_events(q))

        if path == "/fetch":
            pages = qs.get("pages", ["1-1"])[0]
            categories = qs.get("categories", [None])[0]
            concepts = qs.get("concepts", [])
            return _resp(handle_fetch_and_index(pages, categories, concepts))

        if path == "/es-index":
            return _resp(handle_create_index())

        if path == "/delete_index" and method == "DELETE":
            return _resp(handle_delete_index())

        return _resp({"error": "Not Found"}, 404)

    except Exception as e:
        return _resp({"error": str(e)}, 500)
