import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import {
  createEarthGroup,
  createLights,
  createClouds,
  createGlow,
} from "./materials";

const ThreeGlobe: React.FC<{ articles: any[] }> = ({ articles }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<THREE.Mesh[]>([]);
  const rotationSpeedRef = useRef(0.0004);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const [hoveredInfo, setHoveredInfo] = useState<{
    title: string;
    image: string;
    url: string;
  } | null>(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState({ x: 0, y: 0 });
  const isMouseOverGlobe = useRef(false);
  const isDragging = useRef(false);

  const isTouchscreen = () => {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  };

  useEffect(() => {
    // Clean up previous markers
    markerRefs.current.forEach((marker) => marker.parent?.remove(marker));
    markerRefs.current = [];
    setHoveredInfo(null);
    const currentMount = mountRef.current;

    // Set up scene
    const w = currentMount?.clientWidth || window.innerWidth;
    const h = currentMount?.clientHeight || window.innerHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 1000);

    const initializeCamera = () => {
      camera.position.set(0, 0, 3);
      camera.lookAt(new THREE.Vector3(0, 0, 0));
    };

    // Adjust camera position based on screen width for responsiveness
    const updateCameraPosition = () => {
      const width = window.innerWidth;
      if (width < 450) {
        camera.position.set(0, 0, 4);
      } else if (width < 600) {
        camera.position.set(0, 0, 3.5);
      } else {
        camera.position.set(0, 0, 3);
      }
      camera.updateProjectionMatrix();
    };

    // Initial camera setup
    initializeCamera();
    updateCameraPosition();

    // Set up renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    if (currentMount) {
      currentMount.appendChild(renderer.domElement);
    }

    // Set up controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableZoom = false; // Disable zoom initially
    controls.enablePan = false;

    controls.maxDistance = 5;
    controls.minDistance = 1.3;
    controls.update();

    // Create Earth and related objects
    const earthGroup = createEarthGroup(articles, markerRefs, gsap);
    earthGroup.rotation.z = (-12.4 * Math.PI) / 180;
    scene.add(earthGroup);

    const lightsMesh = createLights();
    earthGroup.add(lightsMesh);

    const cloudsMesh = createClouds();
    earthGroup.add(cloudsMesh);

    const glowMesh = createGlow();
    earthGroup.add(glowMesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.25);
    scene.add(ambientLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (!isTouchscreen()) {
        if (mouse.current.x && mouse.current.y) {
          raycaster.current.setFromCamera(mouse.current, camera);
          const allObjects = [earthGroup, ...markerRefs.current];
          // Check for intersections visible to the camera
          const intersects = raycaster.current.intersectObjects(
            allObjects,
            true
          );

          if (intersects.length > 0 && intersects[0].object.visible) {
            const intersected = intersects[0].object;
            setHoveredInfo(
              intersected.userData.url
                ? {
                    title: intersected.userData.title,
                    image: intersected.userData.image,
                    url: intersected.userData.url,
                  }
                : null
            );

            isMouseOverGlobe.current = true;
            rotationSpeedRef.current = 0;
          } else {
            setHoveredInfo(null);
            isMouseOverGlobe.current = false;
            rotationSpeedRef.current = 0.0004;
          }
        }
      }

      earthGroup.rotation.y += rotationSpeedRef.current;
      cloudsMesh.rotation.y += rotationSpeedRef.current / 3;

      renderer.render(scene, camera);
    };

    animate();

    // Event handlers
    const handleMouseDown = () => {
      isDragging.current = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.current.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      setInfoWindowPosition({
        x: event.clientX - bounds.left + 50,
        y: event.clientY - bounds.top - 50,
      });
      if (event.movementX !== 0 || event.movementY !== 0) {
        isDragging.current = true;
      }
    };

    const handleMouseUp = () => {
      if (!isDragging.current) {
        raycaster.current.setFromCamera(mouse.current, camera);
        const intersects = raycaster.current.intersectObjects(
          markerRefs.current
        );
        if (intersects.length > 0 && intersects[0].object.visible) {
          const intersectedMarker = intersects[0].object;
          const url = intersectedMarker.userData.url;
          if (url) {
            window.open(url, "_blank");
          }
        }
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (isTouchscreen() && event.touches.length === 2) {
        controls.enableZoom = true;
        event.preventDefault();
      }
    };

    const handleScroll = (event: WheelEvent) => {
      if (isTouchscreen()) {
        controls.enableZoom = true;
      } else {
        controls.enableZoom = isMouseOverGlobe.current;
      }
    };

    const handleWindowResize = () => {
      const newWidth = currentMount?.clientWidth || window.innerWidth;
      const newHeight = currentMount?.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      updateCameraPosition();
      renderer.setSize(newWidth, newHeight);
      controls.update()
    };

    if (isTouchscreen()) {
      renderer.domElement.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
    } else {
      renderer.domElement.addEventListener("wheel", handleScroll, {
        passive: false,
      });
    }
    renderer.domElement.addEventListener("mousedown", handleMouseDown, false);
    renderer.domElement.addEventListener("mousemove", handleMouseMove, false);
    renderer.domElement.addEventListener("mouseup", handleMouseUp, false);
    window.addEventListener("resize", handleWindowResize, false);

    return () => {
      if (isTouchscreen()) {
        renderer.domElement.removeEventListener("touchmove", handleTouchMove);
      } else {
        renderer.domElement.removeEventListener("wheel", handleScroll);
      }
      renderer.domElement.removeEventListener("mousedown", handleMouseDown);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", handleWindowResize);
      currentMount?.removeChild(renderer.domElement);
    };
  }, [articles]);

  return (
    <div className="three-globe-container">
      {hoveredInfo && (
        <div
          className="info-window"
          style={{ top: infoWindowPosition.y, left: infoWindowPosition.x }}
        >
          <h3>{hoveredInfo.title}</h3>
          <img src={hoveredInfo.image} alt={hoveredInfo.title} />
        </div>
      )}
      <div ref={mountRef} className="background-globe cropped-globe"></div>
      <style jsx>{`
        .background-globe {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 100%;
          user-select: none;
          overflow: visible;
          margin: 0 auto;
        }

        .background-globe::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 60%;
          height: 100%;
          border-radius: 100%;
          pointer-events: none;
          background-color: transparent;
          overflow: visible;
        }

        .three-globe-container {
          position: relative;
          width: 100%;
          height: 100%;
          transform: translateY(-100px);
          pointer-events: none;
          overflow: visible
        }

        .cropped-globe {
          clip-path: inset(100px 0px 150px 0px);
        }

        .three-globe-container .background-globe {
          pointer-events: auto;
          overflow: visible;
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
          z-index: 2000;
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
