import requests
from elasticsearch import Elasticsearch
from config import Config
# from fake_test import fake_fetch_news
import logging
import eventregistry
from eventregistry import *

er = EventRegistry(apiKey = Config.NEWS_API_KEY, allowUseOfArchive=False)

def fetch_news():
    q = QueryArticlesIter(keywords = None,
    conceptUri = ["http://en.wikipedia.org/wiki/Climate_change", "http://en.wikipedia.org/wiki/Energy"],
    categoryUri = ["dmoz/Business", "dmoz/Science"],
    sourceUri = None,
    sourceLocationUri = None,
    sourceGroupUri = None,
    authorUri = None,
    locationUri = None,
    lang = None,
    dateStart = None,
    dateEnd = None,
    dateMentionStart = None,
    dateMentionEnd = None,
    keywordsLoc = "body",
    ignoreKeywords = None,
    ignoreConceptUri = None,
    ignoreCategoryUri = None,
    ignoreSourceUri = None,
    ignoreSourceLocationUri = None,
    ignoreSourceGroupUri = None,
    ignoreAuthorUri = None,
    ignoreLocationUri = None,
    ignoreLang = None,
    ignoreKeywordsLoc = "body",
    isDuplicateFilter = "keepAll",
    hasDuplicateFilter = "keepAll",
    eventFilter = "keepAll",
    startSourceRankPercentile = 0,
    endSourceRankPercentile = 100,
    minSentiment = -1,
    maxSentiment = 1,
    dataType = "news",
    requestedResult = None)
    q.setRequestedResult(RequestArticlesInfo(count = 100, sortBy = "date"))
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
            #"truthfulness": MEDIA VALIDATOR HERE!!!
            "concepts": [
                {"uri": concept.get('uri'), "label": concept.get(
                    'label', {}).get('eng'), "score": concept.get('score')}
                for concept in article.get('concepts', [])
            ],
        }
        prepared_articles.append(prepared_article)
    return prepared_articles


def add_indexed_news():
    es = Elasticsearch(
        ["https://localhost:9200"],
        basic_auth=('elastic', Config.ELASTIC_PW),
        verify_certs=False,
    )
    news_api_response = fetch_news()
    # news_api_response = fake_fetch_news()
    articles = extract_and_prepare_news_data(news_api_response)

    for article in articles:
        logging.debug(f"Indexing article: {article}")
        es.index(index="news", body=article)

    return articles
