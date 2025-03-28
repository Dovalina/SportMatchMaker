import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Game, UserRole } from "@shared/schema";
import AdminUserManager from "@/components/AdminUserManager";
import AdminGameManager from "@/components/AdminGameManager";
import AdminGamePlayers from "@/components/AdminGamePlayers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Admin() {
  const { user } = useAuth();
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  
  // Cargar juegos para el selector
  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });
  
  // Verificar si el usuario actual es admin
  const isAdmin = user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN);
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Acceso denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No tienes permisos para acceder a esta sección. Esta área es exclusiva para administradores.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <Card className="w-full mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Panel de Administración</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Bienvenido, {user.name}. Desde aquí puedes gestionar usuarios, fechas de juego y asignación de jugadores.</p>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="games">Fechas de Juego</TabsTrigger>
          <TabsTrigger value="players">Gestionar Jugadores</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
        </TabsList>
        
        <TabsContent value="games" className="pt-6">
          <AdminGameManager />
        </TabsContent>
        
        <TabsContent value="players" className="pt-6">
          <Card className="w-full mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Seleccionar Fecha</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                onValueChange={(value) => setSelectedGameId(Number(value))}
                value={selectedGameId?.toString() || ""}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una fecha de juego" />
                </SelectTrigger>
                <SelectContent>
                  {games.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No hay fechas disponibles
                    </SelectItem>
                  ) : (
                    games.map((game) => (
                      <SelectItem key={game.id} value={game.id.toString()}>
                        {format(new Date(game.date), "PPP", { locale: es })} 
                        {game.description ? ` - ${game.description}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          {selectedGameId ? (
            <AdminGamePlayers gameId={selectedGameId} />
          ) : (
            <Card className="w-full">
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Selecciona una fecha de juego para gestionar sus jugadores
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="users" className="pt-6">
          <AdminUserManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}