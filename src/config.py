from dotenv import load_dotenv
import os

load_dotenv()


class Config:
    NEWS_API_KEY = os.getenv('NEWS_API_KEY')
    ELASTIC_PW = os.getenv('ELASTIC_PW')
