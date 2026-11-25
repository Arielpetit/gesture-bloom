import { useState, useEffect, useRef, useCallback } from 'react';
import type { HandGestureState, GestureType } from '@/types/particle';
import { detectGesture, handOpenness, type Landmark } from '@/lib/gestures';

export type TrackingMode = 'off' | 'camera' | 'demo';

const IS_MOBILE =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

// MediaPipe is served from our own origin (see scripts/copy-mediapipe.mjs).
const MP_BASE = `${import.meta.env.BASE_URL}mediapipe`;

/* eslint-disable @typescript-eslint/no-explicit-any */
type MpHands = any;
type MpCamera = any;

const scriptCache = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  let p = scriptCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.onload = () => resolve();
      s.onerror = () => {
        scriptCache.delete(src);
        reject(new Error('Could not load hand tracking. Check your connection.'));
      };
      document.head.appendChild(s);
    });
    scriptCache.set(src, p);
  }
  return p;
}

/** Procedural hand for demo mode: drifts in a figure-eight and opens/closes. */
function demoLandmarks(t: number): { lm: Landmark[]; openness: number } {
  const cx = 0.5 + Math.sin(t * 0.45) * 0.24;
  const cy = 0.5 + Math.sin(t * 0.9) * 0.14;
  const openness = 0.5 + Math.sin(t * 0.7) * 0.5;
  const lm: Landmark[] = [{ x: cx, y: cy + 0.12, z: 0 }];
  for (let f = 0; f < 5; f++) {
    const spread = (f - 2) * (0.03 + openness * 0.02);
    const len = 0.05 + openness * 0.07;
    for (let j = 1; j <= 4; j++) {
      lm.push({ x: cx + spread * (j / 2), y: cy + 0.04 - len * (j / 4), z: 0 });
    }
  }
  return { lm, openness };
}

