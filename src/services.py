import requests
from elasticsearch import Elasticsearch
from config import Config
import logging
from eventregistry import *
import hashlib
from datetime import datetime, timedelta

er = EventRegistry(apiKey=Config.NEWS_API_KEY, allowUseOfArchive=False)

es = Elasticsearch(
    ["http://localhost:9200"],
    basic_auth=('elastic', Config.ELASTIC_PW),
    verify_certs=False,
)

def fetch_events():
    er = EventRegistry(apiKey=Config.NEWS_API_KEY, allowUseOfArchive=False)
    all_events = []

    for curPage in range(1, 5):
        q = QueryEventsIter(
            conceptUri=QueryItems.OR(["http://en.wikipedia.org/wiki/Climate_change",
                                      "http://en.wikipedia.org/wiki/Energy"]),
            categoryUri=QueryItems.OR(["dmoz/Business", "dmoz/Science", "dmoz/Technology", "dmoz/Environment", "dmoz/Politics"]),
            sourceUri=None,
            sourceLocationUri=None,
            sourceGroupUri=None,
            authorUri=None,
            locationUri=None,
            lang="eng",
            dateStart=None,
            dateEnd=None,
            minArticlesInEvent=1,
            maxArticlesInEvent=10,
            dateMentionStart=datetime.now() - timedelta(days=1),
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
            requestedResult=RequestEventsInfo(count=50, page=curPage,
                                              returnInfo=ReturnInfo(
                                                  eventInfo=EventInfoFlags(concepts=True, image=True, location=True, imageCount=1, infoArticle=True, socialScore=True),
                                                  locationInfo=LocationInfoFlags(label=True, geoLocation=True)))
        )

        res = er.execQuery(q)
        if res.get('events', {}).get('results'):
            all_events.extend(res['events']['results'])

    return all_events


def extract_and_prepare_event_data(event_response):
    unique_articles = []
    for event in event_response:
        article_url = event['infoArticle']['eng']['url']
        # Query Elasticsearch to check if the article URL already exists
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


def add_indexed_events():
    if not es.indices.exists(index="events"):
        es.indices.create(index="events", body=event_mapping)

    event_api_response = fetch_events()
    events = extract_and_prepare_event_data(event_api_response)

    for event in events:
        es.index(index="events", body=event)

    return events

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
                            "eng": {"type": "text"},
                        }
                    },
                    "location": {
                        "properties": {
                            "label": {
                                "properties": {
                                    "eng": {"type": "text"},
                                }
                            },
                            "lat": {"type": "long"},
                            "long": {"type": "long"},
                        }
                    },
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
                                    "eng": {"type": "text"},
                                }
                            },
                            "lat": {"type": "long"},
                            "long": {"type": "long"},
                        }
                    },
                    "label": {
                        "properties": {
                            "eng": {"type": "text"},
                        }
                    },
                    "lat": {"type": "long"},
                    "long": {"type": "long"},
                }
            },
            "infoArticle": {
                "properties": {
                    "eng": {
                        "properties": {
                            "url": {"type": "keyword"},
                        }
                    }
                }
            }
        }
    }
}


# These function are not used in the current version of the application
######################################################################

# def fetch_news():
#     q = QueryArticlesIter(keywords=None,
#                           conceptUri=["http://en.wikipedia.org/wiki/Climate_change",
#                                       "http://en.wikipedia.org/wiki/Energy"],
#                           categoryUri=["dmoz/Business", "dmoz/Science"],
#                           sourceUri=None,
#                           sourceLocationUri=None,
#                           sourceGroupUri=None,
#                           authorUri=None,
#                           locationUri=None,
#                           lang="eng",
#                           dateStart=None,
#                           dateEnd=None,
#                           dateMentionStart=None,
#                           dateMentionEnd=None,
#                           keywordsLoc="body",
#                           ignoreKeywords=None,
#                           ignoreConceptUri=None,
#                           ignoreCategoryUri=None,
#                           ignoreSourceUri=None,
#                           ignoreSourceLocationUri=None,
#                           ignoreSourceGroupUri=None,
#                           ignoreAuthorUri=None,
#                           ignoreLocationUri=None,
#                           ignoreLang=None,
#                           ignoreKeywordsLoc="body",
#                           isDuplicateFilter="skipDuplicates",
#                           hasDuplicateFilter="skipDuplicates",
#                           eventFilter="keepAll",
#                           startSourceRankPercentile=0,
#                           endSourceRankPercentile=40,
#                           minSentiment=-1,
#                           maxSentiment=1,
#                           dataType="news",
#                           requestedResult=None)
#     q.setRequestedResult(RequestArticlesInfo(count=100, sortBy="date",
#                                              returnInfo=ReturnInfo(articleInfo=ArticleInfoFlags(concepts=True, image=True),
#                                                                     locationInfo=LocationInfoFlags(label=True, geoLocation=True),
#                                                                    )
#                                              )
#                          )
#     res = er.execQuery(q)
#     return res

# def extract_and_prepare_news_data(news_api_response):
#     articles = news_api_response.get('articles', {}).get('results', [])
#     prepared_articles = []

#     for article in articles:
#         prepared_article = {
#             "uri": article.get('uri'),
#             "date": article.get('dateTimePub'),
#             "url": article.get('url'),
#             "title": article.get('title'),
#             "body": article.get('body'),
#             "source_uri": article.get('source', {}).get('uri'),
#             "source_title": article.get('source', {}).get('title'),
#             "image": article.get('image'),
#             "sentiment": article.get('sentiment'),
#             "relevance": article.get('relevance'),
#             # "truthfulness": MEDIA VALIDATOR HERE!!!
#             "concepts": [
#                 {"uri": concept.get('uri'), 
#                  "label": concept.get('label', {}).get('eng'), 
#                  "score": concept.get('score'),
#                  "type": concept.get('type')}
#                 for concept in article.get('concepts', []) if concept.get('type') != 'loc'
#             ],
#             "locations": [
#                 {
#                  "label": concept.get('label', {}).get('eng'), 
#                  "latitude": float(concept.get('location', {}).get('lat', None)),
#                  "longitude": float(concept.get('location', {}).get('long', None))}
#                 for concept in article.get('concepts', []) if concept.get('type') == 'loc' and concept.get('location')
#             ],
#         }
#         prepared_articles.append(prepared_article)
#     return prepared_articles

# def add_indexed_news():
#     es = Elasticsearch(
#         ["http://localhost:9200"],
#         basic_auth=('elastic', Config.ELASTIC_PW),
#         verify_certs=False,
#     )
#     news_api_response = fetch_events()
#     articles = extract_and_prepare_news_data(news_api_response)

#     for article in articles:
#         if not es.indices.exists(index="news"):
#             es.indices.create(index="news", ignore=400)
#         es.index(index="news", body=article)

#     return articles
