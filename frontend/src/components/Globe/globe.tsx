import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import getStarfield from "./src/getStarfield";
import { getFresnelMat } from "./src/getFresnelMat";

interface Event {
  mainLocation: {
    label: string;
    latitude: number;
    longitude: number;
  } | null;
  locations: {
    label: string;
    latitude: number;
    longitude: number;
  }[];
}

interface Props {
  articles: Event[];
}

const ThreeGlobe: React.FC<{ articles: any[] }> = ({ articles }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<THREE.Mesh[]>([]);
  const rotationSpeedRef = useRef(0.0004);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const [hoveredMarker, setHoveredMarker] = useState<THREE.Object3D | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{ title: string; image: string; url: string } | null>(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Clear previous markers and reset hovered marker
    markerRefs.current.forEach(marker => marker.parent?.remove(marker));
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

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;

    const loader = new THREE.TextureLoader();
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      map: loader.load("/textures/2k_earth_daymap.jpg"),
      specularMap: loader.load("/textures/2k_earth_specular_map.jpg"),
      bumpMap: loader.load("/textures/01_earthbump1k.jpg"),
      bumpScale: 5,
    });

    const earthMesh = new THREE.Mesh(geometry, material);
    earthGroup.add(earthMesh);

    function latLongToVector3(lat: number, lon: number, radius = 1.02) {
      const lonOffset = (Math.random() - 0.5) * 3; // Random offset between -1.5 to 1.5 degrees
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + lonOffset + 180) * (Math.PI / 180);

      return new THREE.Vector3(
        -(radius * Math.sin(phi) * Math.cos(theta)),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    }

    articles.forEach((article) => {
      // Process main location
      if (article.mainLocation) {
        const position = latLongToVector3(article.mainLocation.latitude, article.mainLocation.longitude);
        const mainMarkerGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.3); 
        const mainMarkerMaterial = new THREE.MeshBasicMaterial({ color: "#800080", transparent: true, opacity: 0.8 });
        const mainMarker = new THREE.Mesh(mainMarkerGeometry, mainMarkerMaterial);
        mainMarker.position.copy(position);
        mainMarker.lookAt(new THREE.Vector3(0, 0, 0));
        mainMarker.position.normalize().multiplyScalar(1.02);
        mainMarker.userData = { title: article.title, image: article.image, url: article.infoArticle.eng.url };
        earthGroup.add(mainMarker);
        markerRefs.current.push(mainMarker);
      }
    
      // Process secondary concept locations
      article.locations.forEach((location: { latitude: number; longitude: number; }) => {
        const position = latLongToVector3(location.latitude, location.longitude);
        const markerGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.2);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: "#3CD2F9", transparent: true, opacity: 0.5 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(position);
        marker.lookAt(new THREE.Vector3(0, 0, 0));
        marker.position.normalize().multiplyScalar(1.02);
        marker.userData = { title: article.title, image: article.image, url: article.infoArticle.eng.url };
        earthGroup.add(marker);
        markerRefs.current.push(marker);
      });
    });

    const lightsMat = new THREE.MeshBasicMaterial({
      map: loader.load("/textures/2k_earth_nightmap.jpg"),
      blending: THREE.AdditiveBlending,
    });
    const lightsMesh = new THREE.Mesh(geometry, lightsMat);
    earthGroup.add(lightsMesh);

    const cloudsMat = new THREE.MeshStandardMaterial({
      map: loader.load("/textures/2k_earth_clouds.jpg"),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      alphaMap: loader.load("/textures/2k_earth_clouds.jpg"),
    });
    const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
    cloudsMesh.scale.setScalar(1.003);
    earthGroup.add(cloudsMesh);

    const fresnelMat = getFresnelMat();
    const glowMesh = new THREE.Mesh(geometry, fresnelMat);
    glowMesh.scale.setScalar(1.01);
    earthGroup.add(glowMesh);

    const stars = getStarfield({ numStars: 2000 });
    scene.add(stars);

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
      if (intersects.length > 0) {
        const intersectedMarker = intersects[0].object;
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

    const handleMouseEnter = () => {
      rotationSpeedRef.current = 0;
    };

    const handleMouseLeave = () => {
      rotationSpeedRef.current = 0.0004;
      setHoveredInfo(null);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (mountRef.current) {
        const bounds = mountRef.current.getBoundingClientRect();
        mouse.current.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        mouse.current.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
        setInfoWindowPosition({ x: event.clientX + 10, y: event.clientY + 10 });
      }
    };

    renderer.domElement.addEventListener('mouseenter', handleMouseEnter, false);
    renderer.domElement.addEventListener('mouseleave', handleMouseLeave, false);
    renderer.domElement.addEventListener('mousemove', handleMouseMove, false);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      renderer.domElement.removeEventListener('mouseenter', handleMouseEnter);
      renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [articles]);

  return (
    <div ref={mountRef} className="background-globe">
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
        .info-window {
          position: absolute;
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          padding: 10px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
          pointer-events: none;
          max-width: 200px;
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
