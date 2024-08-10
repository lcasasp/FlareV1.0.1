from flask import Flask, request, jsonify
from elasticsearch import Elasticsearch
from services import fetch_events, extract_and_prepare_event_data, event_mapping
from config import Config
from flask_cors import CORS
from datetime import datetime
import logging

app = Flask(__name__)
CORS(app)

es = Elasticsearch(
    ["http://localhost:9200"],
    basic_auth=('elastic', Config.ELASTIC_PW),
    verify_certs=False,
)


@app.route('/articles', methods=['GET'])
def get_articles():
    """
    Fetch all articles sorted by socialScore in descending order.
    Returns a list of events.
    """
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


@app.route('/search', methods=['GET'])
def search_events():
    """
    Search for events based on the user's query, 
    applying a function score to boost recent and weighted articles.
    Returns a list of events.
    """
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
                                        "gte": "now-30d/d"  # Filter for events within the last 30 days
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
                            "factor": 0.1  # Boost based on the "wgt" field
                        }
                    },
                    {
                        "gauss": {
                            "eventDate": {
                                "origin": current_date,
                                "scale": "7d",
                                "offset": "1d",
                                "decay": 0.9  # Decay score based on recency
                            }
                        }
                    }
                ],
                "score_mode": "sum",
                "boost_mode": "sum"
            }
        },
        "size": 100  # Limit the number of results to 100
    }

    search_result = es.search(index="events", body=search_body)
    return search_result['hits']['hits']


@app.route('/fetch', methods=['GET'])
def fetch_and_index_events():
    """
    Fetches events from external sources using EventRegistry and
    adds the fetched events to the Elasticsearch index.
    Returns a list of events.
    """
    pages = request.args.get('pages', '1-1')
    categories = request.args.get('categories')
    concepts = request.args.getlist('concepts')

    start_page, end_page = map(int, pages.split('-'))

    if not es.indices.exists(index="events"):
        es.indices.create(index="events", ignore=400)

    events = fetch_events(categories=categories, concepts=concepts,
                          start_page=start_page, end_page=end_page)
    processed_events = extract_and_prepare_event_data(events, es)

    for event in processed_events:
        es.index(index="events", body=event)

    return jsonify(processed_events)


@app.route('/es-index')
def create_es_index():
    """
    Creates the Elasticsearch index with a predefined mapping if it doesn't exist.
    """
    if not es.indices.exists(index="events"):
        es.indices.create(index="events", body=event_mapping)
        return jsonify({"message": "Index 'events' created"})
    else:
        return jsonify({"message": "Index already exists"})


@app.route('/delete_index', methods=['DELETE'])
def delete_index():
    """
    Deletes the Elasticsearch index if it exists.
    """
    index_name = 'events'
    try:
        if es.indices.exists(index=index_name):
            response = es.indices.delete(index=index_name)
            return jsonify({"message": f"Index '{index_name}' deleted"}), 200
        else:
            return jsonify({"message": "Index not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting index: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
