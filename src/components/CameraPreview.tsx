import { useEffect, useRef, useState, MutableRefObject } from 'react';
import { Video, VideoOff } from 'lucide-react';
import type { HandSnapshot } from '@/components/ParticleScene';

interface Props {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  handRef: MutableRefObject<HandSnapshot>;
}

// Landmark pairs forming the hand skeleton.
const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

const W = 160;
const H = 120;

/** Small mirrored camera feed with the hand skeleton. Draws at ~20fps, only while visible. */
export function CameraPreview({ videoRef, handRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(() => !window.matchMedia('(pointer: coarse)').matches);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden || now - last < 50) return;
      last = now;

      ctx.clearRect(0, 0, W, H);
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        // selfieMode feed is already mirrored by MediaPipe landmarks; mirror the picture to match.
        ctx.save();
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
        ctx.globalAlpha = 0.75;
        ctx.drawImage(v, 0, 0, W, H);
        ctx.restore();
      }

      const lm = handRef.current.landmarks;
      if (handRef.current.isDetected && lm) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (const [a, b] of BONES) {
          ctx.moveTo(lm[a].x * W, lm[a].y * H);
          ctx.lineTo(lm[b].x * W, lm[b].y * H);
        }
        ctx.stroke();
        ctx.fillStyle = '#fb7185';
        for (const p of lm) ctx.fillRect(p.x * W - 1.5, p.y * H - 1.5, 3, 3);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [open, videoRef, handRef]);

  return (
    <div className="pointer-events-auto absolute bottom-20 right-3 z-30 flex flex-col items-end gap-2 md:bottom-4 md:right-4">
      {open && (
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          aria-label="Camera preview"
          className="rounded-2xl border border-white/15 bg-black/50 shadow-xl backdrop-blur-md"
          style={{ width: W, height: H }}
        />
      )}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Hide camera preview' : 'Show camera preview'}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/70 backdrop-blur-md transition hover:border-white/35 hover:text-white"
      >
        {open ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
      </button>
    </div>
  );
}
