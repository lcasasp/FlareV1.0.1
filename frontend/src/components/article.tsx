import React from 'react';

interface ArticleProps {
  article: {
    title: string;
    body: string;
    url: string;
    image: string;
  };
}

const temp = "/flare.png";
const Article: React.FC<ArticleProps> = ({ article }) => (
  <div className="article-card bg-white shadow-md rounded-lg overflow-hidden my-4 p-4 clearfix">
    <h3 className="text-xl font-semibold mb-2 w-full">{article.title}</h3>
    {article.image && <img src={article.image} alt="Article" className="article-image float-left mr-4 mb-4" />}
      <p className="text-gray-600">{article.body}</p>
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">Read more</a>
  </div>
);

export default Article;