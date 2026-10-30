import React, { useEffect, useRef } from 'react';
import { createFieldScene } from './fieldScene';

export interface FlybyField3DProps {
  logoUrl?: string;
  onFormationChange?: (name: string) => void;
  className?: string;
}

/** Mounts the 3D agent field into a full-size container and disposes it on unmount. */
export const FlybyField3D: React.FC<FlybyField3DProps> = ({ logoUrl, onFormationChange, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onFormationChangeRef = useRef(onFormationChange);
  onFormationChangeRef.current = onFormationChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let scene: ReturnType<typeof createFieldScene> | null = null;
    try {
      scene = createFieldScene({
        container,
        logoUrl,
        onFormationChange: (name) => onFormationChangeRef.current?.(name),
      });
    } catch (error) {
      // No WebGL: the hero still works on the plain background.
      console.warn('[flyby] landing scene unavailable:', error);
    }
    return () => scene?.dispose();
  }, [logoUrl]);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
};
