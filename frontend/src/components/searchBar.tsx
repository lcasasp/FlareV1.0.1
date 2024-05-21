import React, { useState } from 'react';
import axios from 'axios';

interface SearchBarProps {
  onResults: (articles: Array<{ title: string; body: string; url: string }>) => void;
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
    <div className="flex mx-auto py-6 py-4 ">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search for articles..."
        className="border p-2 flex-grow rounded"
        style={{ color: 'black' }}
      />
      <button onClick={handleSearch} className="bg-blue-500 text-white p-2 ml-2 rounded">
        Search
      </button>
    </div>
  );
};

export default SearchBar;