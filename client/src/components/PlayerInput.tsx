import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, CheckCircle } from "lucide-react";
import PlayerChip from "./PlayerChip";
import type { Player } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";

interface PlayerInputProps {
  players: Player[];
  isLoading: boolean;
  onAddPlayer: (name: string, playerData?: Partial<Player>) => void;
  onRemovePlayer: (id: number) => void;
  onTogglePlayerSelection?: (id: number) => void;
}

// Define el esquema para la forma completa
const playerFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre es requerido" }),
  alias: z.string().optional(),
  phone: z.string().optional(),
  affiliationNumber: z.string().optional(),
});

export default function PlayerInput({ 
  players, 
  isLoading, 
  onAddPlayer, 
  onRemovePlayer,
  onTogglePlayerSelection 
}: PlayerInputProps) {
  const [activeTab, setActiveTab] = useState("simple");
  const [playerName, setPlayerName] = useState("");

  // Configuración del formulario completo
  const form = useForm<z.infer<typeof playerFormSchema>>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      name: "",
      alias: "",
      phone: "",
      affiliationNumber: "",
    },
  });

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

  const onSubmit = (data: z.infer<typeof playerFormSchema>) => {
    onAddPlayer(data.name, {
      alias: data.alias || null,
      phone: data.phone || null,
      affiliationNumber: data.affiliationNumber || null,
    });
    form.reset();
  };

  return (
    <Card className="bg-white shadow-md rounded-lg mb-6 border-t-4 border-[var(--color-primary)]">
      <CardContent className="p-6">
        <h2 className="text-xl font-medium text-[var(--color-dark)] mb-4">Agregar Jugadores</h2>
        
        <Tabs defaultValue="simple" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="simple">Básico</TabsTrigger>
            <TabsTrigger value="detailed">Detallado</TabsTrigger>
          </TabsList>
          
          <TabsContent value="simple">
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <div className="flex-grow">
                <label htmlFor="playerName" className="block text-sm font-medium text-[var(--color-dark)]">
                  Nombre del Jugador
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <Input
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyUp={handleKeyPress}
                    placeholder="Ej. Juan Pérez"
                    className="focus-visible:ring-[var(--color-primary)] flex-grow"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="sm:mt-7">
                <Button
                  onClick={handleAddPlayer}
                  disabled={isLoading || !playerName.trim()}
                  className="w-full sm:w-auto bg-[var(--color-primary)] text-[var(--color-dark)] hover:bg-[var(--color-primary)]/90 font-medium"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Agregar Jugador
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="detailed">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre completo" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="alias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alias</FormLabel>
                      <FormControl>
                        <Input placeholder="Apodo (opcional)" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Número de teléfono (opcional)" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="affiliationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Afiliación</FormLabel>
                      <FormControl>
                        <Input placeholder="Número de afiliación (opcional)" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-[var(--color-primary)] text-[var(--color-dark)] hover:bg-[var(--color-primary)]/90 font-medium"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Registrar Jugador
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
        
        {/* Player List */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-[var(--color-dark)]">Jugadores Actuales</h3>
            {players.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs font-medium text-[var(--color-primary)]"
                onClick={() => {
                  // Función para seleccionar todos
                  const allSelected = players.every(p => p.selected === true);
                  players.forEach(player => {
                    if (onTogglePlayerSelection && (allSelected || !player.selected)) {
                      onTogglePlayerSelection(player.id);
                    }
                  });
                }}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                {players.every(p => p.selected === true) ? "Desmarcar Todos" : "Seleccionar Todos"}
              </Button>
            )}
          </div>
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
                  onToggleSelection={onTogglePlayerSelection ? () => onTogglePlayerSelection(player.id) : undefined}
                />
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
