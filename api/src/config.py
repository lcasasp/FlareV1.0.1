from dotenv import load_dotenv
import os

load_dotenv()


class Config:
    ER_APIKEY = os.getenv('ER_APIKEY')
    NEWS_API_KEY = os.getenv('NEWS_API_KEY')
    ELASTIC_ENDPOINT = os.getenv('ELASTIC_ENDPOINT')

    def reload_env():
        load_dotenv(override=True)

if __name__ == '__main__':
    Config.reload_env()
