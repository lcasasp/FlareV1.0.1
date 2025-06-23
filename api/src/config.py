from dotenv import load_dotenv
import os

load_dotenv()


class Config:
    ER_APIKEY = "ea5d1155-3e89-4abe-b936-ae5fb20253f9"
    NEWS_API_KEY = os.getenv('NEWS_API_KEY')
    ELASTIC_ENDPOINT = os.getenv('ELASTIC_ENDPOINT')

    def reload_env():
        load_dotenv(override=True)

if __name__ == '__main__':
    Config.reload_env()
