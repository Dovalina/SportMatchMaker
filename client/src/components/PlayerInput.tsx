import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import PlayerChip from "./PlayerChip";
import type { Player } from "@shared/schema";

interface PlayerInputProps {
  players: Player[];
  isLoading: boolean;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: number) => void;
}

export default function PlayerInput({ 
  players, 
  isLoading, 
  onAddPlayer, 
  onRemovePlayer 
}: PlayerInputProps) {
  const [playerName, setPlayerName] = useState("");

  const handleAddPlayer = () => {
    if (playerName.trim()) {
      onAddPlayer(playerName.trim());
      setPlayerName("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddPlayer();
    }
  };

  return (
    <Card className="bg-white shadow rounded-lg mb-6">
      <CardContent className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Agregar Jugadores</h2>
        
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
          <div className="flex-grow">
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700">
              Nombre del Jugador
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <Input
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyUp={handleKeyPress}
                placeholder="Ej. Juan Pérez"
                className="focus:ring-primary-500 focus:border-primary-500 flex-grow"
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="sm:mt-7">
            <Button
              onClick={handleAddPlayer}
              disabled={isLoading || !playerName.trim()}
              className="w-full sm:w-auto"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Agregar Jugador
            </Button>
          </div>
        </div>
        
        {/* Player List */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Jugadores Actuales</h3>
          <div className="flex flex-wrap gap-2">
            {players.length === 0 && !isLoading && (
              <p className="text-sm text-gray-500">No hay jugadores agregados</p>
            )}
            
            {isLoading ? (
              <div className="animate-pulse flex space-x-4">
                <div className="h-6 bg-gray-200 rounded w-32"></div>
                <div className="h-6 bg-gray-200 rounded w-28"></div>
                <div className="h-6 bg-gray-200 rounded w-40"></div>
              </div>
            ) : (
              players.map((player) => (
                <PlayerChip
                  key={player.id}
                  player={player}
                  onRemove={() => onRemovePlayer(player.id)}
                />
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
