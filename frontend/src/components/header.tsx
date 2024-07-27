import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md rounded">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/flare.png" alt="Flare Logo" className="h-10" />
          <h1 className="text-xl font-bold ml-2">Flare</h1>
        </div>
        <nav className="flex items-center">
          <a href="/" className="text-gray-700 px-4">About</a>
          <button className="bg-black text-white px-4 py-2 rounded">Donate</button>
        </nav>
      </div>
    </header>
  );
};

export default Header;