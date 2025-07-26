from urllib.parse import parse_qs
from .routes import handle_get_articles, handle_search_events
from .util import json_resp


def lambda_handler(event, _ctx):
    path = event.get("rawPath", "")
    qs = parse_qs(event.get("rawQueryString", ""))

    if path == "/articles":
        limit = qs.get("limit", [None])[0]
        after = qs.get("after", [None])[0]
        try:
            body = handle_get_articles(limit=limit, after=after)
        except TypeError:
            body = handle_get_articles()
        return json_resp(body)

    if path == "/search":
        q = qs.get("query", ["*"])[0]
        return json_resp(handle_search_events(q))

    return json_resp({"error": "Not found"}, 404)
