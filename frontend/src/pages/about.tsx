import React, { useEffect, useRef } from "react";
import Header from "../components/header";
import { Icons } from "../utils/icons";
import useMousePosition from "@/hooks/useMousePosition";
import Footer from "@/components/footer";

const Icon: React.FC<{ path: string; onClick?: () => void }> = ({
  path,
  onClick,
}) => (
  <svg
    className="w-6 h-6 inline-block mr-2 fill-current text-blue-500 cursor-pointer"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    onClick={onClick}
  >
    <path d={path} />
  </svg>
);

const AboutPage: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { x, y, rotateX, rotateY } = useMousePosition(cardRef);

  return (
    <div className="mb-0">
      <div className="about-container mx-auto p-4">
        <Header/>
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
            indicating negative news. A markers size indicates the news'
            relevance and virality.
          </p>
          <p>
            But Flare is more than just a map. Our platform leverages
            cutting-edge semantic analysis and advanced sorting algorithms that
            leverage Elasticsearch and Lucene to ensure you always receive the
            most relevant and impactful stories. By analyzing the context and
            content of each article, Flare prioritizes news that matters most to
            you, whether you’re looking for the latest scientific breakthroughs,
            business impacts, or societal changes driven by climate events.
          </p>
          <p style={{ color: "#1E427B", fontWeight: "bold" }}>
            Sentiment is a measure of how positive or negative the news is. It
            is a range from -1 to 1, with -1 being the most negative.
          </p>
          <p>
            Flare’s powerful search engine goes beyond simple keyword matching.
            It understands the nuances of language, allowing for more precise
            and meaningful search results. Our sorting algorithms take into
            account the relevance, concepts, timeliness, locations, and
            sentiment of each article, ensuring that you’re always presented
            with the most significant and up-to-date information.
          </p>
          <p>
            Whether you’re a climate activist, a researcher, or someone
            passionate about the environment, Flare is your go-to resource for
            staying informed and engaged. Dive into the world of climate data
            with Flare, and discover how the power of information can drive
            meaningful change.
          </p>
        </div>

        <div className="contact-help-section">
          <div className="contact-us-section">
            <h2 className="text-2xl font-semibold mb-6 text-center">Contact</h2>
            <div className="flex flex-col items-center">
              <img
                src="/headshot.jpeg"
                alt="Lucas Casas"
                className="w-32 h-32 rounded-full mb-4"
              />
              <div className="about-card text-lg text-center">
                <p>Hi, I'm Lucas Carlos Casas, the creator of Flare.</p>
                <p>
                  {" "}
                  I'm a Junior at Cornell University, passionate about
                  technology and climate. <br />
                  Feel free to contact me or view my portfolio below.
                </p>
              </div>
              <div className="contact-info text-lg">
                <Icon
                  path={Icons.Email}
                  onClick={() => window.open("mailto:lucascasasp@icloud.com")}
                />
                <Icon
                  path={Icons.LinkedIn}
                  onClick={() =>
                    window.open("https://www.linkedin.com/in/lcasasp")
                  }
                />
                <Icon
                  path={Icons.Projects}
                  onClick={() => window.open("https://lcasasp.github.io")}
                />
              </div>
            </div>
          </div>

          <div className="vertical-line"></div>

          <div className="help-us-section" id="help us">
            <h2 className="text-2xl font-semibold mb-6 text-center">Help Us</h2>
            <div className="help-content">
              <p className="mb-4">
                Flare is an open-source project, and we welcome contributors
                from all over the world. If you are passionate about climate
                change and technology, consider contributing to our GitHub
                repository.
              </p>
              <p className="mb-6">
                <Icon path={Icons.GitHub} />
                <a
                  href="https://github.com/lcasasp/FlareV1.0.1/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500"
                >
                  Contribute on GitHub
                </a>
              </p>
              <p className="mb-4">
                Your support helps us continue to develop and improve Flare. As
                a college student, maintaining the news API costs can be
                difficult. Consider donating to help keep Flare running.
              </p>
              <p>
                Current monetary needs: improving our data collection API's and
                cloud infrastructure. Better data, a better Flare.
              </p>
              <button
                onClick={() =>
                  window.open("https://github.com/sponsors/lcasasp")
                }
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors duration-200"
              >
                Sponsor Flare
              </button>
              <button
                onClick={() => window.open("https://buymeacoffee.com/lcasasp")}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors duration-200 ml-5"
              >
                Buy me a coffee
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AboutPage;
