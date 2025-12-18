import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { PatternType, ParticleColor, HandGestureState } from '@/types/particle';
import { generatePattern, interpolatePositions } from '@/utils/particlePatterns';

interface ParticleSceneProps {
  pattern: PatternType;
  color: ParticleColor;
  gestureState: HandGestureState;
  particleCount?: number;
  isMobile?: boolean;
  onRotationChange?: (rotation: { x: number; y: number }, isGrabbing: boolean) => void;
}

export function ParticleScene({
  pattern,
  color,
  gestureState,
  particleCount = 8000,
  isMobile = false,
  onRotationChange,
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
  const baseColorsRef = useRef<Float32Array | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);

  const transitionProgressRef = useRef(1);
  const currentPatternRef = useRef(pattern);
  const currentScaleRef = useRef(1);
  const targetScaleRef = useRef(1);
  const rotationRef = useRef({ x: 0, y: 0 });
  const rotationVelocityRef = useRef({ x: 0, y: 0 });
  const lastHandPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTransitioningRef = useRef(false);

  const [isInitialized, setIsInitialized] = useState(false);

  // Create smaller, more vibrant particle material
  const createMaterial = useCallback((particleColor: ParticleColor) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Volumetric sand grain texture
    const imageData = ctx.createImageData(64, 64);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % 64;
      const y = Math.floor((i / 4) / 64);
      const dx = x - 32;
      const dy = y - 32;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 32) {
        // Sharper falloff for a more "solid" grain feel
        const opacity = Math.pow(1 - dist / 32, 2.5);
        const noise = Math.random() * 0.4 + 0.6;

        // Brighter core for specular highlight
        const coreHighlight = dist < 8 ? 1.5 : 1.0;
        const colorObj = new THREE.Color(particleColor.color);

        data[i] = Math.min(255, colorObj.r * 255 * coreHighlight);
        data[i + 1] = Math.min(255, colorObj.g * 255 * coreHighlight);
        data[i + 2] = Math.min(255, colorObj.b * 255 * coreHighlight);
        data[i + 3] = opacity * noise * 255;
      } else {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);

    return new THREE.PointsMaterial({
      size: 0.14, // Slightly larger for better grain definition
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
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
      antialias: !isMobile, // Disable antialias on mobile for performance
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const effectiveParticleCount = isMobile ? Math.min(particleCount, 4000) : particleCount;
    const positions = generatePattern(pattern, effectiveParticleCount);
    basePositionsRef.current = positions.slice();
    currentPositionsRef.current = positions.slice();
    targetPositionsRef.current = positions.slice();
    velocitiesRef.current = new Float32Array(effectiveParticleCount * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Add color variation and glint offsets for realism
    const colors = new Float32Array(effectiveParticleCount * 3);
    const glints = new Float32Array(effectiveParticleCount);
    const baseColor = new THREE.Color(color.color);
    for (let i = 0; i < effectiveParticleCount; i++) {
      const variation = Math.random() * 0.4 - 0.2;
      colors[i * 3] = Math.max(0, Math.min(1, baseColor.r + variation));
      colors[i * 3 + 1] = Math.max(0, Math.min(1, baseColor.g + variation));
      colors[i * 3 + 2] = Math.max(0, Math.min(1, baseColor.b + variation));
      glints[i] = Math.random(); // Random shimmer offset
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    baseColorsRef.current = colors.slice();
    geometry.setAttribute('glint', new THREE.BufferAttribute(glints, 1));

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
      console.log('ParticleScene: Pattern change detected:', currentPatternRef.current, '->', pattern);
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

  // Animation loop - hyper-realistic
  useEffect(() => {
    if (!isInitialized) return;

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const particles = particlesRef.current;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;

      if (!particles || !renderer || !scene || !camera) return;

      const time = Date.now() * 0.001;

      const positionAttribute = particles.geometry.attributes.position as THREE.BufferAttribute;
      const positions = positionAttribute.array as Float32Array;
      const colorAttribute = particles.geometry.attributes.color as THREE.BufferAttribute;
      const colors = colorAttribute.array as Float32Array;
      const glintAttribute = (particles.geometry.attributes as any).glint as THREE.BufferAttribute;
      const glintOffsets = glintAttribute?.array as Float32Array;

      // Slow, organic pattern transition
      if (transitionProgressRef.current < 1) {
        // Much slower transition for "sand grain" construction feel
        transitionProgressRef.current = Math.min(1, transitionProgressRef.current + 0.015);

        if (currentPositionsRef.current && targetPositionsRef.current) {
          // Add organic noise to the interpolation
          const smoothProgress = transitionProgressRef.current;

          for (let i = 0; i < positions.length; i += 3) {
            // Each particle has a slightly different "arrival" time based on its index
            const particleProgress = Math.max(0, Math.min(1, smoothProgress * 1.2 - (i / positions.length) * 0.2));
            const easedProgress = particleProgress === 1 ? 1 : 1 - Math.pow(2, -10 * particleProgress);

            const targetX = targetPositionsRef.current[i];
            const targetY = targetPositionsRef.current[i + 1];
            const targetZ = targetPositionsRef.current[i + 2];

            const currentX = currentPositionsRef.current[i];
            const currentY = currentPositionsRef.current[i + 1];
            const currentZ = currentPositionsRef.current[i + 2];

            // Add a "swirl" noise during transition
            const noise = Math.sin(time * 2 + i) * (1 - easedProgress) * 0.5;

            positions[i] = currentX + (targetX - currentX) * easedProgress + noise;
            positions[i + 1] = currentY + (targetY - currentY) * easedProgress + noise;
            positions[i + 2] = currentZ + (targetZ - currentZ) * easedProgress + noise;

            // Update basePositionsRef so vibration logic uses current state
            basePositionsRef.current![i] = positions[i];
            basePositionsRef.current![i + 1] = positions[i + 1];
            basePositionsRef.current![i + 2] = positions[i + 2];
          }

          if (transitionProgressRef.current >= 1) {
            currentPositionsRef.current = targetPositionsRef.current.slice();
            basePositionsRef.current = targetPositionsRef.current.slice();
            isTransitioningRef.current = false;
          }
        }
      }

      // Smooth scale transition
      const scaleSpeed = isTransitioningRef.current ? 0.15 : 0.12;
      currentScaleRef.current += (targetScaleRef.current - currentScaleRef.current) * scaleSpeed;
      const scale = currentScaleRef.current;

      // Hand interaction and rotation setup
      let handX = 0, handY = 0, handZ = 0;
      let hasHand = false;
      if (gestureState.isDetected && gestureState.landmarks && gestureState.landmarks.length > 0) {
        // Use palm center (landmark 0 and 9 average)
        const l0 = gestureState.landmarks[0];
        const l9 = gestureState.landmarks[9];
        handX = (l0.x + l9.x - 1) * 10; // Map 0-1 to -5 to 5
        handY = -(l0.y + l9.y - 1) * 10;
        handZ = (l0.z + l9.z) * 5;
        hasHand = true;

        // Rotation logic: Calculate delta from last hand position
        if (lastHandPosRef.current) {
          const deltaX = l9.x - lastHandPosRef.current.x;
          const deltaY = l9.y - lastHandPosRef.current.y;

          // Add to velocity instead of direct target
          const sensitivity = 3.0;
          rotationVelocityRef.current.y += deltaX * sensitivity;
          rotationVelocityRef.current.x += deltaY * sensitivity;
        }
        lastHandPosRef.current = { x: l9.x, y: l9.y };
      } else {
        lastHandPosRef.current = null;
        // Subtle auto-rotation when no hand is detected
        rotationVelocityRef.current.y += 0.0005;
      }

      // Apply velocity to rotation
      rotationRef.current.x += rotationVelocityRef.current.x;
      rotationRef.current.y += rotationVelocityRef.current.y;

      // Apply friction (inertia)
      const friction = 0.92;
      rotationVelocityRef.current.x *= friction;
      rotationVelocityRef.current.y *= friction;

      // Apply rotation to the particles object
      particles.rotation.x = rotationRef.current.x;
      particles.rotation.y = rotationRef.current.y;

      // Export rotation state for UI
      if (onRotationChange) {
        onRotationChange(rotationRef.current, hasHand);
      }

      // Apply physics and aesthetics
      if (basePositionsRef.current) {
        for (let i = 0; i < positions.length; i += 3) {
          const baseX = basePositionsRef.current[i];
          const baseY = basePositionsRef.current[i + 1];
          const baseZ = basePositionsRef.current[i + 2];

          // 1. Organic Noise-like movement (Simplex approximation)
          const noiseX = Math.sin(time * 1.5 + i * 0.1) * Math.cos(time * 0.8 + i * 0.05);
          const noiseY = Math.cos(time * 1.2 + i * 0.12) * Math.sin(time * 0.9 + i * 0.08);
          const noiseZ = Math.sin(time * 1.8 + i * 0.07) * Math.cos(time * 1.1 + i * 0.1);

          const vibration = isTransitioningRef.current ? 0.08 : 0.02;
          let px = baseX * scale + noiseX * vibration;
          let py = baseY * scale + noiseY * vibration;
          let pz = baseZ * scale + noiseZ * vibration;

          // 2. Hand Interaction (Magnetic/Repelling force)
          if (hasHand) {
            const dx = px - handX;
            const dy = py - handY;
            const dz = pz - handZ;
            const distSq = dx * dx + dy * dy + dz * dz;
            const dist = Math.sqrt(distSq);

            if (dist < 3) {
              const force = (1 - dist / 3) * 0.15;
              px += dx * force;
              py += dy * force;
              pz += dz * force;
            }
          }

          positions[i] = px;
          positions[i + 1] = py;
          positions[i + 2] = pz;

          // 3. Specular Glints (Shimmer)
          if (glintOffsets && baseColorsRef.current) {
            const glint = Math.sin(time * 5 + glintOffsets[i / 3] * 10);
            const brightness = glint > 0.95 ? 1.8 : 1.0;

            colors[i] = baseColorsRef.current[i] * brightness;
            colors[i + 1] = baseColorsRef.current[i + 1] * brightness;
            colors[i + 2] = baseColorsRef.current[i + 2] * brightness;
          }
        }
      }

      positionAttribute.needsUpdate = true;
      if (colorAttribute) colorAttribute.needsUpdate = true;

      // Dynamic rotation
      rotationRef.current.y += isTransitioningRef.current ? 0.02 : 0.008;
      rotationRef.current.x = Math.sin(Date.now() * 0.0008) * 0.3;
      particles.rotation.y = rotationRef.current.y;
      particles.rotation.x = rotationRef.current.x;

      // Camera movement
      camera.position.x = Math.sin(Date.now() * 0.0004) * 0.8;
      camera.position.y = Math.cos(Date.now() * 0.0005) * 0.5;
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
      style={{ background: 'linear-gradient(180deg, #030508 0%, #080c15 100%)' }}
    />
  );
}
