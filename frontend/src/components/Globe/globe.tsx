import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import getStarfield from "./src/getStarfield";
import { getFresnelMat } from "./src/getFresnelMat";

// Example locations data
// const locations = [
//   { label: 'New York', latitude: 40.7128, longitude: -74.0060 },
//   { label: 'London', latitude: 51.5074, longitude: -0.1278 },
//   { label: 'Tokyo', latitude: 35.6895, longitude: 139.6917 },
//   { label: 'Sydney', latitude: -33.8688, longitude: 151.2093 },
// ];

const ThreeGlobe: React.FC<{ articles: any[] }> = ({ articles }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    const geometry = new THREE.SphereGeometry(1, 64, 64); // Use a standard sphere geometry
    const material = new THREE.MeshPhongMaterial({
      map: loader.load("/textures/2k_earth_daymap.jpg"),
      specularMap: loader.load("/textures/2k_earth_specular_map.jpg"),
      bumpMap: loader.load("/textures/01_earthbump1k.jpg"),
      bumpScale: 5,
    });

    const earthMesh = new THREE.Mesh(geometry, material);
    earthGroup.add(earthMesh);

    // Convert lat/lon to THREE.js coordinates
    function latLongToVector3(lat: number, lon: number, radius = 1) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        return new THREE.Vector3(
          -(radius * Math.sin(phi) * Math.cos(theta)),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta)
        );
    }

    articles.forEach((article) => {
      article.locations.forEach((location: { latitude: number, longitude: number }) => {
        const { latitude, longitude } = location;
        const position = latLongToVector3(latitude, longitude);
        const markerGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.2);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: "#3CD2F9", transparent: true, opacity: 0.5 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(position);
        marker.lookAt(new THREE.Vector3(0, 0, 0));
        marker.position.normalize().multiplyScalar(1);
        earthGroup.add(marker);

        gsap.to(marker.scale, { z: 1.5, duration: 2, repeat: -1, yoyo: true });
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

      const rotationSpeed = 0.0004;

      earthGroup.rotation.y += rotationSpeed;
      cloudsMesh.rotation.y += rotationSpeed / 3;
      stars.rotation.y -= rotationSpeed / 10;

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

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [articles]);

  return <div ref={mountRef} className="background-globe" />;
};

export default ThreeGlobe;
