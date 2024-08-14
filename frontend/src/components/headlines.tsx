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
  const conveyorRef = useRef<HTMLDivElement>(null);
  const displayCount = 5;
  const articleWidth = useRef<number>(0);

  // infinite carousel
  const extendedArticles = [
    ...articles.slice(-displayCount),
    ...articles,             
    ...articles.slice(0, displayCount),
  ];

  const advanceCarousel = useCallback(() => {
    setCurrentIndex((prevIndex) => prevIndex + 1);
  }, []);

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
    setCurrentIndex((prevIndex) => prevIndex - 1);
    startTimer();
  }, [stopTimer, startTimer]);

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [startTimer, stopTimer]);

  useEffect(() => {
    const articleElement = document.querySelector('.news-headline-system .conveyor-belt .article');
    if (articleElement) {
      const width = articleElement.clientWidth;
      articleWidth.current = width;
    }
      
    if (conveyorRef.current) {
      const totalItemsDisplayed = extendedArticles.length;

      // Handle looping forward
      if (currentIndex >= totalItemsDisplayed - 5) {
        setTimeout(() => {
          conveyorRef.current!.style.transition = "none";
          setCurrentIndex(5);
          conveyorRef.current!.style.transform = `translateX(-${5 * Number(articleWidth.current)}px)`;
        }, 500); // Match the transition duration
      }

      // Handle looping backward
      if (currentIndex <= 0) {
        setTimeout(() => {
          conveyorRef.current!.style.transition = "none";
          setCurrentIndex(totalItemsDisplayed - 10);
          conveyorRef.current!.style.transform = `translateX(-${(totalItemsDisplayed - 10) *  Number(articleWidth.current)}px)`;
        }, 500); // Match the transition duration
      }

      // Normal movement
      conveyorRef.current.style.transition = "transform 0.5s ease-in-out";
      conveyorRef.current.style.transform = `translateX(-${currentIndex *  Number(articleWidth.current)}px)`;
    }
  }, [currentIndex, extendedArticles.length, displayCount]);

  const handleCategoryClick = (category: string) => {
    const newCategory = category === activeCategory ? "All" : category;
    setActiveCategory(newCategory);
    onCategorySelect(newCategory);
  };

  return (
    <div className="news-headline-system">
      <div className="conveyor-belt-container">
        <button className="nav-button prev-button" onClick={handlePrevClick}>
          &#10094;
        </button>
        <div className="conveyor-belt-wrapper" style={{ overflow: 'hidden', width: '100%' }}>
          <div
            className="conveyor-belt"
            ref={conveyorRef}
            style={{ display: 'flex', transition: 'transform 0.5s ease-in-out' }}
          >
            {extendedArticles.map((article, index) => (
              <div
                key={index}
                className="article"
                style={{ flex: `0 0 ${100 / displayCount}%` }}
                onClick={() => window.open(article.infoArticle.eng.url, "_blank")}
              >
                <img src={article.image} alt={article.title} />
                <h4>
                  <b>{article.title}</b>
                </h4>
              </div>
            ))}
          </div>
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
