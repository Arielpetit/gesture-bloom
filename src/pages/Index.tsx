import { useState } from 'react';
import { PatternType, ParticleColor } from '@/types/particle';
import { DEFAULT_CONFIG, PARTICLE_COLORS } from '@/constants/patterns';
import { useHandTracking } from '@/hooks/useHandTracking';
import { ParticleScene } from '@/components/ParticleScene';
import { ControlPanel } from '@/components/ControlPanel';

const Index = () => {
  const [selectedPattern, setSelectedPattern] = useState<PatternType>(DEFAULT_CONFIG.pattern);
  const [selectedColor, setSelectedColor] = useState<ParticleColor>(PARTICLE_COLORS[0]);
  
  const { gestureState, isLoading, error } = useHandTracking();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Particle Scene */}
      <ParticleScene
        pattern={selectedPattern}
        color={selectedColor}
        gestureState={gestureState}
        particleCount={5000}
      />

      {/* UI Controls */}
      <ControlPanel
        selectedPattern={selectedPattern}
        onPatternChange={setSelectedPattern}
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
