import React, { useState, useEffect, useRef } from "react";

const Headlines: React.FC<{ articles: any[] }> = ({ articles }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const events = articles.slice(0, 10);
  const totalItems = 10;
  const displayCount = 5;

  useEffect(() => {
    startTimer();
    return () => {
      stopTimer();
    };
  }, []);

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(handleNextClick, 5000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePrevClick = () => {
    stopTimer();
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? totalItems - displayCount : prevIndex - 1
    );
    startTimer();
  };

  const handleNextClick = () => {
    stopTimer();
    setCurrentIndex((prevIndex) =>
      prevIndex >= totalItems - displayCount ? 0 : prevIndex + 1
    );
    startTimer();
  };

  const displayedArticles = events.slice(currentIndex, currentIndex + 5);
  if (displayedArticles.length < 5) {
    displayedArticles.push(...events.slice(0, 5 - displayedArticles.length));
  }

  return (
    <div className="news-headline-system">
      <div className="conveyor-belt-container">
        <button className="nav-button prev-button" onClick={handlePrevClick}>
          &#10094;
        </button>
        <div
          className="conveyor-belt"
          style={{ transform: `translateX(-${currentIndex * 20}%)` }}
        >
          {events.map((article, index) => (
            <div
              key={index}
              className="article"
              onClick={() => window.open(article.infoArticle.eng.url, "_blank")}
            >
              <img src={article.image} alt={article.title} />
              <h4>
                <b>{article.title}</b>
              </h4>
            </div>
          ))}
        </div>
        <button className="nav-button next-button" onClick={handleNextClick}>
          &#10095;
        </button>
      </div>
    </div>
  );
};

export default Headlines;
