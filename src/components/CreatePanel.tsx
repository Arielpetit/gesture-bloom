import { useRef, useState } from 'react';
import { ImagePlus, Type, X } from 'lucide-react';
import { shapeFromImage, shapeFromText, type ParticleShape } from '@/utils/shapeSampling';

interface Props {
  shape: ParticleShape | null;
  onShape: (shape: ParticleShape | null) => void;
}

/** Type a word or pick an image and the particles become it. */
export function CreatePanel({ shape, onShape }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadImage = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onShape(await shapeFromImage(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold text-white">
        <span className="flex items-center gap-2">
          <Type className="h-4 w-4" aria-hidden />
          Make your own
        </span>
        {shape && (
          <button
            onClick={() => onShape(null)}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-medium text-white/70 hover:text-white"
          >
            <X className="h-3 w-3" aria-hidden />
            Back to story
          </button>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          if (text.trim()) onShape(shapeFromText(text));
        }}
      >
        <label htmlFor="particle-word" className="sr-only">Word for the particles</label>
        <input
          id="particle-word"
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={60}
          placeholder="Type a word…"
          className="min-w-0 flex-1 rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-lg bg-white px-3 text-xs font-semibold text-black disabled:opacity-40"
        >
          Form
        </button>
      </form>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 px-3 py-2.5 text-xs text-white/65 transition hover:border-white/40 hover:text-white"
      >
        <ImagePlus className="h-4 w-4" aria-hidden />
        {busy ? 'Reading image…' : 'Pick or drop an image'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          void loadImage(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && <p role="alert" className="mt-2 text-xs text-rose-200">{error}</p>}
    </div>
  );
}
