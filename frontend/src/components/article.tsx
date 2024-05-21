import React from 'react';

interface ArticleProps {
  article: {
    title: string;
    body: string;
    url: string;
  };
}

const Article: React.FC<ArticleProps> = ({ article }) => (
  <div className="border p-4 mb-4">
    <h2 className="text-xl font-bold">{article.title}</h2>
    <p>{article.body}</p>
    <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">Read more</a>
  </div>
);

export default Article;