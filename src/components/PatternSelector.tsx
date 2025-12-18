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
    <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
      {PATTERN_OPTIONS.map((option) => (
        <button
          key={option.id}
          onClick={() => onPatternChange(option.id)}
          className={cn(
            'pattern-card flex flex-col items-center py-2 px-2 md:py-3',
            selectedPattern === option.id && 'active'
          )}
        >
          <span className="text-xl md:text-2xl mb-1 opacity-80">{option.icon}</span>
          <span className="text-[10px] md:text-sm font-medium text-foreground/90">
            {option.name}
          </span>
        </button>
      ))}
    </div>
  );
}
