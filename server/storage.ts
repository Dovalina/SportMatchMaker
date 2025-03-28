import { 
  courts, 
  players, 
  type Court, 
  type InsertCourt, 
  type InsertPlayer, 
  type MatchResult, 
  type Player,
  type PlayerRanking,
  UserRole,
  type Game,
  type WaitListPlayer
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
  
  // Autenticación y autorización
  authenticatePlayer(name: string, password: string): Promise<Player | null>;
  getPlayerByName(name: string): Promise<Player | undefined>;
  hasPermission(playerId: number, requiredRole: string): Promise<boolean>;
  
  // Operaciones de juegos y lista de espera
  getGames(): Promise<Game[]>;
  getGame(id: number): Promise<Game | undefined>;
  createGame(game: Omit<Game, 'id'>): Promise<Game>;
  updateGame(id: number, gameData: Partial<Game>): Promise<Game | undefined>;
  deleteGame(id: number): Promise<boolean>;
  
  // Lista de espera
  getWaitList(gameId: number): Promise<WaitListPlayer[]>;
  addToWaitList(gameId: number, playerId: number): Promise<WaitListPlayer | null>;
  removeFromWaitList(gameId: number, playerId: number): Promise<boolean>;
  moveFromWaitListToGame(gameId: number, playerId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private players: Map<number, Player>;
  private courts: Map<number, Court>;
  private matchResults: Map<number, MatchResult>;
  private playerRankings: Map<number, PlayerRanking>;
  private games: Map<number, Game>;
  private waitLists: Map<number, WaitListPlayer[]>; // key = gameId
  private playerIdCounter: number;
  private courtIdCounter: number;
  private resultIdCounter: number;
  private gameIdCounter: number;

  constructor() {
    this.players = new Map();
    this.courts = new Map();
    this.matchResults = new Map();
    this.playerRankings = new Map();
    this.games = new Map();
    this.waitLists = new Map();
    this.playerIdCounter = 1;
    this.courtIdCounter = 1;
    this.resultIdCounter = 1;
    this.gameIdCounter = 1;
    
    // Initialize with predefined courts
    const predefinedCourts = ["Lala", "AR", "Mochomos", "Combugas", "Casa del Vino", "Moric", "Central"];
    predefinedCourts.forEach(name => {
      this.createCourt({ name });
    });
    
    // Crear usuario superadmin por defecto
    this.createPlayer({
      name: "Admin",
      role: UserRole.SUPERADMIN,
      password: "admin123", // En una implementación real, esto debería estar hasheado
      selected: false
    });
    
    // Crear usuario admin con número de teléfono específico
    this.createPlayer({
      name: "Administrador",
      role: UserRole.ADMIN,
      phone: "123456789", // Número para acceso de administrador
      selected: false
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
      selected: insertPlayer.selected || false,
      role: insertPlayer.role || UserRole.PLAYER,
      password: insertPlayer.password || null,
      invitedBy: insertPlayer.invitedBy || null
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
  
  // Métodos de autenticación y autorización
  async authenticatePlayer(name: string, password: string): Promise<Player | null> {
    const player = await this.getPlayerByName(name);
    
    if (!player || player.password !== password) {
      return null;
    }
    
    return player;
  }
  
  // Autenticación por número de teléfono
  async authenticateByPhone(phone: string): Promise<Player | null> {
    const player = await this.getPlayerByPhone(phone);
    
    if (!player) {
      return null;
    }
    
    return player;
  }
  
  async getPlayerByName(name: string): Promise<Player | undefined> {
    const players = Array.from(this.players.values());
    return players.find(player => player.name === name);
  }
  
  async getPlayerByPhone(phone: string): Promise<Player | undefined> {
    const players = Array.from(this.players.values());
    return players.find(player => player.phone === phone);
  }
  
  async hasPermission(playerId: number, requiredRole: string): Promise<boolean> {
    const player = await this.getPlayer(playerId);
    if (!player) return false;
    
    // Verificar jerarquía de roles
    if (player.role === UserRole.SUPERADMIN) return true;
    if (player.role === UserRole.ADMIN && requiredRole !== UserRole.SUPERADMIN) return true;
    if (player.role === requiredRole) return true;
    
    return false;
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
  
  // Implementación de operaciones de juegos
  async getGames(): Promise<Game[]> {
    return Array.from(this.games.values());
  }
  
  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }
  
  async createGame(game: Omit<Game, 'id'>): Promise<Game> {
    const id = this.gameIdCounter++;
    const newGame: Game = { ...game, id };
    
    // Inicializar lista de espera vacía
    this.waitLists.set(id, []);
    
    this.games.set(id, newGame);
    return newGame;
  }
  
  async updateGame(id: number, gameData: Partial<Game>): Promise<Game | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const updatedGame = { ...game, ...gameData, id };
    this.games.set(id, updatedGame);
    return updatedGame;
  }
  
  async deleteGame(id: number): Promise<boolean> {
    // Eliminar también la lista de espera asociada
    this.waitLists.delete(id);
    return this.games.delete(id);
  }
  
  // Implementación de operaciones de lista de espera
  async getWaitList(gameId: number): Promise<WaitListPlayer[]> {
    const waitList = this.waitLists.get(gameId) || [];
    return waitList;
  }
  
  async addToWaitList(gameId: number, playerId: number): Promise<WaitListPlayer | null> {
    const game = this.games.get(gameId);
    if (!game) return null;
    
    const player = this.players.get(playerId);
    if (!player) return null;
    
    // Verificar si el jugador ya está en la lista de espera
    const waitList = this.waitLists.get(gameId) || [];
    if (waitList.some(p => p.id === playerId)) return null;
    
    // Construir objeto de jugador en espera
    const waitListPlayer: WaitListPlayer = {
      id: player.id,
      name: player.name,
      alias: player.alias,
      phone: player.phone,
      affiliationNumber: player.affiliationNumber,
      selected: player.selected === null ? false : player.selected,
      role: player.role,
    };
    
    // Actualizar lista de espera
    waitList.push(waitListPlayer);
    this.waitLists.set(gameId, waitList);
    
    return waitListPlayer;
  }
  
  async removeFromWaitList(gameId: number, playerId: number): Promise<boolean> {
    const waitList = this.waitLists.get(gameId) || [];
    const initialLength = waitList.length;
    
    const filteredList = waitList.filter(p => p.id !== playerId);
    this.waitLists.set(gameId, filteredList);
    
    return filteredList.length < initialLength;
  }
  
  async moveFromWaitListToGame(gameId: number, playerId: number): Promise<boolean> {
    // Esta funcionalidad requeriría más implementación en un sistema real
    // Para este ejemplo, simplemente seleccionamos el jugador y lo quitamos de la lista de espera
    const player = await this.getPlayer(playerId);
    if (!player) return false;
    
    // Marcar el jugador como seleccionado
    await this.updatePlayer(playerId, { selected: true });
    
    // Remover de la lista de espera
    return this.removeFromWaitList(gameId, playerId);
  }
}

export const storage = new MemStorage();
