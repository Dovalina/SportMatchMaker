import { useState } from "react";
import Header from "@/components/Header";
import PlayerInput from "@/components/PlayerInput";
import CourtManager from "@/components/CourtManager";
import ResultDisplay from "@/components/ResultDisplay";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Player, Court, Pairings, CourtPairing } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [pairings, setPairings] = useState<CourtPairing[]>([]);

  // Fetch players
  const {
    data: players = [],
    isLoading: isLoadingPlayers,
    isError: isPlayersError,
  } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  // Fetch courts
  const {
    data: courts = [],
    isLoading: isLoadingCourts,
    isError: isCourtsError,
  } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  // Add player mutation
  const addPlayerMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("POST", "/api/players", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
    },
    onError: (error) => {
      toast({
        title: "Error al agregar jugador",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove player mutation
  const removePlayerMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/players/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar jugador",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add court mutation (not used anymore - courts are predefined)
  const addCourtMutation = useMutation({
    mutationFn: async () => {
      // This is no longer used as courts are predefined
      const name = "Custom Court";
      await apiRequest("POST", "/api/courts", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
    },
    onError: (error) => {
      toast({
        title: "Error al agregar cancha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove court mutation
  const removeCourtMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/courts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar cancha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate pairings mutation
  const generatePairingsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/pairings/generate", {});
      return (await response.json()) as Pairings;
    },
    onSuccess: (data) => {
      setPairings(data);
      toast({
        title: "¡Parejas generadas!",
        description: "Las parejas han sido asignadas aleatoriamente a las canchas",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al generar parejas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle app reset
  const handleReset = () => {
    setPairings([]);
  };

  // Check if pairings can be generated
  const canGeneratePairings = () => {
    return players.length >= courts.length * 4 && players.length % 4 === 0;
  };

  // Generate validation message
  const getValidationMessage = () => {
    if (players.length < courts.length * 4) {
      return `Necesitas ${courts.length * 4} jugadores para ${courts.length} canchas. Actualmente tienes ${players.length}.`;
    }
    if (players.length % 4 !== 0) {
      return `El número de jugadores debe ser divisible por 4 para formar parejas en todas las canchas.`;
    }
    return "";
  };

  return (
    <div className="min-h-screen">
      <Header onReset={handleReset} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PlayerInput
          players={players}
          isLoading={isLoadingPlayers}
          onAddPlayer={(name) => addPlayerMutation.mutate(name)}
          onRemovePlayer={(id) => removePlayerMutation.mutate(id)}
        />

        <CourtManager
          courts={courts}
          players={players}
          pairings={pairings}
          isLoading={isLoadingCourts}
          isGenerating={generatePairingsMutation.isPending}
          onAddCourt={() => addCourtMutation.mutate()}
          onRemoveCourt={(id) => removeCourtMutation.mutate(id)}
          onGeneratePairings={() => generatePairingsMutation.mutate()}
          canGeneratePairings={canGeneratePairings()}
          validationMessage={getValidationMessage()}
        />

        <ResultDisplay pairings={pairings} />
      </main>
    </div>
  );
}
