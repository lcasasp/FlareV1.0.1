from dotenv import load_dotenv
import os

load_dotenv()


class Config:
    NEWS_API_KEY = os.getenv('NEWS_API_KEY')
    CLOUD_ID = os.getenv('ELASTIC_CLOUDID')
    ES_KEY = os.getenv('ELASTIC_KEY')
    ES_ENDPOINT = os.getenv('ELASTIC_ENDPOINT')

    def reload_env():
        load_dotenv(override=True)

if __name__ == '__main__':
    Config.reload_env()