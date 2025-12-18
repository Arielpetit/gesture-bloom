import { cn } from '@/lib/utils';

interface RotationGizmoProps {
    rotation: { x: number; y: number };
    isGrabbing: boolean;
}

export function RotationGizmo({ rotation, isGrabbing }: RotationGizmoProps) {
    // Map rotation to CSS transforms for a 3D-like effect
    // We use a simplified projection for the UI
    const rotateX = (rotation.x * 180) / Math.PI;
    const rotateY = (rotation.y * 180) / Math.PI;

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-16 h-16">
                {/* Outer Ring */}
                <div className={cn(
                    "absolute inset-0 rounded-full border-2 border-white/10 transition-colors duration-300",
                    isGrabbing && "border-primary/40"
                )} />

                {/* 3D Sphere Representation */}
                <div
                    className="absolute inset-2 rounded-full border border-white/20 flex items-center justify-center overflow-hidden"
                    style={{
                        perspective: '100px',
                    }}
                >
                    <div
                        className="w-full h-full relative transition-transform duration-75 ease-out"
                        style={{
                            transform: `rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`,
                            transformStyle: 'preserve-3d',
                        }}
                    >
                        {/* Grid Lines */}
                        <div className="absolute inset-0 border-t border-white/10 top-1/2 -translate-y-1/2" />
                        <div className="absolute inset-0 border-l border-white/10 left-1/2 -translate-x-1/2" />

                        {/* Front Face Dot */}
                        <div
                            className={cn(
                                "absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.5)]",
                                isGrabbing && "bg-primary shadow-[0_0_12px_rgba(var(--primary),0.8)]"
                            )}
                            style={{ transform: 'translateZ(24px)' }}
                        />
                    </div>
                </div>

                {/* Grabbing Indicator */}
                {isGrabbing && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}
            </div>

            <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">Orientation</span>
                <div className="flex gap-2 text-[9px] font-mono text-white/20">
                    <span>X: {Math.round(rotateX % 360)}°</span>
                    <span>Y: {Math.round(rotateY % 360)}°</span>
                </div>
            </div>
        </div>
    );
}
