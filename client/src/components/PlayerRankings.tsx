import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Award } from "lucide-react";
import type { PlayerRanking } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export default function PlayerRankings() {
  // Obtener rankings de jugadores
  const { data: rankings, isLoading, error } = useQuery({
    queryKey: ["/api/rankings"],
    queryFn: getQueryFn<PlayerRanking[]>({ on401: "throw" }),
  });

  // Determinar el ícono según la posición
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-700" />;
      default:
        return <Award className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Card className="bg-white shadow rounded-lg mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-gray-900">Ranking de Jugadores</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6 text-red-500">
            Error al cargar el ranking
          </div>
        ) : rankings?.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            No hay datos de ranking disponibles
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Jugador</TableHead>
                  <TableHead className="text-center">Partidos</TableHead>
                  <TableHead className="text-center">Ganados</TableHead>
                  <TableHead className="text-center">Sets Jugados</TableHead>
                  <TableHead className="text-center">Sets Ganados</TableHead>
                  <TableHead className="text-center">Puntos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings?.map((player, index) => (
                  <TableRow key={player.playerId} className={index < 3 ? "bg-gray-50" : ""}>
                    <TableCell className="font-medium flex items-center">
                      {getPositionIcon(index + 1)}
                      <span className="ml-2">{index + 1}</span>
                    </TableCell>
                    <TableCell className="font-medium">{player.playerName}</TableCell>
                    <TableCell className="text-center">{player.gamesPlayed}</TableCell>
                    <TableCell className="text-center">{player.gamesWon}</TableCell>
                    <TableCell className="text-center">{player.setsPlayed}</TableCell>
                    <TableCell className="text-center">{player.setsWon}</TableCell>
                    <TableCell className="text-center font-bold">{player.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}