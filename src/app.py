from flask import Flask, request, jsonify
from elasticsearch import Elasticsearch
from services import add_indexed_news
from config import Config
from flask_cors import CORS, cross_origin
import logging

app = Flask(__name__)

CORS(app)

@app.route('/articles', methods=['GET'])
def get_articles():
    es = Elasticsearch(
        ["https://localhost:9200"],
        basic_auth=('elastic', Config.ELASTIC_PW),
        verify_certs=False  # Only for development purposes
    )

    query = {
        "query": {
            "match_all": {}  # Match all documents
        },
        "size": 1000
    }

    result = es.search(index="news", body=query)
    articles = [hit["_source"] for hit in result['hits']['hits']]

    return jsonify(articles)


@app.route('/search')
def search_news():
    query = request.args.get('query', default="*", type=str)
    logging.debug(f"Received query: {query}")

    es = Elasticsearch(
        ["https://localhost:9200"],
        basic_auth=('elastic', Config.ELASTIC_PW),
        verify_certs=False  # only for development purposes
    )

    search_body = {
        "query": {
            "multi_match": {  # Use multi_match to search across multiple fields
                "query": query,
                # Adjust fields according to your data model
                "fields": ["title", "body"]
            },
        },
        "size": 1000
    }

    search_result = es.search(index="news", body=search_body)
    logging.debug(f"Search results: {search_result}")
    return jsonify(search_result['hits']['hits'])


@app.route('/fetch')
def fetch_and_index_news():
    articles = add_indexed_news()
    return articles


if __name__ == '__main__':
    app.run(debug=True)
