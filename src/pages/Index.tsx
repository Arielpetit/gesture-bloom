import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Hand, Maximize2, Minimize2, Palette, Pause, Play, RotateCcw, Sparkles, ThumbsUp, Video, Volume2 } from 'lucide-react';
import { PatternType, GestureType, ParticleColor } from '@/types/particle';
import { PARTICLE_COLORS } from '@/constants/patterns';
import { useHandTracking, type TrackingMode } from '@/hooks/useHandTracking';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ParticleScene, type SceneHandle } from '@/components/ParticleScene';
import { Landing } from '@/components/Landing';
import { GestureFeedback } from '@/components/GestureFeedback';
import { RecordControls } from '@/components/RecordControls';
import { CreatePanel } from '@/components/CreatePanel';
import { MusicPicker } from '@/components/MusicPicker';
import { BUILT_IN_TRACKS, type Track } from '@/constants/tracks';
import { shapeFromImage, type ParticleShape } from '@/utils/shapeSampling';
import { CameraPreview } from '@/components/CameraPreview';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type SequenceItem = {
  text: string;
  delay?: number; // duration to show this text in ms
};

type StoryStep = {
  id: string;
  pattern: PatternType;
  mode: 'gesture' | 'final';
  trigger?: GestureType;
  signName?: string;
  signIcon?: string;
  label: string;
  particleText: string | SequenceItem[];
  guide: string;
  prompt?: string;
  image?: boolean;
  delay?: number;
  autoNext?: boolean;
};

const getColor = (id: string) => PARTICLE_COLORS.find(color => color.id === id) ?? PARTICLE_COLORS[0];

const storySteps: StoryStep[] = [
  {
    id: 'intro',
    mode: 'gesture',
    trigger: 'okSign',
    signName: 'OK Sign',
    signIcon: '👌',
    pattern: 'heart',
    label: 'Start',
    particleText: 'Free particles',
    guide: 'Put your hand in front of the camera, then make an OK sign.',
    prompt: 'Commencer',
  },
  {
    id: 'arrival',
    mode: 'gesture',
    trigger: 'peace',
    signName: 'Peace sign',
    signIcon: '✌️',
    pattern: 'wordArrival',
    label: '1',
    particleText: [
      { text: 'Parfois… certaines personnes arrivent dans nos vies sans prévenir.', delay: 9000 },
      { text: 'Et sans qu’on s’en rende compte… elles commencent à prendre une place importante' }
    ],
    guide: 'Make a peace sign to reveal the story.',
    prompt: 'Suivant',
  },
  {
    id: 'made-better',
    mode: 'gesture',
    trigger: 'callMe',
    signName: 'Call me',
    signIcon: '🤙',
    pattern: 'wordMoments',
    label: '2',
    particleText: 'Tu as rendu beaucoup de moments plus beaux sans même le savoir',
    guide: 'Make the call me sign.',
    prompt: 'Suivant',
  },
  {
    id: 'moments',
    mode: 'gesture',
    trigger: 'rock',
    signName: 'Rock sign',
    signIcon: '🤘',
    pattern: 'wordSimple',
    label: '3',
    particleText: [
      { text: 'J’aime assez bien les moments avec toi.', delay: 9000 },
      { text: 'J’aime ton énergie.', delay: 9000 },
      { text: 'Et surtout… j’aime la personne que tu es' }
    ],
    guide: 'Make the rock sign.',
    prompt: 'Suivant',
  },
  {
    id: 'simple',
    mode: 'gesture',
    trigger: 'pointing',
    signName: 'Pointing',
    signIcon: '☝️',
    pattern: 'wordEnergy',
    label: '4',
    particleText: [
      { text: 'Je pouvais t’offrir quelque chose d’assez classique pour symboliser le moment…', delay: 9000 },
      { text: 'mais je voulais surtout créer quelque chose qui vienne de moi', delay: 9000 },
      { text: 'Je ne veux pas être assez long…' }
    ],
    guide: 'Point one finger up.',
    prompt: 'Suite',
  },
  {
    id: 'final-narrative',
    mode: 'gesture',
    trigger: 'middleFinger',
    signName: 'Middle finger',
    signIcon: '🖕',
    pattern: 'wordFromMe',
    label: '5',
    particleText: [
      { text: 'Alors Marylin ❤️', delay: 9000 },
      { text: 'Veux-tu etre ma petite amie ?' }
    ],
    guide: 'Fais le doigt d’honneur pour commencer le message final.',
    prompt: 'Question finale',
    image: true,
  },
  {
    id: 'victory',
    mode: 'gesture',
    trigger: 'thumbUp',
    signName: 'Thumbs Up',
    signIcon: '👍',
    pattern: 'victoryHeart',
    label: '❤️',
    particleText: 'JE T’AIME ! ❤️',
    guide: 'Fais un pouce en l’air pour dire OUI ! ✨',
    image: false,
    prompt: 'OUI !',
  },
];

