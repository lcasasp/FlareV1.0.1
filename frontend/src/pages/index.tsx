import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Header from "@/components/header";
import Article from "@/components/article";
import ThreeGlobe from "@/components/Globe/globe";
import SearchBar from "@/components/searchBar";
import Pagination from "@/components/pagination";
import Headlines from "@/components/headlines";
import Footer from "@/components/footer";
import Spinner from "@/components/spinner";
import { API_CONFIG } from "@/constants/config";
import type { FlareArticle } from "@/types/flare";
import { formatArticleFromSource, fetchArticlesChunk } from "@/lib/api";

const ITEMS_PER_PAGE = 10;
const INITIAL_LIMIT = 100;
const BATCH_LIMIT = 200;
const MAX_INITIAL = 1000;

const Home: React.FC = () => {
  const [articles, setArticles] = useState<FlareArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<FlareArticle[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [topArticles, setTopArticles] = useState<FlareArticle[]>([]);
  const [filters, setFilters] = useState<{
    location: string;
    concept: string;
    category: string;
    query: string;
  }>({ location: "Any", concept: "Any", category: "All", query: "" });
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSpinner, setShowSpinner] = useState(true);
  const [showContent, setShowContent] = useState(false);

  const { category } = filters;

  const computeTopArticles = (articles: FlareArticle[], category: string) => {
    let filteredArticles = articles;

    if (category !== "All" && category !== "Breaking") {
      filteredArticles = articles.filter((article) =>
        article.categories.some((cat) => cat.label.includes(category))
      );
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const topStories = filteredArticles
      .filter((article) => new Date(article.eventDate) > sevenDaysAgo)
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 25); // Top 25 stories

    setTopArticles(topStories);
  };

  useEffect(() => {
    computeTopArticles(articles, category);
  }, [category, articles]);

  const handleSearchResults = async (query: string, activeFilters: any) => {
    const updatedFilters = { ...activeFilters, query };
    setFilters(updatedFilters);

    if (query == "") {
      handleFilterChange(updatedFilters, articles);
      return;
    }

    const response = await axios.get(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SEARCH}?query=${query}`
    );
    const formattedData = response.data.map(formatArticleFromSource);
    handleFilterChange(updatedFilters, formattedData);
  };

  const handleFilterChange = (
    newFilters: any,
    data: FlareArticle[] = articles
  ) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    let filtered = data;

    // Apply category filter
    if (updatedFilters.category && updatedFilters.category === "Breaking") {
      filtered = topArticles;
    } else if (updatedFilters.category && updatedFilters.category !== "All") {
      filtered = filtered.filter((article) =>
        article.categories.some((cat) =>
          cat.label.includes(updatedFilters.category)
        )
      );
    }

    // Apply location filter
    if (updatedFilters.location && updatedFilters.location !== "Any") {
      filtered = filtered.filter(
        (article) =>
          (article.mainLocation &&
            article.mainLocation.label === updatedFilters.location) ||
          article.locations.some(
            (location) => location.label === updatedFilters.location
          )
      );
    }

    // Apply concept filter
    if (updatedFilters.concept && updatedFilters.concept !== "Any") {
      filtered = filtered.filter((article) =>
        article.concepts.some(
          (concept) => concept.label.eng === updatedFilters.concept
        )
      );
    }

    // Update filtered articles and reset pagination
    setFilteredArticles(filtered);
    setCurrentPage(1);
    setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
  };

  const handleSortChange = (sortCriteria: string) => {
    let sortedArticles = [...filteredArticles];

    switch (sortCriteria) {
      case "relevance":
        sortedArticles = articles;
        break;
      case "date":
        sortedArticles.sort(
          (a, b) =>
            new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
        );
        break;
      case "sentiment":
        sortedArticles.sort((a, b) => b.sentiment - a.sentiment);
        break;
      case "date-desc":
        sortedArticles.sort(
          (a, b) =>
            new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
        );
        break;
      case "sentiment-desc":
        sortedArticles.sort((a, b) => a.sentiment - b.sentiment);
        break;
      default:
        break;
    }

    setFilteredArticles(sortedArticles);
  };

  const handleCategorySelect = (category: string) => {
    const updatedFilters = { ...filters, category };
    handleFilterChange(updatedFilters);
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentArticles = filteredArticles.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const availableConcepts = Array.from(
    new Set([
      "Any",
      ...filteredArticles.flatMap((article) =>
        article.concepts.map((concept) => concept.label.eng)
      ),
    ])
  );
  const availableLocations = Array.from(
    new Set([
      "Any",
      ...filteredArticles.flatMap((article) =>
        article.locations.map((location) => location.label)
      ),
      ...filteredArticles.flatMap((article) =>
        article.mainLocation ? [article.mainLocation.label] : []
      ),
    ])
  );

  const fetchArticles = useCallback(async () => {
    // 1) Initial fast chunk
    const first = await fetchArticlesChunk({ limit: INITIAL_LIMIT });
    let accumulated = [...first.items].sort(
      (a, b) => b.compositeScore - a.compositeScore
    );

    setArticles(accumulated);
    setFilteredArticles(accumulated);
    setTotalPages(Math.ceil(accumulated.length / ITEMS_PER_PAGE));
    computeTopArticles(accumulated, filters.category);
    setIsLoaded(true);
    setShowSpinner(false);
    setTimeout(() => setShowContent(true), 300);

    // 2) Background stream up to MAX_INITIAL
    let cursor = first.next;
    let total = accumulated.length;

    while (cursor && total < MAX_INITIAL) {
      const { items, next } = await fetchArticlesChunk({
        limit: Math.min(BATCH_LIMIT, MAX_INITIAL - total),
        after: cursor,
      });

      accumulated = [...accumulated, ...items].sort(
        (a, b) => b.compositeScore - a.compositeScore
      );

      setArticles(accumulated);
      // Re-apply current filters on the growing dataset
      handleFilterChange(filters, accumulated);
      computeTopArticles(accumulated, filters.category);

      total += items.length;
      cursor = next;
    }
  }, [filters, computeTopArticles, handleFilterChange]);

  useEffect(() => {
    fetchArticles();
  }, []);

  return (
    <div>
      <div className="mx-auto p-4 items-center">
        <Header />
        {showSpinner && (
          <div className={`spinner ${isLoaded ? "hidden" : "visible"}`}>
            <Spinner />
          </div>
        )}
        <div className={`fade-in ${isLoaded ? "show" : ""}`}>
          <Headlines
            articles={topArticles}
            onCategorySelect={handleCategorySelect}
          />
          <div className="globe-and-content">
            <ThreeGlobe articles={filteredArticles} />
            <div className="content-below">
              <SearchBar
                onResults={handleSearchResults}
                onFilterChange={handleFilterChange}
                onSortChange={handleSortChange}
                availableConcepts={availableConcepts}
                availableLocations={availableLocations}
              />
              {currentArticles.map((article, index) => (
                <Article key={index} article={article} />
              ))}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Home;
