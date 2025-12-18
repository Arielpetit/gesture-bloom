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
  particleCount = 8000,
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
  const velocitiesRef = useRef<Float32Array | null>(null);
  
  const transitionProgressRef = useRef(1);
  const currentPatternRef = useRef(pattern);
  const currentScaleRef = useRef(1);
  const targetScaleRef = useRef(1);
  const rotationRef = useRef({ x: 0, y: 0 });
  const isTransitioningRef = useRef(false);

  const [isInitialized, setIsInitialized] = useState(false);

  // Create smaller, more vibrant particle material
  const createMaterial = useCallback((particleColor: ParticleColor) => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    // More vibrant gradient with sharper core
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.1, particleColor.color);
    gradient.addColorStop(0.4, particleColor.color + 'cc');
    gradient.addColorStop(0.7, particleColor.color + '44');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    return new THREE.PointsMaterial({
      size: 0.04, // Smaller particles
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030508);
    scene.fog = new THREE.FogExp2(0x030508, 0.04);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 7;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const positions = generatePattern(pattern, particleCount);
    basePositionsRef.current = positions.slice();
    currentPositionsRef.current = positions.slice();
    targetPositionsRef.current = positions.slice();
    velocitiesRef.current = new Float32Array(particleCount * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = createMaterial(color);
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    setIsInitialized(true);

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

  // Update pattern with fast transition
  useEffect(() => {
    if (!isInitialized || !basePositionsRef.current) return;

    if (pattern !== currentPatternRef.current) {
      currentPatternRef.current = pattern;
      currentPositionsRef.current = basePositionsRef.current.slice();
      targetPositionsRef.current = generatePattern(pattern, particleCount);
      transitionProgressRef.current = 0;
      isTransitioningRef.current = true;
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
      targetScaleRef.current = 0.4 + gestureState.openness * 1.8;
    }
  }, [gestureState]);

  // Animation loop - faster and more reactive
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
      const velocities = velocitiesRef.current;

      // Fast pattern transition
      if (transitionProgressRef.current < 1) {
        // Much faster transition speed
        transitionProgressRef.current = Math.min(1, transitionProgressRef.current + 0.08);
        
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
            isTransitioningRef.current = false;
          }
        }
      }

      // Smooth but reactive scale transition
      const scaleSpeed = isTransitioningRef.current ? 0.15 : 0.12;
      currentScaleRef.current += (targetScaleRef.current - currentScaleRef.current) * scaleSpeed;
      const scale = currentScaleRef.current;

      // Apply scale and add micro-movement for vibrancy
      const time = Date.now() * 0.003;
      if (basePositionsRef.current && velocities) {
        for (let i = 0; i < positions.length; i += 3) {
          const baseX = basePositionsRef.current[i];
          const baseY = basePositionsRef.current[i + 1];
          const baseZ = basePositionsRef.current[i + 2];
          
          // Add subtle vibration/shimmer
          const vibration = isTransitioningRef.current ? 0.02 : 0.005;
          const px = baseX * scale + Math.sin(time + i * 0.1) * vibration;
          const py = baseY * scale + Math.cos(time + i * 0.15) * vibration;
          const pz = baseZ * scale + Math.sin(time + i * 0.12) * vibration;
          
          positions[i] = px;
          positions[i + 1] = py;
          positions[i + 2] = pz;
        }
      }

      positionAttribute.needsUpdate = true;

      // Faster rotation
      rotationRef.current.y += 0.004;
      rotationRef.current.x = Math.sin(Date.now() * 0.0005) * 0.15;
      particles.rotation.y = rotationRef.current.y;
      particles.rotation.x = rotationRef.current.x;

      // Camera movement
      camera.position.x = Math.sin(Date.now() * 0.0003) * 0.6;
      camera.position.y = Math.cos(Date.now() * 0.0004) * 0.4;
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
      style={{ background: 'linear-gradient(180deg, #030508 0%, #080c15 100%)' }}
    />
  );
}
