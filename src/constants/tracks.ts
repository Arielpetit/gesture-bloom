export interface Track {
  id: string;
  name: string;
  artist?: string;
  src: string;
}

export const BUILT_IN_TRACKS: Track[] = [
  { id: 'ours', name: 'Our song', src: '/song.mp3' },
  { id: 'lovely', name: 'lovely', artist: 'Billie Eilish, Khalid', src: '/lovely.mp3' },
];
