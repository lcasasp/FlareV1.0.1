import React, { useRef } from "react";
import useMousePosition from "../hooks/useMousePosition";

interface ArticleProps {
  article: {
    title: string;
    summary: string;
    sentiment: number;
    image: string;
    eventDate: string;
    socialScore: number;
    wgt: number;
    categories: {
      label: string;
      wgt: number;
    }[];
    concepts: {
      label: {
        eng: string;
      };
      type: string;
    }[];
    mainLocation: {
      label: string;
      latitude: number;
      longitude: number;
    };
    locations: {
      label: string;
      latitude: number;
      longitude: number;
    }[];
    infoArticle: {
      eng: {
        url: string;
      };
    };
    totalArticleCount: number;
  };
}

const getSentimentColor = (sentiment: number) => {
  const normalized = (sentiment + 1) / 2;
  const red = Math.floor((1 - normalized) * 255);
  const green = Math.floor(normalized * 255);
  return `rgb(${red}, ${green}, 0)`;
};

const getSentimentLabel = (sentiment: number) => {
  if (sentiment <= -0.5) {
    return "Very Negative";
  } else if (sentiment <= -0.25) {
    return "Negative";
  } else if (sentiment <= -0.15) {
    return "Slightly Negative";
  } else if (sentiment < 0.15) {
    return "Neutral";
  } else if (sentiment < 0.25) {
    return "Slightly Positive";
  } else if (sentiment < 0.5) {
    return "Positive";
  } else {
    return "Very Positive";
  }
};

const Article: React.FC<ArticleProps> = ({ article }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { x, y, rotateX, rotateY } = useMousePosition(cardRef);
  const sentimentLabel = getSentimentLabel(article.sentiment);
  const sentimentColor = getSentimentColor(article.sentiment);

  return (
    <div
      ref={cardRef}
      className="article-card bg-white shadow-md rounded-lg overflow-hidden my-4 p-4 clearfix"
      style={
        {
          "--drop-x": `${x}px`,
          "--drop-y": `${y}px`,
          "--rot-x": `${rotateX}deg`,
          "--rot-y": `${rotateY}deg`,
        } as React.CSSProperties
      }
    >
      <h3 className="article-title text-xl font-semibold mb-2 w-full">
        {article.title}
      </h3>
      <p className="text-gray-600 text-sm mb-2">{article.eventDate}</p>
      <h3 className="text-sm mb-2">
        <span style={{ fontWeight: "bold", color: "#064273" }}>
          Sentiment:
        </span>{" "}
        <span style={{ fontWeight: "bold", color: sentimentColor }}>
          {sentimentLabel} ({article.sentiment.toFixed(2)})
        </span>
      </h3>
      {article.image && (
        <img
          src={article.image}
          alt="Article"
          className="article-image float-left mr-4 mb-4"
        />
      )}
      <p className="text-gray-600">{article.summary + "..."}</p>
      <a
        href={article.infoArticle.eng.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500"
      >
        Read more
      </a>
    </div>
  );
};

export default Article;
