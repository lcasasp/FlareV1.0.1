import * as THREE from "three";
import gsap from "gsap";
import { getFresnelMat } from "./src/getFresnelMat";

const __texLoader = new THREE.TextureLoader();
const __texCache = new Map<string, THREE.Texture>();

function getTexture(url: string) {
  if (__texCache.has(url)) return __texCache.get(url)!;
  const t = __texLoader.load(url);
  // sensible defaults; prevents shimmering/flicker on re-add
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  __texCache.set(url, t);
  return t;
}

export const createEarthGroup = (
  articles: any[],
  markerRefs: any,
  gsap: any,
  knownUris?: Set<string>
) => {
  const earthGroup = new THREE.Group();

  function getSentimentColor(sentiment: number) {
    const color = new THREE.Color();
    const power = 1.5;
    const normalized = Math.pow((sentiment + 1) / 2, sentiment < 0 ? power : 1);
    color.lerpColors(
      new THREE.Color(1, 0, 0),
      new THREE.Color(0, 1, 0),
      normalized
    );
    return color;
  }

  function latLongToVector3(lat: number, lon: number, radius = 1.02) {
    const lonOffset = (Math.random() - 0.5) * 3;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + lonOffset + 180) * (Math.PI / 180);

    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const material = new THREE.MeshPhongMaterial({
    map: getTexture("/textures/8k_globemap.jpeg"),
    bumpMap: getTexture("/textures/4k_earthbump.jpg"),
    bumpScale: 5,
  });

  const earthMesh = new THREE.Mesh(geometry, material);
  earthGroup.add(earthMesh);

  articles.forEach((article) => {
    const isNew = !knownUris || !knownUris.has(article.uri);

    // --- Main location marker ---
    if (article.mainLocation) {
      const position = latLongToVector3(
        article.mainLocation.latitude,
        article.mainLocation.longitude
      );

      const sentimentColor = getSentimentColor(article.sentiment);
      const mainMarkerMaterial = new THREE.MeshBasicMaterial({
        color: sentimentColor,
        transparent: true,
        opacity: 0.8,
      });

      // Base height from compositeScore, clamped
      const markerHeight = article.compositeScore
        ? Math.min(0.01 + article.compositeScore / 1000, 0.5) * 5
        : 0.1;
      const maxMarkerHeight = 0.6;
      const clampedMarkerHeight = Math.min(markerHeight, maxMarkerHeight);

      const mainMarkerGeometry = new THREE.BoxGeometry(
        0.01, // x
        0.01, // y
        clampedMarkerHeight // z = base height (scale.z grows from 0 -> 1)
      );

      const mainMarker = new THREE.Mesh(mainMarkerGeometry, mainMarkerMaterial);
      mainMarker.position.copy(position);
      mainMarker.lookAt(new THREE.Vector3(0, 0, 0));
      mainMarker.position.normalize().multiplyScalar(1.02);

      // Useful metadata for hit-testing / selective animation
      mainMarker.userData = {
        uri: article.uri,
        title: article.title,
        image: article.image,
        url: article.infoArticle?.eng?.url,
      };

      // --- Grow-in animation then oscillate ---
      if (isNew) {
        mainMarker.scale.set(1, 1, 0.0001);
        // Small deterministic jitter to avoid all markers animating in sync
        const jitter = ((article.socialScore || 0) % 7) * 0.03;

        gsap.to(mainMarker.scale, {
          z: 1,
          duration: 0.55,
          ease: "power2.out",
          delay: jitter,
          onComplete: () => {
            gsap.to(mainMarker.scale, {
              z: 1.4,
              duration: 4,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            });
          },
        });
      } else {
        // already known -> no grow-in; just oscillate
        mainMarker.scale.set(1, 1, 1);
        gsap.to(mainMarker.scale, {
          z: 1.4,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }

      earthGroup.add(mainMarker);
      markerRefs.current.push(mainMarker);
    }

    // --- Additional location markers ---
    article.locations.forEach(
      (location: { latitude: number; longitude: number }) => {
        const position = latLongToVector3(
          location.latitude,
          location.longitude
        );

        const markerGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.1);
        const markerMaterial = new THREE.MeshBasicMaterial({
          color: "#3CD2F9",
          transparent: true,
          opacity: 0.4,
        });

        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(position);
        marker.lookAt(new THREE.Vector3(0, 0, 0));
        marker.position.normalize().multiplyScalar(1.02);

        marker.userData = {
          uri: article.uri,
          title: article.title,
          image: article.image,
          url: article.infoArticle?.eng?.url,
        };

        // Grow-in then gentle oscillation
        marker.scale.set(1, 1, 0.0001);
        const jitter = ((article.socialScore || 0) % 5) * 0.03;

        gsap.to(marker.scale, {
          z: 1,
          duration: 0.45,
          ease: "power2.out",
          delay: jitter,
          onComplete: () => {
            gsap.to(marker.scale, {
              z: 1.3,
              duration: 2.6,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            });
          },
        });

        earthGroup.add(marker);
        markerRefs.current.push(marker);
      }
    );
  });

  return earthGroup;
};

export const createLights = () => {
  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const lightsMat = new THREE.MeshBasicMaterial({
    map: getTexture("/textures/4k_nightmap.jpg"),
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Mesh(geometry, lightsMat);
};

export const createClouds = () => {
  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const cloudsMat = new THREE.MeshStandardMaterial({
    map: getTexture("/textures/2k_earth_clouds.jpg"),
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    alphaMap: getTexture("/textures/2k_earth_clouds.jpg"),
  });
  const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
  cloudsMesh.scale.setScalar(1.003);
  return cloudsMesh;
};

export const createGlow = () => {
  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const fresnelMat = getFresnelMat();
  const glowMesh = new THREE.Mesh(geometry, fresnelMat);
  glowMesh.scale.setScalar(1.01);
  return glowMesh;
};
