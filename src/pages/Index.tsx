import { useState, useEffect, useRef } from 'react';
import { PatternType, ParticleColor, GestureType } from '@/types/particle';
import { DEFAULT_CONFIG, PARTICLE_COLORS } from '@/constants/patterns';
import { useHandTracking } from '@/hooks/useHandTracking';
import { ParticleScene } from '@/components/ParticleScene';
import { ControlPanel } from '@/components/ControlPanel';
import { RotationGizmo } from '@/components/RotationGizmo';
import { cn } from '@/lib/utils';

// Map gestures to patterns
const GESTURE_PATTERN_MAP: Partial<Record<GestureType, PatternType>> = {
    peace: 'heart',
    callMe: 'love',
    rock: 'galaxy',
    pointing: 'helix',
};

const Index = () => {
    const [selectedPattern, setSelectedPattern] = useState<PatternType>(DEFAULT_CONFIG.pattern);
    const [selectedColor, setSelectedColor] = useState<ParticleColor>(PARTICLE_COLORS[0]);
    const [manualPattern, setManualPattern] = useState<PatternType | null>(null);
    const [gestureTriggeredPattern, setGestureTriggeredPattern] = useState<PatternType | null>(null);
    const [sensitivity, setSensitivity] = useState(0.5); // 0 to 1
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [isGrabbing, setIsGrabbing] = useState(false);
    const [showPortrait, setShowPortrait] = useState(false);

    const { gestureState, isLoading, error } = useHandTracking();
    const gestureBufferRef = useRef<GestureType[]>([]);

    // Handle gesture-based pattern switching with smoothing and sticky reset
    useEffect(() => {
        const currentGesture = gestureState.gesture;

        // Dynamic buffer and reset based on sensitivity
        // High sensitivity (1.0) -> Buffer 4, Reset 10
        // Low sensitivity (0.0) -> Buffer 20, Reset 60
        const bufferSize = Math.max(4, Math.floor(20 - sensitivity * 16));

        // Add to buffer
        gestureBufferRef.current.push(currentGesture);
        if (gestureBufferRef.current.length > bufferSize) {
            gestureBufferRef.current.shift();
        }
        // Find most frequent gesture in buffer
        const counts: Record<string, number> = {};
        gestureBufferRef.current.forEach(g => counts[g] = (counts[g] || 0) + 1);

        let stableGesture: GestureType = 'none';
        let maxCount = 0;
        for (const [g, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                stableGesture = g as GestureType;
            }
        }

        // Stability threshold (50% of buffer)
        const isStable = maxCount >= Math.floor(bufferSize * 0.5);
        const mappedPattern = GESTURE_PATTERN_MAP[stableGesture];

        if (isStable) {
            if (mappedPattern) {
                // If we have a stable special gesture, switch immediately
                if (selectedPattern !== mappedPattern) {
                    console.log('>>> GESTURE TRIGGERED:', stableGesture, '->', mappedPattern);
                    setGestureTriggeredPattern(mappedPattern);
                    setSelectedPattern(mappedPattern);
                }
            } else if (stableGesture === 'middleFinger') {
                // Middle finger gesture triggers portrait
                if (!showPortrait) {
                    console.log('>>> MIDDLE FINGER GESTURE: Showing portrait');
                    setShowPortrait(true);
                }
            } else if (stableGesture === 'none' || stableGesture === 'open' || stableGesture === 'fist') {
                // Reset portrait if hand is open/fist/none (optional, or just leave it)
                // For now, let's make it toggle or stay until closed
            }
        }
    }, [gestureState, manualPattern, gestureTriggeredPattern, selectedPattern, sensitivity, showPortrait]);

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
                onRotationChange={(rot, grabbing) => {
                    setRotation(rot);
                    setIsGrabbing(grabbing);
                }}
            />

            <ControlPanel
                selectedPattern={selectedPattern}
                onPatternChange={handlePatternChange}
                selectedColor={selectedColor}
                onColorChange={setSelectedColor}
                gestureState={gestureState}
                isLoading={isLoading}
                error={error}
                sensitivity={sensitivity}
                onSensitivityChange={setSensitivity}
                showPortrait={showPortrait}
                onTogglePortrait={() => setShowPortrait(!showPortrait)}
            />

            {/* Rotation Gizmo Overlay */}
            <div className={cn(
                "fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-500",
                // Desktop position
                "md:bottom-8",
                // Mobile position: move up to avoid bottom control panel
                "max-md:bottom-24"
            )}>
                <RotationGizmo rotation={rotation} isGrabbing={isGrabbing} />
            </div>

            {/* Portrait Overlay */}
            {showPortrait && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-500">
                    <div className="relative max-w-2xl w-full aspect-square md:aspect-square max-md:h-[70vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl group">
                        <img
                            src="/portrait.png"
                            alt="Particle Portrait"
                            className="w-full h-full object-cover animate-in zoom-in-95 duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <button
                            onClick={() => setShowPortrait(false)}
                            className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all"
                        >
                            ✕
                        </button>

                        <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 text-white opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                            <h3 className="text-xl md:text-2xl font-bold mb-1">Particle Portrait</h3>
                            <p className="text-xs md:text-sm text-white/60">A hyper-realistic digital being composed of glowing particles.</p>
                        </div>
                    </div>
                </div>
            )}

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
