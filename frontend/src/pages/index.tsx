import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/header";
import Article from "../components/article";
import ThreeGlobe from "../components/Globe/globe";
import SearchBar from "../components/searchBar";
import Pagination from "../components/pagination";
import Headlines from "@/components/headlines";

interface Article {
  title: string;
  summary: string;
  sentiment: number;
  image: string;
  eventDate: string;
  socialScore: number;
  wgt: number;
  categories: {
    label: string;
    wgt: number;
  }[];
  concepts: {
    label: {
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
    };
  };
  compositeScore: number;
  totalArticleCount: number;
}

const ITEMS_PER_PAGE = 10;

const Home: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [topArticles, setTopArticles] = useState<Article[]>([]);
  const [filters, setFilters] = useState<{
    location: string;
    concept: string;
    category: string;
  }>({ location: "Any", concept: "Any", category: "All" });

  const fetchArticles = async () => {
    const response = await axios.get("http://127.0.0.1:5000/articles");
    const formattedData = response.data.map((article: any) => {
      const title = article.title.eng;
      const summary = article.summary.eng;
      const image = article.images[0];

      const mainLocation =
        article.location && article.location.lat && article.location.long
          ? {
              label: article.location.label.eng,
              latitude: article.location.lat,
              longitude: article.location.long,
            }
          : undefined;

      const locations = article.concepts
        .filter((c: any) => c.type === "loc" && c.score > 60)
        .map((loc: any) => {
          const latitude =
            loc.location && loc.location.lat ? loc.location.lat : 0;
          const longitude =
            loc.location && loc.location.long ? loc.location.long : 0;
          return {
            label: loc.label.eng,
            latitude,
            longitude,
          };
        });

      const compositeScore =
        0.3 * article.totalArticleCount +
        0.3 * article.socialScore +
        0.4 * article.wgt;

      return {
        ...article,
        title,
        image,
        summary,
        mainLocation,
        locations,
        compositeScore,
      };
    });

    setArticles(formattedData);
    setFilteredArticles(formattedData);
    setTotalPages(Math.ceil(formattedData.length / ITEMS_PER_PAGE));
    computeTopArticles(formattedData, "All");
  };

  const computeTopArticles = (articles: Article[], category: string) => {
    let filteredArticles = articles;
  
    if (category !== "All" && category !== "Breaking") {
      filteredArticles = articles.filter((article) =>
        article.categories.some((cat) => cat.label.includes(category))
      );
    }
  
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
    const topStories = filteredArticles
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 25); // Top 25 stories
  
    setTopArticles(topStories);
  };

  useEffect(() => {
    computeTopArticles(articles, filters.category);
  }, [filters.category, articles]);

  const handleFilterChange = (newFilters: any) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    let filtered = articles;

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

    if (updatedFilters.concept && updatedFilters.concept !== "Any") {
      filtered = filtered.filter((article) =>
        article.concepts.some(
          (concept) => concept.label.eng === updatedFilters.concept
        )
      );
    }

    if (updatedFilters.category && updatedFilters.category !== "All") {
      if (updatedFilters.category === "Breaking") {
        filtered = topArticles;
      } else {
        filtered = filtered.filter((article) =>
          article.categories.some((cat) =>
            cat.label.includes(updatedFilters.category)
          )
        );
        filtered.sort((a, b) => b.wgt - a.wgt);
      }
    }

    setFilteredArticles(filtered);
    setCurrentPage(1);
    setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
  };

  const handleSearchResults = async (query: string) => {
    if (query === "") {
      fetchArticles();
      return;
    }
    const response = await axios.get(
      `http://127.0.0.1:5000/search?query=${query}`
    );
    const formattedData = response.data.map((article: any) => {
      const score = article._score
      const title = article._source.title.eng;
      const summary = article._source.summary.eng;
      const image = article._source.images[0];

      const mainLocation =
        article._source.location &&
        article._source.location.lat &&
        article._source.location.long
          ? {
              label: article._source.location.label.eng,
              latitude: article._source.location.lat,
              longitude: article._source.location.long,
            }
          : undefined;

      //Only care about locations with score over 60
      const locations = article._source.concepts
        .filter((c: any) => c.type === "loc" && c.score > 60)
        .map((loc: any) => {
          const latitude =
            loc.location && loc.location.lat ? loc.location.lat : 0;
          const longitude =
            loc.location && loc.location.long ? loc.location.long : 0;
          return {
            label: loc.label.eng,
            latitude,
            longitude,
          };
        });

      const compositeScore =
        0.2 * article._source.totalArticleCount +
        0.2 * article._source.socialScore +
        0.2 * article._source.wgt;
        0.4 * score;

      return {
        ...article._source,
        title,
        image,
        summary,
        mainLocation,
        locations,
        compositeScore,
      };
    });
    setArticles(formattedData);
    setFilteredArticles(formattedData);
    setCurrentPage(1);
    setTotalPages(Math.ceil(formattedData.length / ITEMS_PER_PAGE));
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
    if (filters.category === category) {
      handleFilterChange({ category: "All" });
    } else {
      handleFilterChange({ category });
    }
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

  const availableConcepts = Array.from(
    new Set([
      "Any",
      ...articles.flatMap((article) =>
        article.concepts.map((concept) => concept.label.eng)
      ),
    ])
  );
  const availableLocations = Array.from(
    new Set([
      "Any",
      ...articles.flatMap((article) =>
        article.locations.map((location) => location.label)
      ),
      ...articles.flatMap((article) =>
        article.mainLocation ? [article.mainLocation.label] : []
      ),
    ])
  );

  return (
    <div className="container mx-auto p-4">
      <Header onCategorySelect={handleCategorySelect} showCategories={true} />
      <Headlines articles={topArticles} />
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
  );
};

export default Home;
