import { X } from "lucide-react";
import type { Court, CourtPairing } from "@shared/schema";

interface CourtCardProps {
  court: Court;
  pairing?: CourtPairing;
  selected?: boolean;
  onRemove: () => void;
  onToggleSelection?: () => void;
}

export default function CourtCard({ court, pairing, selected = false, onRemove, onToggleSelection }: CourtCardProps) {
  return (
    <div 
      className={`border ${selected ? 'border-[var(--color-primary)]' : 'border-gray-200'} rounded-lg bg-white shadow-sm overflow-hidden transition-all ${onToggleSelection ? 'cursor-pointer hover:shadow-md' : ''} ${selected ? 'ring-2 ring-[var(--color-primary)] ring-opacity-50' : ''}`}
      onClick={onToggleSelection}
    >
      <div className={`${selected ? 'bg-[var(--color-primary)]' : 'bg-primary-600'} text-${selected ? '[var(--color-dark)]' : 'white'} p-4 flex justify-between items-center`}>
        <h3 className="font-medium">{court.name}</h3>
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Previene que el click en el botón de eliminar active el toggle
            onRemove();
          }}
          className={`${selected ? 'text-[var(--color-dark)] hover:text-[var(--color-dark)]/70' : 'text-white hover:text-primary-200'}`}
          aria-label={`Eliminar ${court.name}`}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-4">
        {pairing ? (
          <>
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-500 mb-1">Pareja 1</div>
              <div className="flex flex-wrap gap-2">
                <div className="bg-primary-100 text-primary-800 px-2 py-1 rounded text-sm">
                  {pairing.pair1.player1.name}
                </div>
                <div className="bg-primary-100 text-primary-800 px-2 py-1 rounded text-sm">
                  {pairing.pair1.player2.name}
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Pareja 2</div>
              <div className="flex flex-wrap gap-2">
                <div className="bg-primary-100 text-primary-800 px-2 py-1 rounded text-sm">
                  {pairing.pair2.player1.name}
                </div>
                <div className="bg-primary-100 text-primary-800 px-2 py-1 rounded text-sm">
                  {pairing.pair2.player2.name}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center p-4 text-gray-500 text-sm">
            Genera parejas para asignar jugadores
          </div>
        )}
      </div>
    </div>
  );
}
