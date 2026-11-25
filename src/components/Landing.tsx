import { Camera, Play, ShieldCheck } from 'lucide-react';

interface Props {
  onStartCamera: () => void;
  onStartDemo: () => void;
}

/** First screen: particles assemble the title behind this, the user picks camera or demo. */
export function Landing({ onStartCamera, onStartDemo }: Props) {
  return (
    <section
      aria-labelledby="landing-title"
      className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-end px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center md:pb-16"
    >
      <h1 id="landing-title" className="sr-only">Gesture Bloom</h1>
      <div className="pointer-events-auto flex w-full max-w-md flex-col items-center gap-5 animate-in fade-in slide-in-from-bottom-6 duration-1000 [animation-delay:900ms] [animation-fill-mode:both]">
        <p className="max-w-sm text-balance text-sm leading-relaxed text-white/70 md:text-base">
          Shape thousands of glowing particles with your bare hands. Open, close, point and sign — the light follows.
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={onStartCamera}
            autoFocus
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_14px_50px_rgba(255,255,255,0.22)] transition hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-[0.98]"
          >
            <Camera className="h-4 w-4" aria-hidden />
            Allow camera &amp; begin
          </button>
          <button
            onClick={onStartDemo}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-6 text-sm font-medium text-white/80 backdrop-blur-md transition hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <Play className="h-4 w-4" aria-hidden />
            Watch demo, no camera
          </button>
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-white/40">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Video never leaves your device. Tracking runs locally.
        </p>
      </div>
    </section>
  );
}
