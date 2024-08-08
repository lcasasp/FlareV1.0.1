from flask import Flask, request, jsonify
from elasticsearch import Elasticsearch
from services import *
from config import Config
from flask_cors import CORS, cross_origin
from datetime import datetime, timedelta
import logging

app = Flask(__name__)

CORS(app)

@app.route('/articles', methods=['GET'])
def get_articles():
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
                                    "fields": ["title.eng^3", "summary.eng", "concepts.label.eng^3"],
                                    "type": "cross_fields",
                                    "operator": "and"
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
                            "field": "relevance",
                            "modifier": "log1p",
                            "factor": 0.1  # Adjust to boost by relevance
                        }
                    },
                    {
                        "gauss": {
                            "eventDate": {
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
        "size": 100
    }

    search_result = es.search(index="events", body=search_body)
    return search_result['hits']['hits']


@app.route('/fetch', methods=['GET'])
def fetch_and_index_events():
    pages = request.args.get('pages', '1-1')
    categories = request.args.get('categories')  # expecting single value
    concepts = request.args.getlist('concepts')  # expecting multiple values
    
    page_range = pages.split('-')
    start_page = int(page_range[0])
    end_page = int(page_range[1]) if len(page_range) > 1 else start_page

    if not es.indices.exists(index="events"):
        es.indices.create(index="events", ignore=400)

    events = fetch_events(categories=categories, concepts=concepts, start_page=start_page, end_page=end_page)
    processed_events = extract_and_prepare_event_data(events)

    for event in processed_events:
        es.index(index="events", body=event)

    return jsonify(processed_events)


@app.route('/es-index')
def create_es_index():
    if not es.indices.exists(index="events"):
        es.indices.create(index="events", body=event_mapping)
    return jsonify({"Creating index": "events"})


@app.route('/delete_index', methods=['DELETE'])
def delete_index():
    index_name = 'events'
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
