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
    q = QueryEventsIter(conceptUri=QueryItems.OR(["http://en.wikipedia.org/wiki/Climate_change",
                                    "http://en.wikipedia.org/wiki/Energy"]),
                        categoryUri=QueryItems.OR(["dmoz/Business", "dmoz/Science", "dmoz/Technology", "dmoz/Environment", "dmoz/Politics"]),
                        sourceUri = None,
                        sourceLocationUri = None,
                        sourceGroupUri = None,
                        authorUri = None,
                        locationUri = None,
                        lang = "eng",
                        dateStart = None,
                        dateEnd = None,
                        minArticlesInEvent = 1,
                        maxArticlesInEvent = 10,
                        #Only events in the last month
                        dateMentionStart = datetime.now() - timedelta(days=30),
                        dateMentionEnd = None,
                        ignoreKeywords = None,
                        ignoreConceptUri = None,
                        ignoreCategoryUri = None,
                        ignoreSourceUri = None,
                        ignoreSourceLocationUri = None,
                        ignoreSourceGroupUri = None,
                        ignoreAuthorUri = None,
                        ignoreLocationUri = None,
                        ignoreLang = None,
                        keywordsLoc = "body",
                        ignoreKeywordsLoc = "body",
                        requestedResult = None)
    q.setRequestedResult(RequestEventsInfo(count=50,
                                           returnInfo=ReturnInfo(eventInfo=EventInfoFlags(concepts=True, image=True, location=True, imageCount=1, infoArticle=True),
                                                                  locationInfo=LocationInfoFlags(label=True, geoLocation=True),
                                                                 )
                                           )
                       )
    res = er.execQuery(q)
    return res

def extract_and_prepare_event_data(event_response):
    events = event_response.get('events', {}).get('results', [])
    unique_articles = []
    for event in events:
        article_url = event['infoArticle'].get('eng', {}).get('url')
        # Query Elasticsearch to check if the article URL already exists
        query = {
            "query": {
                "term": {
                    "infoArticle.eng.url.keyword": article_url
                }
            }
        }
        result = es.search(index="events", body=query)
        if result['hits']['total']['value'] == 0:
            unique_articles.append(event)
    events = unique_articles
    return events
    # prepared_events = []

    # for event in events:
    #     event_data = {
    #         "uri": event.get('uri'),
    #         "date": event.get('eventDate'),
    #         "title": event['title'].get('eng', ''),
    #         "summary": event['summary'].get('eng', ''),
    #         "image": event.get('images', [])[0] if event.get('images') else '',
    #         "sentiment": event.get('sentiment'),
    #         "relevance": event.get('relevance'),
    #         "totalArticleCount": event.get('totalArticleCount'),
    #         "location": {
    #             "label": event.get('location', {}).get('label', {}).get('eng', ''),
    #             "country": event.get('location', {}).get('country', {}).get('label', {}).get('eng', ''),
    #             "latitude": float(event.get('location', {}).get('lat', 0)),
    #             "longitude": float(event.get('location', {}).get('long', 0))
    #         },
    #         "concepts": [],
    #         "con-locations": []
    #     }

    #     for concept in event.get('concepts', []):
    #         concept_data = {
    #             "uri": concept.get('uri'),
    #             "label": concept.get('label', {}).get('eng', ''),
    #             "score": concept.get('score'),
    #             "type": concept.get('type')
    #         }
    #         if concept.get('type') == 'loc' and concept.get('score') > 60:
    #             if 'location' in concept:
    #                 concept_location = {
    #                     "label": concept.get('label', {}).get('eng', ''),
    #                     "country": concept.get('location', {}).get('country', {}).get('label', {}).get('eng', ''),
    #                     "latitude": float(concept.get('location', {}).get('lat', 0)),
    #                     "longitude": float(concept.get('location', {}).get('long', 0))
    #                 }
    #                 event_data['con-locations'].append(concept_location) 
    #         else:
    #             event_data['concepts'].append(concept_data)

    #     prepared_events.append(event_data)

    # return prepared_events

