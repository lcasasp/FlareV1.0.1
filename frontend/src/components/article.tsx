import React, { useRef } from 'react';
import useMousePosition from '../hooks/useMousePosition';

interface ArticleProps {
  article: {
    title: string;
    body: string;
    sentiment: number;
    url: string;
    image: string;
    date: string;
    locations: {
      label: string;
      latitude: number;
      longitude: number;
    }[];
  };
}

const Article: React.FC<ArticleProps> = ({ article }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { x, y, rotateX, rotateY } = useMousePosition(cardRef);

  const shortenBody = (body: string) => {
    const words = body.split(/\s+/);
    if (words.length <= 200) {
      return body; 
    } else {
      return words.slice(0, 200).join(' ') + '...'; 
    }
  };

  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });

  return (
    <div
      ref={cardRef}
      className="article-card bg-white shadow-md rounded-lg overflow-hidden my-4 p-4 clearfix"
      style={{
        '--drop-x': `${x}px`,
        '--drop-y': `${y}px`,
        '--rot-x': `${rotateX}deg`,
        '--rot-y': `${rotateY}deg`,
      } as React.CSSProperties}
    >
      <h3 className="text-xl font-semibold mb-2 w-full">{article.title}</h3>
      <p className="text-gray-600 text-sm mb-2">{formattedDate}</p>
      <h3 className="text-sm font-semibold mb-2" style={{ color: '#064273' }}>Sentiment: {article.sentiment.toFixed(2)}</h3>
      {article.image && <img src={article.image} alt="Article" className="article-image float-left mr-4 mb-4" />}
        <p className="text-gray-600">{shortenBody(article.body)+'...'}</p>
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">Read more</a>
    </div>
  );
};

export default Article;