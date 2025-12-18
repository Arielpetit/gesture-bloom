import { useState } from 'react';
import { PatternType, ParticleColor, HandGestureState, GestureType } from '@/types/particle';
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
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
  showPortrait: boolean;
  onTogglePortrait: () => void;
}

// Define gesture labels and icons consistently
const GESTURE_LABELS: Record<GestureType, string> = {
  none: 'No gesture',
  open: 'Open hand',
  fist: 'Fist',
  peace: '✌️ Peace → Heart',
  pointing: '☝️ Pointing → Helix',
  rock: '🤘 Rock → Galaxy',
  iLoveYou: '🤟 I Love You',
  callMe: '🤙 Call Me → I Love You',
  middleFinger: '� Middle Finger → Portrait',
};

const GESTURE_ICONS: Record<GestureType, string> = {
  none: '○',
  open: '✋',
  fist: '✊',
  peace: '✌️',
  pointing: '☝️',
  rock: '🤘',
  iLoveYou: '🤟',
  callMe: '🤙',
  middleFinger: '�',
};

export function ControlPanel({
  selectedPattern,
  onPatternChange,
  selectedColor,
  onColorChange,
  gestureState,
  isLoading,
  error,
  sensitivity,
  onSensitivityChange,
  showPortrait,
  onTogglePortrait,
}: ControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={cn(
        'fixed z-50 transition-all duration-500 ease-in-out',
        // Desktop: Right side
        'md:right-6 md:top-1/2 md:-translate-y-1/2',
        isCollapsed
          ? 'md:translate-x-[calc(100%-20px)]'
          : 'md:translate-x-0',
        // Mobile: Bottom side
        'max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:px-4 max-md:pb-4',
        isCollapsed
          ? 'max-md:translate-y-[calc(100%-40px)]'
          : 'max-md:translate-y-0'
      )}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute bg-background/80 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-background transition-colors group z-10",
          // Desktop toggle
          "md:-left-4 md:top-1/2 md:-translate-y-1/2 md:w-8 md:h-12 md:rounded-l-xl",
          // Mobile toggle
          "max-md:left-1/2 max-md:-top-4 max-md:-translate-x-1/2 max-md:w-16 max-md:h-8 max-md:rounded-t-xl"
        )}
      >
        <div className={cn(
          'rounded-full bg-primary/50 group-hover:bg-primary transition-all',
          // Desktop dot
          'md:w-1.5 md:h-1.5',
          isCollapsed && 'md:scale-150 md:bg-primary',
          // Mobile bar
          'max-md:w-8 max-md:h-1',
          isCollapsed && 'max-md:w-12 max-md:bg-primary'
        )} />
      </button>

      <div className={cn(
        "bg-background/40 backdrop-blur-xl border border-white/10 shadow-2xl custom-scrollbar space-y-6 md:space-y-8 transition-all duration-500",
        // Desktop sizing
        "md:w-80 md:max-h-[90vh] md:rounded-3xl md:p-6",
        // Mobile sizing
        "max-md:w-full max-md:max-h-[60vh] max-md:rounded-t-3xl max-md:p-5 overflow-y-auto"
      )}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Particle Flow
          </h2>
          <FullscreenButton />
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">Pattern</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {selectedPattern}
            </span>
          </div>
          <PatternSelector selectedPattern={selectedPattern} onPatternChange={onPatternChange} />
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">Color Theme</h3>
          <ColorPicker selectedColor={selectedColor} onColorChange={onColorChange} />
          <p className="text-[10px] text-center text-white/30">
            Selected: <span className="text-white/60 font-medium">{selectedColor.name}</span>
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">Gesture Sensitivity</h3>
            <span className="text-[10px] text-primary font-mono">{Math.round(sensitivity * 100)}%</span>
          </div>
          <div className="px-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sensitivity}
              onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
            />
            <div className="flex justify-between mt-2 text-[9px] text-white/20 uppercase tracking-tighter">
              <span>Stable</span>
              <span>Reactive</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">Gesture Controls</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-xs text-white/60 group">
              <span className="w-5 h-5 flex items-center justify-center rounded-md bg-white/5 group-hover:bg-primary/10 transition-colors">✋</span>
              <span className="group-hover:text-white transition-colors">Open hand to <span className="text-primary/80">expand</span></span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/60 group">
              <span className="w-5 h-5 flex items-center justify-center rounded-md bg-white/5 group-hover:bg-primary/10 transition-colors">✊</span>
              <span className="group-hover:text-white transition-colors">Fist to <span className="text-primary/80">contract</span></span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/60 group">
              <span className="w-5 h-5 flex items-center justify-center rounded-md bg-white/5 group-hover:bg-primary/10 transition-colors">✌️</span>
              <span className="group-hover:text-white transition-colors">Peace sign → <span className="text-primary/80">Heart shape</span></span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/60 group">
              <span className="w-5 h-5 flex items-center justify-center rounded-md bg-white/5 group-hover:bg-primary/10 transition-colors">🤙</span>
              <span className="group-hover:text-white transition-colors">Call me → <span className="text-primary/80">I love you</span></span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/60 group">
              <span className="w-5 h-5 flex items-center justify-center rounded-md bg-white/5 group-hover:bg-primary/10 transition-colors">☝️</span>
              <span className="group-hover:text-white transition-colors">Point → <span className="text-primary/80">Helix</span></span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/60 group">
              <span className="w-5 h-5 flex items-center justify-center rounded-md bg-white/5 group-hover:bg-primary/10 transition-colors">🤘</span>
              <span className="group-hover:text-white transition-colors">Rock sign → <span className="text-primary/80">Galaxy</span></span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/60 group">
              <span className="w-5 h-5 flex items-center justify-center rounded-md bg-white/5 group-hover:bg-primary/10 transition-colors">�</span>
              <span className="group-hover:text-white transition-colors">Middle finger → <span className="text-primary/80">Particle Portrait</span></span>
            </div>
          </div>
        </section>

        <div className="pt-2 border-t border-white/5">
          <HandIndicator gestureState={gestureState} isLoading={isLoading} error={error} />
        </div>
      </div>
    </div>
  );
}
