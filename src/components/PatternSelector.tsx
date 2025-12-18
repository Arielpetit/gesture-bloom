import { PatternType } from '@/types/particle';
import { PATTERN_OPTIONS } from '@/constants/patterns';
import { cn } from '@/lib/utils';

interface PatternSelectorProps {
  selectedPattern: PatternType;
  onPatternChange: (pattern: PatternType) => void;
}

export function PatternSelector({
  selectedPattern,
  onPatternChange,
}: PatternSelectorProps) {
  return (
    <div className="glass-panel p-4 animate-fade-in">
      <h3 className="floating-label mb-3">Pattern</h3>
      <div className="grid grid-cols-2 gap-2">
        {PATTERN_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => onPatternChange(option.id)}
            className={cn(
              'pattern-card flex flex-col items-center py-3 px-2',
              selectedPattern === option.id && 'active'
            )}
          >
            <span className="text-2xl mb-1 opacity-80">{option.icon}</span>
            <span className="text-sm font-medium text-foreground/90">
              {option.name}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5 text-center leading-tight">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
