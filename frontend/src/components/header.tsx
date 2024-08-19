import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";

const Header: React.FC = () => {
  const [showMotto, setShowMotto] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleDonateClick = () => {
    router.push("/about#help-us");
  };

  useEffect(() => {
    const updateHeaderStyle = () => {
      setShowMotto(window.innerWidth >= 768);
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

    updateHeaderStyle();
    updateMargin();

    window.addEventListener("resize", updateHeaderStyle);
    window.addEventListener("resize", updateMargin);

    return () => {
      window.removeEventListener("resize", updateHeaderStyle);
      window.removeEventListener("resize", updateMargin);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="header w-full bg-white shadow-md rounded z-50 fixed top-0 left-0"
    >
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center justify-between w-full md:w-auto">
          <Link href="/">
            <div className="flex items-center">
              <Image src="/favicon.ico" alt="Logo" width={40} height={40} />
              <h1 className="title text-xl font-bold ml-2">Flare</h1>
            </div>
          </Link>
          <nav className="flex items-center md:hidden">
            <Link href="/about">About</Link>
            <button
              onClick={handleDonateClick}
              className="ml-4 bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors duration-200"
            >
              Donate
            </button>
          </nav>
        </div>
        {showMotto && (
          <>
            <h2 className="text-xl font-bold mb-2 motto">
              Search for a Better Climate
            </h2>
            <nav className="md:flex items-center mt-4 md:mt-0">
              <Link
                href="/about"
                className="text-gray-700 px-4 hover:text-gray-900 transition-colors duration-200"
              >
                About
              </Link>
              <button
                onClick={handleDonateClick}
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors duration-200"
              >
                Donate
              </button>
            </nav>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
