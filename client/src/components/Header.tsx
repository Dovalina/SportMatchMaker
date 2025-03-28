import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "../assets/logo.svg";

interface HeaderProps {
  onReset: () => void;
}

export default function Header({ onReset }: HeaderProps) {
  return (
    <div className="bg-[var(--color-dark)] text-[var(--color-white)] shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Logo" className="h-12 w-12" />
            <h1 className="text-xl font-bold text-[var(--color-white)]">
              Emparejador de Canchas
            </h1>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-[var(--color-white)] hover:text-[var(--color-primary)] flex items-center gap-1">
                <RefreshCw className="h-5 w-5" />
                <span>Reiniciar</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se borrarán todas las parejas generadas. Los jugadores y canchas se mantendrán.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onReset} className="bg-[var(--color-primary)] text-[var(--color-dark)]">
                  Sí, reiniciar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
