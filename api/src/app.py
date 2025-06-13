import os
from flask import Flask, request, jsonify
from elasticsearch import Elasticsearch, helpers
from config import Config
from services import *
from flask_cors import CORS
from datetime import datetime
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s %(levelname)s: %(message)s')

try:
    ELASTIC_URL = os.getenv("ELASTIC_URL", "http://localhost:9200")
    es = Elasticsearch(
        ELASTIC_URL
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

        search_body = build_search_query(query)

        # add_custom_scoring(search_body)

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
        processed_events = extract_and_prepare_event_data(events)

        bulk_actions = []
        uris_seen = set()

        for event in processed_events:
            uri = event["uri"]
            if uri not in uris_seen:
                uris_seen.add(uri)
                action = {
                    "_index": "events",
                    "_id": event['uri'],
                    "_source": event
                }
                bulk_actions.append(action)

        # Perform bulk indexing
        if bulk_actions:
            helpers.bulk(es, bulk_actions)

        return jsonify([action['_source'] for action in bulk_actions])
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


@app.route('/export', methods=['GET'])
def export_articles():
    try:
        result = es.search(index="events", body={
            "query": {"match_all": {}},
            "size": 1500  # Adjust if needed
        }, scroll='2m')  # Use scroll for large data sets

        all_hits = result['hits']['hits']
        scroll_id = result['_scroll_id']

        while len(result['hits']['hits']):
            result = es.scroll(scroll_id=scroll_id, scroll='2m')
            scroll_id = result['_scroll_id']
            all_hits.extend(result['hits']['hits'])

        articles = [hit["_source"] for hit in all_hits]

        return jsonify(articles)
    except Exception as e:
        logging.error(f"Error exporting articles: {e}")
        return jsonify({"error": "Failed to export articles"}), 500


if __name__ == '__main__':
    app.run('0.0.0.0', port=5000, debug=True)
