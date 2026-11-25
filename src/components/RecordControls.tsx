import { useEffect, useRef, useState } from 'react';
import { Circle, ImageDown, Square } from 'lucide-react';
import type { SceneHandle } from '@/components/ParticleScene';
import { cn } from '@/lib/utils';

const CLIP_SECONDS = 10;

function pickMime() {
  const types = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  return types.find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
}

async function deliver(blob: Blob, name: string) {
  const file = new File([blob], name, { type: blob.type });
  // Phones: native share sheet. Desktop: plain download.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Gesture Bloom' });
      return;
    } catch {
      /* user closed the sheet: fall back to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

interface Props {
  scene: SceneHandle | null;
  /** Music element, mixed into the clip when the browser allows it. */
  audio?: HTMLAudioElement | null;
  className?: string;
}

export function RecordControls({ scene, audio, className }: Props) {
  const [recording, setRecording] = useState(false);
  const [left, setLeft] = useState(CLIP_SECONDS);
  const recRef = useRef<MediaRecorder | null>(null);
  const canRecord = typeof MediaRecorder !== 'undefined' && !!pickMime() && !!scene?.canvas.captureStream;

  useEffect(() => () => recRef.current?.stop(), []);

  const screenshot = async () => {
    const blob = await scene?.screenshot();
    if (blob) await deliver(blob, `gesture-bloom-${Date.now()}.png`);
  };

  const stop = () => recRef.current?.state === 'recording' && recRef.current.stop();

  const record = () => {
    if (!scene || recording) return;
    const mime = pickMime();
    if (!mime) return;
    const stream = scene.canvas.captureStream(30);
    const a = audio as (HTMLAudioElement & { captureStream?: () => MediaStream }) | null | undefined;
    if (a && !a.paused && a.captureStream) {
      a.captureStream().getAudioTracks().forEach(t => stream.addTrack(t));
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    let tick = 0;
    rec.onstop = () => {
      window.clearInterval(tick);
      stream.getVideoTracks().forEach(t => t.stop());
      setRecording(false);
      recRef.current = null;
      const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
      void deliver(new Blob(chunks, { type: mime.split(';')[0] }), `gesture-bloom-${Date.now()}.${ext}`);
    };
    recRef.current = rec;
    rec.start(250);
    setRecording(true);
    setLeft(CLIP_SECONDS);
    const started = Date.now();
    tick = window.setInterval(() => {
      const remaining = CLIP_SECONDS - Math.floor((Date.now() - started) / 1000);
      setLeft(remaining);
      if (remaining <= 0) stop();
    }, 250);
  };

  const btn =
    'pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 text-sm font-medium text-white/70 backdrop-blur-md transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40';

  return (
    <div className={cn('flex items-center gap-1.5 sm:gap-2', className)}>
      <button onClick={screenshot} disabled={!scene} className={btn} aria-label="Save screenshot">
        <ImageDown className="h-4 w-4" aria-hidden />
      </button>
      {canRecord && (
        <button
          onClick={recording ? stop : record}
          className={cn(btn, recording && 'border-rose-400/60 text-rose-100')}
          aria-label={recording ? 'Stop recording' : `Record a ${CLIP_SECONDS} second clip`}
        >
          {recording ? (
            <>
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
              <span className="tabular-nums" aria-live="off">{left}s</span>
            </>
          ) : (
            <>
              <Circle className="h-4 w-4 fill-rose-500 text-rose-500" aria-hidden />
              <span className="hidden sm:inline">Clip</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
