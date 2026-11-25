import { useEffect, useRef, MutableRefObject } from 'react';
import * as THREE from 'three';
import { PatternType, ParticleColor, HandGestureState } from '@/types/particle';
import { generatePattern } from '@/utils/particlePatterns';
import type { ParticleShape } from '@/utils/shapeSampling';

export interface HandSnapshot {
  isDetected: boolean;
  openness: number;
  landmarks?: { x: number; y: number; z: number }[];
}

export interface SceneHandle {
  canvas: HTMLCanvasElement;
  /** PNG of the next rendered frame. */
  screenshot: () => Promise<Blob | null>;
}

interface ParticleSceneProps {
  pattern: PatternType;
  color: ParticleColor;
  gestureState: HandGestureState;
  /** Per-frame hand data, read without React re-renders. Falls back to gestureState. */
  handRef?: MutableRefObject<HandSnapshot>;
  particleCount?: number;
  isImageVisible?: boolean;
  customText?: string;
  /** User-made shape (typed word or dropped image). Overrides pattern while set. */
  customShape?: ParticleShape | null;
  reducedMotion?: boolean;
  onReady?: (handle: SceneHandle | null) => void;
}

const isTextPattern = (pattern: PatternType) => pattern.startsWith('word');

const TRANSITION_SECONDS = 1.5;
const FOV = 70;

// Each shape gets its own edge hue, so the palette glides when the shape changes.
const PATTERN_HUE_SHIFT: Partial<Record<PatternType, number>> = {
  heart: -0.06,
  victoryHeart: 0.08,
  galaxy: 0.16,
  helix: 0.12,
  sphere: 0.1,
  ambient: 0.2,
};

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uT;
  uniform float uScale;
  uniform float uSize;
  uniform float uPx;
  uniform float uVib;
  uniform float uText;
  uniform float uMotion;
  uniform float uAmbient;
  uniform float uSphere;
  uniform float uHasHand;
  uniform float uImgMix;
  uniform float uRadius;
  uniform vec3  uHand;
  uniform vec3  uColCore;
  uniform vec3  uColEdge;
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute vec4 aSeed;
  attribute vec3 aImg;
  varying vec3 vCol;
  varying float vFade;

  void main() {
    // ---- scatter -> reform transition, fully on the GPU
    vec3 dir = aSeed.xyz * 2.0 - 1.0;
    vec3 scatter = normalize(dir + 1e-4) * (8.0 + aSeed.w * 12.0);
    float a = clamp(uT / 0.3, 0.0, 1.0);
    a = 1.0 - pow(1.0 - a, 3.0);
    float stag = aSeed.w * 0.12;
    float b = clamp((uT - 0.3 - stag) / (0.7 - stag), 0.0, 1.0);
    b = 1.0 - pow(1.0 - b, 4.0);
    vec3 p = uT < 0.3 ? mix(aFrom, scatter, a) : mix(scatter, aTo, b);
    vec3 rest = p;

    float act = sin(clamp(uT, 0.0, 1.0) * 3.14159);
    float ang = uTime * 3.0 + aSeed.x * 6.2831;
    p.xy += vec2(cos(ang), sin(ang)) * 0.8 * act * (1.0 - a) * uMotion;

    p *= uScale;

    // ---- always-alive organic motion
    float t = uTime;
    vec3 n = vec3(
      sin(t * 1.5 + aSeed.x * 60.0) * cos(t * 0.8 + aSeed.y * 30.0),
      cos(t * 1.2 + aSeed.y * 70.0) * sin(t * 0.9 + aSeed.z * 40.0),
      sin(t * 1.8 + aSeed.z * 50.0) * cos(t * 1.1 + aSeed.x * 35.0)
    );
    p += n * (uVib + act * 0.08) * uMotion;

    // flowing twist ripples through the shape (not for readable text)
    float flow = (1.0 - uText) * uMotion;
    float tw = flow * 0.09 * sin(t * 0.8 + p.y * 0.7);
    float cs = cos(tw), sn = sin(tw);
    p.xz = mat2(cs, -sn, sn, cs) * p.xz;
    p.y += flow * 0.12 * sin(t * 1.3 + length(p.xz) * 1.4 + aSeed.w * 6.0);

    float orbit = t * 0.7 + aSeed.x * 40.0;
    float orb = (uAmbient * 0.42 + uSphere * 0.15) * uMotion;
    p.x += orb * cos(orbit + p.y * 0.2);
    p.z += orb * sin(orbit + p.x * 0.2);
    p.y += orb * 0.7 * sin(t * 0.55 + aSeed.y * 30.0);

    // ---- world space: hand / pointer repel + swirl
    vec4 w = modelMatrix * vec4(p, 1.0);
    if (uHasHand > 0.5) {
      vec3 d = w.xyz - uHand;
      float dist = length(d);
      float R = 3.4;
      if (dist < R) {
        float f = 1.0 - dist / R;
        f *= f;
        vec3 nd = d / (dist + 0.001);
        w.xyz += nd * f * 1.6;
        w.xyz += cross(vec3(0.0, 0.0, 1.0), nd) * f * 1.1 * uMotion;
      }
    }

    vec4 mv = viewMatrix * w;
    gl_Position = projectionMatrix * mv;

    // ---- color: core-to-edge gradient, per-particle variation, glints
    float r = clamp(length(rest) / uRadius, 0.0, 1.0);
    vec3 grad = mix(uColCore, uColEdge, smoothstep(0.1, 1.0, r));
    grad = clamp(grad + (aSeed.y - 0.5) * 0.3, 0.0, 1.0);
    vec3 base = mix(grad, aImg, uImgMix);

    float glint = smoothstep(0.93, 1.0, sin(t * 5.0 + aSeed.x * 62.83)) * (1.0 - uText) * uMotion;
    float core = exp(-length(p) * 0.35) * (1.0 - uImgMix * 0.8);
    vCol = base * (1.0 + glint * 1.4 + core * 0.45);
    vFade = smoothstep(34.0, 7.0, -mv.z);

    float size = uSize * uPx / max(0.5, -mv.z) * (1.0 + glint * 0.9);
    gl_PointSize = clamp(size, 1.2, 64.0);
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vCol;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = exp(-d * d * 9.0);
    float halo = pow(1.0 - d, 2.0) * 0.32;
    float a = (core + halo) * vFade;
    gl_FragColor = vec4(vCol * a, a);
  }
