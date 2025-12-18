import { HandGestureState } from '@/types/particle';
import { cn } from '@/lib/utils';

interface HandIndicatorProps {
  gestureState: HandGestureState;
  isLoading: boolean;
  error: string | null;
}

export function HandIndicator({
  gestureState,
  isLoading,
  error,
}: HandIndicatorProps) {
  const getStatusText = () => {
    if (error) return 'Camera error';
    if (isLoading) return 'Initializing camera...';
    if (gestureState.isDetected) {
      const openPercent = Math.round(gestureState.openness * 100);
      return `Hand detected • ${openPercent}% open`;
    }
    return 'No hand detected';
  };

  const getStatusIcon = () => {
    if (error) return '⚠';
    if (isLoading) return '◌';
    if (gestureState.isDetected) return '✋';
    return '○';
  };

  return (
    <div
      className={cn(
        'hand-indicator flex items-center gap-2 transition-all duration-300',
        gestureState.isDetected && 'detected',
        error && 'border-destructive/50'
      )}
    >
      <span 
        className={cn(
          'text-lg transition-transform duration-300',
          gestureState.isDetected && 'animate-pulse-glow',
          isLoading && 'animate-spin'
        )}
      >
        {getStatusIcon()}
      </span>
      <span className="text-foreground/80">{getStatusText()}</span>
      
      {/* Openness bar */}
      {gestureState.isDetected && (
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden ml-2">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-150"
            style={{ width: `${gestureState.openness * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
