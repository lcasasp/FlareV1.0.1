import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """
    Environment-aware config.
    """
    STAGE = os.getenv("STAGE", "local")          # local | dev | prod
    LOCAL = STAGE == "local"

    # OpenSearch
    OPENSEARCH_ENDPOINT = os.getenv(
        "OPENSEARCH_ENDPOINT",
        "http://localhost:9200" if LOCAL else None
    )

    # API keys
    ER_APIKEY = os.getenv("ER_APIKEY")