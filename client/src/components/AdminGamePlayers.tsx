import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Player, Game, UserRole, insertPlayerSchema, WaitListPlayer } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Search, UserPlus, UserCheck, Trash2 } from "lucide-react";

// Schema para agregar invitado
const guestPlayerSchema = insertPlayerSchema.pick({
  name: true,
  alias: true,
  phone: true,
}).extend({
  invitedBy: z.number(),
});

type GuestPlayerValues = z.infer<typeof guestPlayerSchema>;

export default function AdminGamePlayers({ gameId }: { gameId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Formulario para agregar invitado
  const guestForm = useForm<GuestPlayerValues>({
    resolver: zodResolver(guestPlayerSchema),
    defaultValues: {
      name: "",
      alias: "",
      phone: "",
      invitedBy: user?.id || 0,
    },
  });

  // Cargar jugadores registrados
  const { data: players = [], isLoading: isLoadingPlayers } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  // Cargar detalles del juego
  const { data: game, isLoading: isLoadingGame } = useQuery<Game>({
    queryKey: ["/api/games", gameId],
    enabled: Boolean(gameId),
  });

  // Cargar lista de espera
  const { data: waitList = [], isLoading: isLoadingWaitList } = useQuery<WaitListPlayer[]>({
    queryKey: ["/api/games", gameId, "waitlist"],
    enabled: Boolean(gameId),
  });

  // Mutación para agregar jugador al juego
  const addPlayerMutation = useMutation({
    mutationFn: async (playerId: number) => {
      return await apiRequest(`/api/games/${gameId}/players/${playerId}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Jugador agregado",
        description: "El jugador ha sido agregado al juego exitosamente",
      });
      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el jugador",
        variant: "destructive",
      });
    },
  });

  // Mutación para agregar invitado
  const addGuestMutation = useMutation({
    mutationFn: async (guestData: GuestPlayerValues) => {
      // Primero creamos el jugador invitado
      const newPlayer = await apiRequest("/api/players", {
        method: "POST",
        body: JSON.stringify({
          ...guestData,
          role: UserRole.PLAYER,
          selected: true // Automáticamente seleccionarlo
        }),
      });

      // Luego lo agregamos al juego
      if (newPlayer && newPlayer.id) {
        return await apiRequest(`/api/games/${gameId}/players/${newPlayer.id}`, {
          method: "POST",
        });
      }
      throw new Error("No se pudo crear el jugador invitado");
    },
    onSuccess: () => {
      toast({
        title: "Invitado agregado",
        description: "El invitado ha sido registrado y agregado al juego exitosamente",
      });
      guestForm.reset();
      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el invitado",
        variant: "destructive",
      });
    },
  });

  // Mutación para agregar a la lista de espera
  const addToWaitListMutation = useMutation({
    mutationFn: async (playerId: number) => {
      return await apiRequest(`/api/games/${gameId}/waitlist/${playerId}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Agregado a lista de espera",
        description: "El jugador ha sido agregado a la lista de espera exitosamente",
      });
      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId, "waitlist"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar a la lista de espera",
        variant: "destructive",
      });
    },
  });

  // Mutación para quitar de la lista de espera
  const removeFromWaitListMutation = useMutation({
    mutationFn: async (playerId: number) => {
      return await apiRequest(`/api/games/${gameId}/waitlist/${playerId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Quitado de lista de espera",
        description: "El jugador ha sido quitado de la lista de espera exitosamente",
      });
      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId, "waitlist"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo quitar de la lista de espera",
        variant: "destructive",
      });
    },
  });

  // Manejar envío del formulario de invitado
  const onGuestFormSubmit = (data: GuestPlayerValues) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para agregar invitados",
        variant: "destructive",
      });
      return;
    }

    // Asegurarse de que el invitador esté especificado
    const guestData = {
      ...data,
      invitedBy: user.id,
    };

    addGuestMutation.mutate(guestData);
  };

  // Filtrar jugadores según término de búsqueda
  const filteredPlayers = players.filter(
    (player) =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (player.alias && player.alias.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (player.phone && player.phone.includes(searchTerm))
  );

  // Verificar si el juego está lleno
  const isGameFull = game?.playerIds.length === game?.maxPlayers;

  // Verificar si el usuario actual es admin
  const isAdmin = user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN);

  if (!isAdmin) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Acceso denegado</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No tienes permisos para acceder a esta sección.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Gestionar Jugadores</CardTitle>
          <CardDescription>
            {isLoadingGame ? (
              "Cargando detalles del juego..."
            ) : !game ? (
              "Juego no encontrado"
            ) : (
              <>
                Fecha: {new Date(game.date).toLocaleDateString()} - Capacidad:{" "}
                <Badge
                  variant={isGameFull ? "destructive" : "outline"}
                >
                  {game.playerIds?.length || 0}/{game.maxPlayers} jugadores
                </Badge>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="registered">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="registered">Jugadores Registrados</TabsTrigger>
              <TabsTrigger value="guest">Agregar Invitado</TabsTrigger>
            </TabsList>

            <TabsContent value="registered" className="pt-4">
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar jugadores..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {isLoadingPlayers ? (
                <div className="flex justify-center my-8">
                  <p>Cargando jugadores...</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Alias</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlayers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center h-24">
                            No hay jugadores que coincidan con la búsqueda
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPlayers.map((player) => {
                          // Verificar si el jugador ya está en el juego
                          const isInGame = game?.playerIds.includes(player.id);
                          // Verificar si el jugador está en lista de espera
                          const isInWaitList = waitList.some(wp => wp.id === player.id);

                          return (
                            <TableRow key={player.id}>
                              <TableCell>{player.name}</TableCell>
                              <TableCell>
                                {player.alias || "-"}
                                {player.invitedBy && (
                                  <Badge variant="outline" className="ml-2">
                                    Invitado
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{player.phone || "-"}</TableCell>
                              <TableCell>
                                {isInGame ? (
                                  <Badge>Ya está en el juego</Badge>
                                ) : isInWaitList ? (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => removeFromWaitListMutation.mutate(player.id)}
                                    disabled={removeFromWaitListMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Quitar de espera
                                  </Button>
                                ) : isGameFull ? (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => addToWaitListMutation.mutate(player.id)}
                                    disabled={addToWaitListMutation.isPending}
                                  >
                                    Agregar a espera
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => addPlayerMutation.mutate(player.id)}
                                    disabled={addPlayerMutation.isPending}
                                  >
                                    <UserPlus className="h-4 w-4 mr-1" />
                                    Agregar al juego
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Lista de espera */}
              {waitList.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Lista de Espera</h3>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Alias</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waitList.map((player) => (
                          <TableRow key={player.id}>
                            <TableCell>{player.name}</TableCell>
                            <TableCell>{player.alias || "-"}</TableCell>
                            <TableCell>{player.phone || "-"}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeFromWaitListMutation.mutate(player.id)}
                                disabled={removeFromWaitListMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Quitar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="guest" className="pt-4">
              <Form {...guestForm}>
                <form
                  onSubmit={guestForm.handleSubmit(onGuestFormSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={guestForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del invitado" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={guestForm.control}
                      name="alias"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alias (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Apodo del invitado" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={guestForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="Número de teléfono"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      addGuestMutation.isPending || isGameFull || !game
                    }
                  >
                    {addGuestMutation.isPending ? (
                      "Agregando invitado..."
                    ) : isGameFull ? (
                      "Juego completo"
                    ) : (
                      <>
                        <UserCheck className="mr-2 h-4 w-4" /> Agregar Invitado
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}