from dotenv import load_dotenv
import os

load_dotenv()


class Config:
    NEWS_API_KEY = os.getenv('NEWS_API_KEY')
    ELASTIC_PW = os.getenv('ELASTIC_PW')

    def reload_env():
        load_dotenv(override=True)

if __name__ == '__main__':
    Config.reload_env()