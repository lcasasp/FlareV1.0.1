import React, { useRef } from "react";
import { Icons } from "../utils/icons";
import useMousePosition from "@/hooks/useMousePosition";
import Image from "next/image";

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

const Contact: React.FC = () => {
  return (
    <div className="contact-help-section">
      <div className="contact-us-section">
        <h2 className="text-2xl font-semibold mb-6 text-center">Contact</h2>
        <div className="flex flex-col items-center">
          <Image
            src="/headshot.jpeg"
            alt="Lucas Casas"
            className="w-32 h-32 rounded-full mb-4"
            width={200}
            height={200}
          />
          <div className="about-card text-lg text-center">
            <p>Hi, I&apos;m Lucas Carlos Casas, the creator of Flare.</p>
            <p>
              {" "}
              I&apos;m a Junior at Cornell University, passionate about technology
              and climate. <br />
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
              onClick={() => window.open("https://www.linkedin.com/in/lcasasp")}
            />
            <Icon
              path={Icons.Projects}
              onClick={() => window.open("https://lcasasp.github.io")}
            />
          </div>
        </div>
      </div>

      <div className="vertical-line"></div>

      <div className="help-us-section" id="help-us">
        <h2 className="text-2xl font-semibold mb-6 text-center">Help Us</h2>
        <div className="help-content">
          <p className="mb-4">
            Flare is an open-source project, and we welcome contributors from
            all over the world. If you are passionate about climate change and
            technology, consider contributing to our GitHub repository.
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
            Your support helps us continue to develop and improve Flare. As a
            college student, maintaining the news API costs can be difficult.
            Consider donating to help keep Flare running.
          </p>
          <p>
            Current monetary needs: improving our data collection API&apos;s and
            cloud infrastructure. Better data, a better Flare.
          </p>
          <button
            onClick={() => window.open("https://github.com/sponsors/lcasasp")}
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
  );
};

export default Contact;
