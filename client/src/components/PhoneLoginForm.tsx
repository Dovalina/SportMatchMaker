import React, { useState } from "react";
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
import { phoneLoginSchema, quickRegisterSchema } from "@shared/schema";

type PhoneLoginValues = z.infer<typeof phoneLoginSchema>;
type QuickRegisterValues = z.infer<typeof quickRegisterSchema>;

interface PhoneLoginFormProps {
  onSuccess?: (user: any) => void;
}

export default function PhoneLoginForm({ onSuccess }: PhoneLoginFormProps) {
  const { toast } = useToast();
  const [needsRegister, setNeedsRegister] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Formulario de login por teléfono
  const loginForm = useForm<PhoneLoginValues>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: {
      phone: "",
    },
  });

  // Formulario de registro rápido
  const registerForm = useForm<QuickRegisterValues>({
    resolver: zodResolver(quickRegisterSchema),
    defaultValues: {
      name: "",
      phone: "",
      alias: "",
    },
  });

  // Mutación para login
  const loginMutation = useMutation({
    mutationFn: async (data: PhoneLoginValues) => {
      return await apiRequest("/api/auth/login-phone", {
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
      // Si el teléfono no está registrado, mostrar formulario de registro
      if (error.response?.status === 404) {
        setNeedsRegister(true);
        setPhoneNumber(loginForm.getValues().phone);
        registerForm.setValue("phone", loginForm.getValues().phone);
        
        toast({
          title: "Número no registrado",
          description: "Por favor regístrese para continuar",
        });
      } else {
        toast({
          title: "Error de inicio de sesión",
          description: "Ocurrió un error. Por favor intente de nuevo.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutación para registro rápido
  const registerMutation = useMutation({
    mutationFn: async (data: QuickRegisterValues) => {
      return await apiRequest("/api/auth/register-phone", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "¡Registro exitoso!",
        description: `Bienvenido, ${data.name}`,
      });
      
      // Guardar el usuario en localStorage
      localStorage.setItem("currentUser", JSON.stringify(data));
      
      // Volver a formulario de login
      setNeedsRegister(false);
      
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error de registro",
        description: error.message || "Ocurrió un error. Por favor intente de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Manejar envío de login
  function onLoginSubmit(data: PhoneLoginValues) {
    loginMutation.mutate(data);
  }

  // Manejar envío de registro
  function onRegisterSubmit(data: QuickRegisterValues) {
    registerMutation.mutate(data);
  }

  // Cambiar a formulario de login
  function handleBackToLogin() {
    setNeedsRegister(false);
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          {needsRegister ? "Registro Rápido" : "Iniciar Sesión"}
        </CardTitle>
        <CardDescription>
          {needsRegister 
            ? "Complete sus datos para registrarse" 
            : "Ingrese su número de teléfono para acceder"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {needsRegister ? (
          // Formulario de registro
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <FormField
                control={registerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingrese su nombre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de teléfono</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel" 
                        placeholder="Ej: 6441234567" 
                        {...field} 
                        defaultValue={phoneNumber}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="alias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alias o apodo (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingrese un alias o apodo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleBackToLogin}
                  disabled={registerMutation.isPending}
                >
                  Volver
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Registrando..." : "Registrarme"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          // Formulario de login
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de teléfono</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel" 
                        placeholder="Ej: 6441234567" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Verificando..." : "Continuar"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="flex justify-center flex-col gap-2">
        {!needsRegister && (
          <>
            <p className="text-sm text-muted-foreground">
              Si es su primera vez, se le pedirá que se registre
            </p>
            <p className="text-sm text-muted-foreground">
              <Button 
                variant="link" 
                className="p-0 h-auto" 
                onClick={() => {
                  loginForm.setValue("phone", "123456789");
                  loginForm.handleSubmit(onLoginSubmit)();
                }}
              >
                Entrar como administrador
              </Button>
            </p>
          </>
        )}
      </CardFooter>
    </Card>
  );
}