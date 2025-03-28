import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlayerInput from "@/components/PlayerInput";
import CourtManager from "@/components/CourtManager";
import ResultDisplay from "@/components/ResultDisplay";
import PlayerRankings from "@/components/PlayerRankings";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dice5, Trophy, Users } from "lucide-react";
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
    // Compara las canchas actuales con las que ya están en el estado
    // para evitar actualizaciones innecesarias que causan bucles infinitos
    if (courts.length === courtsWithSelection.length) {
      // Si la longitud es igual, verificamos si necesitamos actualizar
      const needsUpdate = courts.some((court, index) => 
        court.id !== courtsWithSelection[index].id
      );
      
      if (!needsUpdate) {
        return; // No necesitamos actualizar, evitamos el bucle
      }
    }
    
    // Inicializar todas las canchas como no seleccionadas al cargarlas
    const courtsWithSelectionState = courts.map(court => {
      // Buscar si la cancha ya existe en el estado actual
      const existingCourt = courtsWithSelection.find(c => c.id === court.id);
      return {
        ...court,
        // Mantener el estado de selección si existe, de lo contrario false
        selected: existingCourt ? existingCourt.selected : false
      };
    });
    
    setCourtsWithSelection(courtsWithSelectionState);
  }, [courts, courtsWithSelection]);

  // Add player mutation
  const addPlayerMutation = useMutation({
    mutationFn: async (data: string | { name: string; playerData?: Partial<Player> }) => {
      // Si es solo un string, consideramos que es el nombre
      if (typeof data === 'string') {
        await apiRequest("/api/players", { 
          method: "POST", 
          body: JSON.stringify({ name: data }) 
        });
      } else {
        const { name, playerData = {} } = data;
        await apiRequest("/api/players", { 
          method: "POST", 
          body: JSON.stringify({ name, ...playerData }) 
        });
      }
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
  
  // Toggle player selection mutation
  const togglePlayerSelectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/players/${id}/toggle-selection`, {
        method: "POST"
      });
      return await response.json() as Player;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
    },
    onError: (error) => {
      toast({
        title: "Error al seleccionar jugador",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove player mutation
  const removePlayerMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/players/${id}`, {
        method: "DELETE"
      });
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
      await apiRequest("/api/courts", {
        method: "POST",
        body: JSON.stringify({ name })
      });
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
      await apiRequest(`/api/courts/${id}`, {
        method: "DELETE"
      });
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
    mutationFn: async (data: { gameDate?: string; sets?: number; selectedCourtIds?: number[] }) => {
      try {
        const response = await apiRequest("/api/pairings/generate", {
          method: "POST",
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error al generar el rol de juegos");
        }
        
        return (await response.json()) as Pairings;
      } catch (error: any) {
        throw new Error(error.message || "Error al generar el rol de juegos");
      }
    },
    onSuccess: (data) => {
      setPairings(data);
      toast({
        title: "¡Rol de juegos generado!",
        description: "Las parejas han sido asignadas aleatoriamente a las canchas",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al generar rol de juegos",
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
        <Tabs defaultValue="players" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="players" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Jugadores</span>
            </TabsTrigger>
            <TabsTrigger value="game" className="flex items-center gap-2">
              <Dice5 className="h-4 w-4" />
              <span>Juego</span>
            </TabsTrigger>
            <TabsTrigger value="rankings" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>Clasificación</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="players" className="space-y-6">
            <PlayerInput
              players={players}
              isLoading={isLoadingPlayers}
              onAddPlayer={(name, playerData) => 
                addPlayerMutation.mutate({ name, playerData })
              }
              onRemovePlayer={(id) => removePlayerMutation.mutate(id)}
              onTogglePlayerSelection={(id) => togglePlayerSelectionMutation.mutate(id)}
            />
          </TabsContent>
          
          <TabsContent value="game" className="space-y-6">
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
              onGeneratePairings={(gameDate, sets, selectedCourtIds) => 
                generatePairingsMutation.mutate({ gameDate, sets, selectedCourtIds })
              }
              canGeneratePairings={canGeneratePairings()}
              validationMessage={getValidationMessage()}
            />

            <ResultDisplay pairings={pairings} />
          </TabsContent>
          
          <TabsContent value="rankings" className="space-y-6">
            <PlayerRankings />
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
}
