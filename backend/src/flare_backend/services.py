import os
import requests
from eventregistry import *
from datetime import datetime, timedelta

er = EventRegistry(apiKey=os.getenv(
    'ER_APIKEY'), allowUseOfArchive=False)


def fetch_events(categories=None, concepts=None, start_page=1, end_page=5):
    """
    Fetches events from EventRegistry API based on given categories and concepts.

    Args:
        categories (str): The category URI to filter events.
        concepts (list): List of concept URIs to filter events.
        start_page (int): Starting page number for API Call depth.
        end_page (int): Ending page number for API Call depth.

    Returns:
        list: A list of events fetched from EventRegistry.
    """
    all_events = []

    for curPage in range(start_page, end_page + 1):
        q = QueryEventsIter(
            conceptUri=concepts,
            categoryUri=categories,
            sourceUri=None,
            sourceLocationUri=None,
            sourceGroupUri=None,
            authorUri=None,
            locationUri=None,
            lang="eng",
            dateStart=None,
            dateEnd=None,
            minArticlesInEvent=5,
            maxArticlesInEvent=999,
            dateMentionStart=datetime.now() - timedelta(days=30),
            dateMentionEnd=None,
            ignoreKeywords=None,
            ignoreConceptUri=None,
            ignoreCategoryUri=None,
            ignoreSourceUri=None,
            ignoreSourceLocationUri=None,
            ignoreSourceGroupUri=None,
            ignoreAuthorUri=None,
            ignoreLocationUri=None,
            ignoreLang=None,
            keywordsLoc="body",
            ignoreKeywordsLoc="body",
            requestedResult=RequestEventsInfo(
                count=50,
                sortBy="rel",
                page=curPage,
                returnInfo=ReturnInfo(
                    eventInfo=EventInfoFlags(
                        concepts=True, image=True, location=True, imageCount=1, infoArticle=True, socialScore=True),
                    locationInfo=LocationInfoFlags(
                        label=True, geoLocation=True)
                )
            )
        )

        res = er.execQuery(q)
        if res.get('events', {}).get('results'):
            all_events.extend(res['events']['results'])

    return all_events


def _to_float(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def extract_and_prepare_event_data(event_response):
    """
    Filters and prepares event data for indexing into Elasticsearch.

    Args:
        event_response (list): A list of event data to process.

    Returns:
        list: A list of unique and processed events ready for indexing.
    """
    processed = []
    for ev in event_response:
        if 'concepts' in ev:
            ev['concepts'] = [c for c in ev['concepts']
                              if c.get('score', 0) > 50]

            for c in ev['concepts']:
                loc = c.get('location') or {}
                loc['lat'] = _to_float(loc.get('lat'))
                loc['long'] = _to_float(loc.get('long'))
                c['location'] = loc

        processed.append(ev)
    return processed


def build_search_query(query):
    return {
        "query": {
            "bool": {
                "must": [
                    {
                        "multi_match": {
                            "query": query,
                            "fields": [
                                "title.eng^2.5",
                                "summary.eng^1",
                                "concepts.label.eng^2.5"
                            ],
                            "type": "most_fields",
                            "fuzziness": "AUTO"
                        }
                    },
                    {
                        "function_score": {
                            "query": {
                                "range": {
                                    "eventDate": {"gte": "now-30d/d"}
                                }
                            },
                            "functions": [
                                {
                                    "gauss": {
                                        "eventDate": {
                                            "origin": "now",
                                            "scale": "10d",
                                            "offset": "2d",
                                            "decay": 0.5
                                        }
                                    }
                                }
                            ],
                            "score_mode": "sum",
                            "boost_mode": "multiply"
                        }
                    }
                ],
                "should": [
                    {
                        "multi_match": {
                            "query": query,
                            "fields": [
                                "concepts.label.eng^2",
                                "summary.eng^1"
                            ],
                            "type": "phrase",
                            "boost": 2
                        }
                    }
                ]
            }
        },
        "size": 100
    }


# Define Elasticsearch mapping
event_mapping = {
    "mappings": {
        "properties": {
            "uri": {"type": "keyword"},
            "totalArticleCount": {"type": "integer"},
            "articleCounts": {
                "properties": {
                    "eng": {"type": "integer"}
                }
            },
            "concepts": {
                "properties": {
                    "type": {"type": "keyword"},
                    "label": {
                        "properties": {
                            "eng": {"type": "text"}
                        }
                    },
                    "location": {
                        "properties": {
                            "country": {
                                "properties": {
                                    "label": {
                                        "properties": {
                                            "eng": {"type": "text"}
                                        }
                                    },
                                    "lat": {"type": "float"},
                                    "long": {"type": "float"}
                                }
                            },
                            "label": {
                                "properties": {
                                    "eng": {"type": "text"}
                                }
                            },
                            "lat": {"type": "float"},
                            "long": {"type": "float"}
                        }
                    }
                }
            },
            "categories": {
                "properties": {
                    "uri": {"type": "keyword"},
                    "label": {"type": "text"}
                }
            },
            "title": {
                "properties": {
                    "eng": {"type": "text"}
                }
            },
            "summary": {
                "properties": {
                    "eng": {"type": "text"}
                }
            },
            "eventDate": {"type": "date"},
            "sentiment": {"type": "float"},
            "socialScore": {"type": "float"},
            "wgt": {"type": "integer"},
            "images": {"type": "keyword"},
            "location": {
                "properties": {
                    "country": {
                        "properties": {
                            "label": {
                                "properties": {
                                    "eng": {"type": "text"}
                                }
                            },
                            "lat": {"type": "float"},
                            "long": {"type": "float"}
                        }
                    },
                    "label": {
                        "properties": {
                            "eng": {"type": "text"}
                        }
                    },
                    "lat": {"type": "float"},
                    "long": {"type": "float"}
                }
            },
            "infoArticle": {
                "properties": {
                    "eng": {
                        "properties": {
                            "url": {"type": "keyword"}
                        }
                    }
                }
            }
        }
    }
}
