import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/header";
import Article from "../components/article";
import ThreeGlobe from "../components/Globe/globe";
import SearchBar from "../components/searchBar";
import Pagination from "../components/pagination";

interface Article {
  title: string;
  body: string;
  sentiment: number;
  url: string;
  image: string;
  date: string;
  concepts: {
    label: string;
    score: number;
  }[];
  locations: {
    label: string;
    latitude: number;
    longitude: number;
  }[];
}

const ITEMS_PER_PAGE = 10;

const Home: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<string>('None');

  const fetchArticles = async () => {
    const response = await axios.get("http://127.0.0.1:5000/articles");
    setArticles(response.data);
    setFilteredArticles(response.data);
    setTotalPages(Math.ceil(response.data.length / ITEMS_PER_PAGE));
  };

  const handleSearchResults = async (query: string) => {
    const response = await axios.get(
      `http://127.0.0.1:5000/search?query=${query}`
    );
    const searchResults = response.data.map((result: any) => result._source);
    setArticles(searchResults);
    setFilteredArticles(searchResults);
    setCurrentPage(1); // Reset to the first page on new search results
    setTotalPages(Math.ceil(searchResults.length / ITEMS_PER_PAGE));
  };
  
  const handleFilterChange = (filters: any) => {
    let filtered = articles;

    if (filters.location && filters.location !== "Any") {
      filtered = filtered.filter(article => 
        article.locations.some(location => location.label === filters.location)
      );
    }

    if (filters.concept && filters.concept !== "Any") {
      filtered = filtered.filter(article => 
        article.concepts.some(concept => concept.label === filters.concept)
      );
    }

    if (filters.location === "Any" && filters.concept === "Any") {
      filtered = articles;
    } else if (filters.location === "Any" && filters.concept !== "Any") {
      filtered = filtered.filter(article =>
        article.concepts.some(concept => concept.label === filters.concept)
      );
    } else if (filters.location !== "Any" && filters.concept === "Any") {
      filtered = filtered.filter(article =>
        article.locations.some(location => location.label === filters.location)
      );
    }

    setFilteredArticles(filtered);
    setCurrentPage(1); // Reset to the first page on filter change
    setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
  };

  const handleSortChange = (sortCriteria: string) => {
    if (sortCriteria === 'None') {
      return;
    }
    setSortBy(sortCriteria);
    let sortedArticles = [...filteredArticles];

    switch (sortCriteria) {
      case 'date':
        sortedArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'sentiment':
        sortedArticles.sort((a, b) => b.sentiment - a.sentiment);
        break;
      case 'date-desc':
        sortedArticles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'sentiment-desc':
        sortedArticles.sort((a, b) => a.sentiment - b.sentiment);
        break;
      default:
        break;
    }

    setFilteredArticles(sortedArticles);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentArticles = filteredArticles.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const availableConcepts = Array.from(new Set(articles.flatMap((article) => article.concepts.map((concept) => concept.label))));
  const availableLocations = Array.from(new Set(articles.flatMap((article) => article.locations.map((location) => location.label))));

  return (
    <div className="container mx-auto p-4">
      <Header />
      <ThreeGlobe articles={filteredArticles} />
      <SearchBar onResults={handleSearchResults} onFilterChange={handleFilterChange} onSortChange={handleSortChange} availableConcepts={availableConcepts} availableLocations={availableLocations} />
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
