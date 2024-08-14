import React from 'react';

const Spinner = () => {
  return <div> 
    <div className="spinner"></div>
    <style jsx>{`
        @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
        }

        .spinner {
        width: 100px;
        height: 100px;
        animation: spin 2s linear infinite;
        margin: 100px auto;
        display: block;
        background-image: url('/flare-icon.svg');
        background-size: contain;
        background-repeat: no-repeat;
        }
    `}</style>
    </div>;
};

export default Spinner;