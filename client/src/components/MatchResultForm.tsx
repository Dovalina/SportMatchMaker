import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Trophy, Award, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MatchResult, CourtPairing } from "@shared/schema";

// Extender la interfaz de CourtPairing para incluir el ID
interface CourtPairingWithId extends CourtPairing {
  id: number;
}

// Esquema de validación para el formulario de resultados
const resultFormSchema = z.object({
  pairingId: z.number(),
  gameDate: z.string(),
  setNumber: z.number().min(1),
  pair1Score: z.coerce.number().min(0).max(7),
  pair2Score: z.coerce.number().min(0).max(7),
  winner: z.enum(["pair1", "pair2"]),
  completed: z.boolean().default(true),
});

type ResultFormValues = z.infer<typeof resultFormSchema>;

interface MatchResultFormProps {
  pairing: CourtPairing & { id?: number };
  onSuccess?: () => void;
}

export default function MatchResultForm({ pairing, onSuccess }: MatchResultFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Inicializar formulario
  const form = useForm<ResultFormValues>({
    resolver: zodResolver(resultFormSchema),
    defaultValues: {
      pairingId: pairing.id || pairing.courtId, // Usar courtId si id no está disponible
      gameDate: new Date().toISOString().split('T')[0],
      setNumber: 1,
      pair1Score: 0,
      pair2Score: 0,
      winner: "pair1",
      completed: true,
    },
  });

  // Determinar ganador basado en puntajes
  const determineWinner = (pair1Score: number, pair2Score: number) => {
    return pair1Score > pair2Score ? "pair1" : "pair2";
  };

  // Manejar cambios en puntajes para actualizar ganador automáticamente
  const handleScoreChange = (pair1Score: number, pair2Score: number) => {
    if (pair1Score === pair2Score) return; // No actualizar si es empate
    const winner = determineWinner(pair1Score, pair2Score);
    form.setValue("winner", winner);
  };

  // Manejar envío del formulario
  const onSubmit = async (data: ResultFormValues) => {
    setIsSubmitting(true);
    try {
      // Preparar los datos completos del resultado
      const resultData: Partial<MatchResult> = {
        ...data,
        pair1: pairing.pair1,
        pair2: pairing.pair2,
        courtId: pairing.courtId,
        courtName: pairing.courtName,
      };

      // Enviar al API
      await apiRequest("/api/match-results", {
        method: "POST",
        body: JSON.stringify(resultData),
      });

      // Actualizar caché de consultas
      await queryClient.invalidateQueries({ queryKey: ["/api/rankings"] });
      
      toast({
        title: "Resultado guardado",
        description: "El resultado del partido ha sido registrado correctamente.",
      });

      // Resetear formulario
      form.reset({
        pairingId: pairing.id || pairing.courtId,
        gameDate: new Date().toISOString().split('T')[0],
        setNumber: data.setNumber + 1, // Incrementar para el siguiente set
        pair1Score: 0,
        pair2Score: 0,
        winner: "pair1",
        completed: true,
      });

      // Llamar callback de éxito si existe
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error al guardar resultado:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el resultado. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-white shadow-md rounded-lg mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-center">Registrar Resultado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <h3 className="font-bold text-sm mb-2">Pareja 1</h3>
            <div className="text-sm">
              <div>{pairing.pair1.player1.alias || pairing.pair1.player1.name}</div>
              <div>{pairing.pair1.player2.alias || pairing.pair1.player2.name}</div>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <h3 className="font-bold text-sm mb-2">Pareja 2</h3>
            <div className="text-sm">
              <div>{pairing.pair2.player1.alias || pairing.pair2.player1.name}</div>
              <div>{pairing.pair2.player2.alias || pairing.pair2.player2.name}</div>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="setNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de set</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          field.onChange(value < 1 ? 1 : value);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gameDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pair1Score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puntos Pareja 1</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={7}
                        {...field}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          const validValue = Math.min(Math.max(0, value), 7);
                          field.onChange(validValue);
                          handleScoreChange(validValue, form.getValues("pair2Score"));
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pair2Score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puntos Pareja 2</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={7}
                        {...field}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          const validValue = Math.min(Math.max(0, value), 7);
                          field.onChange(validValue);
                          handleScoreChange(form.getValues("pair1Score"), validValue);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="winner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pareja ganadora</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pair1" id="pair1" />
                        <Label htmlFor="pair1" className="flex items-center">
                          <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                          Pareja 1
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pair2" id="pair2" />
                        <Label htmlFor="pair2" className="flex items-center">
                          <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                          Pareja 2
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Se selecciona automáticamente según el puntaje
                  </FormDescription>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Award className="mr-2 h-4 w-4" />
                  Registrar resultado
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}