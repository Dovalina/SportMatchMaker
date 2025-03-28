import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enumeración de roles de usuario
export const UserRole = {
  PLAYER: "player",
  ADMIN: "admin",
  SUPERADMIN: "superadmin"
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  alias: text("alias"),
  phone: text("phone"), // Será usado para autenticación
  affiliationNumber: text("affiliation_number"),
  selected: boolean("selected").default(false),
  role: text("role").default(UserRole.PLAYER).notNull(),
  password: text("password"), // Solo para admin/superadmin
  invitedBy: text("invited_by"), // ID del jugador que lo invitó
});

export const courts = pgTable("courts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const insertPlayerSchema = createInsertSchema(players).pick({
  name: true,
  alias: true,
  phone: true,
  affiliationNumber: true,
  selected: true,
  role: true,
  password: true,
  invitedBy: true,
});

// Schema para inicio de sesión por teléfono
export const phoneLoginSchema = z.object({
  phone: z.string().min(1, { message: "Número de teléfono es requerido" }),
});

// Schema para registro rápido por teléfono
export const quickRegisterSchema = z.object({
  name: z.string().min(1, { message: "Nombre es requerido" }),
  phone: z.string().min(1, { message: "Número de teléfono es requerido" }),
  alias: z.string().optional(),
});

export const insertCourtSchema = createInsertSchema(courts).pick({
  name: true,
});

// Schema para lista de espera
export const waitListPlayerSchema = z.object({
  id: z.number(),
  name: z.string(),
  alias: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  affiliationNumber: z.string().nullable().optional(),
  selected: z.boolean(),
  role: z.string().default(UserRole.PLAYER).optional(),
});

// Pair type for frontend and API
export const pairSchema = z.object({
  player1: z.object({
    id: z.number(),
    name: z.string(),
    alias: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    affiliationNumber: z.string().nullable().optional(),
    selected: z.boolean().optional(),
    role: z.string().default(UserRole.PLAYER).optional(),
  }),
  player2: z.object({
    id: z.number(),
    name: z.string(),
    alias: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    affiliationNumber: z.string().nullable().optional(),
    selected: z.boolean().optional(),
    role: z.string().default(UserRole.PLAYER).optional(),
  }),
});

// Court pairing type with two pairs
export const courtPairingSchema = z.object({
  courtId: z.number(),
  courtName: z.string(),
  pair1: pairSchema,
  pair2: pairSchema,
  sets: z.number().min(1).default(1),
  gameDate: z.string().optional(),
});

// Complete pairings result
export const pairingsSchema = z.array(courtPairingSchema);

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type InsertCourt = z.infer<typeof insertCourtSchema>;
export type Player = typeof players.$inferSelect;
export type Court = typeof courts.$inferSelect;
export type Pair = z.infer<typeof pairSchema>;
// Schema para los resultados de partidos
export const matchResultSchema = z.object({
  id: z.number().optional(),
  pairingId: z.number(), // Identificador único para el emparejamiento
  gameDate: z.string(),
  setNumber: z.number().min(1),
  pair1Score: z.number().min(0),
  pair2Score: z.number().min(0),
  winner: z.enum(["pair1", "pair2"]),
  completed: z.boolean().default(false),
  // Referencias a las parejas
  pair1: pairSchema,
  pair2: pairSchema,
  courtId: z.number(),
  courtName: z.string(),
});

// Schema para los rankings de jugadores
export const playerRankingSchema = z.object({
  playerId: z.number(),
  playerName: z.string(),
  gamesPlayed: z.number().default(0),
  gamesWon: z.number().default(0),
  setsPlayed: z.number().default(0),
  setsWon: z.number().default(0),
  points: z.number().default(0), // Puntos acumulados
});

// Schema para juegos (agrupación de parejas por fecha)
export const gameSchema = z.object({
  id: z.number().optional(),
  gameDate: z.string(),
  date: z.string().optional(), // campo adicional para compatibilidad
  courtIds: z.array(z.number()),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  maxPlayers: z.number().optional(),
  waitList: z.array(waitListPlayerSchema).optional(),
  playerIds: z.array(z.number()).default([]), // IDs de jugadores seleccionados
  setsPerMatch: z.number().default(3), // Número de sets por partido
  description: z.string().optional(), // Descripción opcional
});

// Schema para la lista de espera
export const waitListSchema = z.array(waitListPlayerSchema);

export type CourtPairing = z.infer<typeof courtPairingSchema>;
export type Pairings = z.infer<typeof pairingsSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;
export type PlayerRanking = z.infer<typeof playerRankingSchema>;
export type WaitListPlayer = z.infer<typeof waitListPlayerSchema>;
export type Game = z.infer<typeof gameSchema>;
