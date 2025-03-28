import { 
  courts, 
  players, 
  type Court, 
  type InsertCourt, 
  type InsertPlayer, 
  type MatchResult, 
  type Player,
  type PlayerRanking
} from "@shared/schema";

export interface IStorage {
  // Player operations
  getPlayers(): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, playerData: Partial<InsertPlayer>): Promise<Player | undefined>;
  togglePlayerSelection(id: number): Promise<Player | undefined>;
  getSelectedPlayers(): Promise<Player[]>;
  deletePlayer(id: number): Promise<boolean>;
  
  // Court operations
  getCourts(): Promise<Court[]>;
  getCourt(id: number): Promise<Court | undefined>;
  createCourt(court: InsertCourt): Promise<Court>;
  deleteCourt(id: number): Promise<boolean>;
  
  // Match results operations
  getMatchResults(gameDate?: string): Promise<MatchResult[]>;
  saveMatchResult(result: MatchResult): Promise<MatchResult>;
  updateMatchResult(id: number, result: Partial<MatchResult>): Promise<MatchResult | undefined>;
  
  // Ranking operations
  getPlayerRankings(): Promise<PlayerRanking[]>;
  updatePlayerRanking(playerId: number, data: Partial<PlayerRanking>): Promise<PlayerRanking | undefined>;
  calculateRankings(): Promise<void>; // Recalcula todos los rankings basados en los resultados de partidos
}

export class MemStorage implements IStorage {
  private players: Map<number, Player>;
  private courts: Map<number, Court>;
  private matchResults: Map<number, MatchResult>;
  private playerRankings: Map<number, PlayerRanking>;
  private playerIdCounter: number;
  private courtIdCounter: number;
  private resultIdCounter: number;

  constructor() {
    this.players = new Map();
    this.courts = new Map();
    this.matchResults = new Map();
    this.playerRankings = new Map();
    this.playerIdCounter = 1;
    this.courtIdCounter = 1;
    this.resultIdCounter = 1;
    
    // Initialize with predefined courts
    const predefinedCourts = ["Lala", "AR", "Mochomos", "Combugas", "Casa del Vino", "Moric", "Central"];
    predefinedCourts.forEach(name => {
      this.createCourt({ name });
    });
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
    const player: Player = { 
      ...insertPlayer, 
      id,
      alias: insertPlayer.alias || null,
      phone: insertPlayer.phone || null,
      affiliationNumber: insertPlayer.affiliationNumber || null,
      selected: insertPlayer.selected || false
    };
    this.players.set(id, player);
    return player;
  }

  async updatePlayer(id: number, playerData: Partial<InsertPlayer>): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;

    const updatedPlayer: Player = {
      ...player,
      ...playerData,
      id
    };

    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  async togglePlayerSelection(id: number): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;

    const updatedPlayer: Player = {
      ...player,
      selected: player.selected === null ? true : !player.selected
    };

    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  async getSelectedPlayers(): Promise<Player[]> {
    return Array.from(this.players.values()).filter(player => player.selected);
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
  
  // Match results operations
  async getMatchResults(gameDate?: string): Promise<MatchResult[]> {
    const results = Array.from(this.matchResults.values());
    if (gameDate) {
      return results.filter(result => result.gameDate === gameDate);
    }
    return results;
  }
  
  async saveMatchResult(result: MatchResult): Promise<MatchResult> {
    const id = this.resultIdCounter++;
    const newResult = { ...result, id };
    this.matchResults.set(id, newResult);
    
    // Calcular rankings después de guardar el resultado
    await this.calculateRankings();
    
    return newResult;
  }
  
  async updateMatchResult(id: number, result: Partial<MatchResult>): Promise<MatchResult | undefined> {
    const existingResult = this.matchResults.get(id);
    if (!existingResult) return undefined;
    
    const updatedResult = { ...existingResult, ...result, id };
    this.matchResults.set(id, updatedResult);
    
    // Recalcular rankings después de actualizar el resultado
    await this.calculateRankings();
    
    return updatedResult;
  }
  
  // Ranking operations
  async getPlayerRankings(): Promise<PlayerRanking[]> {
    return Array.from(this.playerRankings.values())
      .sort((a, b) => b.points - a.points); // Ordenar por puntos en orden descendente
  }
  
  async updatePlayerRanking(playerId: number, data: Partial<PlayerRanking>): Promise<PlayerRanking | undefined> {
    const existingRanking = this.playerRankings.get(playerId);
    if (!existingRanking) return undefined;
    
    const updatedRanking = { ...existingRanking, ...data };
    this.playerRankings.set(playerId, updatedRanking);
    
    return updatedRanking;
  }
  
  async calculateRankings(): Promise<void> {
    // Reiniciar rankings
    this.playerRankings.clear();
    
    // Inicializar rankings para todos los jugadores
    const allPlayers = await this.getPlayers();
    allPlayers.forEach(player => {
      this.playerRankings.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        gamesPlayed: 0,
        gamesWon: 0,
        setsPlayed: 0,
        setsWon: 0,
        points: 0
      });
    });
    
