import React, { useState, useEffect } from 'react';

const categories = ["Breaking", "Business", "Technology", "Science", "Politics"];

const Headlines: React.FC<{ articles: any[], onCategorySelect: (category: string) => void }> = ({ articles, onCategorySelect }) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const events = articles.slice(0, 10);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex === events.length - 1 ? 0 : prevIndex + 1));
    }, 5000); // Change every 5 seconds

    setTimer(interval);

    return () => clearInterval(interval);
  }, [events.length]);

  const resetTimer = () => {
    if (timer) {
      clearInterval(timer);
    }
    const newInterval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex === events.length - 1 ? 0 : prevIndex + 1));
    }, 5000);
    setTimer(newInterval);
  };

  const handlePrevClick = () => {
    resetTimer();
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? events.length - 1 : prevIndex - 1));
  };

  const handleNextClick = () => {
    resetTimer();
    setCurrentIndex((prevIndex) => (prevIndex === events.length - 1 ? 0 : prevIndex + 1));
  };

  const displayedArticles = events.slice(currentIndex, currentIndex + 5);
  if (displayedArticles.length < 5) {
    displayedArticles.push(...events.slice(0, 5 - displayedArticles.length));
  }

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category === activeCategory ? 'All' : category);
    onCategorySelect(category === activeCategory ? 'All' : category);
  };
  
  return (
    <div className="news-headline-system">
      <div className="conveyor-belt-container">
        <button className="nav-button prev-button" onClick={handlePrevClick}>&#10094;</button>
        <div className="conveyor-belt">
          {displayedArticles.map((article, index) => (
            <div key={index} className="article" onClick={() => window.open(article.infoArticle.eng.url, '_blank')}>
              <img src={article.image} alt={article.title} />
              <h4><b>{article.title}</b></h4>
            </div>
          ))}
        </div>
        <button className="nav-button next-button" onClick={handleNextClick}>&#10095;</button>
      </div>
      <div className="categories">
        {categories.map((category) => (
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