import { courts, players, type Court, type InsertCourt, type InsertPlayer, type Player } from "@shared/schema";

export interface IStorage {
  // Player operations
  getPlayers(): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  deletePlayer(id: number): Promise<boolean>;
  
  // Court operations
  getCourts(): Promise<Court[]>;
  getCourt(id: number): Promise<Court | undefined>;
  createCourt(court: InsertCourt): Promise<Court>;
  deleteCourt(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private players: Map<number, Player>;
  private courts: Map<number, Court>;
  private playerIdCounter: number;
  private courtIdCounter: number;

  constructor() {
    this.players = new Map();
    this.courts = new Map();
    this.playerIdCounter = 1;
    this.courtIdCounter = 1;
    
    // Initialize with one court
    this.createCourt({ name: "Cancha 1" });
  }

  // Player operations
  async getPlayers(): Promise<Player[]> {
    return Array.from(this.players.values());
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.playerIdCounter++;
    const player: Player = { ...insertPlayer, id };
    this.players.set(id, player);
    return player;
  }

  async deletePlayer(id: number): Promise<boolean> {
    return this.players.delete(id);
  }

  // Court operations
  async getCourts(): Promise<Court[]> {
    return Array.from(this.courts.values());
  }

  async getCourt(id: number): Promise<Court | undefined> {
    return this.courts.get(id);
  }

  async createCourt(insertCourt: InsertCourt): Promise<Court> {
    const id = this.courtIdCounter++;
    const court: Court = { ...insertCourt, id };
    this.courts.set(id, court);
    return court;
  }

  async deleteCourt(id: number): Promise<boolean> {
    return this.courts.delete(id);
  }
}

export const storage = new MemStorage();
