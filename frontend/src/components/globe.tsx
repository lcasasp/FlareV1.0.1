import React from 'react';

const InteractiveGlobe: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="bg-gradient-to-r from-blue-500 to-green-500 shadow-lg rounded-lg p-6">
        <h2 className="text-3xl font-bold text-white mb-4 text-center">Explore Climate News by Country</h2>
        <div className="flex justify-center items-center">
          {/* Placeholder for the globe */}
          <div className="w-96 h-96 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-gray-400">Globe Placeholder</span>
          </div>
        </div>
        <p className="text-white text-center mt-4">Click on a country to see the latest climate news.</p>
      </div>
    </div>
  );
};

export default InteractiveGlobe;