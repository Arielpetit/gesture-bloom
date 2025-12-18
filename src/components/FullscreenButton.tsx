import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  return (
    <button
      onClick={toggleFullscreen}
      className={cn(
        'glass-panel p-3 transition-all duration-300',
        'hover:bg-card/80 btn-glow',
        'flex items-center gap-2'
      )}
      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? (
        <svg 
          className="w-5 h-5 text-primary" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 9V5a2 2 0 00-2-2H5m10 6V5a2 2 0 012-2h2m-6 14v4a2 2 0 002 2h2m-10-6v4a2 2 0 01-2 2H5" 
          />
        </svg>
      ) : (
        <svg 
          className="w-5 h-5 text-primary" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" 
          />
        </svg>
      )}
      <span className="text-sm font-medium text-foreground/80 hidden sm:inline">
        {isFullscreen ? 'Exit' : 'Fullscreen'}
      </span>
    </button>
  );
}
