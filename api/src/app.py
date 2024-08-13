import os
from flask import Flask, request, jsonify
from elasticsearch_serverless import Elasticsearch
from config import Config
from services import fetch_events, extract_and_prepare_event_data, event_mapping
from flask_cors import CORS
from datetime import datetime
import logging

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s %(levelname)s: %(message)s')

try:
    es = Elasticsearch(
        Config.ES_ENDPOINT,
        api_key=Config.ES_KEY
    )
except Exception as e:
    logging.error(f"Error connecting to Elasticsearch: {e}")
    raise


@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Resource not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    logging.error(f"Server Error: {error}")
    return jsonify({"error": "Internal server error"}), 500


@app.errorhandler(Exception)
def unhandled_exception(error):
    logging.error(f"Unhandled Exception: {error}")
    return jsonify({"error": "An unexpected error occurred"}), 500


@app.route('/articles', methods=['GET'])
def get_articles():
    try:
        result = es.search(index="events", body={
            "query": {
                "match_all": {}
            },
            "sort": [
                {
                    "socialScore": {
                        "order": "desc"
                    }
                }
            ],
            "size": 1000
        })
        articles = [hit["_source"] for hit in result['hits']['hits']]
        return jsonify(articles)
    except Exception as e:
        logging.error(f"Error fetching articles: {e}")
        return jsonify({"error": "Failed to fetch articles from Elasticsearch"}), 500


@app.route('/search', methods=['GET'])
def search_events():
    try:
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
                                        "fields": ["title.eng^3", "summary.eng", "concepts.label.eng^2"],
                                        "type": "best_fields",
                                        "operator": "or",
                                        "fuzziness": "AUTO"
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "eventDate": {
                                            "gte": "now-30d/d"
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "functions": [
                        {
                            "field_value_factor": {
                                "field": "wgt",
                                "modifier": "log1p",
                                "factor": 0.1
                            }
                        },
                        {
                            "gauss": {
                                "eventDate": {
                                    "origin": current_date,
                                    "scale": "7d",
                                    "offset": "1d",
                                    "decay": 0.9
                                }
                            }
                        }
                    ],
                    "score_mode": "sum",
                    "boost_mode": "sum"
                }
            },
            "size": 50
        }

        search_result = es.search(index="events", body=search_body)
        return search_result['hits']['hits']
    except Exception as e:
        logging.error(f"Error searching for events: {e}")
        return jsonify({"error": "Failed to search events in Elasticsearch"}), 500


@app.route('/fetch', methods=['GET'])
def fetch_and_index_events():
    try:
        pages = request.args.get('pages', '1-1')
        categories = request.args.get('categories')
        concepts = request.args.getlist('concepts')

        start_page, end_page = map(int, pages.split('-'))

        if not es.indices.exists(index="events"):
            es.indices.create(index="events", ignore=400)

        events = fetch_events(categories=categories, concepts=concepts,
                              start_page=start_page, end_page=end_page)
        processed_events = extract_and_prepare_event_data(events, es)

        es.bulk(operations=processed_events, pipeline="search-default-ingestion")

        return jsonify(processed_events)
    except Exception as e:
        logging.error(f"Error indexing events: {e}")
        return jsonify({"error": "Failed to index events"}), 500
    except Exception as e:
        logging.error(f"Unhandled error during fetch and index: {e}")
        return jsonify({"error": "An unexpected error occurred during fetch and index"}), 500


@app.route('/es-index')
def create_es_index():
    try:
        if not es.indices.exists(index="events"):
            es.indices.create(index="events", body=event_mapping)
            return jsonify({"message": "Index 'events' created"})
        else:
            return jsonify({"message": "Index already exists"})
    except Exception as e:
        logging.error(f"Error creating Elasticsearch index: {e}")
        return jsonify({"error": "Failed to create Elasticsearch index"}), 500


@app.route('/delete_index', methods=['DELETE'])
def delete_index():
    index_name = 'events'
    try:
        if es.indices.exists(index=index_name):
            response = es.indices.delete(index=index_name)
            return jsonify({"message": f"Index '{index_name}' deleted"}), 200
        else:
            return jsonify({"message": "Index not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting index: {e}")
        return jsonify({"error": "Failed to delete Elasticsearch index"}), 500


if __name__ == '__main__':
    app.run('0.0.0.0', port=5000, debug=True)
