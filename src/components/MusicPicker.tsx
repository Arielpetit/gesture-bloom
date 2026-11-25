import { useRef } from 'react';
import { Check, FolderOpen, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Track } from '@/constants/tracks';

interface Props {
  tracks: Track[];
  selectedId: string;
  playing: boolean;
  onSelect: (track: Track) => void;
  /** User picked a file from their device. It stays local (object URL), never uploaded. */
  onFile: (file: File) => void;
}

export function MusicPicker({ tracks, selectedId, playing, onSelect, onFile }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Music className="h-4 w-4" aria-hidden />
        Music
      </div>

      <div role="radiogroup" aria-label="Choose music" className="space-y-1.5">
        {tracks.map(track => {
          const active = track.id === selectedId;
          return (
            <button
              key={track.id}
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(track)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition',
                active
                  ? 'border-rose-300/50 bg-rose-500/10 text-white'
                  : 'border-white/10 bg-black/20 text-white/65 hover:border-white/25 hover:text-white'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                  active ? 'border-rose-300 bg-rose-400/20' : 'border-white/20'
                )}
              >
                {active && playing ? (
                  <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                    <span className="w-[2px] animate-pulse bg-rose-200 [height:60%]" />
                    <span className="w-[2px] animate-pulse bg-rose-200 [animation-delay:150ms] [height:100%]" />
                    <span className="w-[2px] animate-pulse bg-rose-200 [animation-delay:300ms] [height:40%]" />
                  </span>
                ) : active ? (
                  <Check className="h-3.5 w-3.5 text-rose-200" aria-hidden />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{track.name}</span>
                {track.artist && <span className="block truncate text-[11px] text-white/45">{track.artist}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 px-3 py-2.5 text-xs text-white/65 transition hover:border-white/40 hover:text-white"
      >
        <FolderOpen className="h-4 w-4" aria-hidden />
        Choose a song from your device
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
