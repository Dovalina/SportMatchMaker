import { Card, CardContent } from "@/components/ui/card";
import type { CourtPairing } from "@shared/schema";

interface ResultDisplayProps {
  pairings: CourtPairing[];
}

export default function ResultDisplay({ pairings }: ResultDisplayProps) {
  return (
    <Card className="bg-white shadow rounded-lg mb-6">
      <CardContent className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Resultados</h2>
        <div className="space-y-4">
          {pairings.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-gray-500">
              Haz clic en "Generar Parejas" para crear emparejamientos aleatorios
            </div>
          ) : (
            pairings.map((pairing) => (
              <div key={pairing.courtId} className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">{pairing.courtName}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded shadow-sm">
                    <div className="text-sm font-medium text-primary-600 mb-2">Pareja 1</div>
                    <ul className="space-y-1">
                      <li className="text-gray-700">{pairing.pair1.player1.name}</li>
                      <li className="text-gray-700">{pairing.pair1.player2.name}</li>
                    </ul>
                  </div>
                  <div className="bg-white p-3 rounded shadow-sm">
                    <div className="text-sm font-medium text-primary-600 mb-2">Pareja 2</div>
                    <ul className="space-y-1">
                      <li className="text-gray-700">{pairing.pair2.player1.name}</li>
                      <li className="text-gray-700">{pairing.pair2.player2.name}</li>
                    </ul>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
