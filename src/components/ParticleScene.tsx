import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { PatternType, ParticleColor, HandGestureState, GestureType } from '@/types/particle';
import { generatePattern, interpolatePositions } from '@/utils/particlePatterns';
import { createVelocityArrays, applyPhysics, applyBurstEffect, applyGravityDrop, ParticleVelocity } from '@/utils/particlePhysics';

interface ParticleSceneProps {
  pattern: PatternType;
  color: ParticleColor;
  gestureState: HandGestureState;
  particleCount?: number;
}

const GESTURE_PATTERNS: Partial<Record<GestureType, PatternType>> = {
  peace: 'heart',
  love: 'love',
  thumbsUp: 'burst',
  point: 'star',
};

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
  const velocitiesRef = useRef<ParticleVelocity | null>(null);
  
  const transitionProgressRef = useRef(1);
  const currentPatternRef = useRef(pattern);
  const currentGesturePatternRef = useRef<PatternType | null>(null);
  const currentScaleRef = useRef(1);
  const targetScaleRef = useRef(1);
  const rotationRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const lastBurstTimeRef = useRef(0);

  const [isInitialized, setIsInitialized] = useState(false);

  const createMaterial = useCallback((particleColor: ParticleColor) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.2, particleColor.color);
    gradient.addColorStop(0.5, particleColor.color + 'cc');
    gradient.addColorStop(0.8, particleColor.color + '44');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    return new THREE.PointsMaterial({
      size: 0.12,
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
    scene.fog = new THREE.FogExp2(0x030508, 0.03);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 10;
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
    velocitiesRef.current = createVelocityArrays(particleCount);

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

  // Update pattern based on gesture or manual selection
  useEffect(() => {
    if (!isInitialized || !basePositionsRef.current) return;

    const gesturePattern = gestureState.isDetected ? GESTURE_PATTERNS[gestureState.gesture] : null;
    const activePattern = gesturePattern || pattern;

    if (activePattern !== currentPatternRef.current || gesturePattern !== currentGesturePatternRef.current) {
      currentPatternRef.current = activePattern;
      currentGesturePatternRef.current = gesturePattern || null;
      
      // Store current positions before transitioning
      if (currentPositionsRef.current && particlesRef.current) {
        const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        currentPositionsRef.current = new Float32Array(posAttr.array);
      }
      
      targetPositionsRef.current = generatePattern(activePattern, particleCount);
      basePositionsRef.current = targetPositionsRef.current.slice();
      transitionProgressRef.current = 0;
    }
  }, [pattern, gestureState.gesture, gestureState.isDetected, particleCount, isInitialized]);

  // Update color
  useEffect(() => {
    if (!particlesRef.current || !isInitialized) return;
    const newMaterial = createMaterial(color);
    (particlesRef.current.material as THREE.PointsMaterial).dispose();
    particlesRef.current.material = newMaterial;
  }, [color, createMaterial, isInitialized]);

  // Update scale based on gesture
  useEffect(() => {
    if (gestureState.isDetected) {
      targetScaleRef.current = 0.4 + gestureState.openness * 1.8 + gestureState.depth * 0.5;
    }
  }, [gestureState]);

  // Handle burst effect on thumbs up
  useEffect(() => {
    if (gestureState.gesture === 'thumbsUp' && gestureState.isDetected) {
      const now = Date.now();
      if (now - lastBurstTimeRef.current > 500 && velocitiesRef.current && currentPositionsRef.current) {
        applyBurstEffect(
          currentPositionsRef.current,
          velocitiesRef.current,
          0, 0,
          0.3
        );
        lastBurstTimeRef.current = now;
      }
    }
  }, [gestureState.gesture, gestureState.isDetected]);

  // Handle gravity drop on open palm
  useEffect(() => {
    if (gestureState.gesture === 'open' && gestureState.isDetected && gestureState.openness > 0.8) {
      if (velocitiesRef.current) {
        applyGravityDrop(velocitiesRef.current, 0.01);
      }
    }
  }, [gestureState.gesture, gestureState.isDetected, gestureState.openness]);

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

      timeRef.current += 0.016;
      const time = timeRef.current;

      const positionAttribute = particles.geometry.attributes.position as THREE.BufferAttribute;
      const positions = positionAttribute.array as Float32Array;

      // Fast pattern transition
      if (transitionProgressRef.current < 1) {
        transitionProgressRef.current = Math.min(1, transitionProgressRef.current + 0.04);
        
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
          }
        }
      }

      // Apply physics
      if (velocitiesRef.current && basePositionsRef.current) {
        const handVelMag = Math.sqrt(
          gestureState.velocity.x * gestureState.velocity.x + 
          gestureState.velocity.y * gestureState.velocity.y
        );
        
        applyPhysics(
          positions,
          velocitiesRef.current,
          basePositionsRef.current,
          gestureState.isDetected ? gestureState.position : null,
          gestureState.velocity,
          gestureState.openness,
          time,
          {
            attractionStrength: gestureState.isDetected ? 0.8 + handVelMag * 0.5 : 0,
            turbulenceIntensity: 0.015 + (gestureState.isDetected ? handVelMag * 0.03 : 0),
            velocityDamping: 0.92,
            noiseScale: 0.15,
            returnStrength: 0.02,
          }
        );
      }

      // Smooth scale transition
      currentScaleRef.current += (targetScaleRef.current - currentScaleRef.current) * 0.12;
      particles.scale.setScalar(currentScaleRef.current);

      positionAttribute.needsUpdate = true;

      // Dynamic rotation based on hand velocity
      const rotSpeed = 0.004 + Math.abs(gestureState.velocity.x) * 0.01;
      rotationRef.current.y += rotSpeed;
      rotationRef.current.x = Math.sin(time * 0.5) * 0.15;
      
      if (gestureState.isDetected && gestureState.position) {
        // Tilt towards hand
        const targetRotX = (gestureState.position.y - 0.5) * 0.3;
        const targetRotY = (0.5 - gestureState.position.x) * 0.5 + rotationRef.current.y;
        particles.rotation.x += (targetRotX - particles.rotation.x) * 0.1;
        particles.rotation.y = targetRotY;
      } else {
        particles.rotation.y = rotationRef.current.y;
        particles.rotation.x = rotationRef.current.x;
      }

      // Camera movement
      camera.position.x = Math.sin(time * 0.3) * 0.8;
      camera.position.y = Math.cos(time * 0.4) * 0.5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
    };
  }, [isInitialized, gestureState]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full"
      style={{ background: 'linear-gradient(180deg, #030508 0%, #0a0f18 100%)' }}
    />
  );
}
