import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { HandGestureState } from '@/types/particle';

export function useHandTracking() {
  const [gestureState, setGestureState] = useState<HandGestureState>({
    isDetected: false,
    openness: 0.5,
    position: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const calculateHandOpenness = useCallback((landmarks: any[]) => {
    // Calculate distance between fingertips and palm center
    const palmCenter = landmarks[0]; // Wrist
    const fingerTips = [
      landmarks[4],  // Thumb tip
      landmarks[8],  // Index tip
      landmarks[12], // Middle tip
      landmarks[16], // Ring tip
      landmarks[20], // Pinky tip
    ];

    const fingerBases = [
      landmarks[2],  // Thumb base
      landmarks[5],  // Index base
      landmarks[9],  // Middle base
      landmarks[13], // Ring base
      landmarks[17], // Pinky base
    ];

    // Calculate average extension ratio
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

    // Normalize to 0-1 range
    const avgExtension = totalExtension / 5;
    const openness = Math.min(1, Math.max(0, (avgExtension - 1.2) / 1.5));
    
    return openness;
  }, []);

  const onResults = useCallback((results: Results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const openness = calculateHandOpenness(landmarks);
      
      // Get palm center for position
      const palmCenter = landmarks[9]; // Middle finger base
      
      setGestureState({
        isDetected: true,
        openness,
        position: { x: palmCenter.x, y: palmCenter.y },
      });
    } else {
      setGestureState(prev => ({
        ...prev,
        isDetected: false,
        position: null,
      }));
    }
  }, [calculateHandOpenness]);

  const initializeHandTracking = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create video element
      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.style.display = 'none';
      document.body.appendChild(video);
      videoRef.current = video;

      // Initialize MediaPipe Hands
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      // Initialize camera
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
    if (cameraRef.current) {
      cameraRef.current.stop();
    }
    if (handsRef.current) {
      handsRef.current.close();
    }
    if (videoRef.current) {
      videoRef.current.remove();
    }
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
