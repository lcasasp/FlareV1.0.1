import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const getPageList = () => {
    let pages: (string | number)[] = [];

    if (totalPages <= 1) return pages;

    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    if (totalPages !== 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const renderPageNumbers = () => {
    const pages = getPageList();

    return pages.map((page, index) => {
      if (page === '...') {
        return <span key={index} className="px-3 py-1">...</span>;
      } else {
        return (
          <button
            key={index}
            className={`px-3 py-1 rounded-md ${currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => onPageChange(Number(page))}
            disabled={currentPage === page}
          >
            {page}
          </button>
        );
      }
    });
  };

  return (
    <div className="flex justify-center my-4 space-x-2" style={{ fontFamily: 'Copperplate, fantasy' }}>
      <button
        className={`px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'}`}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
      {renderPageNumbers()}
      <button
        className={`px-3 py-1 rounded-md ${currentPage === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'}`}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
