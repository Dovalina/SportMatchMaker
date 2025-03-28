import { X } from "lucide-react";
import type { Court, CourtPairing } from "@shared/schema";

interface CourtCardProps {
  court: Court;
  pairing?: CourtPairing;
  onRemove: () => void;
}

export default function CourtCard({ court, pairing, onRemove }: CourtCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="bg-primary-600 text-white p-4 flex justify-between items-center">
        <h3 className="font-medium">{court.name}</h3>
        <button 
          onClick={onRemove}
          className="text-white hover:text-primary-200"
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
