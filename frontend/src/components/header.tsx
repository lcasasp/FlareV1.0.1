import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

interface HeaderProps {
  onCategorySelect: (category: string) => void;
  showCategories?: boolean;
}

const categories = [
  "All",
  "Breaking",
  "Business",
  "Technology",
  "Science",
  "Society",
];

const Header: React.FC<HeaderProps> = ({ onCategorySelect, showCategories = true }) => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [isFixed, setIsFixed] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleDonateClick = () => {
    router.push('/about#help-us');
  };

  useEffect(() => {
    const updateHeaderStyle = () => {
      const isMobile = window.innerWidth < 754;
      setIsFixed(!isMobile);
    };

    const updateMargin = () => {
      if (headerRef.current) {
        const headerHeight = headerRef.current.offsetHeight - 76;
        document.documentElement.style.setProperty(
          "--header-height",
          `${headerHeight}px`
        );
      }
    };

    // Initial update
    updateHeaderStyle();
    updateMargin();

    // Add event listener
    window.addEventListener("resize", updateHeaderStyle);
    window.addEventListener("resize", updateMargin);

    // Cleanup event listener
    return () => {
      window.removeEventListener("resize", updateHeaderStyle);
      window.removeEventListener("resize", updateMargin);
    };
  }, []);

  const handleCategoryClick = (category: string) => {
    const newCategory = category === activeCategory ? "All" : category;
    setActiveCategory(newCategory);
    onCategorySelect(newCategory);
  };

  return (
    <header
      ref={headerRef}
      className={`header w-full bg-white shadow-md rounded z-50 ${
        isFixed ? "fixed top-0 left-0" : "relative"
      }`}
    >
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center justify-between w-full md:w-auto">
          <Link href="/">
            <div className="flex items-center">
              <img src="/flare.png" alt="Flare Logo" className="h-10" />
              <h1 className="title text-xl font-bold ml-2">Flare</h1>
            </div>
          </Link>
          <nav className="flex items-center md:hidden">
            <Link href="/about">
              About
            </Link>
            <button 
              onClick={handleDonateClick}
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors duration-200">
              Donate
            </button>
          </nav>
        </div>
        {showCategories && (
          <div className="categories flex flex-row flex-wrap justify-center items-center mt-4 md:mt-0 md:flex-grow">
            {categories.slice(1).map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`px-4 py-2 mx-2 my-1 md:my-0 rounded transition-colors duration-200 ${
                  activeCategory === category
                    ? "categories-active text-white bg-blue-500"
                    : "text-gray-700 hover:bg-gray-300"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
        {!showCategories && (
          <h2 className="text-xl font-bold mb-2 motto">Search for a better Climate</h2>
        )}
        <nav className="hidden md:flex items-center mt-4 md:mt-0">
          <Link href="/about" className="text-gray-700 px-4 hover:text-gray-900 transition-colors duration-200">
            About
          </Link>
          <button 
            onClick={handleDonateClick}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors duration-200"
          >
            Donate
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
