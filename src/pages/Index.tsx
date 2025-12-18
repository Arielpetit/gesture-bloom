import { useState, useEffect, useRef } from 'react';
import { PatternType, ParticleColor, GestureType } from '@/types/particle';
import { DEFAULT_CONFIG, PARTICLE_COLORS } from '@/constants/patterns';
import { useHandTracking } from '@/hooks/useHandTracking';
import { ParticleScene } from '@/components/ParticleScene';
import { ControlPanel } from '@/components/ControlPanel';

// Map gestures to patterns
const GESTURE_PATTERN_MAP: Partial<Record<GestureType, PatternType>> = {
  peace: 'heart',
  thumbsUp: 'love',
  rock: 'galaxy',
  pointing: 'helix',
};

const Index = () => {
  const [selectedPattern, setSelectedPattern] = useState<PatternType>(DEFAULT_CONFIG.pattern);
  const [selectedColor, setSelectedColor] = useState<ParticleColor>(PARTICLE_COLORS[0]);
  const [manualPattern, setManualPattern] = useState<PatternType | null>(null);
  const [gestureTriggeredPattern, setGestureTriggeredPattern] = useState<PatternType | null>(null);
  
  const { gestureState, isLoading, error } = useHandTracking();
  const lastGestureRef = useRef<GestureType>('none');
  const gestureHoldCountRef = useRef<number>(0);

  // Handle gesture-based pattern switching
  useEffect(() => {
    const gesture = gestureState.gesture;
    
    // Count how long gesture is held
    if (gesture === lastGestureRef.current) {
      gestureHoldCountRef.current += 1;
    } else {
      gestureHoldCountRef.current = 0;
      lastGestureRef.current = gesture;
    }

    // Require gesture to be held for ~5 frames (reduced from 10 for faster response)
    if (gestureHoldCountRef.current >= 5) {
      const mappedPattern = GESTURE_PATTERN_MAP[gesture];
      
      if (mappedPattern) {
        // Special gesture detected - switch to mapped pattern
        console.log('Switching to pattern:', mappedPattern, 'for gesture:', gesture);
        setGestureTriggeredPattern(mappedPattern);
        setSelectedPattern(mappedPattern);
      } else if (gesture === 'none' || gesture === 'open' || gesture === 'fist') {
        // No special gesture - return to manual pattern if one was set
        if (gestureTriggeredPattern && manualPattern) {
          setGestureTriggeredPattern(null);
          setSelectedPattern(manualPattern);
        }
      }
    }
  }, [gestureState.gesture, manualPattern, gestureTriggeredPattern]);

  // Handle manual pattern selection
  const handlePatternChange = (pattern: PatternType) => {
    setManualPattern(pattern);
    setGestureTriggeredPattern(null);
    setSelectedPattern(pattern);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <ParticleScene
        pattern={selectedPattern}
        color={selectedColor}
        gestureState={gestureState}
        particleCount={8000}
      />

      <ControlPanel
        selectedPattern={selectedPattern}
        onPatternChange={handlePatternChange}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        gestureState={gestureState}
        isLoading={isLoading}
        error={error}
      />

      {/* Decorative gradient overlays */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div 
          className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle, ${selectedColor.color}33 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(60px)',
          }}
        />
        <div 
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15"
          style={{
            background: `radial-gradient(circle, ${selectedColor.color}22 0%, transparent 70%)`,
            transform: 'translate(30%, 30%)',
            filter: 'blur(80px)',
          }}
        />
      </div>
    </div>
  );
};

export default Index;
