import { useEffect, useState } from 'react';
import axios from 'axios';
import Header from '../components/header';
import Article from '../components/article';
import SearchBar from '../components/searchBar';

interface Article {
  title: string;
  body: string;
  url: string;
}

const Home: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);

  const fetchArticles = async () => {
    const response = await axios.get('http://127.0.0.1:5000/articles');
    setArticles(response.data);
  };

  const handleSearchResults = (results: Article[]) => {
    setArticles(results);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <Header />
      <SearchBar onResults={handleSearchResults} />
      {articles.map((article, index) => (
        <Article key={index} article={article} />
      ))}
    </div>
  );
};

export default Home;