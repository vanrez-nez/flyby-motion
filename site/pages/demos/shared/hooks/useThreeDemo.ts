import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useEffect, useState } from 'react';
import { waitForStableSize } from '../../../../lib/waitForStableSize';


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

    const aborter = new AbortController();
    let created: ThreeDemoContext | null = null;

    // Create the renderer only once the play area has its final size, so the first frame already
    // renders at full size with the right camera aspect instead of a zero-width canvas.
    waitForStableSize(playArea, aborter.signal)
      .then(({ width, height }) => {
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setClearColor(0x000000);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        playArea.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x000000, 20, 60);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 12, 20);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false;
        controls.target.set(0, 0.5, 0);

        created = { renderer, scene, camera, controls };
        setContext(created);
      })
      .catch((error: unknown) => {
        if ((error as DOMException)?.name !== 'AbortError') throw error;
      });

    return () => {
      aborter.abort();
      if (!created) return;
      const { renderer, controls } = created;
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  return context;
}
