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
  const [hoveredInfo, setHoveredInfo] = useState<{
    title: string;
    image: string;
    url: string;
  } | null>(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState({ x: 0, y: 0 });
  const isMouseOverGlobe = useRef(false);
  const isDragging = useRef(false);

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
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.maxDistance = 5;
    controls.minDistance = 2;

    // Disable scroll to zoom
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: null,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_ROTATE,
    };
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

    const stars = createStars();
    scene.add(stars);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(-2, 0.5, 1.5);
    scene.add(sunLight);


    // Animation loop
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
        setHoveredInfo({
          title: intersectedMarker.userData.title,
          image: intersectedMarker.userData.image,
          url: intersectedMarker.userData.url,
        });
      } else {
        setHoveredInfo(null);
      }

      //Stops spinning globe if hovering over globe or markers
      if (mouse.current.x && mouse.current.y) {
        const barrierIntersects = raycaster.current.intersectObjects([
          earthGroup,
          ...markerRefs.current,
        ]);
        if (barrierIntersects.length > 0) {
          isMouseOverGlobe.current = true;
          rotationSpeedRef.current = 0;
        } else {
          isMouseOverGlobe.current = false;
          rotationSpeedRef.current = 0.0004;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Scroll handler to allow scroll only when over the globe
    const handleScroll = () => {
      if (isMouseOverGlobe.current) {
        controls.enableZoom = true;
      }
      else {
        controls.enableZoom = false;
      }
    };

    // Set up event listeners
    const handleWindowResize = () => {
      const newWidth = mountRef.current?.clientWidth || window.innerWidth;
      const newHeight = mountRef.current?.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      renderer.setSize(newWidth, newHeight);
      updateCameraPosition();

      controls.target.set(0, 0, 0);
      controls.update();
    };

    window.addEventListener("wheel", handleScroll, false);
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
          setHoveredInfo
        ),
      false
    );

    // Clean up
    return () => {
      window.removeEventListener("wheel", handleScroll);
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
          setHoveredInfo
        )
      );
      currentMount?.removeChild(renderer.domElement);
    };
  }, [articles]);

  return (
    <div className="three-globe-container">
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
      </div>
      <style jsx>{`
        .three-globe-container {
          position: relative;
          bottom: 0;
        }
        .background-globe {
          overflow: hidden;
          position: relative;
          transform: translateY(-100px);
          user-select: none;
        }
        .cropped-globe {
          clip-path: inset(100px 0px 150px 0px);
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
