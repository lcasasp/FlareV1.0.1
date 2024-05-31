import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import getStarfield from './src/getStarfield';
import { getFresnelMat } from './src/getFresnelMat';

const ThreeGlobe: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = mountRef.current?.clientWidth || window.innerWidth;
    const h = mountRef.current?.clientHeight || window.innerHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }, );
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = -23.4 * Math.PI / 180;
    scene.add(earthGroup);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;

    const detail = 12;
    const loader = new THREE.TextureLoader();
    const geometry = new THREE.IcosahedronGeometry(1, detail);
    const material = new THREE.MeshPhongMaterial({
      map: loader.load('/textures/00_earthmap1k.jpg'),
      specularMap: loader.load('/textures/02_earthspec1k.jpg'),
      bumpMap: loader.load('/textures/01_earthbump1k.jpg'),
      bumpScale: 0.04,
    });

    const earthMesh = new THREE.Mesh(geometry, material);
    earthGroup.add(earthMesh);

    const lightsMat = new THREE.MeshBasicMaterial({
      map: loader.load('/textures/03_earthlights1k.jpg'),
      blending: THREE.AdditiveBlending,
    });
    const lightsMesh = new THREE.Mesh(geometry, lightsMat);
    earthGroup.add(lightsMesh);

    const cloudsMat = new THREE.MeshStandardMaterial({
      map: loader.load('/textures/04_earthcloudmap.jpg'),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      alphaMap: loader.load('/textures/05_earthcloudmaptrans.jpg'),
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

    const animate = () => {
        requestAnimationFrame(animate);
      
        const rotationSpeed = 0.0002;
      
        earthMesh.rotation.y += rotationSpeed;
        lightsMesh.rotation.y += rotationSpeed;
        cloudsMesh.rotation.y += rotationSpeed * 1.15;
        glowMesh.rotation.y += rotationSpeed;
        stars.rotation.y -= rotationSpeed / 10;
      
        renderer.render(scene, camera);
      };
      
      animate();

    animate();

    const handleWindowResize = () => {
        const newWidth = mountRef.current?.clientWidth || window.innerWidth;
        const newHeight = mountRef.current?.clientHeight || window.innerHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      };
    window.addEventListener('resize', handleWindowResize, false);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="bg-gradient-to-r from-blue-500 to-green-500 shadow-lg rounded-lg p-6">
        <h2 className="text-3xl font-bold text-white mb-4 text-center">Explore Climate News by Country</h2>
        <div className="flex justify-center items-center">
            <div className="rounded" ref={mountRef} style={{ width: '100%', height: '100vh' }} />
        </div>
        <p className="text-white text-center mt-4">Click on a country to see the latest climate news.</p>
      </div>
    </div>
  );
};

export default ThreeGlobe;