const haptic = (ms = 18) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
};

const DEMO_STEP_MS = 7000;
const TRACK_KEY = 'gesture-bloom:track';
const MUSIC_VOLUME = 0.48;

const savedTrackId = () => {
  try {
    return localStorage.getItem(TRACK_KEY);
  } catch {
    return null;
  }
};

/** Fade an element's volume to `to` over `ms`, then resolve. */
const fadeVolume = (el: HTMLAudioElement, to: number, ms: number) =>
  new Promise<void>(resolve => {
    const from = el.volume;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      el.volume = from + (to - from) * k;
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });

const colorChoices = [
  getColor('white'),
  getColor('cyan'),
  getColor('coral'),
  getColor('gold'),
  getColor('emerald'),
  getColor('magenta'),
  getColor('violet'),
];

const Index = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [hasCompletedAll, setHasCompletedAll] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [particleCount, setParticleCount] = useState(4200);
  const [selectedColor, setSelectedColor] = useState<ParticleColor>(getColor('coral'));
  const [customColor, setCustomColor] = useState(getColor('white').color);
  const [stage, setStage] = useState<'landing' | 'story'>('landing');
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('off');
  const [customShape, setCustomShape] = useState<ParticleShape | null>(null);
  const [scene, setScene] = useState<SceneHandle | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const reducedMotion = useReducedMotion();
  const { gestureState, handRef, videoRef, isLoading, error, restart } = useHandTracking(trackingMode);
  const isDemo = trackingMode === 'demo';
  const gestureBufferRef = useRef<GestureType[]>([]);
  const lastAdvanceRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [customTrack, setCustomTrack] = useState<Track | null>(null);
  const tracks = useMemo(() => (customTrack ? [...BUILT_IN_TRACKS, customTrack] : BUILT_IN_TRACKS), [customTrack]);
  const [trackId, setTrackId] = useState(
    () => BUILT_IN_TRACKS.find(t => t.id === savedTrackId())?.id ?? BUILT_IN_TRACKS[0].id
  );
  // Read inside startSound, which effects capture once: a ref always has the latest pick.
  const trackSrcRef = useRef(BUILT_IN_TRACKS.find(t => t.id === trackId)?.src ?? BUILT_IN_TRACKS[0].src);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const activeStep = storySteps[stepIndex];
  const canAdvance = activeStep.mode === 'gesture' && stepIndex < storySteps.length - 1;
  const isWaiting = stepIndex === 0;

  useEffect(() => {
    const isSmallScreen = window.matchMedia('(max-width: 760px)').matches;
    const lowEnd = (navigator.hardwareConcurrency || 4) <= 4;
    setParticleCount(isSmallScreen ? (lowEnd ? 5000 : 7000) : 18000);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    setSequenceIndex(0);
  }, [stepIndex]);

  useEffect(() => {
    const activeStep = storySteps[stepIndex];
    let timer: number | undefined;
    
    if (Array.isArray(activeStep.particleText)) {
      const currentPart = activeStep.particleText[sequenceIndex];
      if (currentPart?.delay) {
        if (sequenceIndex < activeStep.particleText.length - 1) {
          timer = window.setTimeout(() => {
            setSequenceIndex(idx => idx + 1);
          }, currentPart.delay);
        } else if (activeStep.autoNext) {
          timer = window.setTimeout(() => {
            setStepIndex(prev => Math.min(storySteps.length - 1, prev + 1));
          }, currentPart.delay);
        }
      }
    } else if (activeStep.autoNext && activeStep.delay) {
      timer = window.setTimeout(() => {
        setStepIndex(prev => Math.min(storySteps.length - 1, prev + 1));
      }, activeStep.delay);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [stepIndex, sequenceIndex]);

  useEffect(() => {
    const currentGesture = gestureState.gesture;
    if (currentGesture === 'none') return;

    gestureBufferRef.current.push(currentGesture);
    if (gestureBufferRef.current.length > 15) {
      gestureBufferRef.current.shift();
    }

    const counts: Record<string, number> = {};
    gestureBufferRef.current.forEach(g => counts[g] = (counts[g] || 0) + 1);
    const mostFrequent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Chronological restriction: only check the NEXT step, unless completed all
    const nextStepIdx = stepIndex + 1;
    if (nextStepIdx < storySteps.length && storySteps[nextStepIdx].trigger === mostFrequent) {
      const now = Date.now();
      if (now - lastAdvanceRef.current > 1500) {

        
        const isAtEndOfSequence = !Array.isArray(activeStep.particleText) || 
                                 sequenceIndex === activeStep.particleText.length - 1;

        if (isAtEndOfSequence) {
          lastAdvanceRef.current = now;
          setSequenceIndex(0);
          gestureBufferRef.current = [];
          setStepIndex(nextStepIdx);
          haptic(30);
          if (nextStepIdx === storySteps.length - 1) setHasCompletedAll(true);
          if (!soundOn) void startSound();
        }
      }
    }
    
    // If completed all, allow jumping to any step
    if (hasCompletedAll) {
      for (let i = 0; i < storySteps.length; i++) {
        if (i !== stepIndex && storySteps[i].trigger === mostFrequent) {
          setStepIndex(i);
          setSequenceIndex(0);
          gestureBufferRef.current = [];
          break;
        }
      }
    }
  }, [gestureState, stepIndex, soundOn, hasCompletedAll, sequenceIndex]);

  // Demo mode walks through the story by itself.
  useEffect(() => {
    if (!isDemo || stage !== 'story' || customShape) return;
    const step = storySteps[stepIndex];
    const atEnd = !Array.isArray(step.particleText) || sequenceIndex === step.particleText.length - 1;
    if (!atEnd || stepIndex >= storySteps.length - 1) return;
    const t = window.setTimeout(() => {
      setStepIndex(i => Math.min(i + 1, storySteps.length - 1));
    }, DEMO_STEP_MS);
    return () => window.clearTimeout(t);
  }, [isDemo, stage, stepIndex, sequenceIndex, customShape]);

  // Drop an image anywhere to turn it into particles.
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDropActive(true);
    };
    const onLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDropActive(false);
    };
    const onDrop = async (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDropActive(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      try {
        setCustomShape(await shapeFromImage(file));
        setStage('story');
      } catch {
        /* not an image: ignore */
      }
    };
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stage !== 'story') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Escape' && customShape) {
        setCustomShape(null);
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        const activeStep = storySteps[stepIndex];
        const isAtEndOfSequence = !Array.isArray(activeStep.particleText) || 
                                 sequenceIndex === activeStep.particleText.length - 1;

        if (!isAtEndOfSequence) {
          // Advance sequence
          setSequenceIndex(idx => idx + 1);
        } else if (stepIndex < storySteps.length - 1) {
          // Advance step
          const nextIdx = stepIndex + 1;
          setStepIndex(nextIdx);
          setSequenceIndex(0);
          gestureBufferRef.current = [];
          if (nextIdx === storySteps.length - 1) setHasCompletedAll(true);
          if (!soundOn) void startSound();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepIndex, sequenceIndex, soundOn, stage, customShape]);

  useEffect(() => {
    return () => {
      musicRef.current?.pause();
      try {
        oscillatorRef.current?.stop();
      } catch {
      /* already stopped or unsupported */
    }
      audioRef.current?.close();
    };
  }, []);

  const stopSound = () => {
    musicRef.current?.pause();
    musicRef.current = null;

    try {
      oscillatorRef.current?.stop();
    } catch {
      /* already stopped or unsupported */
    }

    oscillatorRef.current = null;
    gainRef.current = null;
    void audioRef.current?.close();
    audioRef.current = null;
    setSoundOn(false);
  };

  const startSound = async () => {
    if (soundOn) return;

    try {
      const music = new Audio(trackSrcRef.current);
      music.loop = true;
      music.volume = 0;
      await music.play();
      void fadeVolume(music, MUSIC_VOLUME, 600);
      musicRef.current = music;
      setSoundOn(true);
      return;
    } catch {
      /* already stopped or unsupported */
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audio = new AudioContextClass();
    const gain = audio.createGain();
    const oscillator = audio.createOscillator();

    oscillator.type = 'sine';
    oscillator.frequency.value = 196;
    gain.gain.value = 0.0001;

    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();

    const now = audio.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.025, now + 2);
    oscillator.frequency.setValueAtTime(196, now);
    oscillator.frequency.exponentialRampToValueAtTime(246.94, now + 8);
    oscillator.frequency.exponentialRampToValueAtTime(220, now + 14);

    audioRef.current = audio;
    oscillatorRef.current = oscillator;
    gainRef.current = gain;
    setSoundOn(true);
  };

  const selectTrack = async (track: Track) => {
    setTrackId(track.id);
    trackSrcRef.current = track.src;
    if (!track.src.startsWith('blob:')) {
      try {
        localStorage.setItem(TRACK_KEY, track.id);
      } catch {
        /* storage blocked: choice lasts for this visit only */
      }
    }

    const current = musicRef.current;
    if (!current || !soundOn) return;
    // Crossfade: fade the old song out, then bring the new one in.
    await fadeVolume(current, 0, 400);
    current.pause();
    const next = new Audio(track.src);
    next.loop = true;
    next.volume = 0;
    try {
      await next.play();
      musicRef.current = next;
      void fadeVolume(next, MUSIC_VOLUME, 600);
    } catch {
      musicRef.current = null;
      setSoundOn(false);
    }
  };

  const chooseOwnSong = (file: File) => {
    if (customTrack) URL.revokeObjectURL(customTrack.src);
    const track: Track = {
      id: 'custom',
      name: file.name.replace(/\.[^.]+$/, ''),
      artist: 'From your device',
      src: URL.createObjectURL(file),
    };
    setCustomTrack(track);
    void selectTrack(track).then(() => {
      if (!soundOn) void startSound();
    });
  };

  const toggleSound = () => {
    if (soundOn) {
      stopSound();
      return;
    }

    void startSound();
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  };

  const begin = (mode: TrackingMode) => {
    haptic();
    setTrackingMode(mode);
    setStage('story');
  };

  const handleScene = useCallback((handle: SceneHandle | null) => setScene(handle), []);

  const advanceManually = () => {
    haptic(30);
    void startSound();
    lastAdvanceRef.current = Date.now();
    gestureBufferRef.current = [];
    setStepIndex(current => Math.min(current + 1, storySteps.length - 1));
  };

  const progress = useMemo(() => ((stepIndex + 1) / storySteps.length) * 100, [stepIndex]);

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    setSelectedColor({
      id: 'custom',
      name: 'Custom',
      color,
      hsl: [0, 0, 100],
    });
  };

  const isAtEndOfSequence = useMemo(() => {
    if (Array.isArray(activeStep.particleText)) {
      return sequenceIndex === activeStep.particleText.length - 1;
    }
    return true;
  }, [activeStep.particleText, sequenceIndex]);

  const nextStep = stepIndex < storySteps.length - 1 ? storySteps[stepIndex + 1] : null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#030508] text-white">
      <ParticleScene
        pattern={stage === 'landing' ? 'wordSimple' : activeStep.pattern}
        color={selectedColor}
        gestureState={gestureState}
        handRef={handRef}
        particleCount={particleCount}
        isImageVisible={stage === 'story' && !!activeStep.image}
        customText={stage === 'landing'
          ? (window.innerWidth < window.innerHeight ? 'Gesture\nBloom' : 'Gesture Bloom')
          : typeof activeStep.particleText === 'string'
            ? activeStep.particleText
            : (activeStep.particleText[sequenceIndex]?.text || '')}
        customShape={stage === 'story' ? customShape : null}
        reducedMotion={reducedMotion}
        onReady={handleScene}
      />

      {trackingMode === 'camera' && <CameraPreview videoRef={videoRef} handRef={handRef} />}

      <GestureFeedback
        gesture={gestureState.gesture}
        isDetected={gestureState.isDetected}
        watching={stage === 'story' && trackingMode === 'camera' && !isLoading && !error}
      />

      {dropActive && (
        <div className="pointer-events-none fixed inset-4 z-50 flex items-center justify-center rounded-3xl border-2 border-dashed border-white/40 bg-black/40 text-sm font-semibold text-white backdrop-blur-sm">
          Drop the image to turn it into particles
        </div>
      )}

      {stage === 'landing' && (
        <Landing onStartCamera={() => begin('camera')} onStartDemo={() => begin('demo')} />
      )}

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_55%_50%,transparent_0%,rgba(3,5,8,0.08)_38%,rgba(3,5,8,0.62)_82%)]" />
      <div className="pointer-events-none absolute inset-0 z-10 proposal-grain opacity-[0.18]" />

      {stage === 'story' && (
      <main className="relative z-20 flex min-h-screen flex-col px-4 py-4 md:px-6 md:py-6">
        <header className={cn(
          "flex items-center justify-between gap-4 transition-all duration-500",
          sidebarOpen ? "md:ml-[21.5rem]" : "md:ml-0"
        )}>
          <div>
            <div className="hidden whitespace-nowrap text-[10px] sm:block font-semibold uppercase tracking-[0.32em] text-white/45">Gesture Bloom</div>
            <div className="mt-1 h-1 w-16 overflow-hidden sm:w-36 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open settings"
                className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 sm:px-4 text-sm font-medium text-white/70 backdrop-blur-md transition hover:border-white/35 hover:text-white"
              >
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}

            <RecordControls scene={scene} audio={musicRef.current} />

            <button
              onClick={toggleFullscreen}
              className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-3.5 sm:px-4 text-sm font-bold text-rose-100 backdrop-blur-md transition hover:border-rose-400/60 hover:bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Exit Full' : 'Go Fullscreen'}</span>
            </button>

            <button
              onClick={toggleSound}
              className={cn(
                'pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 sm:px-4 text-sm font-medium text-white/70 backdrop-blur-md transition hover:border-white/35 hover:text-white',
                soundOn && 'border-rose-300/60 text-rose-100 shadow-[0_0_24px_rgba(251,113,133,0.28)]'
              )}
              aria-label={soundOn ? 'Stop music' : 'Play music'}
            >
              <Volume2 className="h-4 w-4" />
              {soundOn ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span className="hidden sm:inline">{soundOn ? 'Stop' : 'Play'}</span>
            </button>
          </div>
        </header>

        {activeStep.image && (activeStep.id !== 'final-narrative' || sequenceIndex === 1) && (
          <div className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-center p-6 pb-48 text-center sm:pb-64">
            <div className="mb-8 w-64 overflow-hidden rounded-3xl border border-white/20 bg-white/[0.04] shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:w-80 md:w-96">
              <img src="/portrait.png" alt="Portrait" className="aspect-square w-full object-cover" />
            </div>
            {/* Removed overlay text as requested - now only particles will show the text */}
          </div>
        )}

        {/* Floating Next Gesture Hint - only show if sequence done AND no sign detected yet */}
        {isAtEndOfSequence && nextStep && (!gestureState.isDetected || gestureState.gesture === 'none') && (
          <div className="pointer-events-none fixed bottom-12 left-1/2 z-40 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 bg-white/[0.08] text-4xl shadow-[0_0_40px_rgba(255,255,255,0.15)] backdrop-blur-xl">
                {nextStep.signIcon}
              </div>
              <div className="rounded-full border border-white/15 bg-black/60 px-6 py-2 backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/90">
                  Fais le signe <span className="text-rose-300">{nextStep.signName}</span> pour continuer
                </p>
              </div>
            </div>
          </div>
        )}

        <aside className={cn(
          "fixed bottom-4 left-4 right-4 z-30 max-h-[72vh] overflow-y-auto overscroll-contain rounded-2xl border border-white/12 bg-black/55 p-4 text-left shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-500 ease-in-out md:bottom-6 md:left-6 md:top-6 md:w-80 md:overflow-y-auto",
          !sidebarOpen && "pointer-events-none -translate-x-[120%] opacity-0 md:right-auto"
        )}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">Guide</p>
              <h1 className="mt-1 text-xl font-semibold tracking-normal text-white">Proposal flow</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white/60 transition hover:border-white/30 hover:text-white"
              aria-label="Close sidebar"
            >
              <Minimize2 className="h-4 w-4 rotate-45" />
            </button>
          </div>

          <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <Hand className={cn('h-4 w-4', gestureState.isDetected ? 'text-emerald-200' : 'text-white/45')} />
              Sign to make now
            </div>
            <p className="text-sm leading-relaxed text-white/68">
              <span className="mr-2 text-base">{activeStep.signIcon ?? '✨'}</span>
              {activeStep.signName ?? 'Final moment'}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white/45">{activeStep.guide}</p>
          </div>

          <div className="mb-4 space-y-2">
            {storySteps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'rounded-xl border px-3 py-2 transition',
                  stepIndex === index
                    ? 'border-white/35 bg-white/[0.10] text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/45'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em]">
                    {step.signIcon ? `${step.signIcon} ${step.signName}` : step.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em]">
                    {stepIndex === index ? 'Now' : 'Next'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-snug">
                  {typeof step.particleText === 'string' 
                    ? step.particleText 
                    : step.particleText[0].text}
                </p>
              </div>
            ))}
          </div>

          <MusicPicker
            tracks={tracks}
            selectedId={trackId}
            playing={soundOn}
            onSelect={track => void selectTrack(track)}
            onFile={chooseOwnSong}
          />

          <CreatePanel shape={customShape} onShape={setCustomShape} />

          <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Palette className="h-4 w-4" />
              Particle color
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {colorChoices.map(color => (
                <button
                  key={color.id}
                  onClick={() => {
                    setSelectedColor(color);
                    setCustomColor(color.color);
                  }}
                  className={cn(
                    'h-8 w-8 rounded-full border transition hover:scale-105',
                    selectedColor.color === color.color ? 'border-white shadow-[0_0_18px_rgba(255,255,255,0.35)]' : 'border-white/18'
                  )}
                  style={{ backgroundColor: color.color }}
                  aria-label={`Use ${color.name}`}
                />
              ))}
            </div>
            <label className="flex items-center justify-between gap-3 text-xs text-white/60">
              Custom
              <input
                type="color"
                value={customColor}
                onChange={event => handleCustomColorChange(event.target.value)}
                className="h-9 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
              />
            </label>
          </div>

          <div className="mb-3 flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/12 bg-black/28 px-3 py-2 text-xs text-white/60">
            {isDemo ? (
              <>
                <Play className="h-4 w-4" />
                Demo mode: a virtual hand is playing
              </>
            ) : isLoading ? (
              <>
                <Camera className="h-4 w-4 animate-pulse" />
                Preparing camera...
              </>
            ) : error ? (
              <>
                <Camera className="h-4 w-4 text-rose-200" />
                {error}
              </>
            ) : (
              <>
                <Hand className={cn('h-4 w-4', gestureState.isDetected ? 'text-emerald-200' : 'text-white/35')} />
                {canAdvance
                  ? isWaiting
                    ? `Camera ready: ${activeStep.signName}`
                    : activeStep.guide
                  : activeStep.mode === 'final'
                    ? 'Final question'
                    : 'Waiting'}
              </>
            )}
          </div>

          <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/58">
            Detected: <span className={cn('font-semibold', gestureState.isDetected ? 'text-emerald-200' : 'text-white/40')}>
              {gestureState.isDetected ? gestureState.gesture : 'no hand'}
            </span>
          </div>

          <button
            onClick={() => (trackingMode === 'camera' ? void restart() : setTrackingMode('camera'))}
            className="mb-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 text-xs font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
          >
            {trackingMode === 'camera' ? <RotateCcw className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            {trackingMode === 'camera' ? 'Restart camera' : 'Switch to camera'}
          </button>

          {activeStep.mode !== 'final' && (
            <button
              onClick={advanceManually}
              className="pointer-events-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/16 bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_14px_50px_rgba(255,255,255,0.18)] transition hover:scale-[1.01] active:scale-[0.98]"
            >
              {stepIndex === 0 ? <ThumbsUp className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {activeStep.prompt ?? 'Continuer'}
            </button>
          )}
        </aside>
      </main>
      )}
    </div>
  );
};

export default Index;
