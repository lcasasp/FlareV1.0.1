import requests
from elasticsearch import Elasticsearch
from config import Config
from fake_test import fake_fetch_news
import logging


def fetch_news():
    url = f"https://newsapi.org/v2/top-headlines?country=us&apiKey={
        Config.NEWS_API_KEY}"
    response = requests.get(url)
    return response.json()['articles'] if response.status_code == 200 else None


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
    # news_api_response = fetch_news()
    news_api_response = fake_fetch_news()
    articles = extract_and_prepare_news_data(news_api_response)

    for article in articles:
        logging.debug(f"Indexing article: {article}")
        es.index(index="news", body=article)

    return articles
