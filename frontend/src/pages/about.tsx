import React, { useRef } from "react";
import Header from "../components/header";
import useMousePosition from "@/hooks/useMousePosition";
import Footer from "@/components/footer";
import Contact from "@/components/contact";

const AboutPage: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { x, y, rotateX, rotateY } = useMousePosition(cardRef);

  return (
    <div className="mb-0">
      <div className="about-container mx-auto p-4">
        <Header />
        <div className="about-header">
          <h1>About Flare</h1>
        </div>
        <div
          ref={cardRef}
          className="about-card overflow-hidden my-4 p-4 clearfix"
          id="about-flare"
          style={
            {
              "--drop-x": `${x}px`,
              "--drop-y": `${y}px`,
              "--rot-x": `${rotateX}deg`,
              "--rot-y": `${rotateY}deg`,
            } as React.CSSProperties
          }
        >
          <p>
            Flare is an innovative, open-source platform designed to transform
            how you explore and understand global climate change. At its core,
            Flare combines advanced data visualization with powerful search
            capabilities, offering a unique way to stay informed about the most
            pressing environmental issues of our time.
          </p>
          <p>
            Our interactive 3D globe serves as the centerpiece of the Flare
            experience, allowing you to visually navigate and discover
            climate-related events happening across the planet.
          </p>
          <p style={{ color: "#1E427B", fontWeight: "bold" }}>
            Each marker on the globe represents a piece of critical news,
            colored by sentiment, with green indicating positive news and red
            indicating negative news. A markers size indicates the news&apos;
            relevance and virality.
          </p>
          <p>
            But Flare is more than just a map. Our platform leverages
            cutting-edge semantic analysis and advanced sorting algorithms that
            leverage Elasticsearch and Lucene to ensure you always receive the
            most relevant and impactful stories. By analyzing the context and
            content of each article, Flare prioritizes news that matters most to
            you, whether you&rsquo;re looking for the latest scientific
            breakthroughs, business impacts, or societal changes driven by
            climate events.
          </p>
          <p style={{ color: "#1E427B", fontWeight: "bold" }}>
            Sentiment is a measure of how positive or negative the news is. It
            is a range from -1 to 1, with -1 being the most negative.
          </p>
          <p>
            Flare&rsquo;s powerful search engine goes beyond simple keyword
            matching. It understands the nuances of language, allowing for more
            precise and meaningful search results. Our sorting algorithms take
            into account the relevance, concepts, timeliness, locations, and
            sentiment of each article, ensuring that you&rsquo;re always
            presented with the most significant and up-to-date information.
          </p>
          <p>
            Whether you&rsquo;re a climate activist, a researcher, or someone
            passionate about the environment, Flare is your go-to resource for
            staying informed and engaged. Dive into the world of climate data
            with Flare, and discover how the power of information can drive
            meaningful change.
          </p>
        </div>

        <Contact />
      </div>
      <Footer />
    </div>
  );
};

export default AboutPage;
