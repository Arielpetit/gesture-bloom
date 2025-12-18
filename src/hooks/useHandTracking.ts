import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { HandGestureState, GestureType } from '@/types/particle';

const INITIAL_STATE: HandGestureState = {
  isDetected: false,
  openness: 0.5,
  position: null,
  gesture: 'none',
  velocity: { x: 0, y: 0 },
  depth: 0.5,
  confidence: 0,
};

export function useHandTracking() {
  const [gestureState, setGestureState] = useState<HandGestureState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const lastPositionRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const isFingerExtended = useCallback((landmarks: any[], fingerTip: number, fingerPip: number, fingerMcp: number) => {
    const tip = landmarks[fingerTip];
    const pip = landmarks[fingerPip];
    const mcp = landmarks[fingerMcp];
    
    // Check if fingertip is above (lower y value) the PIP joint
    const extendedY = tip.y < pip.y;
    // Also check distance from MCP
    const tipToMcp = Math.sqrt(
      Math.pow(tip.x - mcp.x, 2) + 
      Math.pow(tip.y - mcp.y, 2) + 
      Math.pow(tip.z - mcp.z, 2)
    );
    const pipToMcp = Math.sqrt(
      Math.pow(pip.x - mcp.x, 2) + 
      Math.pow(pip.y - mcp.y, 2) + 
      Math.pow(pip.z - mcp.z, 2)
    );
    
    return extendedY && tipToMcp > pipToMcp * 1.2;
  }, []);

  const isThumbExtended = useCallback((landmarks: any[]) => {
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];
    const indexMcp = landmarks[5];
    
    // Thumb is extended if tip is far from index MCP
    const tipToIndex = Math.sqrt(
      Math.pow(thumbTip.x - indexMcp.x, 2) + 
      Math.pow(thumbTip.y - indexMcp.y, 2)
    );
    
    return tipToIndex > 0.1;
  }, []);

  const detectGesture = useCallback((landmarks: any[]): GestureType => {
    const indexExtended = isFingerExtended(landmarks, 8, 6, 5);
    const middleExtended = isFingerExtended(landmarks, 12, 10, 9);
    const ringExtended = isFingerExtended(landmarks, 16, 14, 13);
    const pinkyExtended = isFingerExtended(landmarks, 20, 18, 17);
    const thumbExtended = isThumbExtended(landmarks);
    
    const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;
    
    // Peace sign: index and middle extended, others closed
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      return 'peace';
    }
    
    // Thumbs up: thumb extended, all fingers closed
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      // Check if thumb is pointing up (tip above IP)
      if (landmarks[4].y < landmarks[3].y) {
        return 'thumbsUp';
      }
    }
    
    // Love sign (🤟): thumb, index, and pinky extended
    if (thumbExtended && indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
      return 'love';
    }
    
    // Point: only index extended
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'point';
    }
    
    // Fist: all fingers closed
    if (extendedCount === 0 && !thumbExtended) {
      return 'fist';
    }
    
    // Open hand: all fingers extended
    if (extendedCount >= 3 && thumbExtended) {
      return 'open';
    }
    
    return 'none';
  }, [isFingerExtended, isThumbExtended]);

  const calculateHandOpenness = useCallback((landmarks: any[]) => {
    const palmCenter = landmarks[0];
    const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
    const fingerBases = [landmarks[2], landmarks[5], landmarks[9], landmarks[13], landmarks[17]];

    let totalExtension = 0;
    for (let i = 0; i < 5; i++) {
      const tipToPalm = Math.sqrt(
        Math.pow(fingerTips[i].x - palmCenter.x, 2) +
        Math.pow(fingerTips[i].y - palmCenter.y, 2) +
        Math.pow(fingerTips[i].z - palmCenter.z, 2)
      );
      const baseToPalm = Math.sqrt(
        Math.pow(fingerBases[i].x - palmCenter.x, 2) +
        Math.pow(fingerBases[i].y - palmCenter.y, 2) +
        Math.pow(fingerBases[i].z - palmCenter.z, 2)
      );
      totalExtension += tipToPalm / (baseToPalm + 0.001);
    }

    const avgExtension = totalExtension / 5;
    return Math.min(1, Math.max(0, (avgExtension - 1.2) / 1.5));
  }, []);

  const calculateVelocity = useCallback((currentPos: { x: number; y: number }) => {
    const now = Date.now();
    if (!lastPositionRef.current) {
      lastPositionRef.current = { ...currentPos, time: now };
      return { x: 0, y: 0 };
    }

    const dt = Math.max(1, now - lastPositionRef.current.time) / 1000;
    const velocity = {
      x: (currentPos.x - lastPositionRef.current.x) / dt,
      y: (currentPos.y - lastPositionRef.current.y) / dt,
    };

    lastPositionRef.current = { ...currentPos, time: now };
    
    // Clamp velocity for stability
    return {
      x: Math.max(-5, Math.min(5, velocity.x)),
      y: Math.max(-5, Math.min(5, velocity.y)),
    };
  }, []);

  const calculateDepth = useCallback((landmarks: any[]) => {
    // Average z-depth of key landmarks
    const keyPoints = [landmarks[0], landmarks[5], landmarks[9], landmarks[13], landmarks[17]];
    const avgDepth = keyPoints.reduce((sum, p) => sum + p.z, 0) / keyPoints.length;
    // Normalize to 0-1 range (closer = higher value)
    return Math.min(1, Math.max(0, 0.5 - avgDepth * 5));
  }, []);

  const onResults = useCallback((results: Results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const openness = calculateHandOpenness(landmarks);
      const gesture = detectGesture(landmarks);
      const palmCenter = landmarks[9];
      const position = { x: palmCenter.x, y: palmCenter.y };
      const velocity = calculateVelocity(position);
      const depth = calculateDepth(landmarks);
      
      setGestureState({
        isDetected: true,
        openness,
        position,
        gesture,
        velocity,
        depth,
        confidence: 1,
      });
    } else {
      setGestureState(prev => ({
        ...prev,
        isDetected: false,
        position: null,
        gesture: 'none',
        velocity: { x: 0, y: 0 },
        confidence: 0,
      }));
    }
  }, [calculateHandOpenness, detectGesture, calculateVelocity, calculateDepth]);

  const initializeHandTracking = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.style.display = 'none';
      document.body.appendChild(video);
      videoRef.current = video;

      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      const camera = new Camera(video, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;
      setIsLoading(false);
    } catch (err) {
      console.error('Hand tracking initialization error:', err);
      setError('Failed to initialize camera. Please allow camera access.');
      setIsLoading(false);
    }
  }, [onResults]);

  const cleanup = useCallback(() => {
    cameraRef.current?.stop();
    handsRef.current?.close();
    videoRef.current?.remove();
  }, []);

  useEffect(() => {
    initializeHandTracking();
    return cleanup;
  }, [initializeHandTracking, cleanup]);

  return {
    gestureState,
    isLoading,
    error,
    restart: initializeHandTracking,
  };
}
