import { useState } from 'react';
import { PatternType, ParticleColor, HandGestureState } from '@/types/particle';
import { PatternSelector } from './PatternSelector';
import { ColorPicker } from './ColorPicker';
import { FullscreenButton } from './FullscreenButton';
import { HandIndicator } from './HandIndicator';
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  selectedPattern: PatternType;
  onPatternChange: (pattern: PatternType) => void;
  selectedColor: ParticleColor;
  onColorChange: (color: ParticleColor) => void;
  gestureState: HandGestureState;
  isLoading: boolean;
  error: string | null;
}

export function ControlPanel({
  selectedPattern,
  onPatternChange,
  selectedColor,
  onColorChange,
  gestureState,
  isLoading,
  error,
}: ControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Top header */}
      <header className="fixed top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2">
            <h1 className="text-lg font-semibold gradient-text">
              Particle Flow
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'glass-panel p-3 transition-all duration-300',
              'hover:bg-card/80 sm:hidden'
            )}
          >
            <svg 
              className={cn(
                'w-5 h-5 text-primary transition-transform duration-300',
                isCollapsed && 'rotate-180'
              )} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" 
              />
            </svg>
          </button>
          <FullscreenButton />
        </div>
      </header>

      {/* Side panel */}
      <aside
        className={cn(
          'fixed right-0 top-0 bottom-0 z-10 w-72 p-4 pt-20',
          'flex flex-col gap-4 overflow-y-auto',
          'transition-transform duration-300',
          isCollapsed && 'translate-x-full sm:translate-x-0'
        )}
      >
        <PatternSelector
          selectedPattern={selectedPattern}
          onPatternChange={onPatternChange}
        />
        
        <ColorPicker
          selectedColor={selectedColor}
          onColorChange={onColorChange}
        />

        {/* Instructions */}
        <div 
          className="glass-panel p-4 animate-fade-in" 
          style={{ animationDelay: '0.2s' }}
        >
          <h3 className="floating-label mb-3">How to Use</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">✋</span>
              <span>Open your hand to <span className="text-foreground">expand</span> particles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✊</span>
              <span>Close your fist to <span className="text-foreground">contract</span> particles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">◉</span>
              <span>Select different <span className="text-foreground">patterns</span> above</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">🎨</span>
              <span>Choose a <span className="text-foreground">color theme</span> for particles</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* Hand indicator */}
      <HandIndicator
        gestureState={gestureState}
        isLoading={isLoading}
        error={error}
      />
    </>
  );
}
