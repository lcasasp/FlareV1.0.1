from faker import Faker
import random


def fake_fetch_news(number_of_articles=20):
    fake = Faker()
    articles = []
    for _ in range(number_of_articles):
        article = {
            "uri": fake.uuid4(),
            "dateTimePub": fake.date_time_this_year().isoformat(),
            "url": fake.url(),
            "title": fake.sentence(),
            "body": fake.text(max_nb_chars=2000),
            "source": {
                "uri": fake.hostname(),
                "title": fake.company(),
            },
            "image": fake.image_url(),
            "sentiment": random.uniform(-1, 1),
            "concepts": [
                {"uri": fake.url(), "label": {"eng": fake.word()},
                 "score": random.randint(1, 10)}
                for _ in range(random.randint(2, 5))
            ]
        }
        articles.append(article)
    return {"articles": {"results": articles}}
