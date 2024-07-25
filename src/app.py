from flask import Flask, request, jsonify
from elasticsearch import Elasticsearch
from services import add_indexed_news
from config import Config
from flask_cors import CORS, cross_origin
from datetime import datetime, timedelta
import logging

app = Flask(__name__)

CORS(app)

es = Elasticsearch(
    ["http://localhost:9200"],
    basic_auth=('elastic', Config.ELASTIC_PW),
    verify_certs=False  # Only for development purposes
)


@app.route('/articles', methods=['GET'])
def get_articles():
    result = es.search(index="news", body={
        "query": {
            "match_all": {}
        },
        "sort": [
            {
                "relevance": {
                    "order": "desc"
                }
            }
        ],
        "size": 100
    })
    articles = [hit["_source"] for hit in result['hits']['hits']]

    return jsonify(articles)

@app.route('/search', methods=['GET'])
def search_news():
    query = request.args.get('query', default="*", type=str)
    logging.debug(f"Received query: {query}")
    
    current_date = datetime.now().strftime('%Y-%m-%d')
    search_body = {
        "query": {
            "function_score": {
                "query": {
                    "bool": {
                        "should": [
                            {
                                "multi_match": {
                                    "query": query,
                                    "fields": ["title^3", "body", "concepts.label^3"],
                                    "type": "cross_fields",
                                    "operator": "and"
                                }
                            }
                        ],
                        "filter": [
                            {
                                "range": {
                                    "date": {
                                        "gte": "now-30d/d"  # Adjust this as necessary for date range
                                    }
                                }
                            }
                        ]
                    }
                },
                "functions": [
                    {
                        "field_value_factor": {
                            "field": "relevance",
                            "modifier": "log1p",
                            "factor": 0.1  # Adjust the factor based on how much you want to boost by relevance
                        }
                    },
                    {
                        "gauss": {
                            "date": {
                                "origin": current_date,
                                "scale": "7d",
                                "offset": "1d",
                                "decay": 0.9  # Adjust decay to manage the drop-off rate
                            }
                        }
                    }
                ],
                "score_mode": "sum",  # Combines scores of all functions
                "boost_mode": "sum"   # Combines function scores with query score
            }
        },
        "size": 1000
    }

    search_result = es.search(index="news", body=search_body)
    return search_result['hits']['hits']


@app.route('/fetch')
def fetch_and_index_news():
    if not es.indices.exists(index="news"):
        es.indices.create(index="news", ignore=400)
    articles = add_indexed_news()
    return articles


@app.route('/es-index')
def create_es_index():
    if not es.indices.exists(index="news"):
        es.indices.create(index="news", ignore=400)
    return jsonify({"message": Config.ELASTIC_PW})

@app.route('/delete_index', methods=['DELETE'])
def delete_index():
    index_name = 'news'
    try:
        if es.indices.exists(index=index_name):
            response = es.indices.delete(index=index_name)
            return jsonify({"message": f"Index '{index_name}' deleted"}), 404
        else:
            return jsonify({"message": "Index not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