export function useHandTracking(mode: TrackingMode) {
  // Per-frame hand data for the renderer: updated every result, never triggers React.
  const handRef = useRef<{ isDetected: boolean; openness: number; landmarks?: Landmark[] }>({
    isDetected: false,
    openness: 0.5,
  });
  const smoothRef = useRef<Landmark[] | null>(null);
  const missRef = useRef(0);
  const gestureCandRef = useRef<GestureType>('none');
  const gestureCountRef = useRef(0);
  const gestureStableRef = useRef<GestureType>('none');
  const lastEmitRef = useRef({ detected: false, gesture: 'none' as GestureType, openness: -1, t: 0 });
  const lastSendRef = useRef(0);

  const [gestureState, setGestureState] = useState<HandGestureState>({
    isDetected: false,
    openness: 0.5,
    position: null,
    gesture: 'none',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<MpHands | null>(null);
  const cameraRef = useRef<MpCamera | null>(null);
  const runIdRef = useRef(0);

  const emit = useCallback((sm: Landmark[], openness: number, gesture: GestureType) => {
    const last = lastEmitRef.current;
    const now = performance.now();
    if (
      !last.detected ||
      last.gesture !== gesture ||
      (Math.abs(last.openness - openness) > 0.06 && now - last.t > 120)
    ) {
      lastEmitRef.current = { detected: true, gesture, openness, t: now };
      setGestureState({ isDetected: true, openness, position: { x: sm[9].x, y: sm[9].y }, gesture, landmarks: sm });
    }
  }, []);

  const markLost = useCallback(() => {
    smoothRef.current = null;
    gestureStableRef.current = 'none';
    gestureCandRef.current = 'none';
    gestureCountRef.current = 0;
    handRef.current = { isDetected: false, openness: handRef.current.openness };
    lastEmitRef.current = { detected: false, gesture: 'none', openness: -1, t: 0 };
    setGestureState(prev => ({ ...prev, isDetected: false, position: null, gesture: 'none' }));
  }, []);

  const onResults = useCallback((results: { multiHandLandmarks?: Landmark[][] }) => {
    const raw = results.multiHandLandmarks?.[0];

    if (raw && raw.length >= 21) {
      missRef.current = 0;

      // Adaptive smoothing: calm when still (kills jitter), fast when moving (kills lag).
      const prev = smoothRef.current;
      const sm: Landmark[] = new Array(21);
      for (let i = 0; i < 21; i++) {
        const c = raw[i];
        if (!prev) {
          sm[i] = { x: c.x, y: c.y, z: c.z };
        } else {
          const p = prev[i];
          const a = Math.min(0.95, 0.35 + Math.hypot(c.x - p.x, c.y - p.y) * 12);
          sm[i] = { x: p.x + (c.x - p.x) * a, y: p.y + (c.y - p.y) * a, z: p.z + (c.z - p.z) * a };
        }
      }
      smoothRef.current = sm;

      const openness = handOpenness(sm);
      handRef.current = { isDetected: true, openness, landmarks: sm };

      // A gesture must hold for 3 frames before it switches (no flicker).
      const g = detectGesture(sm);
      if (g === gestureCandRef.current) gestureCountRef.current++;
      else {
        gestureCandRef.current = g;
        gestureCountRef.current = 1;
      }
      if (gestureCountRef.current >= 3) gestureStableRef.current = g;
      emit(sm, openness, gestureStableRef.current);
    } else {
      // Tolerate a few dropped frames before declaring the hand lost.
      missRef.current++;
      if (missRef.current >= 5 && handRef.current.isDetected) markLost();
    }
  }, [emit, markLost]);

  const cleanup = useCallback(() => {
    runIdRef.current++;
    try { cameraRef.current?.stop(); } catch { /* already stopped */ }
    cameraRef.current = null;
    try { handsRef.current?.close(); } catch { /* already closed */ }
    handsRef.current = null;
    const v = videoRef.current;
    if (v) {
      const stream = v.srcObject as MediaStream | null;
      stream?.getTracks().forEach(t => t.stop());
      v.pause();
      v.srcObject = null;
      v.remove();
      videoRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    cleanup();
    const runId = runIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadScript(`${MP_BASE}/hands/hands.js`),
        loadScript(`${MP_BASE}/camera_utils/camera_utils.js`),
      ]);
      if (runId !== runIdRef.current) return;

      const w = window as any;
      const hands: MpHands = new w.Hands({ locateFile: (file: string) => `${MP_BASE}/hands/${file}` });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: IS_MOBILE ? 0 : 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
        selfieMode: true,
      });
      hands.onResults(onResults);
      handsRef.current = hands;

      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.muted = true;
      video.style.display = 'none';
      document.body.appendChild(video);
      videoRef.current = video;

      const camera: MpCamera = new w.Camera(video, {
        onFrame: async () => {
          if (document.hidden || !handsRef.current || !videoRef.current) return;
          // Phones: cap inference at ~24fps to save battery and heat.
          const now = performance.now();
          if (IS_MOBILE && now - lastSendRef.current < 41) return;
          lastSendRef.current = now;
          await handsRef.current.send({ image: videoRef.current });
        },
        facingMode: 'user',
        width: IS_MOBILE ? 480 : 640,
        height: IS_MOBILE ? 360 : 480,
      });
      cameraRef.current = camera;
      await camera.start();
      if (runId === runIdRef.current) setIsLoading(false);
    } catch (err) {
      if (runId !== runIdRef.current) return;
      const e = err as Error;
      let message = 'Could not start the camera.';
      if (e?.name === 'NotReadableError') message = 'Camera is already in use by another app.';
      else if (e?.name === 'NotAllowedError') message = 'Camera access was denied. Allow it in your browser settings.';
      else if (e?.name === 'NotFoundError') message = 'No camera found on this device.';
      else if (e?.message) message = e.message;
      setError(message);
      setIsLoading(false);
    }
  }, [cleanup, onResults]);

  useEffect(() => {
    if (mode === 'camera') {
      void startCamera();
      return cleanup;
    }

    cleanup();
    setIsLoading(false);
    setError(null);

    if (mode === 'demo') {
      let raf = 0;
      const t0 = performance.now();
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        const { lm, openness } = demoLandmarks((now - t0) / 1000);
        handRef.current = { isDetected: true, openness, landmarks: lm };
        emit(lm, openness, 'open');
      };
      raf = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(raf);
        markLost();
      };
    }

    markLost();
    return undefined;
  }, [mode, startCamera, cleanup, emit, markLost]);

  return { gestureState, handRef, videoRef, isLoading, error, restart: startCamera };
}
