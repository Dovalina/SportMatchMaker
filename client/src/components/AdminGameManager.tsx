import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Court, Game, UserRole } from "@shared/schema";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const gameFormSchema = z.object({
  date: z.date({
    required_error: "La fecha es requerida",
  }),
  courtIds: z.array(z.number()).min(1, {
    message: "Selecciona al menos una cancha",
  }),
  setsPerMatch: z.number().min(1).max(7),
  description: z.string().optional(),
});

type GameFormValues = z.infer<typeof gameFormSchema>;

export default function AdminGameManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedCourtIds, setSelectedCourtIds] = useState<number[]>([]);

  // Cargar canchas
  const { data: courts = [], isLoading: isLoadingCourts } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  // Cargar juegos
  const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  // Formulario para crear fechas de juego
  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      setsPerMatch: 3,
      courtIds: [],
    },
  });

  // Mutación para crear juego
  const createGameMutation = useMutation({
    mutationFn: async (data: GameFormValues) => {
      return await apiRequest("/api/games", {
        method: "POST",
        body: JSON.stringify({
          date: format(data.date, "yyyy-MM-dd"),
          courtIds: data.courtIds,
          setsPerMatch: data.setsPerMatch,
          description: data.description || "",
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Fecha creada",
        description: "La fecha de juego ha sido creada exitosamente",
      });
      form.reset();
      setSelectedCourtIds([]);
      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la fecha de juego",
        variant: "destructive",
      });
    },
  });

  // Mutación para eliminar juego
  const deleteGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      return await apiRequest(`/api/games/${gameId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Fecha eliminada",
        description: "La fecha de juego ha sido eliminada exitosamente",
      });
      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la fecha de juego",
        variant: "destructive",
      });
    },
  });

  // Manejar creación de juego
  const onSubmit = (data: GameFormValues) => {
    createGameMutation.mutate(data);
  };

  // Manejar selección de canchas
  const handleCourtSelection = (courtId: number, checked: boolean) => {
    setSelectedCourtIds((prevSelected) => {
      if (checked) {
        return [...prevSelected, courtId];
      } else {
        return prevSelected.filter((id) => id !== courtId);
      }
    });

    // Actualizar el formulario
    const currentCourtIds = form.getValues().courtIds;
    if (checked && !currentCourtIds.includes(courtId)) {
      form.setValue("courtIds", [...currentCourtIds, courtId]);
    } else if (!checked) {
      form.setValue(
        "courtIds",
        currentCourtIds.filter((id) => id !== courtId)
      );
    }
  };

  // Manejar eliminación de juego
  const handleDeleteGame = (gameId: number) => {
    if (window.confirm("¿Estás seguro de eliminar esta fecha de juego? Esta acción no se puede deshacer.")) {
      deleteGameMutation.mutate(gameId);
    }
  };

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
          <CardTitle className="text-2xl">Crear Nueva Fecha de Juego</CardTitle>
          <CardDescription>Configura la fecha, canchas y número de sets para los juegos</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Selecciona una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="setsPerMatch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sets por Partido</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el número de sets" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 3, 5, 7].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {num === 1 ? "set" : "sets"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Número de sets que se jugarán en cada partido
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Añade una descripción a esta fecha de juego"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="courtIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Canchas disponibles</FormLabel>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {isLoadingCourts ? (
                        <p>Cargando canchas...</p>
                      ) : (
                        courts.map((court) => (
                          <div
                            key={court.id}
                            className="flex items-center space-x-2 rounded-md border p-3"
                          >
                            <Checkbox
                              id={`court-${court.id}`}
                              checked={selectedCourtIds.includes(court.id)}
                              onCheckedChange={(checked) =>
                                handleCourtSelection(court.id, checked === true)
                              }
                            />
                            <label
                              htmlFor={`court-${court.id}`}
                              className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {court.name}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={createGameMutation.isPending}
              >
                {createGameMutation.isPending ? (
                  "Creando fecha..."
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" /> Crear Fecha de Juego
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Fechas de Juego Programadas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingGames ? (
            <div className="flex justify-center my-8">
              <p>Cargando fechas de juego...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay fechas de juego programadas</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Sets por Partido</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Canchas</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>
                        {format(new Date(game.date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{game.setsPerMatch}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {game.maxPlayers} jugadores
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {game.courtIds.length}{" "}
                        {game.courtIds.length === 1 ? "cancha" : "canchas"}
                      </TableCell>
                      <TableCell>{game.description || "-"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteGame(game.id)}
                          disabled={deleteGameMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}