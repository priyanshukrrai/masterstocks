"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  MeshDistortMaterial,
  Sphere,
  Icosahedron,
  Sparkles,
} from "@react-three/drei";
import { useRef, Suspense } from "react";

// Premium 3D hero: a softly distorting champagne-gold orb lit by warm key/fill/
// rim lights, wrapped in a faint gold wireframe shell with floating sparkles.
// The orb is offset to the right so the hero copy on the left stays legible.
const CAMERA = { position: [0, 0, 5.2], fov: 38 };
const GL = { antialias: true, alpha: true };
const KEY_POS = [5, 6, 4];
const FILL_POS = [-6, -2, 2];
const RIM_POS = [0, 4, -6];
const GROUP_POS = [1.95, 0.15, 0];

function Orb() {
  const shell = useRef();
  useFrame((state, delta) => {
    if (!shell.current) return;
    shell.current.rotation.y += delta * 0.18;
    shell.current.rotation.x += delta * 0.06;
  });
  return (
    <group position={GROUP_POS}>
      <Float speed={1.1} rotationIntensity={0.5} floatIntensity={0.9}>
        <Sphere args={[1.7, 96, 96]}>
          <MeshDistortMaterial
            color="#d8ac5e"
            roughness={0.26}
            metalness={0.42}
            distort={0.32}
            speed={1.3}
            emissive="#7a531a"
            emissiveIntensity={0.2}
          />
        </Sphere>
        <Icosahedron ref={shell} args={[2.25, 2]}>
          <meshBasicMaterial
            color="#b8893b"
            wireframe
            transparent
            opacity={0.16}
          />
        </Icosahedron>
      </Float>
      <Sparkles
        count={70}
        scale={9}
        size={2.4}
        speed={0.35}
        color="#dcbd82"
        opacity={0.7}
      />
    </group>
  );
}

export default function Hero3D() {
  return (
    <div className="hero-canvas" aria-hidden="true">
      <Canvas camera={CAMERA} dpr={[1, 2]} gl={GL}>
        <ambientLight intensity={0.75} />
        <directionalLight position={KEY_POS} intensity={1.7} color="#fff4df" />
        <pointLight position={FILL_POS} intensity={1.2} color="#e7b765" />
        <pointLight position={RIM_POS} intensity={0.9} color="#ffd9a0" />
        <Suspense fallback={null}>
          <Orb />
        </Suspense>
      </Canvas>
    </div>
  );
}