def add_indexed_events():
    event_api_response = fetch_events()
    events = extract_and_prepare_event_data(event_api_response)

    for event in events:
        if not es.indices.exists(index="events"):
            es.indices.create(index="events", ignore=400)
        es.index(index="events", body=event)

    return events


# These function are not used in the current version of the application
######################################################################

def fetch_news():
    q = QueryArticlesIter(keywords=None,
                          conceptUri=["http://en.wikipedia.org/wiki/Climate_change",
                                      "http://en.wikipedia.org/wiki/Energy"],
                          categoryUri=["dmoz/Business", "dmoz/Science"],
                          sourceUri=None,
                          sourceLocationUri=None,
                          sourceGroupUri=None,
                          authorUri=None,
                          locationUri=None,
                          lang="eng",
                          dateStart=None,
                          dateEnd=None,
                          dateMentionStart=None,
                          dateMentionEnd=None,
                          keywordsLoc="body",
                          ignoreKeywords=None,
                          ignoreConceptUri=None,
                          ignoreCategoryUri=None,
                          ignoreSourceUri=None,
                          ignoreSourceLocationUri=None,
                          ignoreSourceGroupUri=None,
                          ignoreAuthorUri=None,
                          ignoreLocationUri=None,
                          ignoreLang=None,
                          ignoreKeywordsLoc="body",
                          isDuplicateFilter="skipDuplicates",
                          hasDuplicateFilter="skipDuplicates",
                          eventFilter="keepAll",
                          startSourceRankPercentile=0,
                          endSourceRankPercentile=40,
                          minSentiment=-1,
                          maxSentiment=1,
                          dataType="news",
                          requestedResult=None)
    q.setRequestedResult(RequestArticlesInfo(count=100, sortBy="date",
                                             returnInfo=ReturnInfo(articleInfo=ArticleInfoFlags(concepts=True, image=True),
                                                                    locationInfo=LocationInfoFlags(label=True, geoLocation=True),
                                                                   )
                                             )
                         )
    res = er.execQuery(q)
    return res

def extract_and_prepare_news_data(news_api_response):
    articles = news_api_response.get('articles', {}).get('results', [])
    prepared_articles = []

    for article in articles:
        prepared_article = {
            "uri": article.get('uri'),
            "date": article.get('dateTimePub'),
            "url": article.get('url'),
            "title": article.get('title'),
            "body": article.get('body'),
            "source_uri": article.get('source', {}).get('uri'),
            "source_title": article.get('source', {}).get('title'),
            "image": article.get('image'),
            "sentiment": article.get('sentiment'),
            "relevance": article.get('relevance'),
            # "truthfulness": MEDIA VALIDATOR HERE!!!
            "concepts": [
                {"uri": concept.get('uri'), 
                 "label": concept.get('label', {}).get('eng'), 
                 "score": concept.get('score'),
                 "type": concept.get('type')}
                for concept in article.get('concepts', []) if concept.get('type') != 'loc'
            ],
            "locations": [
                {
                 "label": concept.get('label', {}).get('eng'), 
                 "latitude": float(concept.get('location', {}).get('lat', None)),
                 "longitude": float(concept.get('location', {}).get('long', None))}
                for concept in article.get('concepts', []) if concept.get('type') == 'loc' and concept.get('location')
            ],
        }
        prepared_articles.append(prepared_article)
    return prepared_articles

def add_indexed_news():
    es = Elasticsearch(
        ["http://localhost:9200"],
        basic_auth=('elastic', Config.ELASTIC_PW),
        verify_certs=False,
    )
    news_api_response = fetch_events()
    articles = extract_and_prepare_news_data(news_api_response)

    for article in articles:
        if not es.indices.exists(index="news"):
            es.indices.create(index="news", ignore=400)
        es.index(index="news", body=article)

    return articles
