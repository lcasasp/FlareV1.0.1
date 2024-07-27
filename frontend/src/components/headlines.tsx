import React, { useState } from 'react';

const categories = ["Breaking", "Business", "Technology", "Science", "Politics"];

const Headlines: React.FC<{ articles: any[] }> = ({ articles }) => {
  const [activeCategory, setActiveCategory] = useState('All');

  //get first 10 articles
  const events = articles.slice(0, 10);

  return (
    <div className="news-headline-system">
      <div className="conveyor-belt">
        {events.map((article) => (
          <div key={article.id} className="article">
            <img src={article.image} alt={article.title} />
            <h4><b>{article.title}</b></h4>
          </div>
        ))}
      </div>
      <div className="categories">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={activeCategory === category ? 'active' : ''}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Headlines;
