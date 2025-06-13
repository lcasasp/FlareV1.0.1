import json
from elasticsearch import Elasticsearch, helpers
import logging
from config import Config
import os

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s: %(message)s')


def create_index(es):
    """Create the events index with proper mapping if it doesn't exist."""
    try:
        if not es.indices.exists(index="events"):
            with open('./src/event_mapping.json', 'r') as f:
                mapping = json.load(f)
            es.indices.create(index="events", body=mapping)
            logging.info("Created 'events' index with mapping")
        else:
            logging.info("Index 'events' already exists")
    except Exception as e:
        logging.error(f"Error creating index: {e}")
        raise


def load_snapshot_data(snapshot_path):
    """Load data from the snapshot file."""
    try:
        with open(snapshot_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error loading snapshot file: {e}")
        raise


def prepare_bulk_actions(articles):
    """Prepare bulk actions for Elasticsearch indexing."""
    bulk_actions = []
    for article in articles:
        action = {
            "_index": "events",
            "_id": article.get('uri', article.get('id', None)),
            "_source": article
        }
        bulk_actions.append(action)
    return bulk_actions


def migrate_data():
    """Main function to handle the migration process."""
    try:
        # Initialize Elasticsearch client
        es = Elasticsearch("http://localhost:9200")

        # Create index with mapping
        create_index(es)

        # Load snapshot data
        snapshot_path = os.path.join(os.path.dirname(
            __file__), '..', 'flare-snapshot.json')
        articles = load_snapshot_data(snapshot_path)

        # Prepare bulk actions
        bulk_actions = prepare_bulk_actions(articles)

        # Perform bulk indexing
        if bulk_actions:
            success, failed = helpers.bulk(es, bulk_actions, stats_only=True)
            logging.info(f"Successfully indexed {success} documents")
            if failed:
                logging.warning(f"Failed to index {failed} documents")

        logging.info("Migration completed successfully!")

    except Exception as e:
        logging.error(f"Migration failed: {e}")
        raise


if __name__ == "__main__":
    migrate_data()
