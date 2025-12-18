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

  // Check if finger is extended by comparing tip to PIP joint distance from wrist
  const isFingerExtended = useCallback((landmarks: any[], tipIdx: number, pipIdx: number, mcpIdx: number) => {
    const wrist = landmarks[0];
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    const mcp = landmarks[mcpIdx];
    
    // Distance from tip to wrist
    const tipToWrist = Math.sqrt(
      Math.pow(tip.x - wrist.x, 2) + 
      Math.pow(tip.y - wrist.y, 2) + 
      Math.pow(tip.z - wrist.z, 2)
    );
    
    // Distance from pip to wrist
    const pipToWrist = Math.sqrt(
      Math.pow(pip.x - wrist.x, 2) + 
      Math.pow(pip.y - wrist.y, 2) + 
      Math.pow(pip.z - wrist.z, 2)
    );
    
    // Finger is extended if tip is further from wrist than pip
    return tipToWrist > pipToWrist * 1.1;
  }, []);

  // Thumb extension is different - check horizontal spread
  const isThumbExtended = useCallback((landmarks: any[]) => {
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const indexMcp = landmarks[5];
    const wrist = landmarks[0];
    
    // Check if thumb tip is far from index finger base (spread out)
    const thumbToIndex = Math.abs(thumbTip.x - indexMcp.x);
    const palmWidth = Math.abs(landmarks[5].x - landmarks[17].x); // index mcp to pinky mcp
    
    return thumbToIndex > palmWidth * 0.5;
  }, []);

  const detectGesture = useCallback((landmarks: any[]): GestureType => {
    // Check each finger
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, 8, 6, 5);
    const middle = isFingerExtended(landmarks, 12, 10, 9);
    const ring = isFingerExtended(landmarks, 16, 14, 13);
    const pinky = isFingerExtended(landmarks, 20, 18, 17);
    
    const extendedCount = [index, middle, ring, pinky].filter(Boolean).length;
    
    console.log('Gesture Debug:', { thumb, index, middle, ring, pinky, extendedCount });

    // Peace sign: ONLY index and middle extended
    if (index && middle && !ring && !pinky) {
      console.log('Detected: PEACE');
      return 'peace';
    }
    
    // Thumbs up: thumb extended, all fingers closed
    if (thumb && !index && !middle && !ring && !pinky) {
      console.log('Detected: THUMBS UP');
      return 'thumbsUp';
    }
    
    // Pointing: only index extended
    if (index && !middle && !ring && !pinky) {
      console.log('Detected: POINTING');
      return 'pointing';
    }
    
    // Rock gesture: index and pinky extended, middle and ring closed
    if (index && !middle && !ring && pinky) {
      console.log('Detected: ROCK');
      return 'rock';
    }
    
    // Open hand: 4+ fingers extended
    if (extendedCount >= 3) {
      return 'open';
    }
    
    // Fist: all fingers closed
    if (extendedCount <= 1 && !thumb) {
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
