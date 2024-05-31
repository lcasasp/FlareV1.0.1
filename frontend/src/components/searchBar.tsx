import React, { useState } from 'react';

interface SearchBarProps {
  onResults: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onResults }) => {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    onResults(query);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex justify-center my-8">
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
  );
};

export default SearchBar;