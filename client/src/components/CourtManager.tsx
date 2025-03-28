import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, PlusCircle, Users, Calendar, Hash } from "lucide-react";
import CourtCard from "./CourtCard";
import type { Player, Court, CourtPairing } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Esquema para validación del formulario
const gamePairingSchema = z.object({
  gameDate: z.string().min(1, { message: "La fecha es obligatoria" }),
  sets: z.coerce.number().min(3, { message: "Mínimo 3 sets" }).max(7, { message: "Máximo 7 sets" }),
});

type GamePairingFormValues = z.infer<typeof gamePairingSchema>;

interface CourtManagerProps {
  courts: Court[];
  players: Player[];
  pairings: CourtPairing[];
  isLoading: boolean;
  isGenerating: boolean;
  onAddCourt: () => void;
  onRemoveCourt: (id: number) => void;
  onToggleCourtSelection?: (id: number) => void;
  courtsWithSelection?: Array<Court & { selected: boolean }>;
  onGeneratePairings: (gameDate?: string, sets?: number, selectedCourtIds?: number[]) => void;
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
  onToggleCourtSelection,
  courtsWithSelection = [],
  onGeneratePairings,
  canGeneratePairings,
  validationMessage
}: CourtManagerProps) {
  // Inicializar formulario con valores por defecto
  const form = useForm<GamePairingFormValues>({
    resolver: zodResolver(gamePairingSchema),
    defaultValues: {
      gameDate: new Date().toISOString().split('T')[0],
      sets: 3, // Valor por defecto: 3 sets
    },
  });
  return (
    <Card className="bg-white shadow rounded-lg mb-6">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Canchas</h2>
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
            (courtsWithSelection.length > 0 ? courtsWithSelection : courts).map((court) => {
              const courtPairing = pairings.find(p => p.courtId === court.id);
              const isSelected = 'selected' in court ? Boolean(court.selected) : false;
              
              return (
                <CourtCard
                  key={court.id}
                  court={court}
                  pairing={courtPairing}
                  selected={isSelected}
                  onRemove={() => onRemoveCourt(court.id)}
                  onToggleSelection={onToggleCourtSelection ? () => onToggleCourtSelection(court.id) : undefined}
                />
              );
            })
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => {
              // Obtener los IDs de las canchas seleccionadas
              const selectedCourtIds = courtsWithSelection
                .filter(court => court.selected)
                .map(court => court.id);
              
              // Si no hay canchas seleccionadas, usar todas
              const courtIdsToUse = selectedCourtIds.length > 0 ? selectedCourtIds : undefined;
              
              // Llamar a la función con los parámetros del formulario
              onGeneratePairings(data.gameDate, data.sets, courtIdsToUse);
            })}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormField
                  control={form.control}
                  name="gameDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Fecha del juego
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Hash className="h-4 w-4 mr-2" />
                        Número de sets
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="3"
                          max="7"
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            field.onChange(value < 3 ? 3 : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Mínimo 3 sets por rol
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{players.length}</span> jugadores disponibles para
                    <span className="font-medium">{courtsWithSelection.filter(c => c.selected).length || courts.length}</span> canchas
                  </p>
                  {validationMessage && (
                    <p className="flex items-center gap-1 text-red-600 text-sm mt-1">
                      <AlertCircle className="h-4 w-4" />
                      {validationMessage}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
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
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
