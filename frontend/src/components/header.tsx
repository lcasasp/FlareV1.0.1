import React, { useState } from 'react';

interface HeaderProps {
  onCategorySelect: (category: string) => void;
}

const categories = ["All", "Breaking", "Business", "Technology", "Science", "Society"];

const Header: React.FC<HeaderProps> = ({ onCategorySelect }) => {
  const [activeCategory, setActiveCategory] = useState('All');

  const handleCategoryClick = (category: string) => {
    const newCategory = category === activeCategory ? 'All' : category;
    setActiveCategory(newCategory);
    onCategorySelect(newCategory);
  };

  return (
    <header className="header fixed top-0 left-0 w-full bg-white shadow-md rounded z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/flare.png" alt="Flare Logo" className="h-10" />
          <h1 className="title text-xl font-bold ml-2">Flare</h1>
        </div>
        <div className="categories flex justify-center items-center">
          {categories.slice(1).map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`px-4 py-2 mx-2 rounded transition-colors duration-200 ${
                activeCategory === category ? 'categories-active text-white' : 'text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <nav className="flex items-center">
          <a href="/" className="text-gray-700 px-4 hover:text-gray-900 transition-colors duration-200">About</a>
          <button className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors duration-200">Donate</button>
        </nav>
      </div>
    </header>
  );
};

export default Header;