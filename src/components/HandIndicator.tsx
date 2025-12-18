import { HandGestureState, GestureType } from '@/types/particle';
import { cn } from '@/lib/utils';

interface HandIndicatorProps {
  gestureState: HandGestureState;
  isLoading: boolean;
  error: string | null;
}

const GESTURE_LABELS: Record<GestureType, string> = {
  none: 'No gesture',
  open: 'Open hand',
  fist: 'Fist',
  peace: '✌️ Peace → Heart',
  pointing: '☝️ Pointing → Helix',
  rock: '🤘 Rock → Galaxy',
  iLoveYou: '🤟 I Love You',
  callMe: '🤙 Call Me → I Love You',
  middleFinger: '🖕 Middle Finger → Portrait',
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
  middleFinger: '🖕',
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
      return GESTURE_LABELS[gestureState.gesture] || 'Hand detected';
    }
    return 'No hand detected';
  };

  const getStatusIcon = () => {
    if (error) return '⚠';
    if (isLoading) return '◌';
    if (gestureState.isDetected) {
      return GESTURE_ICONS[gestureState.gesture] || '✋';
    }
    return '○';
  };

  const isSpecialGesture = ['peace', 'pointing', 'rock', 'iLoveYou', 'callMe', 'middleFinger'].includes(gestureState.gesture);

  return (
    <div
      className={cn(
        'hand-indicator flex items-center gap-2 transition-all duration-300',
        // Mobile: smaller padding
        'max-md:p-2 max-md:rounded-xl',
        gestureState.isDetected && 'detected',
        isSpecialGesture && 'border-primary bg-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.3)]',
        error && 'border-destructive/50'
      )}
    >
      <span
        className={cn(
          'text-lg transition-transform duration-300',
          gestureState.isDetected && 'animate-pulse-glow',
          isLoading && 'animate-spin',
          isSpecialGesture && 'text-2xl'
        )}
      >
        {getStatusIcon()}
      </span>
      <span className={cn(
        'text-foreground/80',
        isSpecialGesture && 'text-foreground font-medium'
      )}>
        {getStatusText()}
      </span>

      {/* Openness bar for open/fist gestures */}
      {gestureState.isDetected && !isSpecialGesture && (
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden ml-2">
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${gestureState.openness * 100}% ` }}
          />
        </div>
      )}
    </div>
  );
}
