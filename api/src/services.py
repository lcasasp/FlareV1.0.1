import os
import requests
from eventregistry import *
from datetime import datetime, timedelta

er = EventRegistry(apiKey=os.getenv(
    'ER_APIKEY'), allowUseOfArchive=False)


def fetch_events(categories=None, concepts=None, start_page=1, end_page=5, days=7):
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
    if days <= 30: 
        days = 30
        
    for curPage in range(start_page, end_page + 1):
        q = QueryEventsIter(
            conceptUri=concepts if concepts else "http://en.wikipedia.org/wiki/Climate_change",
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
            dateMentionStart=datetime.now() - timedelta(days=days),
            dateMentionEnd=None,
            ignoreKeywords=None,
            ignoreConceptUri=None,
            ignoreCategoryUri=None,
            ignoreSourceUri=None,
            ignoreSourceLocationUri=None,
            ignoreSourceGroupUri=None,
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


def extract_and_prepare_event_data(event_response, es):
    """
    Filters and prepares event data for indexing into Elasticsearch.

    Args:
        event_response (list): A list of event data to process.

    Returns:
        list: A list of unique and processed events ready for indexing.
    """
    unique_articles = []
    for event in event_response:
        # Filter out concepts with a score below 50
        if 'concepts' in event:
            filtered_concepts = [
                concept for concept in event['concepts'] if concept.get('score', 0) > 50]
            event['concepts'] = filtered_concepts

        article_url = event['infoArticle']['eng']['url']

        # Check if the article URL already exists in the index
        query = {
            "query": {
                "term": {
                    "infoArticle.eng.url": article_url
                }
            }
        }
        result = es.search(index="events", body=query)
        if result['hits']['total']['value'] == 0:
            unique_articles.append(event)

    return unique_articles


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
