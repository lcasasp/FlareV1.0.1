import * as THREE from "three";

export default function getStarfield({ numStars = 500 } = {}) {
  function randomSpherePoint() {
    const radius = Math.random() * 25 + 25;
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    let x = radius * Math.sin(phi) * Math.cos(theta);
    let y = radius * Math.sin(phi) * Math.sin(theta);
    let z = radius * Math.cos(phi);

    return {
      pos: new THREE.Vector3(x, y, z),
      hue: 0.6,
      minDist: radius,
    };
  }

  const verts = [];
  const colors = [];
  for (let i = 0; i < numStars; i += 1) {
    let p = randomSpherePoint();
    const { pos, hue } = p;
    const brightness = Math.random() * 0.5 + 0.1; // Darker stars
    const col = new THREE.Color().setHSL(hue, 0.2, brightness);
    verts.push(pos.x, pos.y, pos.z);
    colors.push(col.r, col.g, col.b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const starTexture = new THREE.TextureLoader().load(
    "./textures/stars/circle.png"
  );

  const mat = new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    map: starTexture,
    transparent: true,
    alphaTest: 0.5, 
    depthWrite: false, 
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  return points;
}
