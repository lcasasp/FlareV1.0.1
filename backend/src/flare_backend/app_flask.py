from flask import Flask, jsonify, request
from flask_cors import CORS
import logging

from flare_backend.routes import (
    handle_get_articles, handle_search_events,
    handle_fetch_and_index, handle_create_index,
    handle_delete_index,
)
from flare_backend.config import Settings

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.DEBUG)

# ---------- API routes ---------- #


@app.route("/articles")
def articles():
    return jsonify(handle_get_articles())


@app.route("/search")
def search():
    q = request.args.get("query", "*")
    return jsonify(handle_search_events(q))


@app.route("/fetch")
def fetch():
    pages = request.args.get("pages", "1-1")
    categories = request.args.get("categories")
    concepts = request.args.getlist("concepts")
    return jsonify(handle_fetch_and_index(pages, categories, concepts))


@app.route("/es-index")
def create_index():
    return jsonify(handle_create_index())


@app.route("/delete_index", methods=["DELETE"])
def delete_index():
    return jsonify(handle_delete_index())


if __name__ == "__main__":
    print(">> Running local API on http://localhost:5000")
    app.run("0.0.0.0", 5000, debug=True)
