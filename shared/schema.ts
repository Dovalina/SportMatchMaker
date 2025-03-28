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
export type CourtPairing = z.infer<typeof courtPairingSchema>;
export type Pairings = z.infer<typeof pairingsSchema>;
