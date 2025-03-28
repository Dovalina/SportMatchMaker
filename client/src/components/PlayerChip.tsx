import { X } from "lucide-react";
import type { Player } from "@shared/schema";

interface PlayerChipProps {
  player: Player;
  onRemove: () => void;
}

export default function PlayerChip({ player, onRemove }: PlayerChipProps) {
  return (
    <div className="bg-[var(--color-primary)]/10 text-[var(--color-dark)] px-3 py-1 rounded-full text-sm font-medium flex items-center">
      {player.name}
      <button
        onClick={onRemove}
        className="ml-2 text-[var(--color-dark)]/70 hover:text-[var(--color-dark)] focus:outline-none"
        aria-label={`Eliminar ${player.name}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
