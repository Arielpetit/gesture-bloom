import { useEffect, useRef, useState } from 'react';
import type { GestureType } from '@/types/particle';

const LABELS: Record<GestureType, { icon: string; name: string }> = {
  none: { icon: '', name: '' },
  open: { icon: '✋', name: 'Open hand' },
  fist: { icon: '✊', name: 'Fist' },
  thumbUp: { icon: '👍', name: 'Thumbs up' },
  peace: { icon: '✌️', name: 'Peace' },
  pointing: { icon: '☝️', name: 'Pointing' },
  rock: { icon: '🤘', name: 'Rock' },
  iLoveYou: { icon: '🤟', name: 'I love you' },
  callMe: { icon: '🤙', name: 'Call me' },
  middleFinger: { icon: '🖕', name: 'Middle finger' },
  okSign: { icon: '👌', name: 'OK' },
};

interface Props {
  gesture: GestureType;
  isDetected: boolean;
  /** Camera is live and expected to see a hand. */
  watching: boolean;
}

/**
 * Confirms each recognised gesture with a ring pulse, announces it to screen readers,
 * and hints when the hand has been out of view for a while.
 */
export function GestureFeedback({ gesture, isDetected, watching }: Props) {
  const [shown, setShown] = useState<GestureType>('none');
  const [pulseKey, setPulseKey] = useState(0);
  const [lost, setLost] = useState(false);
  const hideTimer = useRef<number>();

  useEffect(() => {
    if (gesture === 'none' || gesture === 'open') return;
    setShown(gesture);
    setPulseKey(k => k + 1);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShown('none'), 1600);
  }, [gesture]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  useEffect(() => {
    if (!watching || isDetected) {
      setLost(false);
      return;
    }
    const t = window.setTimeout(() => setLost(true), 3500);
    return () => window.clearTimeout(t);
  }, [watching, isDetected]);

  const label = LABELS[shown];

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {shown !== 'none' ? `Gesture recognised: ${label.name}` : lost ? 'Hand not visible' : ''}
      </div>

      {shown !== 'none' && (
        <div
          key={pulseKey}
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-20 z-40 -translate-x-1/2 animate-in fade-in zoom-in-90 duration-300"
        >
          <div className="relative flex items-center gap-2 rounded-full border border-white/20 bg-black/55 py-1.5 pl-1.5 pr-4 backdrop-blur-md">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl">
              <span className="absolute inset-0 rounded-full border-2 border-rose-300/80 motion-safe:animate-ping" />
              {label.icon}
            </span>
            <span className="text-sm font-semibold text-white">{label.name}</span>
          </div>
        </div>
      )}

      {lost && (
        <div
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-20 z-40 -translate-x-1/2 animate-in fade-in duration-700"
        >
          <div className="rounded-full border border-white/15 bg-black/55 px-4 py-2 text-xs text-white/75 backdrop-blur-md">
            ✋ Show your hand to the camera
          </div>
        </div>
      )}
    </>
  );
}
