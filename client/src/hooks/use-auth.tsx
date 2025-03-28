import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { UserRole } from "@shared/schema";

// Tipo para el usuario autenticado
export interface AuthUser {
  id: number;
  name: string;
  alias?: string | null;
  role: string;
  selected?: boolean;
}

// Contexto de autenticación
type AuthContextType = {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (role: string | string[]) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Proveedor de autenticación
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Cargar usuario desde localStorage al iniciar
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error al cargar usuario desde localStorage:", error);
        localStorage.removeItem("currentUser");
      }
    }
  }, []);

  // Iniciar sesión
  const login = (userData: AuthUser) => {
    setUser(userData);
    localStorage.setItem("currentUser", JSON.stringify(userData));
  };

  // Cerrar sesión
  const logout = () => {
    setUser(null);
    localStorage.removeItem("currentUser");
  };

  // Verificar si hay un usuario autenticado
  const isAuthenticated = () => {
    return user !== null;
  };

  // Verificar si el usuario tiene un rol específico
  const hasRole = (role: string | string[]) => {
    if (!user) return false;

    const roles = Array.isArray(role) ? role : [role];

    // Superadmin tiene acceso a todo
    if (user.role === UserRole.SUPERADMIN) return true;

    // Admin tiene acceso a todo excepto funciones de superadmin
    if (user.role === UserRole.ADMIN && !roles.includes(UserRole.SUPERADMIN)) return true;

    // Verificar si el rol del usuario está en la lista de roles permitidos
    return roles.includes(user.role);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    hasRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook para usar el contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}