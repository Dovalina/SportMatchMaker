import { X, Check } from "lucide-react";
import type { Player } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";

interface PlayerChipProps {
  player: Player;
  onRemove: () => void;
  onToggleSelection?: () => void;
}

export default function PlayerChip({ player, onRemove, onToggleSelection }: PlayerChipProps) {
  // Determinar si el jugador está seleccionado
  const isSelected = player.selected === true;
  
  return (
    <div 
      className={`${isSelected ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-primary)]/10'} 
                 ${isSelected ? 'text-white' : 'text-[var(--color-dark)]'} 
                 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2`}
    >
      {onToggleSelection && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelection}
          className="h-3.5 w-3.5 rounded-sm border-white"
        />
      )}
      <span>{player.name}</span>
      <button
        onClick={onRemove}
        className={`ml-auto ${isSelected ? 'text-white/70 hover:text-white' : 'text-[var(--color-dark)]/70 hover:text-[var(--color-dark)]'} focus:outline-none`}
        aria-label={`Eliminar ${player.name}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
