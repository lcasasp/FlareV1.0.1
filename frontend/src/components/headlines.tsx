import React, { useState, useEffect, useRef, useCallback } from "react";

interface HeadlinesProps {
  articles: any[];
  onCategorySelect: (category: string) => void;
}

const categories = [
  "All",
  "Breaking",
  "Business",
  "Technology",
  "Science",
  "Society",
];

const Headlines: React.FC<HeadlinesProps> = ({
  articles,
  onCategorySelect,
}) => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const events = articles.slice(0, 10);
  const totalItems = 10;
  const displayCount = 5;

  const advanceCarousel = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex >= totalItems - displayCount ? 0 : prevIndex + 1
    );
  }, [totalItems, displayCount]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(advanceCarousel, 5000);
  }, [advanceCarousel]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleNextClick = useCallback(() => {
    stopTimer();
    advanceCarousel();
    startTimer();
  }, [advanceCarousel, startTimer, stopTimer]);

  const handlePrevClick = useCallback(() => {
    stopTimer();
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? totalItems - displayCount : prevIndex - 1
    );
    startTimer();
  }, [stopTimer, startTimer, totalItems, displayCount]);

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [startTimer, stopTimer]);

  const handleCategoryClick = (category: string) => {
    const newCategory = category === activeCategory ? "All" : category;
    setActiveCategory(newCategory);
    onCategorySelect(newCategory);
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
      <div className="categories">
        {categories.slice(1).map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            className={activeCategory === category ? "active" : ""}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Headlines;
