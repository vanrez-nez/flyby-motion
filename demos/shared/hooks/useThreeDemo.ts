import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useEffect, useState } from 'react';

export interface ThreeDemoContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
}

export function useThreeDemo(playAreaRef: React.RefObject<HTMLDivElement | null>) {
  const [context, setContext] = useState<ThreeDemoContext | null>(null);

  useEffect(() => {
    const playArea = playAreaRef.current;
    if (!playArea) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(0x000000);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(playArea.clientWidth, playArea.clientHeight);
    playArea.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 8, 32);

    const camera = new THREE.PerspectiveCamera(
      45,
      playArea.clientWidth / playArea.clientHeight,
      0.1,
      200,
    );
    camera.position.set(0, 7.5, 12);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;



    setContext({ renderer, scene, camera, controls });

    return () => {

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  return context;
}
