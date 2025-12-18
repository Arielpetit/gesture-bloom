import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { HandGestureState, GestureType } from '@/types/particle';

export function useHandTracking() {
  const [gestureState, setGestureState] = useState<HandGestureState>({
    isDetected: false,
    openness: 0.5,
    position: null,
    gesture: 'none',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const isFingerExtended = useCallback((landmarks: any[], fingerTip: number, fingerPip: number, fingerMcp: number) => {
    const tip = landmarks[fingerTip];
    const pip = landmarks[fingerPip];
    const mcp = landmarks[fingerMcp];
    
    // For vertical fingers, check Y position
    const tipToPip = Math.sqrt(
      Math.pow(tip.x - pip.x, 2) + Math.pow(tip.y - pip.y, 2) + Math.pow(tip.z - pip.z, 2)
    );
    const pipToMcp = Math.sqrt(
      Math.pow(pip.x - mcp.x, 2) + Math.pow(pip.y - mcp.y, 2) + Math.pow(pip.z - mcp.z, 2)
    );
    
    // Finger is extended if tip is above pip (lower Y) and distance is significant
    return tip.y < pip.y && tipToPip > pipToMcp * 0.5;
  }, []);

  const isThumbExtended = useCallback((landmarks: any[]) => {
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];
    const indexMcp = landmarks[5];
    
    // Thumb is extended if it's away from the palm (index mcp)
    const thumbToIndex = Math.sqrt(
      Math.pow(thumbTip.x - indexMcp.x, 2) + Math.pow(thumbTip.z - indexMcp.z, 2)
    );
    
    return thumbToIndex > 0.1;
  }, []);

  const detectGesture = useCallback((landmarks: any[]): GestureType => {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, 8, 6, 5);
    const middle = isFingerExtended(landmarks, 12, 10, 9);
    const ring = isFingerExtended(landmarks, 16, 14, 13);
    const pinky = isFingerExtended(landmarks, 20, 18, 17);
    
    const extendedCount = [thumb, index, middle, ring, pinky].filter(Boolean).length;

    // Peace sign: index and middle extended, others closed
    if (index && middle && !ring && !pinky) {
      return 'peace';
    }
    
    // Thumbs up: only thumb extended
    if (thumb && !index && !middle && !ring && !pinky) {
      return 'thumbsUp';
    }
    
    // Pointing: only index extended
    if (index && !middle && !ring && !pinky) {
      return 'pointing';
    }
    
    // Rock gesture: index and pinky extended
    if (index && pinky && !middle && !ring) {
      return 'rock';
    }
    
    // Open hand: most fingers extended
    if (extendedCount >= 4) {
      return 'open';
    }
    
    // Fist: no fingers extended
    if (extendedCount <= 1) {
      return 'fist';
    }
    
    return 'none';
  }, [isFingerExtended, isThumbExtended]);

  const calculateHandOpenness = useCallback((landmarks: any[]) => {
    const palmCenter = landmarks[0];
    const fingerTips = [
      landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20],
    ];
    const fingerBases = [
      landmarks[2], landmarks[5], landmarks[9], landmarks[13], landmarks[17],
    ];

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

  const onResults = useCallback((results: Results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const openness = calculateHandOpenness(landmarks);
      const gesture = detectGesture(landmarks);
      const palmCenter = landmarks[9];
      
      setGestureState({
        isDetected: true,
        openness,
        position: { x: palmCenter.x, y: palmCenter.y },
        gesture,
      });
    } else {
      setGestureState(prev => ({
        ...prev,
        isDetected: false,
        position: null,
        gesture: 'none',
      }));
    }
  }, [calculateHandOpenness, detectGesture]);

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
        minDetectionConfidence: 0.7,
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
    if (cameraRef.current) cameraRef.current.stop();
    if (handsRef.current) handsRef.current.close();
    if (videoRef.current) videoRef.current.remove();
  }, []);

  useEffect(() => {
    initializeHandTracking();
    return cleanup;
  }, [initializeHandTracking, cleanup]);

  return { gestureState, isLoading, error, restart: initializeHandTracking };
}
