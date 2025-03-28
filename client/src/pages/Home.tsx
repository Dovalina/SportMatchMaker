import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlayerInput from "@/components/PlayerInput";
import CourtManager from "@/components/CourtManager";
import ResultDisplay from "@/components/ResultDisplay";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Player, Court, Pairings, CourtPairing } from "@shared/schema";

// Extender el tipo Court para incluir el estado de selección
interface CourtWithSelection extends Court {
  selected: boolean;
}

export default function Home() {
  const { toast } = useToast();
  const [pairings, setPairings] = useState<CourtPairing[]>([]);
  const [courtsWithSelection, setCourtsWithSelection] = useState<CourtWithSelection[]>([]);

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
  
  // Transform courts to courts with selection state
  useEffect(() => {
    // Inicializar todas las canchas como no seleccionadas al cargarlas
    const courtsWithSelectionState = courts.map(court => ({
      ...court,
      selected: false
    }));
    setCourtsWithSelection(courtsWithSelectionState);
  }, [courts]);

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

  // Add court mutation with preset names
  const addCourtMutation = useMutation({
    mutationFn: async () => {
      // Lista de canchas válidas
      const validCourtNames = ["Lala", "AR", "Mochomos", "Combugas", "Casa del Vino", "Moric", "Central"];
      
      // Usar las canchas existentes del estado local
      const existingNames = courts.map((court: Court) => court.name);
      
      // Filtrar nombres que ya existen
      const availableNames = validCourtNames.filter(name => !existingNames.includes(name));
      
      if (availableNames.length === 0) {
        throw new Error("Todas las canchas disponibles ya han sido agregadas");
      }
      
      // Agregar la primera cancha disponible
      const name = availableNames[0];
      await apiRequest("POST", "/api/courts", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      toast({
        title: "Cancha agregada",
        description: "La cancha ha sido agregada exitosamente",
      });
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

  // Toggle court selection
  const toggleCourtSelection = (courtId: number) => {
    setCourtsWithSelection(prev => 
      prev.map(court => 
        court.id === courtId ? { ...court, selected: !court.selected } : court
      )
    );
  };
  
  // Get number of selected courts
  const getSelectedCourtsCount = () => {
    return courtsWithSelection.filter(court => court.selected).length;
  };
  
  // Check if pairings can be generated - based on selected courts
  const canGeneratePairings = () => {
    const selectedCourtsCount = getSelectedCourtsCount();
    if (selectedCourtsCount === 0) {
      return players.length >= courts.length * 4 && players.length % 4 === 0;
    }
    return players.length >= selectedCourtsCount * 4 && players.length % 4 === 0;
  };

  // Generate validation message - based on selected courts
  const getValidationMessage = () => {
    const selectedCourtsCount = getSelectedCourtsCount();
    const totalCourtsToUse = selectedCourtsCount > 0 ? selectedCourtsCount : courts.length;
    
    if (players.length < totalCourtsToUse * 4) {
      return `Necesitas ${totalCourtsToUse * 4} jugadores para ${totalCourtsToUse} canchas. Actualmente tienes ${players.length}.`;
    }
    if (players.length % 4 !== 0) {
      return `El número de jugadores debe ser divisible por 4 para formar parejas en todas las canchas.`;
    }
    return "";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onReset={handleReset} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow">
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
          onToggleCourtSelection={toggleCourtSelection}
          courtsWithSelection={courtsWithSelection}
          onGeneratePairings={() => generatePairingsMutation.mutate()}
          canGeneratePairings={canGeneratePairings()}
          validationMessage={getValidationMessage()}
        />

        <ResultDisplay pairings={pairings} />
      </main>
      
      <Footer />
    </div>
  );
}
