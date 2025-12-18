import { ParticleColor } from '@/types/particle';
import { PARTICLE_COLORS } from '@/constants/patterns';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  selectedColor: ParticleColor;
  onColorChange: (color: ParticleColor) => void;
}

export function ColorPicker({
  selectedColor,
  onColorChange,
}: ColorPickerProps) {
  return (
    <div className="glass-panel p-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <h3 className="floating-label mb-3">Color Theme</h3>
      <div className="flex flex-wrap gap-2">
        {PARTICLE_COLORS.map((color) => (
          <button
            key={color.id}
            onClick={() => onColorChange(color)}
            className={cn(
              'group relative w-10 h-10 rounded-lg transition-all duration-300',
              'hover:scale-110 hover:z-10',
              selectedColor.id === color.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
            )}
            style={{
              background: `linear-gradient(135deg, ${color.color}, ${color.color}88)`,
              boxShadow: selectedColor.id === color.id 
                ? `0 0 20px ${color.color}66` 
                : `0 4px 12px ${color.color}33`,
            }}
            title={color.name}
          >
            <span className="sr-only">{color.name}</span>
            
            {/* Glow effect on hover */}
            <div 
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                boxShadow: `0 0 25px ${color.color}88`,
              }}
            />
          </button>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-3">
        Selected: <span className="text-foreground font-medium">{selectedColor.name}</span>
      </p>
    </div>
  );
}
