import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Hand, Maximize2, Minimize2, Palette, Pause, Play, RotateCcw, Sparkles, ThumbsUp, Volume2 } from 'lucide-react';
import { PatternType, GestureType, ParticleColor } from '@/types/particle';
import { PARTICLE_COLORS } from '@/constants/patterns';
import { useHandTracking } from '@/hooks/useHandTracking';
import { ParticleScene } from '@/components/ParticleScene';
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
};

const getColor = (id: string) => PARTICLE_COLORS.find(color => color.id === id) ?? PARTICLE_COLORS[0];

const storySteps: StoryStep[] = [
  {
    id: 'waiting',
    mode: 'gesture',
    trigger: 'thumbUp',
    signName: 'Thumbs up',
    signIcon: '👍',
    pattern: 'heart',
    label: 'Start',
    particleText: 'Free particles',
    guide: 'Put your hand in front of the camera, then make a thumbs up.',
    prompt: 'Avancer sans camera',
  },
  {
    id: 'arrival',
    mode: 'gesture',
    trigger: 'peace',
    signName: 'Peace sign',
    signIcon: '✌',
    pattern: 'wordArrival',
    label: '1',
    particleText: [
      { text: 'Parfois… certaines personnes arrivent dans nos vies sans prévenir.', delay: 5000 },
      { text: 'Et sans qu’on s’en rende compte… elles commencent à prendre une place importante' }
    ],
    guide: 'Make a peace sign to reveal the next sentence.',
    prompt: 'Suite',
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
    prompt: 'Suite',
  },
  {
    id: 'personal',
    mode: 'gesture',
    trigger: 'rock',
    signName: 'Rock sign',
    signIcon: '🤘',
    pattern: 'wordSimple',
    label: '3',
    particleText: [
      { text: 'J’aime les moments avec toi', delay: 5000 },
      { text: 'J’aime ton énergie', delay: 5000 },
      { text: 'Et surtout… j’aime la personne que tu es' }
    ],
    guide: 'Make the rock sign.',
    prompt: 'Suite',
  },
  {
    id: 'energy',
    mode: 'gesture',
    trigger: 'pointing',
    signName: 'Pointing',
    signIcon: '☝',
    pattern: 'wordEnergy',
    label: '4',
    particleText: [
      { text: 'je pourrais t’offrir quelque chose de classique…', delay: 5000 },
      { text: 'mais je voulais surtout créer quelque chose qui vienne de moi' }
    ],
    guide: 'Point one finger up.',
    prompt: 'Suite',
  },
  {
    id: 'final-silence',
    mode: 'gesture',
    trigger: 'middleFinger',
    signName: 'Middle finger',
    signIcon: '🖕',
    pattern: 'wordFromMe',
    label: '5',
    particleText: 'Alors Marylin ❤️',
    delay: 5000,
    autoNext: true,
    guide: 'Fais le doigt d’honneur pour continuer.',
    prompt: 'Reveler la question',
  },
  {
    id: 'proposal',
    mode: 'gesture',
    trigger: 'thumbUp',
    signName: 'Thumbs Up',
    signIcon: '👍',
    pattern: 'wordQuestion',
    label: '6',
    particleText: 'Veux-tu etre ma petite amie ?',
    guide: 'Fais un pouce en l’air pour dire OUI !',
    image: true,
    prompt: 'OUI !',
  },
  {
    id: 'victory',
    mode: 'gesture',
    trigger: 'none',
    signName: 'Heart',
    signIcon: '❤️',
    pattern: 'victoryHeart',
    label: '❤️',
    particleText: 'JE T’AIME ! ❤️',
    guide: 'Vous êtes maintenant ensemble ! ✨',
    image: true,
    prompt: 'Fin',
  },
];

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
  const [soundOn, setSoundOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [particleCount, setParticleCount] = useState(4200);
  const [selectedColor, setSelectedColor] = useState<ParticleColor>(getColor('coral'));
  const [customColor, setCustomColor] = useState(getColor('white').color);
  const { gestureState, isLoading, error, restart } = useHandTracking();
  const gestureBufferRef = useRef<GestureType[]>([]);
  const lastAdvanceRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const activeStep = storySteps[stepIndex];
  const canAdvance = activeStep.mode === 'gesture' && stepIndex < storySteps.length - 1;
  const isWaiting = stepIndex === 0;

  useEffect(() => {
    const isSmallScreen = window.matchMedia('(max-width: 760px)').matches;
    setParticleCount(isSmallScreen ? 10000 : 16000);
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
    
    // Handle array sequences
    if (Array.isArray(activeStep.particleText)) {
      const currentPart = activeStep.particleText[sequenceIndex];
      if (currentPart?.delay) {
        if (sequenceIndex < activeStep.particleText.length - 1) {
          const timer = setTimeout(() => {
            setSequenceIndex(idx => idx + 1);
          }, currentPart.delay);
          return () => clearTimeout(timer);
        } else if (activeStep.autoNext) {
          const timer = setTimeout(() => {
            setStepIndex(prev => Math.min(storySteps.length - 1, prev + 1));
          }, currentPart.delay);
          return () => clearTimeout(timer);
        }
      }
    } 
    // Handle single string with autoNext
    else if (activeStep.autoNext && activeStep.delay) {
      const timer = setTimeout(() => {
        setStepIndex(prev => Math.min(storySteps.length - 1, prev + 1));
      }, activeStep.delay);
      return () => clearTimeout(timer);
    }
  }, [stepIndex, sequenceIndex]);

  useEffect(() => {
    const currentGesture = gestureState.gesture;
    if (currentGesture === 'none') return;

    gestureBufferRef.current.push(currentGesture);
    if (gestureBufferRef.current.length > 15) {
      gestureBufferRef.current.shift();
    }

    const now = Date.now();
    const requiredCount = 8;

    // Check if any step's trigger is consistently detected in the buffer
    for (let i = 0; i < storySteps.length; i++) {
      const step = storySteps[i];
      if (!step.trigger) continue;

      const matchingCount = gestureBufferRef.current.filter(g => g === step.trigger).length;
      
      if (matchingCount >= requiredCount && now - lastAdvanceRef.current > 1500) {
        if (stepIndex !== i) {
          console.log(`Switching to step ${i} based on gesture: ${step.trigger}`);
          lastAdvanceRef.current = now;
          gestureBufferRef.current = [];
          setStepIndex(i);
          
          if (!soundOn) {
            void startSound();
          }
        }
        break;
      }
    }
  }, [gestureState, stepIndex, soundOn]);

  useEffect(() => {
    return () => {
      musicRef.current?.pause();
      try {
        oscillatorRef.current?.stop();
      } catch {
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
      const music = new Audio('/song.mp3');
      music.loop = true;
      music.volume = 0.48;
      await music.play();
      musicRef.current = music;
      setSoundOn(true);
      return;
    } catch {
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

  const advanceManually = () => {
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
        pattern={activeStep.pattern}
        color={selectedColor}
        gestureState={gestureState}
        particleCount={particleCount}
        isImageVisible={!!activeStep.image}
        customText={typeof activeStep.particleText === 'string' 
          ? activeStep.particleText 
          : (activeStep.particleText[sequenceIndex]?.text || '')}
      />

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_55%_50%,transparent_0%,rgba(3,5,8,0.08)_38%,rgba(3,5,8,0.62)_82%)]" />
      <div className="pointer-events-none absolute inset-0 z-10 proposal-grain opacity-[0.18]" />

      <main className="relative z-20 flex min-h-screen flex-col px-4 py-4 md:px-6 md:py-6">
        <header className={cn(
          "flex items-center justify-between gap-4 transition-all duration-500",
          sidebarOpen ? "md:ml-[21.5rem]" : "md:ml-0"
        )}>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/45">Gesture Bloom</div>
            <div className="mt-1 h-1 w-36 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-medium text-white/70 backdrop-blur-md transition hover:border-white/35 hover:text-white"
              >
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-4 text-sm font-bold text-rose-100 backdrop-blur-md transition hover:border-rose-400/60 hover:bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span>{isFullscreen ? 'Exit Full' : 'Go Fullscreen'}</span>
            </button>

            <button
              onClick={toggleSound}
              className={cn(
                'pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-medium text-white/70 backdrop-blur-md transition hover:border-white/35 hover:text-white',
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

        {activeStep.image && (
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
          "fixed bottom-4 left-4 right-4 z-30 rounded-2xl border border-white/12 bg-black/55 p-4 text-left shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-500 ease-in-out md:bottom-6 md:left-6 md:top-6 md:w-80 md:overflow-y-auto",
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
            {isLoading ? (
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
            onClick={restart}
            className="mb-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 text-xs font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Restart camera
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
    </div>
  );
};

export default Index;
