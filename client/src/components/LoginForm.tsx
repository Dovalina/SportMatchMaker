import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Schema para login
const loginSchema = z.object({
  name: z.string().min(1, { message: "Nombre es requerido" }),
  password: z.string().min(1, { message: "Contraseña es requerida" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: (user: any) => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { toast } = useToast();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      name: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      return apiRequest<any>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "¡Inicio de sesión exitoso!",
        description: `Bienvenido, ${data.name}`,
      });
      
      // Guardar el usuario en localStorage
      localStorage.setItem("currentUser", JSON.stringify(data));
      
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error: any) => {
      console.error("Error de autenticación:", error);
      toast({
        title: "Error de inicio de sesión",
        description: "Credenciales inválidas. Por favor intente de nuevo.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: LoginFormValues) {
    mutation.mutate(data);
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
        <CardDescription>
          Ingrese sus credenciales para acceder al sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingrese su nombre de usuario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Ingrese su contraseña" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full" 
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Para registrarse como nuevo jugador, contacte al administrador.
        </p>
      </CardFooter>
    </Card>
  );
}