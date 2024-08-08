import React, { useState, useRef, useEffect } from "react";

interface SearchBarProps {
  onResults: (query: string, filters: any) => void;
  onFilterChange: (filters: any) => void;
  onSortChange: (sortBy: string) => void;
  availableLocations: string[];
  availableConcepts: string[];
}

const SearchBar: React.FC<SearchBarProps> = ({
  onResults,
  onFilterChange,
  onSortChange,
  availableLocations,
  availableConcepts,
}) => {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [concept, setConcept] = useState("");
  const [sortBy, setSortBy] = useState("None");
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const [showConceptOptions, setShowConceptOptions] = useState(false);

  const locationRef = useRef<HTMLDivElement>(null);
  const conceptRef = useRef<HTMLDivElement>(null);

  const handleSearch = () => {
    const filters = {
      location,
      concept,
      sortBy,
    };
    onResults(query, filters);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
    onSortChange(e.target.value);
  };

  const handleFilterChange = (newLocation: string, newConcept: string) => {
    const filters = {
      location: newLocation || location,
      concept: newConcept || concept,
      sortBy,
    };
    onFilterChange(filters);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const filterOptions = (options: string[], input: string) => {
    return options.filter((option) =>
      option.toLowerCase().includes(input.toLowerCase())
    );
  };
  const handleClickOutside = (event: MouseEvent) => {
    if (
      locationRef.current &&
      !locationRef.current.contains(event.target as Node) &&
      conceptRef.current &&
      !conceptRef.current.contains(event.target as Node)
    ) {
      setShowLocationOptions(false);
      setShowConceptOptions(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col items-center my-8" style={{ fontFamily: "Copperplate, fantasy" }}>
      <div className="flex justify-center w-full mb-4">
        <input
          type="text"
          placeholder="Search for articles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="p-2 w-2/3 border rounded-l-full focus:outline-none"
        />
        <button
          onClick={handleSearch}
          className="p-2 bg-blue-500 text-white rounded-r-full hover:bg-blue-700"
        >
          Search
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-4 w-full mb-4">
        <div className="relative w-full md:w-1/3" ref={locationRef}>
          <label htmlFor="location" className="block">
            Search by Location:
          </label>
          <input
            type="text"
            placeholder="Any"
            id="location"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setShowLocationOptions(true);
            }}
            className="p-2 w-full border rounded"
          />
          {showLocationOptions && location && (
            <ul className="absolute z-10 w-full bg-white border rounded mt-1 max-h-48 overflow-y-auto">
              {filterOptions(availableLocations, location).map((loc, index) => (
                <li
                  key={index}
                  onClick={() => {
                    handleFilterChange(loc, "");
                    setLocation(loc);
                    setShowLocationOptions(false);
                  }}
                  className="p-2 cursor-pointer hover:bg-gray-200"
                >
                  {loc}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="relative w-full md:w-1/3" ref={conceptRef}>
          <label htmlFor="concept" className="block">
            Search by Concept:
          </label>
          <input
            type="text"
            placeholder="Any"
            id="concept"
            value={concept}
            onChange={(e) => {
              setConcept(e.target.value);
              setShowConceptOptions(true);
            }}
            className="p-2 w-full border rounded"
          />
          {showConceptOptions && concept && (
            <ul className="absolute z-10 w-full bg-white border rounded mt-1 max-h-48 overflow-y-auto">
              {filterOptions(availableConcepts, concept).map((con, index) => (
                <li
                  key={index}
                  onClick={() => {
                    handleFilterChange("", con);
                    setConcept(con);
                    setShowConceptOptions(false);
                  }}
                  className="p-2 cursor-pointer hover:bg-gray-200"
                >
                  {con}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label htmlFor="sortBy" className="block">
            Sort by:
          </label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={handleSortChange}
            className="p-2 border rounded"
          >
            <option value="relevance">Most Relevant</option>
            <option value="date">Date (Newest)</option>
            <option value="date-desc">Date (Oldest)</option>
            <option value="sentiment">Sentiment (Most Positive)</option>
            <option value="sentiment-desc">Sentiment (Most Negative)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
