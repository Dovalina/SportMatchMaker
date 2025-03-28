import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Player, UserRole } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function AdminUserManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  
  // Cargar jugadores
  const { data: players = [], isLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
    staleTime: 5000, // 5 segundos
  });

  // Mutación para promover a un jugador a admin
  const promoteMutation = useMutation({
    mutationFn: async (playerId: number) => {
      return await apiRequest(`/api/players/${playerId}/promote`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Usuario promovido",
        description: "El jugador ha sido promovido a administrador exitosamente",
      });
      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo promover al usuario",
        variant: "destructive",
      });
    },
  });

  // Función para filtrar jugadores
  const filteredPlayers = players.filter(
    (player) =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (player.alias && player.alias.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (player.phone && player.phone.includes(searchTerm))
  );

  // Función para manejar promoción
  const handlePromotePlayer = (playerId: number) => {
    if (window.confirm("¿Estás seguro de promover a este jugador a administrador? Esta acción no se puede deshacer.")) {
      promoteMutation.mutate(playerId);
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Gestión de Usuarios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, alias o teléfono..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center my-8">
            <p>Cargando usuarios...</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      No hay usuarios que coincidan con la búsqueda
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>{player.id}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>{player.alias || "-"}</TableCell>
                      <TableCell>{player.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            player.role === UserRole.SUPERADMIN
                              ? "destructive"
                              : player.role === UserRole.ADMIN
                              ? "default"
                              : "outline"
                          }
                        >
                          {player.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {player.role === UserRole.PLAYER && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handlePromotePlayer(player.id)}
                            disabled={promoteMutation.isPending}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Promover a Admin
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}