import { useEffect, useState } from 'react';
import axios from 'axios';
import Header from '../components/header';
import Article from '../components/article';
import ThreeGlobe from '../components/Globe/globe';
import SearchBar from '../components/searchBar';
import Pagination from '../components/pagination'; // Import the Pagination component
import dynamic from 'next/dynamic';

// Dynamically import the ThreeScene component
const ThreeScene = dynamic(() => import('../components/three'), { ssr: false });

interface Article {
  title: string;
  body: string;
  url: string;
  image: string;
}

const ITEMS_PER_PAGE = 10;

const Home: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchArticles = async () => {
    const response = await axios.get('http://127.0.0.1:5000/articles');
    setArticles(response.data);
    setTotalPages(Math.ceil(response.data.length / ITEMS_PER_PAGE));
  };

  const handleSearchResults = async (query: string) => {
    const response = await axios.get(`http://127.0.0.1:5000/search?query=${query}`);
    const searchResults = response.data.map((result: any) => result._source);
    setArticles(searchResults);
    setCurrentPage(1); // Reset to the first page on new search results
    setTotalPages(Math.ceil(searchResults.length / ITEMS_PER_PAGE));
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentArticles = articles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto p-4">
      <Header />
      <ThreeGlobe />
      <SearchBar onResults={handleSearchResults} />
      {currentArticles.map((article, index) => (
        <Article key={index} article={article} />
      ))}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default Home;