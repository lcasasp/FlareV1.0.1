import React, { useState } from 'react';
import axios from 'axios';

interface SearchBarProps {
  onResults: (articles: Array<{ title: string; body: string; url: string; image: string }>) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onResults }) => {
  const [query, setQuery] = useState('');

  const handleSearch = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/search', {
        params: { query },
      });
      const articles = response.data.map((hit: any) => hit._source);
      onResults(articles);
    } catch (error) {
      console.error('Error searching articles:', error);
    }
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
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search for articles..."
        className="p-2 w-4/5 border rounded-l-full focus:outline-none"
        style={{ color: 'black' }}
      />
      <button onClick={handleSearch} className="p-2 bg-blue-500 text-white rounded-r-full hover:bg-blue-700">
        Search
      </button>
    </div>
  );
};

export default SearchBar;