    // Procesar todos los resultados
    const results = Array.from(this.matchResults.values());
    
    for (const result of results) {
      if (!result.completed) continue;
      
      const player1Id = result.pair1.player1.id;
      const player2Id = result.pair1.player2.id;
      const player3Id = result.pair2.player1.id;
      const player4Id = result.pair2.player2.id;
      
      // Actualizar estadísticas para el par 1
      if (result.winner === 'pair1') {
        this.updatePairStats(player1Id, player2Id, true, result.setNumber);
        this.updatePairStats(player3Id, player4Id, false, result.setNumber);
      } else {
        this.updatePairStats(player1Id, player2Id, false, result.setNumber);
        this.updatePairStats(player3Id, player4Id, true, result.setNumber);
      }
    }
  }
  
  // Método auxiliar para actualizar estadísticas de un par de jugadores
  private updatePairStats(player1Id: number, player2Id: number, isWinner: boolean, setCount: number): void {
    const ranking1 = this.playerRankings.get(player1Id);
    const ranking2 = this.playerRankings.get(player2Id);
    
    // Obtener todos los resultados para verificar marcadores 6-0
    const results = Array.from(this.matchResults.values());
    const specialScoreResults = results.filter(result => 
      (result.pair1Score === 6 && result.pair2Score === 0) || 
      (result.pair1Score === 0 && result.pair2Score === 6)
    );
    
    if (ranking1) {
      // Actualizar estadísticas del jugador 1
      ranking1.gamesPlayed += 1;
      ranking1.setsPlayed += setCount;
      
      // 1 punto por default por participación
      ranking1.points += 1;
      
      if (isWinner) {
        ranking1.gamesWon += 1;
        ranking1.setsWon += setCount;
        
        // 1 punto adicional por cada set ganado
        ranking1.points += setCount;
        
        // Verificar si hubo marcadores 6-0 a favor
        for (const result of specialScoreResults) {
          if ((result.winner === 'pair1' && 
               (result.pair1.player1.id === player1Id || result.pair1.player2.id === player1Id)) || 
              (result.winner === 'pair2' && 
               (result.pair2.player1.id === player1Id || result.pair2.player2.id === player1Id))) {
            // 3 puntos adicionales por sets 6-0
            ranking1.points += 3;
          }
        }
      } else {
        // Restar 1 punto por cada set perdido
        ranking1.points -= setCount;
        
        // Verificar si hubo marcadores 0-6 en contra
        for (const result of specialScoreResults) {
          if ((result.winner === 'pair2' && 
               (result.pair1.player1.id === player1Id || result.pair1.player2.id === player1Id)) || 
              (result.winner === 'pair1' && 
               (result.pair2.player1.id === player1Id || result.pair2.player2.id === player1Id))) {
            // -3 puntos adicionales por sets 0-6
            ranking1.points -= 3;
          }
        }
      }
      
      // Asegurar que los puntos no sean negativos
      ranking1.points = Math.max(0, ranking1.points);
      
      this.playerRankings.set(player1Id, ranking1);
    }
    
    if (ranking2) {
      // Actualizar estadísticas del jugador 2
      ranking2.gamesPlayed += 1;
      ranking2.setsPlayed += setCount;
      
      // 1 punto por default por participación
      ranking2.points += 1;
      
      if (isWinner) {
        ranking2.gamesWon += 1;
        ranking2.setsWon += setCount;
        
        // 1 punto adicional por cada set ganado
        ranking2.points += setCount;
        
        // Verificar si hubo marcadores 6-0 a favor
        for (const result of specialScoreResults) {
          if ((result.winner === 'pair1' && 
               (result.pair1.player1.id === player2Id || result.pair1.player2.id === player2Id)) || 
              (result.winner === 'pair2' && 
               (result.pair2.player1.id === player2Id || result.pair2.player2.id === player2Id))) {
            // 3 puntos adicionales por sets 6-0
            ranking2.points += 3;
          }
        }
      } else {
        // Restar 1 punto por cada set perdido
        ranking2.points -= setCount;
        
        // Verificar si hubo marcadores 0-6 en contra
        for (const result of specialScoreResults) {
          if ((result.winner === 'pair2' && 
               (result.pair1.player1.id === player2Id || result.pair1.player2.id === player2Id)) || 
              (result.winner === 'pair1' && 
               (result.pair2.player1.id === player2Id || result.pair2.player2.id === player2Id))) {
            // -3 puntos adicionales por sets 0-6
            ranking2.points -= 3;
          }
        }
      }
      
      // Asegurar que los puntos no sean negativos
      ranking2.points = Math.max(0, ranking2.points);
      
      this.playerRankings.set(player2Id, ranking2);
    }
  }
}

export const storage = new MemStorage();
