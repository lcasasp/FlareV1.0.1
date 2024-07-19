import requests
from elasticsearch import Elasticsearch
from config import Config
import logging
import eventregistry
from eventregistry import *

er = EventRegistry(apiKey=Config.NEWS_API_KEY, allowUseOfArchive=False)


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
                          lang=None,
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
                          isDuplicateFilter="keepAll",
                          hasDuplicateFilter="keepAll",
                          eventFilter="keepAll",
                          startSourceRankPercentile=0,
                          endSourceRankPercentile=100,
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
    news_api_response = fetch_news()
    articles = extract_and_prepare_news_data(news_api_response)

    for article in articles:
        # Search for an existing article with the same title
        search_query = {
            "query": {
                "match": {
                    "title": article["title"]
                }
            }
        }
        search_result = es.search(index="news", body=search_query)
        if search_result['hits']['total']['value'] == 0:
            # If no existing article with the same title, index the new article
            logging.debug(f"Indexing article: {article}")
            if not es.indices.exists(index="news"):
                es.indices.create(index="news", ignore=400)
            es.index(index="news", body=article)
        else:
            logging.debug(f"Skipping duplicate article: {article['title']}")

    return articles
