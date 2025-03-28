import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, PlusCircle, Users } from "lucide-react";
import CourtCard from "./CourtCard";
import type { Player, Court, CourtPairing } from "@shared/schema";

interface CourtManagerProps {
  courts: Court[];
  players: Player[];
  pairings: CourtPairing[];
  isLoading: boolean;
  isGenerating: boolean;
  onAddCourt: () => void;
  onRemoveCourt: (id: number) => void;
  onGeneratePairings: () => void;
  canGeneratePairings: boolean;
  validationMessage: string;
}

export default function CourtManager({
  courts,
  players,
  pairings,
  isLoading,
  isGenerating,
  onAddCourt,
  onRemoveCourt,
  onGeneratePairings,
  canGeneratePairings,
  validationMessage
}: CourtManagerProps) {
  return (
    <Card className="bg-white shadow rounded-lg mb-6">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Canchas</h2>
          <Button
            onClick={onAddCourt}
            disabled={isLoading}
            variant="outline"
            className="text-primary-700 bg-primary-100 hover:bg-primary-200 border-transparent"
          >
            <PlusCircle className="h-5 w-5 mr-1" />
            Agregar Cancha
          </Button>
        </div>
        
        {/* Courts Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 1 }).map((_, index) => (
              <div key={index} className="border border-gray-200 rounded-lg animate-pulse h-48 bg-gray-100"></div>
            ))
          ) : courts.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No hay canchas agregadas
            </div>
          ) : (
            courts.map((court) => {
              const courtPairing = pairings.find(p => p.courtId === court.id);
              return (
                <CourtCard
                  key={court.id}
                  court={court}
                  pairing={courtPairing}
                  onRemove={() => onRemoveCourt(court.id)}
                />
              );
            })
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="font-medium">{players.length}</span> jugadores disponibles para
                <span className="font-medium">{courts.length}</span> canchas
              </p>
              {validationMessage && (
                <p className="flex items-center gap-1 text-red-600 text-sm mt-1">
                  <AlertCircle className="h-4 w-4" />
                  {validationMessage}
                </p>
              )}
            </div>
            <Button
              onClick={onGeneratePairings}
              disabled={!canGeneratePairings || isGenerating}
              className={!canGeneratePairings ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isGenerating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando...
                </span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  Generar Parejas
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
