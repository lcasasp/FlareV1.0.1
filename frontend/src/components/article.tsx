import React, { useRef } from 'react';
import useMousePosition from '../hooks/useMousePosition';

interface ArticleProps {
  article: {
    title: string;
    summary: string;
    sentiment: number;
    url: string;
    image: string;
    eventDate: string;
    concepts: {
      label: 
      {
        eng: string;
      };
      type: string;
    }[];
    mainLocation: {
      label: string;
      latitude: number;
      longitude: number;
    };
    locations: {
      label: string;
      latitude: number;
      longitude: number;
    }[];
    infoArticle: {
      eng: {
        url: string;
      }
    };
  };
}

const Article: React.FC<ArticleProps> = ({ article }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { x, y, rotateX, rotateY } = useMousePosition(cardRef);

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
      <p className="text-gray-600 text-sm mb-2">{article.eventDate}</p>
      <h3 className="text-sm font-semibold mb-2" style={{ color: '#064273' }}>Sentiment: {article.sentiment.toFixed(2)}</h3>
      {article.image && <img src={article.image} alt="Article" className="article-image float-left mr-4 mb-4" />}
        <p className="text-gray-600">{article.summary+'...'}</p>
        <a href={article.infoArticle.eng.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">Read more</a>
    </div>
  );
};

export default Article;