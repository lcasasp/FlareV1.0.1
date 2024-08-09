import * as THREE from "three";

export const handleMouseDown = (
  event: MouseEvent,
  isDragging: React.MutableRefObject<boolean>
) => {
  isDragging.current = false;
};

export const handleMouseMove = (
  event: MouseEvent,
  mouse: React.MutableRefObject<THREE.Vector2>,
  isDragging: React.MutableRefObject<boolean>,
  setInfoWindowPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >
) => {
  const target = event.currentTarget as HTMLDivElement;
  const bounds = target.getBoundingClientRect();
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

export const handleMouseUp = (
  event: MouseEvent,
  isDragging: React.MutableRefObject<boolean>,
  raycaster: React.MutableRefObject<THREE.Raycaster>,
  camera: THREE.PerspectiveCamera,
  markerRefs: React.MutableRefObject<THREE.Mesh[]>,
  mouse: React.MutableRefObject<THREE.Vector2>,
  setHoveredMarker: React.Dispatch<React.SetStateAction<THREE.Object3D | null>>,
  setHoveredInfo: React.Dispatch<
    React.SetStateAction<{ title: string; image: string; url: string } | null>
  >
) => {
  if (!isDragging.current) {
    console.log("Clicked");
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
      const url = intersectedMarker.userData.url;
      if (url) {
        window.open(url, "_blank");
      }
    }
  }
};
