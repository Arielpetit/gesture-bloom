import { HandGestureState, GestureType } from '@/types/particle';
import { cn } from '@/lib/utils';

interface HandIndicatorProps {
  gestureState: HandGestureState;
  isLoading: boolean;
  error: string | null;
}

const GESTURE_ICONS: Record<GestureType, string> = {
  none: '○',
  open: '✋',
  fist: '✊',
  peace: '✌️',
  thumbsUp: '👍',
  love: '🤟',
  point: '👆',
};

const GESTURE_NAMES: Record<GestureType, string> = {
  none: 'No gesture',
  open: 'Open Palm',
  fist: 'Fist',
  peace: 'Peace → Heart',
  thumbsUp: 'Thumbs Up → Burst',
  love: 'Love Sign → I♥U',
  point: 'Point → Star',
};

export function HandIndicator({
  gestureState,
  isLoading,
  error,
}: HandIndicatorProps) {
  const getStatusText = () => {
    if (error) return 'Camera error';
    if (isLoading) return 'Initializing camera...';
    if (gestureState.isDetected) {
      return GESTURE_NAMES[gestureState.gesture] || 'Hand detected';
    }
    return 'Show your hand';
  };

  const getStatusIcon = () => {
    if (error) return '⚠️';
    if (isLoading) return '◌';
    if (gestureState.isDetected) {
      return GESTURE_ICONS[gestureState.gesture];
    }
    return '👋';
  };

  const velocityMag = Math.sqrt(
    gestureState.velocity.x * gestureState.velocity.x + 
    gestureState.velocity.y * gestureState.velocity.y
  );

  return (
    <div
      className={cn(
        'hand-indicator flex flex-col gap-2 transition-all duration-300',
        gestureState.isDetected && 'detected',
        error && 'border-destructive/50'
      )}
    >
      <div className="flex items-center gap-2">
        <span 
          className={cn(
            'text-2xl transition-transform duration-300',
            gestureState.isDetected && 'scale-110',
            isLoading && 'animate-spin'
          )}
        >
          {getStatusIcon()}
        </span>
        <span className="text-foreground/90 font-medium">{getStatusText()}</span>
      </div>
      
      {gestureState.isDetected && (
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-16">Openness</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-100"
                style={{ width: `${gestureState.openness * 100}%` }}
              />
            </div>
            <span className="text-muted-foreground w-8 text-right">
              {Math.round(gestureState.openness * 100)}%
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-16">Velocity</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full transition-all duration-100"
                style={{ width: `${Math.min(100, velocityMag * 50)}%` }}
              />
            </div>
            <span className="text-muted-foreground w-8 text-right">
              {velocityMag.toFixed(1)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-16">Depth</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-secondary rounded-full transition-all duration-100"
                style={{ width: `${gestureState.depth * 100}%` }}
              />
            </div>
            <span className="text-muted-foreground w-8 text-right">
              {Math.round(gestureState.depth * 100)}%
            </span>
          </div>
        </div>
      )}

      {!gestureState.isDetected && !isLoading && !error && (
        <div className="text-xs text-muted-foreground mt-1">
          Try: ✌️ Peace • 👍 Thumbs Up • 🤟 Love
        </div>
      )}
    </div>
  );
}
