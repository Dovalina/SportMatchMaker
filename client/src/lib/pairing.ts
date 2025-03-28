import type { Player } from "@shared/schema";

/**
 * Shuffles an array using the Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Validates if pairings can be generated with the given number of players and courts
 */
export function validatePairings(playerCount: number, courtCount: number): {
  isValid: boolean;
  message: string;
} {
  if (playerCount < courtCount * 4) {
    return {
      isValid: false,
      message: `Necesitas ${courtCount * 4} jugadores para ${courtCount} canchas. Actualmente tienes ${playerCount}.`,
    };
  }
  
  if (playerCount % 4 !== 0) {
    return {
      isValid: false,
      message: "El número de jugadores debe ser divisible por 4 para formar parejas en todas las canchas.",
    };
  }
  
  return {
    isValid: true,
    message: "",
  };
}
