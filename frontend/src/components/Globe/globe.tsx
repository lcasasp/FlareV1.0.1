import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import {
  createEarthGroup,
  createLights,
  createClouds,
  createGlow,
  createStars,
} from "./materials";
import {
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
} from "./eventHandlers";

const ThreeGlobe: React.FC<{ articles: any[] }> = ({ articles }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<THREE.Mesh[]>([]);
  const rotationSpeedRef = useRef(0.0004);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const [hoveredMarker, setHoveredMarker] = useState<THREE.Object3D | null>(
    null
  );
  const [hoveredInfo, setHoveredInfo] = useState<{
    title: string;
    image: string;
    url: string;
  } | null>(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState({ x: 0, y: 0 });

  const isDragging = useRef(false);

  useEffect(() => {
    markerRefs.current.forEach((marker) => marker.parent?.remove(marker));
    markerRefs.current = [];
    setHoveredMarker(null);
    setHoveredInfo(null);

    const w = mountRef.current?.clientWidth || window.innerWidth;
    const h = mountRef.current?.clientHeight || window.innerHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // Create Earth and related objects
    const earthGroup = createEarthGroup(articles, markerRefs, gsap);
    scene.add(earthGroup);

    // Add lights, clouds, glow, and stars
    const lightsMesh = createLights();
    earthGroup.add(lightsMesh);

    const cloudsMesh = createClouds();
    earthGroup.add(cloudsMesh);

    const glowMesh = createGlow();
    earthGroup.add(glowMesh);

    const stars = createStars();
    scene.add(stars);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(-2, 0.5, 1.5);
    scene.add(sunLight);

    earthGroup.rotation.z = (-12.4 * Math.PI) / 180;

    const animate = () => {
      requestAnimationFrame(animate);

      earthGroup.rotation.y += rotationSpeedRef.current;
      cloudsMesh.rotation.y += rotationSpeedRef.current / 3;
      stars.rotation.y -= rotationSpeedRef.current / 10;

      raycaster.current.setFromCamera(mouse.current, camera);
      const intersects = raycaster.current.intersectObjects(markerRefs.current);

      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      const visibleIntersects = intersects.filter((intersect) => {
        const markerPosition = intersect.object.position.clone().normalize();
        return cameraDirection.dot(markerPosition) < 0;
      });

      if (visibleIntersects.length > 0) {
        const intersectedMarker = visibleIntersects[0].object;
        if (intersectedMarker !== hoveredMarker) {
          setHoveredMarker(intersectedMarker);
          setHoveredInfo({
            title: intersectedMarker.userData.title,
            image: intersectedMarker.userData.image,
            url: intersectedMarker.userData.url,
          });
        }
      } else {
        setHoveredMarker(null);
        setHoveredInfo(null);
      }

      if (mouse.current.x && mouse.current.y) {
        const barrierIntersects = raycaster.current.intersectObject(earthGroup);
        if (barrierIntersects.length > 0) {
          rotationSpeedRef.current = 0;
        } else {
          rotationSpeedRef.current = 0.0004;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleWindowResize = () => {
      const newWidth = mountRef.current?.clientWidth || window.innerWidth;
      const newHeight = mountRef.current?.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleWindowResize, false);

    renderer.domElement.addEventListener(
      "mousedown",
      (event) => handleMouseDown(event, isDragging),
      false
    );
    renderer.domElement.addEventListener(
      "mousemove",
      (event) =>
        handleMouseMove(event, mouse, isDragging, setInfoWindowPosition),
      false
    );
    renderer.domElement.addEventListener(
      "mouseup",
      (event) =>
        handleMouseUp(
          event,
          isDragging,
          raycaster,
          camera,
          markerRefs,
          mouse,
          setHoveredMarker,
          setHoveredInfo
        ),
      false
    );

    return () => {
      renderer.domElement.removeEventListener("mousedown", (event) =>
        handleMouseDown(event, isDragging)
      );
      renderer.domElement.removeEventListener("mousemove", (event) =>
        handleMouseMove(event, mouse, isDragging, setInfoWindowPosition)
      );
      renderer.domElement.removeEventListener("mouseup", (event) =>
        handleMouseUp(
          event,
          isDragging,
          raycaster,
          camera,
          markerRefs,
          mouse,
          setHoveredMarker,
          setHoveredInfo
        )
      );
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [articles]);

  return (
    <div ref={mountRef} className="background-globe cropped-globe">
      {hoveredInfo && (
        <div
          className="info-window"
          style={{ top: infoWindowPosition.y, left: infoWindowPosition.x }}
        >
          <h3>{hoveredInfo.title}</h3>
          <img src={hoveredInfo.image} alt={hoveredInfo.title} />
        </div>
      )}
      <style jsx>{`
        .container {
          position: relative;
        }
        .background-globe {
          overflow: hidden;
          position: relative;
          transform: translateY(-100px);

          user-select: none; /* Disable text selection */
          -webkit-user-select: none; /* Safari */
          -moz-user-select: none; /* Firefox */
          -ms-user-select: none; /* Edge */
        }
        .cropped-globe {
          clip-path: inset(
            100px 0px 150px 0px
          ); /* Crop 150px from the bottom */
        }
        .info-window {
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          padding: 10px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
          pointer-events: none;
          max-width: 200px;
          position: absolute;
        }

        .info-window h3 {
          margin: 0 0 5px;
          font-size: 16px;
        }

        .info-window img {
          width: 100%;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default ThreeGlobe;
