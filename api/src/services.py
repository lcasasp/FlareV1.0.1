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


def extract_and_prepare_event_data(event_response):
    """
    Filters and prepares event data for indexing into Elasticsearch.

    Args:
        event_response (list): A list of event data to process.

    Returns:
        list: A list of unique and processed events ready for indexing.
    """
    processed_events = []
    for event in event_response:
        if 'concepts' in event:
            filtered_concepts = [concept for concept in event['concepts'] if concept.get('score', 0) > 50]
            event['concepts'] = filtered_concepts
        processed_events.append(event)
    return processed_events

def build_search_query(query):
    search_body = {
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
                ],
                "must": [
                    {
                        "function_score": {  # Custom scoring to boost recent articles
                                "query": {
                                    "range": {
                                        "eventDate": {
                                            "gte": "now-30d/d"
                                        }
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
                ]
            },
            
        },
        "size": 100
    }

    return search_body

# def add_custom_scoring(search_body):
#     """Adds custom scoring functions to the search query."""
#     search_body["query"]["bool"].setdefault("must", []).append({
#         "function_score": {
#             "query": search_body["query"]["bool"]["must"][0], 
#             "functions": [
#                 {
#                     "gauss": {
#                         "eventDate": {
#                             "origin": "now",
#                             "scale": "15d", 
#                             "decay": 0.3
#                         }
#                     }
#                 },
#                 {
#                     "field_value_factor": {
#                         "field": "socialScore",
#                         "factor": 1.2,  # Slightly reduced impact
#                         "modifier": "log1p"
#                     }
#                 }
#             ],
#             "boost_mode": "multiply"
#         }
#     })

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
