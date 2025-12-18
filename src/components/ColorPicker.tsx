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
    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
      {PARTICLE_COLORS.map((color) => (
        <button
          key={color.id}
          onClick={() => onColorChange(color)}
          className={cn(
            'group relative w-8 h-8 md:w-10 md:h-10 rounded-lg transition-all duration-300',
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

          <div
            className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              boxShadow: `0 0 25px ${color.color}88`,
            }}
          />
        </button>
      ))}
    </div>
  );
}
