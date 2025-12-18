import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { PatternType, ParticleColor, HandGestureState } from '@/types/particle';
import { generatePattern, interpolatePositions } from '@/utils/particlePatterns';

interface ParticleSceneProps {
  pattern: PatternType;
  color: ParticleColor;
  gestureState: HandGestureState;
  particleCount?: number;
}

export function ParticleScene({
  pattern,
  color,
  gestureState,
  particleCount = 5000,
}: ParticleSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animationIdRef = useRef<number>(0);
  
  const currentPositionsRef = useRef<Float32Array | null>(null);
  const targetPositionsRef = useRef<Float32Array | null>(null);
  const basePositionsRef = useRef<Float32Array | null>(null);
  
  const transitionProgressRef = useRef(1);
  const currentPatternRef = useRef(pattern);
  const currentScaleRef = useRef(1);
  const targetScaleRef = useRef(1);
  const rotationRef = useRef({ x: 0, y: 0 });

  const [isInitialized, setIsInitialized] = useState(false);

  // Create particle material
  const createMaterial = useCallback((particleColor: ParticleColor) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, particleColor.color);
    gradient.addColorStop(0.3, particleColor.color + 'aa');
    gradient.addColorStop(0.6, particleColor.color + '44');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    return new THREE.PointsMaterial({
      size: 0.08,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: false,
    });
  }, []);

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050810);
    scene.fog = new THREE.FogExp2(0x050810, 0.05);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 8;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Initial particles
    const positions = generatePattern(pattern, particleCount);
    basePositionsRef.current = positions.slice();
    currentPositionsRef.current = positions.slice();
    targetPositionsRef.current = positions.slice();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = createMaterial(color);
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    setIsInitialized(true);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [particleCount, createMaterial]);

  // Update pattern
  useEffect(() => {
    if (!isInitialized || !basePositionsRef.current) return;

    if (pattern !== currentPatternRef.current) {
      currentPatternRef.current = pattern;
      targetPositionsRef.current = generatePattern(pattern, particleCount);
      transitionProgressRef.current = 0;
    }
  }, [pattern, particleCount, isInitialized]);

  // Update color
  useEffect(() => {
    if (!particlesRef.current || !isInitialized) return;
    
    const newMaterial = createMaterial(color);
    particlesRef.current.material = newMaterial;
  }, [color, createMaterial, isInitialized]);

  // Update scale based on gesture
  useEffect(() => {
    if (gestureState.isDetected) {
      // Map openness (0-1) to scale (0.3-2.5)
      targetScaleRef.current = 0.3 + gestureState.openness * 2.2;
    }
  }, [gestureState]);

  // Animation loop
  useEffect(() => {
    if (!isInitialized) return;

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const particles = particlesRef.current;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;

      if (!particles || !renderer || !scene || !camera) return;

      const positionAttribute = particles.geometry.attributes.position as THREE.BufferAttribute;
      const positions = positionAttribute.array as Float32Array;

      // Smooth pattern transition
      if (transitionProgressRef.current < 1) {
        transitionProgressRef.current = Math.min(1, transitionProgressRef.current + 0.02);
        
        if (currentPositionsRef.current && targetPositionsRef.current) {
          const interpolated = interpolatePositions(
            currentPositionsRef.current,
            targetPositionsRef.current,
            transitionProgressRef.current
          );
          
          for (let i = 0; i < interpolated.length; i++) {
            positions[i] = interpolated[i];
          }
          
          if (transitionProgressRef.current >= 1) {
            currentPositionsRef.current = targetPositionsRef.current.slice();
            basePositionsRef.current = targetPositionsRef.current.slice();
          }
        }
      }

      // Smooth scale transition
      currentScaleRef.current += (targetScaleRef.current - currentScaleRef.current) * 0.08;
      const scale = currentScaleRef.current;

      // Apply scale to positions
      if (basePositionsRef.current) {
        for (let i = 0; i < positions.length; i++) {
          const basePos = basePositionsRef.current[i];
          positions[i] = basePos * scale;
        }
      }

      positionAttribute.needsUpdate = true;

      // Rotate
      rotationRef.current.y += 0.002;
      rotationRef.current.x = Math.sin(Date.now() * 0.0003) * 0.1;
      particles.rotation.y = rotationRef.current.y;
      particles.rotation.x = rotationRef.current.x;

      // Camera subtle movement
      camera.position.x = Math.sin(Date.now() * 0.0002) * 0.5;
      camera.position.y = Math.cos(Date.now() * 0.0003) * 0.3;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
    };
  }, [isInitialized]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full"
      style={{ background: 'linear-gradient(180deg, #050810 0%, #0a1020 100%)' }}
    />
  );
}
