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
import type { FlareArticle } from "@/types/flare";

const ThreeGlobe: React.FC<{ articles: FlareArticle[] }> = ({ articles }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const seenUrisRef = useRef<Set<string>>(new Set());

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const earthGroupRef = useRef<THREE.Group | null>(null);
  const lightsRef = useRef<THREE.Object3D | null>(null);
  const cloudsRef = useRef<THREE.Object3D | null>(null);
  const glowRef = useRef<THREE.Object3D | null>(null);

  const markerRefs = useRef<THREE.Mesh[]>([]);
  const rotationSpeedRef = useRef(0.0004);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const animationIdRef = useRef<number | null>(null);

  const getMarkerNode = (o: THREE.Object3D | null) => {
    let cur: THREE.Object3D | null = o;
    while (cur && !cur.userData?.url) cur = cur.parent || null;
    return cur;
  };

  // treat only OPAQUE meshes as occluders (skip clouds/glow/etc.)
  const isOpaqueMesh = (obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh;
    const mat = (mesh as any).material;
    if (!mat) return true;
    const list = Array.isArray(mat) ? mat : [mat];
    // Opaque if any sub‑material is not marked transparent (or has high opacity)
    return list.some((m) => !m?.transparent || (m?.opacity ?? 1) >= 0.99);
  };

  // Pick first VISIBLE marker that is IN FRONT of the nearest opaque hit
  const pickFrontMostMarker = (hits: THREE.Intersection[]) => {
    // 1) Nearest opaque (non-marker) distance
    let nearestOpaque = Infinity;
    for (const h of hits) {
      const maybeMarker = getMarkerNode(h.object);
      if (!maybeMarker && isOpaqueMesh(h.object)) {
        nearestOpaque = h.distance;
        break;
      }
    }
    const EPS = 1e-3;

    // 2) First marker not behind the nearest opaque
    for (const h of hits) {
      const marker = getMarkerNode(h.object);
      if (!marker) continue;
      if ((marker as any).visible === false) continue;
      // Accept only if the marker is at/closer than the nearest opaque
      if (h.distance <= nearestOpaque + EPS) return marker;
    }
    return null;
  };

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

  // --- One-time scene setup (renderer, camera, controls, initial earth) ---
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const w = currentMount.clientWidth || window.innerWidth;
    const h = currentMount.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 1000);
    cameraRef.current = camera;

    const initializeCamera = () => {
      camera.position.set(0, 0, 3);
      camera.lookAt(new THREE.Vector3(0, 0, 0));
    };

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

    initializeCamera();
    updateCameraPosition();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.maxDistance = 5;
    controls.minDistance = 1.3;
    controls.update();
    controlsRef.current = controls;

    // Initial Earth group (from current articles; ok if empty)
    const earthGroup = createEarthGroup(
      articles,
      markerRefs,
      gsap,
      seenUrisRef.current
    );
    earthGroup.rotation.z = (-12.4 * Math.PI) / 180;
    earthGroupRef.current = earthGroup;
    scene.add(earthGroup);

    // Reusable child layers (stay the same across updates)
    const lightsMesh = createLights();
    lightsRef.current = lightsMesh;
    earthGroup.add(lightsMesh);

    const cloudsMesh = createClouds();
    cloudsRef.current = cloudsMesh;
    earthGroup.add(cloudsMesh);

    const glowMesh = createGlow();
    glowRef.current = glowMesh;
    earthGroup.add(glowMesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.25);
    scene.add(ambientLight);

    // Animation loop (uses refs so it survives prop/state updates)
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const sceneLocal = sceneRef.current;
      const cameraLocal = cameraRef.current;
      const rendererLocal = rendererRef.current;
      const earthLocal = earthGroupRef.current;
      const cloudsLocal = cloudsRef.current;

      if (!sceneLocal || !cameraLocal || !rendererLocal || !earthLocal) return;

      if (!isTouchscreen()) {
        if (mouse.current.x && mouse.current.y) {
          raycaster.current.setFromCamera(mouse.current, cameraLocal);

          const hits = earthLocal
            ? raycaster.current.intersectObject(earthLocal, true)
            : [];

          const pick = pickFrontMostMarker(hits);

          if (pick) {
            setHoveredInfo({
              title: (pick as any).userData.title,
              image: (pick as any).userData.image,
              url: (pick as any).userData.url,
            });
            isMouseOverGlobe.current = true;
            rotationSpeedRef.current = 0;
          } else {
            setHoveredInfo(null);
            isMouseOverGlobe.current = false;
            rotationSpeedRef.current = 0.0004;
          }
        }
      }

      earthLocal.rotation.y += rotationSpeedRef.current;
      if (cloudsLocal) {
        (cloudsLocal as any).rotation.y += rotationSpeedRef.current / 3;
      }

      rendererLocal.render(sceneLocal, cameraLocal);
    };
    animate();

    // Event handlers (use refs)
    const handleMouseDown = () => {
      isDragging.current = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rendererLocal = rendererRef.current;
      if (!rendererLocal) return;
      const bounds = rendererLocal.domElement.getBoundingClientRect();
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
      const cameraLocal = cameraRef.current;
      const group = earthGroupRef.current;
      if (!cameraLocal || !group) return;

      raycaster.current.setFromCamera(mouse.current, cameraLocal);
      const hits = raycaster.current.intersectObject(group, true);
      const pick = pickFrontMostMarker(hits);
      const url = (pick as any)?.userData?.url;
      if (url) window.open(url, "_blank");
    };

    const handleTouchMove = (event: TouchEvent) => {
      const controlsLocal = controlsRef.current;
      if (isTouchscreen() && event.touches.length === 2 && controlsLocal) {
        controlsLocal.enableZoom = true;
        event.preventDefault();
      }
    };

    const handleScroll = (_event: WheelEvent) => {
      const controlsLocal = controlsRef.current;
      if (!controlsLocal) return;
      if (isTouchscreen()) {
        controlsLocal.enableZoom = true;
      } else {
        controlsLocal.enableZoom = isMouseOverGlobe.current;
      }
    };

    const handleWindowResize = () => {
      const rendererLocal = rendererRef.current;
      const cameraLocal = cameraRef.current;
      const controlsLocal = controlsRef.current;
      if (!rendererLocal || !cameraLocal || !controlsLocal) return;

      const newWidth = currentMount.clientWidth || window.innerWidth;
      const newHeight = currentMount.clientHeight || window.innerHeight;
      cameraLocal.aspect = newWidth / newHeight;
      updateCameraPosition();
      rendererLocal.setSize(newWidth, newHeight);
      controlsLocal.update();
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
      // Clean up only on unmount
      if (isTouchscreen()) {
        renderer.domElement.removeEventListener("touchmove", handleTouchMove);
      } else {
        renderer.domElement.removeEventListener("wheel", handleScroll);
      }
      renderer.domElement.removeEventListener("mousedown", handleMouseDown);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", handleWindowResize);

      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      currentMount.removeChild(renderer.domElement);
      renderer.dispose();
      rendererRef.current = null;
      controlsRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
      earthGroupRef.current = null;
      lightsRef.current = null;
      cloudsRef.current = null;
      glowRef.current = null;
      markerRefs.current = [];
    };
  }, []);

  // --- Update only the earth group when `articles` changes (preserve orientation & controls) ---
  useEffect(() => {
    const scene = sceneRef.current;
    const oldGroup = earthGroupRef.current;
    if (!scene) return;

    // Keep prior orientation
    const prevQuat = oldGroup ? oldGroup.quaternion.clone() : undefined;

    markerRefs.current.length = 0;

    // Articles-update effect (every time `articles` changes)
    const newGroup = createEarthGroup(
      articles,
      markerRefs,
      gsap,
      seenUrisRef.current
    );
    if (prevQuat) newGroup.quaternion.copy(prevQuat);

    // Re-attach persistent layers before making the swap
    if (lightsRef.current) newGroup.add(lightsRef.current);
    if (cloudsRef.current) newGroup.add(cloudsRef.current);
    if (glowRef.current) newGroup.add(glowRef.current);

    // Add the new group first (prevents a blank frame), then remove the old
    scene.add(newGroup);
    if (oldGroup) scene.remove(oldGroup);
    earthGroupRef.current = newGroup;

    // Smooth appear only for URIs that weren't present before
    const prev = seenUrisRef.current;
    const next = new Set(articles.map((a) => a.uri));

    seenUrisRef.current = next;
    setHoveredInfo(null);
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
          overflow: visible;
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
