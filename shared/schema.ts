import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  alias: text("alias"),
  phone: text("phone"),
  affiliationNumber: text("affiliation_number"),
  selected: boolean("selected").default(false),
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
});

export const insertCourtSchema = createInsertSchema(courts).pick({
  name: true,
});

// Pair type for frontend and API
export const pairSchema = z.object({
  player1: z.object({
    id: z.number(),
    name: z.string(),
    alias: z.string().optional(),
    phone: z.string().optional(),
    affiliationNumber: z.string().optional(),
    selected: z.boolean().optional(),
  }),
  player2: z.object({
    id: z.number(),
    name: z.string(),
    alias: z.string().optional(),
    phone: z.string().optional(),
    affiliationNumber: z.string().optional(),
    selected: z.boolean().optional(),
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

export type CourtPairing = z.infer<typeof courtPairingSchema>;
export type Pairings = z.infer<typeof pairingsSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;
export type PlayerRanking = z.infer<typeof playerRankingSchema>;
