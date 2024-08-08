import React, { useState, useEffect, useRef } from 'react';

const Headlines: React.FC<{ articles: any[] }> = ({ articles }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const conveyorBeltRef = useRef<HTMLDivElement>(null);

  const totalItems = 10;
  const displayCount = 5;
  const loopItems = [...articles.slice(-displayCount), ...articles, ...articles.slice(0, displayCount)];

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
    if (currentIndex === 0) {
      setCurrentIndex(5);
      setTimeout(() => {
        if (conveyorBeltRef.current) {
          conveyorBeltRef.current.style.transition = 'none'; // Temporarily disable transition
          setCurrentIndex(5);
          setTimeout(() => {
            if (conveyorBeltRef.current) {
              conveyorBeltRef.current.style.transition = 'transform 1s ease-in-out'; // Re-enable transition
            }
          }, 50);
        }
      }, 1000); // Wait for the last transition to complete
    } else {
      setCurrentIndex((prevIndex) => prevIndex - 1);
    }
  };

  const handleNextClick = () => {
    resetTimer();
    if (currentIndex === 5) {
      setCurrentIndex(0);
      setTimeout(() => {
        if (conveyorBeltRef.current) {
          conveyorBeltRef.current.style.transition = 'none'; // Temporarily disable transition
          setCurrentIndex(0);
          setTimeout(() => {
            if (conveyorBeltRef.current) {
              conveyorBeltRef.current.style.transition = 'transform 1s ease-in-out'; // Re-enable transition
            }
          }, 50);
        }
      }, 1000); // Wait for the last transition to complete
    } else {
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }
  };

  const displayedArticles = events.slice(currentIndex, currentIndex + 5);
  if (displayedArticles.length < 5) {
    displayedArticles.push(...events.slice(0, 5 - displayedArticles.length));
  }


  return (
    <div className="news-headline-system">
      <div className="conveyor-belt-container">
        <button className="nav-button prev-button" onClick={handlePrevClick}>&#10094;</button>
        <div className="conveyor-belt" style={{ transform: `translateX(-${currentIndex * 20}%)` }}>
          {events.map((article, index) => (
            <div key={index} className="article" onClick={() => window.open(article.infoArticle.eng.url, '_blank')}>
              <img src={article.image} alt={article.title} />
              <h4><b>{article.title}</b></h4>
            </div>
          ))}
        </div>
        <button className="nav-button next-button" onClick={handleNextClick}>&#10095;</button>
      </div>
    </div>
  );
};

export default Headlines;