`;

function halfWidthOf(pos: Float32Array) {
  let max = 0.1;
  for (let i = 0; i < pos.length; i += 3) max = Math.max(max, Math.abs(pos[i]));
  return max;
}

function radiusOf(pos: Float32Array) {
  let max = 0.1;
  for (let i = 0; i < pos.length; i += 3) {
    const r = pos[i] * pos[i] + pos[i + 1] * pos[i + 1] + pos[i + 2] * pos[i + 2];
    if (r > max) max = r;
  }
  return Math.sqrt(max);
}

export function ParticleScene({
  pattern,
  color,
  gestureState,
  handRef,
  particleCount = 12000,
  isImageVisible = false,
  customText,
  customShape = null,
  reducedMotion = false,
  onReady,
}: ParticleSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Latest props, read inside the render loop so it never restarts.
  const live = useRef({ gestureState, handRef, isImageVisible, reducedMotion });
  live.current = { gestureState, handRef, isImageVisible, reducedMotion };
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const api = useRef<{
    setShape: (pattern: PatternType, text: string | undefined, shape: ParticleShape | null) => void;
    setColor: (hex: string) => void;
  } | null>(null);

  // ---------------------------------------------------------------- scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const maxDpr = Math.min(window.devicePixelRatio || 1, isCoarse ? 1.5 : 2);
    let dpr = maxDpr;

    const renderer = new THREE.WebGLRenderer({
      antialias: false, // soft additive points do not need MSAA
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setClearColor(0x04060b, 1);
    renderer.setPixelRatio(dpr);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
    camera.position.set(0, 0, 7);

    // ---------- main particle geometry (all motion lives in the shader)
    const initialPositions = generatePattern(pattern, particleCount, 1, customText ? customText.split('\n') : undefined);
    const aTo = new THREE.BufferAttribute(initialPositions.slice(), 3);
    const aFrom = new THREE.BufferAttribute(initialPositions.slice(), 3);
    aTo.setUsage(THREE.DynamicDrawUsage);
    aFrom.setUsage(THREE.DynamicDrawUsage);

    const seeds = new Float32Array(particleCount * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const aImg = new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3);
    aImg.setUsage(THREE.DynamicDrawUsage);

    const geometry = new THREE.BufferGeometry();
    // 'position' only provides the draw count; the shader uses aFrom / aTo.
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));
    geometry.setAttribute('aFrom', aFrom);
    geometry.setAttribute('aTo', aTo);
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    geometry.setAttribute('aImg', aImg);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);

    const colCore = new THREE.Color(color.color);
    const colEdge = colCore.clone();
    const targetCore = colCore.clone();
    const targetEdge = colCore.clone();
    let baseHex = color.color;

    const uniforms = {
      uTime: { value: 0 },
      uT: { value: 0.3 }, // start scattered: the first shape assembles itself
      uScale: { value: 1 },
      uSize: { value: 0.085 },
      uPx: { value: 600 },
      uVib: { value: 0.03 },
      uText: { value: isTextPattern(pattern) ? 1 : 0 },
      uMotion: { value: 1 },
      uAmbient: { value: 0 },
      uSphere: { value: 0 },
      uHasHand: { value: 0 },
      uImgMix: { value: 0 },
      uRadius: { value: radiusOf(initialPositions) },
      uHand: { value: new THREE.Vector3() },
      uColCore: { value: colCore },
      uColEdge: { value: colEdge },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);

    // ---------- distant stars: tiny static backdrop for depth
    const starCount = isCoarse ? 260 : 600;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 24 + Math.random() * 30;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      starPos[i * 3 + 2] = -Math.abs(r * Math.cos(ph)) - 6;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.09,
      color: 0x9fb4ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ---------- state (plain locals: no React in the hot path)
    let currentPattern = pattern;
    let currentText = customText;
    let currentShape: ParticleShape | null = null;
    let textMode = isTextPattern(pattern);
    let halfWidth = halfWidthOf(initialPositions);
    let imgTarget = 0;
    let transition = 0.3;
    let scale = 1;
    let targetScale = 1;
    let rotY = 0;
    let rotX = 0;
    let velY = 0;
    let velX = 0;
    let lastLandmarks: unknown = null;
    let lastHand: { x: number; y: number } | null = null;
    const handWorld = new THREE.Vector3();
    const handTarget = new THREE.Vector3();
    let handActive = 0;
    const pointer = { x: 0, y: 0, active: false };
    const par = { x: 0, y: 0 };
    let camY = 0;
    let lookY = 0;
    let aspect = 1;
    let pendingShots: ((b: Blob | null) => void)[] = [];

    const updatePalette = () => {
      targetCore.set(baseHex);
      const shift = currentShape ? 0.12 : PATTERN_HUE_SHIFT[currentPattern] ?? (textMode ? 0.05 : 0.1);
      targetEdge.set(baseHex).offsetHSL(shift, 0.05, 0.06);
    };
    updatePalette();
    colEdge.copy(targetEdge);

    const resize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      aspect = w / h;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      uniforms.uPx.value = (h * dpr) / (2 * Math.tan((FOV * Math.PI) / 360));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // ---------- touch / mouse acts as a hand
    const onPointer = (e: PointerEvent) => {
      const r = container.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    container.addEventListener('pointermove', onPointer, { passive: true });
    container.addEventListener('pointerdown', onPointer, { passive: true });
    container.addEventListener('pointerup', onLeave, { passive: true });
    container.addEventListener('pointerleave', onLeave, { passive: true });

    // ---------- public API for prop-driven changes
    api.current = {
      setShape: (next, text, shape) => {
        if (next === currentPattern && text === currentText && shape === currentShape) return;
        currentPattern = next;
        currentText = text;
        currentShape = shape;
        (aFrom.array as Float32Array).set(aTo.array as Float32Array);
        const to = aTo.array as Float32Array;

        if (shape) {
          // Spread particles over the shape's sample points.
          const n = shape.points.length / 3;
          const img = aImg.array as Float32Array;
          for (let i = 0; i < particleCount; i++) {
            const k = Math.floor(Math.random() * n);
            to[i * 3] = shape.points[k * 3] + (Math.random() - 0.5) * 0.02;
            to[i * 3 + 1] = shape.points[k * 3 + 1] + (Math.random() - 0.5) * 0.02;
            to[i * 3 + 2] = shape.points[k * 3 + 2] + (Math.random() - 0.5) * 0.12;
            if (shape.colors) {
              img[i * 3] = shape.colors[k * 3];
              img[i * 3 + 1] = shape.colors[k * 3 + 1];
              img[i * 3 + 2] = shape.colors[k * 3 + 2];
            }
          }
          aImg.needsUpdate = true;
          imgTarget = shape.colors ? 1 : 0;
          textMode = shape.flat;
        } else {
          to.set(generatePattern(next, particleCount, 1, text ? text.split('\n') : undefined));
          imgTarget = 0;
          textMode = isTextPattern(next);
        }
        aFrom.needsUpdate = true;
        aTo.needsUpdate = true;
        uniforms.uRadius.value = radiusOf(to);
        halfWidth = halfWidthOf(to);
        transition = 0;
        updatePalette();
        if (textMode) {
          velX = velY = 0;
          targetScale = 1;
          scale = 1;
        }
      },
      setColor: (hex) => {
        baseHex = hex;
        updatePalette();
      },
    };

    onReadyRef.current?.({
      canvas: renderer.domElement,
      screenshot: () => new Promise(resolve => pendingShots.push(resolve)),
    });

    // ---------- adaptive quality: drop resolution if the device struggles
    let emaDt = 1 / 60;
    let slowFor = 0;

    let raf = 0;
    let prev = performance.now();
    let elapsed = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      elapsed += dt;
      const k60 = dt * 60; // frame-rate independent smoothing factor

      emaDt += (dt - emaDt) * 0.05;
      if (emaDt > 0.026) {
        slowFor += dt;
        if (slowFor > 2 && dpr > 0.75) {
          dpr = Math.max(0.75, dpr - 0.25);
          slowFor = 0;
          resize();
        }
      } else {
        slowFor = 0;
      }

      const L = live.current;
      const motion = L.reducedMotion ? 0.3 : 1;
      const isText = textMode;
      const hand = L.handRef?.current ?? L.gestureState;
      const lm = hand.isDetected ? hand.landmarks : undefined;

      // ----- where is the "hand" in world space?
      const halfH = Math.tan((FOV * Math.PI) / 360) * camera.position.z;
      const halfW = halfH * aspect;
      let hasHand = false;
      if (!isText && lm && lm.length > 9) {
        const cx = (lm[0].x + lm[9].x) / 2;
        const cy = (lm[0].y + lm[9].y) / 2;
        handTarget.set((cx - 0.5) * 2 * halfW, -(cy - 0.5) * 2 * halfH, 0.4);
        par.x += ((cx - 0.5) * 2 - par.x) * 0.08 * k60;
        par.y += (-(cy - 0.5) * 2 - par.y) * 0.08 * k60;
        hasHand = true;

        if (lm !== lastLandmarks) {
          lastLandmarks = lm;
          if (lastHand) {
            velY += (lm[9].x - lastHand.x) * 3.2 * motion;
            velX += (lm[9].y - lastHand.y) * 2.0 * motion;
          }
          lastHand = { x: lm[9].x, y: lm[9].y };
        }
      } else if (!isText && pointer.active) {
        handTarget.set(pointer.x * halfW, pointer.y * halfH, 0.4);
        par.x += (pointer.x - par.x) * 0.08 * k60;
        par.y += (pointer.y - par.y) * 0.08 * k60;
        hasHand = true;
        lastHand = null;
        lastLandmarks = null;
      } else {
        lastHand = null;
        lastLandmarks = null;
        par.x += (0 - par.x) * 0.04 * k60;
        par.y += (0 - par.y) * 0.04 * k60;
      }
      if (hasHand) {
        if (handActive < 0.5) handWorld.copy(handTarget);
        handWorld.lerp(handTarget, Math.min(1, 0.35 * k60));
      }
      handActive = hasHand ? 1 : 0;

      // ----- transition clock
      if (transition < 1) transition = Math.min(1, transition + dt / TRANSITION_SECONDS);

      // ----- scale from gesture openness
      if (isText) targetScale = 1;
      else if (hand.isDetected) targetScale = 0.9 + hand.openness * 1.35;
      else targetScale = 1.2 + Math.sin(elapsed * 0.9) * 0.05 * motion;
      if (currentPattern === 'victoryHeart' && !currentShape) targetScale *= 1 + Math.sin(elapsed * 3.2) * 0.08 * motion;
      scale += (targetScale - scale) * (transition < 1 ? 0.22 : 0.14) * Math.min(2, k60);

      // ----- rotation with inertia
      if (!isText) {
        rotY += velY * k60;
        rotX += (Math.sin(elapsed * 0.3) * 0.15 * motion + par.y * -0.12 - rotX) * 0.06 * k60;
        rotX += velX * 0.4 * k60;
        velY *= Math.pow(0.93, k60);
        velX *= Math.pow(0.9, k60);
        rotY += 0.18 * dt * motion; // idle spin so it never looks frozen
      } else {
        rotX += (0 - rotX) * Math.min(1, 0.18 * k60);
        rotY += (0 - rotY) * Math.min(1, 0.18 * k60);
        velX = velY = 0;
      }
      points.rotation.set(rotX, rotY, 0);

      // ----- palette glides instead of snapping
      const ck = Math.min(1, 0.05 * k60);
      colCore.lerp(targetCore, ck);
      colEdge.lerp(targetEdge, ck);

      // ----- uniforms
      uniforms.uTime.value = elapsed;
      uniforms.uT.value = transition;
      uniforms.uScale.value = scale;
      uniforms.uMotion.value += (motion - uniforms.uMotion.value) * 0.1;
      uniforms.uText.value += ((isText ? 1 : 0) - uniforms.uText.value) * 0.15;
      uniforms.uImgMix.value += (imgTarget - uniforms.uImgMix.value) * Math.min(1, 0.06 * k60);
      uniforms.uAmbient.value = currentPattern === 'ambient' && !currentShape ? 0.8 : 0;
      uniforms.uSphere.value = currentPattern === 'sphere' && !currentShape ? 1 : 0;
      uniforms.uVib.value = isText
        ? transition < 1 ? 0.05 : 0.002
        : currentPattern === 'ambient' ? 0.34
        : currentPattern === 'victoryHeart' ? 0.22
        : transition < 1 ? 0.1 : 0.035;
      uniforms.uHasHand.value = hasHand ? 1 : 0;
      uniforms.uHand.value.copy(handWorld);

      // ----- camera: parallax follows hand/pointer, fits portrait screens
      const portraitFit = aspect < 1 ? Math.min(1.9, 1 / Math.pow(Math.max(aspect, 0.4), 0.75)) : 1;
      // Flat shapes (text, images) must fit the screen width, with a small margin.
      const fitZ = isText ? (halfWidth * 1.12) / (Math.tan((FOV * Math.PI) / 360) * aspect) : 0;
      const baseZ = Math.max((isText ? 8.5 : 5.9) * (isText ? 1 : portraitFit), fitZ);
      const breathe = isText ? 0 : Math.sin(elapsed * 0.45) * 0.14 * motion;
      camera.position.z += (baseZ + breathe - camera.position.z) * 0.06 * k60;

      const textImage = isText && L.isImageVisible && !currentShape;
      const targetCamY = isText ? (textImage ? 2.8 : 0) : par.y * 0.9 * motion + Math.cos(elapsed * 0.5) * 0.4 * motion;
      const targetCamX = isText ? 0 : par.x * 1.1 * motion + Math.sin(elapsed * 0.4) * 0.6 * motion;
      camera.position.x += (targetCamX - camera.position.x) * 0.05 * k60;
      camY += (targetCamY - camY) * 0.05 * k60;
      camera.position.y = camY;
      const targetLook = textImage ? 2.8 : isText ? -0.5 : 0;
      lookY += (targetLook - lookY) * 0.06 * k60;
      camera.lookAt(0, lookY, 0);
      camera.rotation.z = isText ? 0 : -par.x * 0.025 * motion; // subtle roll

      stars.rotation.y = elapsed * 0.01 * motion;
      stars.position.x = -camera.position.x * 0.3;
      stars.position.y = -camera.position.y * 0.3;

      renderer.render(scene, camera);

      // Read the drawing buffer in the same task as render, before it is cleared.
      if (pendingShots.length) {
        const shots = pendingShots;
        pendingShots = [];
        renderer.domElement.toBlob(b => shots.forEach(s => s(b)), 'image/png');
      }
    };
    raf = requestAnimationFrame(frame);

    const onContextLost = (e: Event) => e.preventDefault();
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      container.removeEventListener('pointermove', onPointer);
      container.removeEventListener('pointerdown', onPointer);
      container.removeEventListener('pointerup', onLeave);
      container.removeEventListener('pointerleave', onLeave);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      pendingShots.forEach(s => s(null));
      onReadyRef.current?.(null);
      api.current = null;
      geometry.dispose();
      material.dispose();
      starGeo.dispose();
      starMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // Scene is rebuilt only when the particle budget changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleCount]);

  useEffect(() => {
    api.current?.setShape(pattern, customText, customShape);
  }, [pattern, customText, customShape, particleCount]);

  useEffect(() => {
    api.current?.setColor(color.color);
  }, [color, particleCount]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
      style={{ background: '#04060b', touchAction: 'none' }}
    />
  );
}
