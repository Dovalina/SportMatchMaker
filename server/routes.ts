import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCourtSchema, insertPlayerSchema, pairingsSchema, gameSchema, UserRole } from "@shared/schema";
import { z } from "zod";

// Middleware de autenticación
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;
  
  if (!authorization) {
    return res.status(401).json({ message: "Se requiere autenticación" });
  }
  
  try {
    // Formato esperado: "Basic nombre:contraseña" (en codificación Base64)
    const authParts = authorization.split(' ');
    if (authParts.length !== 2 || authParts[0] !== 'Basic') {
      return res.status(401).json({ message: "Formato de autenticación inválido" });
    }
    
    const credentials = Buffer.from(authParts[1], 'base64').toString().split(':');
    if (credentials.length !== 2) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    
    const [name, password] = credentials;
    const player = await storage.authenticatePlayer(name, password);
    
    if (!player) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    
    // Agregar el usuario autenticado a la solicitud
    (req as any).user = player;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Error en la autenticación" });
  }
};

// Middleware de autorización basado en roles
const roleMiddleware = (requiredRole: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: "No autenticado" });
    }
    
    const hasPermission = await storage.hasPermission(user.id, requiredRole);
    
    if (!hasPermission) {
      return res.status(403).json({ message: "No autorizado para esta acción" });
    }
    
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Rutas de autenticación
  
  // Login tradicional (para admin)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { name, password } = req.body;
      if (!name || !password) {
        return res.status(400).json({ message: "Se requiere nombre y contraseña" });
      }
      
      const player = await storage.authenticatePlayer(name, password);
      
      if (!player) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }
      
      // Enviar usuario autenticado (sin contraseña)
      const { password: _, ...playerWithoutPassword } = player;
      res.json(playerWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error en la autenticación" });
    }
  });
  
  // Login por teléfono
  app.post("/api/auth/login-phone", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ message: "Se requiere número de teléfono" });
      }
      
      const player = await storage.authenticateByPhone(phone);
      
      if (!player) {
        return res.status(404).json({ 
          message: "Número de teléfono no registrado",
          notRegistered: true
        });
      }
      
      // Enviar usuario autenticado (sin contraseña)
      const { password: _, ...playerWithoutPassword } = player;
      res.json(playerWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error en la autenticación" });
    }
  });
  
  // Registro rápido por teléfono
  app.post("/api/auth/register-phone", async (req, res) => {
    try {
      const { name, phone, alias } = req.body;
      if (!name || !phone) {
        return res.status(400).json({ message: "Se requiere nombre y número de teléfono" });
      }
      
      // Verificar si el teléfono ya está registrado
      const existingPlayer = await storage.getPlayerByPhone(phone);
      if (existingPlayer) {
        return res.status(400).json({ message: "Este número de teléfono ya está registrado" });
      }
      
      // Crear nuevo jugador
      const newPlayer = await storage.createPlayer({
        name,
        phone,
        alias: alias || null,
        role: UserRole.PLAYER,
        selected: false
      });
      
      // Enviar usuario recién registrado
      const { password: _, ...playerWithoutPassword } = newPlayer;
      res.status(201).json(playerWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error al registrar usuario" });
    }
  });
  
  // Registrar invitado (solo para usuarios autenticados)
  app.post("/api/players/invite", async (req, res) => {
    try {
      const { name, invitedBy, alias } = req.body;
      
      if (!name || !invitedBy) {
        return res.status(400).json({ message: "Faltan datos requeridos" });
      }
      
      // Verificar que el usuario que invita existe
      const inviter = await storage.getPlayer(parseInt(invitedBy));
      if (!inviter) {
        return res.status(404).json({ message: "Jugador que invita no encontrado" });
      }
      
      // Crear el jugador invitado
      const displayName = `${name} (${inviter.alias || inviter.name})`;
      
      const newPlayer = await storage.createPlayer({
        name: displayName,
        alias: alias || null,
        role: UserRole.PLAYER,
        selected: false,
        invitedBy: invitedBy.toString()
      });
      
      res.status(201).json(newPlayer);
    } catch (error) {
      res.status(500).json({ message: "Error al registrar invitado" });
    }
  });
  
  // Players API
  app.get("/api/players", async (req, res) => {
    const players = await storage.getPlayers();
    res.json(players);
  });
  
  // Get selected players (Colocada antes de la ruta con id param)
  app.get("/api/players/selected", async (req, res) => {
    try {
      const selectedPlayers = await storage.getSelectedPlayers();
      res.json(selectedPlayers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get selected players" });
    }
  });

  app.post("/api/players", async (req, res) => {
    try {
      const validatedData = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(validatedData);
      res.status(201).json(player);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid player data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create player" });
      }
    }
  });

  app.delete("/api/players/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid player ID" });
    }
    
    const deleted = await storage.deletePlayer(id);
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Player not found" });
    }
  });
  
  // Update a player
  app.patch("/api/players/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid player ID" });
      }
      
      const playerData = req.body;
      const updatedPlayer = await storage.updatePlayer(id, playerData);
      
      if (updatedPlayer) {
        res.json(updatedPlayer);
      } else {
        res.status(404).json({ message: "Player not found" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid player data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update player" });
      }
    }
  });
  
  // Toggle player selection
  app.post("/api/players/:id/toggle-selection", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid player ID" });
      }
      
      const updatedPlayer = await storage.togglePlayerSelection(id);
      
      if (updatedPlayer) {
        res.json(updatedPlayer);
      } else {
        res.status(404).json({ message: "Player not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle player selection" });
    }
  });

  // Courts API
  app.get("/api/courts", async (req, res) => {
    const courts = await storage.getCourts();
    res.json(courts);
  });

  app.post("/api/courts", async (req, res) => {
    try {
      const validCourtNames = ["Lala", "AR", "Mochomos", "Combugas", "Casa del Vino", "Moric", "Central"];
      
      const validatedData = insertCourtSchema.parse(req.body);
      
      // Si un nombre específico es proporcionado y no está en la lista, rechazar
      if (validatedData.name && !validCourtNames.includes(validatedData.name)) {
        return res.status(400).json({ 
          message: "Nombre de cancha no válido. Debe ser uno de: " + validCourtNames.join(", ") 
        });
      }
      
      const court = await storage.createCourt(validatedData);
      res.status(201).json(court);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid court data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create court" });
      }
    }
  });

  app.delete("/api/courts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid court ID" });
    }
    
    const deleted = await storage.deleteCourt(id);
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Court not found" });
    }
  });

  // Generate pairings
  app.post("/api/pairings/generate", async (req, res) => {
    try {
      // Obtener parámetros de la solicitud
      const { gameDate, sets = 1, selectedCourtIds = [] } = req.body;
      
      const allPlayers = await storage.getPlayers();
      const selectedPlayers = await storage.getSelectedPlayers();
      const players = selectedPlayers.length > 0 ? selectedPlayers : allPlayers;
      
      // Validación básica de jugadores
      if (players.length < 4) {
        return res.status(400).json({ 
          message: "Se necesitan al menos 4 jugadores para generar parejas" 
        });
      }
      
      if (players.length % 4 !== 0) {
        return res.status(400).json({ 
          message: `Se necesita un múltiplo de 4 jugadores para emparejamientos equitativos (actualmente ${players.length})` 
        });
      }
      
      // Calculamos cuántas canchas necesitamos
      const requiredCourts = Math.floor(players.length / 4);
      
      // Obtener todas las canchas
      const allCourts = await storage.getCourts();
      
      // Filtrar canchas según selección o usar todas disponibles
      let availableCourts = [];
      if (selectedCourtIds && selectedCourtIds.length > 0) {
        // Usar canchas seleccionadas
        availableCourts = allCourts.filter(court => selectedCourtIds.includes(court.id));
      } else {
        // Usar todas las canchas disponibles
        availableCourts = allCourts;
      }
      
      // Verificar si tenemos suficientes canchas
      if (availableCourts.length < requiredCourts) {
        return res.status(400).json({ 
          message: `No hay suficientes canchas (${availableCourts.length}) para los jugadores seleccionados (${players.length}). Se necesitan ${requiredCourts} canchas.` 
        });
      }
      
      // Limitamos las canchas a las necesarias
      const selectedCourts = availableCourts.slice(0, requiredCourts);
      
      // Obtener los rankings de los jugadores para crear emparejamientos más equilibrados
      await storage.calculateRankings(); // Asegurar que los rankings están actualizados
      const rankings = await storage.getPlayerRankings();
      
      // Función para obtener el ranking de un jugador por su ID
      const getPlayerRanking = (playerId: number) => {
        const ranking = rankings.find(r => r.playerId === playerId);
        return ranking ? ranking.points : 0; // Si no tiene ranking, devolvemos 0
      };
      
      // Ordenar jugadores por ranking (de mayor a menor)
      const sortedPlayers = [...players].sort((a, b) => {
        const rankingA = getPlayerRanking(a.id);
        const rankingB = getPlayerRanking(b.id);
        return rankingB - rankingA; // Orden descendente
      });
      
      // Crear pares más equilibrados usando el sistema de "serpiente"
      // Los mejores jugadores se emparejan con los de menor ranking
      const balancedPairs = [];
      
      // Crear parejas alternando el ranking
      // 1+8, 2+7, 3+6, 4+5, etc.
      for (let i = 0; i < sortedPlayers.length / 2; i++) {
        const topPlayer = sortedPlayers[i];
        const bottomPlayer = sortedPlayers[sortedPlayers.length - 1 - i];
        
        balancedPairs.push({
          player1: topPlayer,
          player2: bottomPlayer
        });
      }
      
      // Ordenar las parejas por su puntuación combinada
      const sortedPairs = balancedPairs.sort((a, b) => {
        const scoreA = getPlayerRanking(a.player1.id) + getPlayerRanking(a.player2.id);
        const scoreB = getPlayerRanking(b.player1.id) + getPlayerRanking(b.player2.id);
        return scoreB - scoreA; // Orden descendente
      });
      
      // Agrupar parejas para cada cancha de forma equilibrada
      // Parejas 0 y 3 en una cancha, 1 y 2 en otra, etc.
      const pairings = [];
      
      for (let i = 0; i < selectedCourts.length && i * 2 < sortedPairs.length; i++) {
        const pairIndex1 = i;
        const pairIndex2 = sortedPairs.length - 1 - i;
        
        // Evitar duplicados si nos quedamos sin parejas suficientes
        if (pairIndex1 >= pairIndex2) break;
        
        const courtPairing = {
          courtId: selectedCourts[i].id,
          courtName: selectedCourts[i].name,
          pair1: sortedPairs[pairIndex1],
          pair2: sortedPairs[pairIndex2],
          sets: Number(sets) || 3, // Valor por defecto de 3 sets
          gameDate: gameDate || new Date().toISOString().split('T')[0]
        };
        
        pairings.push(courtPairing);
      }
      
      // Validar la respuesta con nuestro schema
      const validatedPairings = pairingsSchema.parse(pairings);
      res.json(validatedPairings);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Formato de datos inválido", errors: error.errors });
      } else {
        console.error("Error al generar emparejamientos:", error);
        res.status(500).json({ message: "Error al generar emparejamientos" });
      }
    }
  });

  // Rutas para resultados de partidos
  app.get("/api/match-results", async (req, res) => {
    try {
      const { gameDate } = req.query;
      const results = await storage.getMatchResults(gameDate as string);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener resultados" });
    }
  });
  
  app.post("/api/match-results", async (req, res) => {
    try {
      const result = req.body;
      const savedResult = await storage.saveMatchResult(result);
      
      // Recalcular rankings automáticamente después de guardar un resultado
      await storage.calculateRankings();
      
      res.status(201).json(savedResult);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Datos de resultado inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error al guardar resultado" });
      }
    }
  });
  
  app.patch("/api/match-results/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de resultado inválido" });
      }
      
      const result = req.body;
      const updatedResult = await storage.updateMatchResult(id, result);
      
      if (updatedResult) {
        // Recalcular rankings después de actualizar un resultado
        await storage.calculateRankings();
        
        res.json(updatedResult);
      } else {
        res.status(404).json({ message: "Resultado no encontrado" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Datos de resultado inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error al actualizar resultado" });
      }
    }
  });
  
  // Rutas para rankings
  app.get("/api/rankings", async (req, res) => {
    try {
      // Asegurarse de que los rankings estén actualizados
      await storage.calculateRankings();
      
      // Obtener rankings
      const rankings = await storage.getPlayerRankings();
      res.json(rankings);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener rankings" });
    }
  });
  
  // Rutas para la gestión de juegos (solo admin)
  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getGames();
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener juegos" });
    }
  });
  
  app.get("/api/games/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de juego inválido" });
      }
      
      const game = await storage.getGame(id);
      if (!game) {
        return res.status(404).json({ message: "Juego no encontrado" });
      }
      
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener juego" });
    }
  });
  
  // Crear juego (protegido, solo admin)
  app.post("/api/games", authMiddleware, roleMiddleware(UserRole.ADMIN), async (req, res) => {
    try {
      const gameData = gameSchema.omit({ id: true }).parse(req.body);
      
      // Validar que las canchas existan
      const courts = await Promise.all(
        gameData.courtIds.map((id: number) => storage.getCourt(id))
      );
      
      if (courts.some(court => !court)) {
        return res.status(400).json({ 
          message: "Una o más canchas seleccionadas no existen" 
        });
      }
      
      // Calcular capacidad máxima de jugadores (4 por cancha)
      const maxPlayers = gameData.courtIds.length * 4;
      const gameWithCapacity = {
        ...gameData,
        maxPlayers
      };
      
      const newGame = await storage.createGame(gameWithCapacity);
      res.status(201).json(newGame);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Datos de juego inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error al crear juego" });
      }
    }
  });
  
  // Actualizar juego (protegido, solo admin)
  app.patch("/api/games/:id", authMiddleware, roleMiddleware(UserRole.ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de juego inválido" });
      }
      
      const game = await storage.getGame(id);
      if (!game) {
        return res.status(404).json({ message: "Juego no encontrado" });
      }
      
      const updateData = req.body;
      
      // Si se actualizan las canchas, recalcular capacidad máxima
      if (updateData.courtIds) {
        // Validar que las canchas existan
        const courts = await Promise.all(
          updateData.courtIds.map((id: number) => storage.getCourt(id))
        );
        
        if (courts.some(court => !court)) {
          return res.status(400).json({ 
            message: "Una o más canchas seleccionadas no existen" 
          });
        }
        
        // Actualizar capacidad máxima
        updateData.maxPlayers = updateData.courtIds.length * 4;
      }
      
      const updatedGame = await storage.updateGame(id, updateData);
      res.json(updatedGame);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Datos de actualización inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error al actualizar juego" });
      }
    }
  });
  
  // Eliminar juego (protegido, solo admin)
  app.delete("/api/games/:id", authMiddleware, roleMiddleware(UserRole.ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de juego inválido" });
      }
      
      const deleted = await storage.deleteGame(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Juego no encontrado" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar juego" });
    }
  });
  
  // Rutas para la lista de espera
  app.get("/api/games/:id/waitlist", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return res.status(400).json({ message: "ID de juego inválido" });
      }
      
      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ message: "Juego no encontrado" });
      }
      
      const waitList = await storage.getWaitList(gameId);
      res.json(waitList);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener lista de espera" });
    }
  });
  
  // Añadir jugador a la lista de espera
  app.post("/api/games/:id/waitlist/:playerId", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const playerId = parseInt(req.params.playerId);
      
      if (isNaN(gameId) || isNaN(playerId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      
      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ message: "Juego no encontrado" });
      }
      
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ message: "Jugador no encontrado" });
      }
      
      const waitListPlayer = await storage.addToWaitList(gameId, playerId);
      if (!waitListPlayer) {
        return res.status(400).json({ message: "El jugador ya está en la lista de espera" });
      }
      
      res.status(201).json(waitListPlayer);
    } catch (error) {
      res.status(500).json({ message: "Error al añadir jugador a la lista de espera" });
    }
  });
  
  // Eliminar jugador de la lista de espera
  app.delete("/api/games/:id/waitlist/:playerId", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const playerId = parseInt(req.params.playerId);
      
      if (isNaN(gameId) || isNaN(playerId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      
      const removed = await storage.removeFromWaitList(gameId, playerId);
      if (removed) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Jugador no encontrado en la lista de espera" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar jugador de la lista de espera" });
    }
  });
  
  // Mover jugador de la lista de espera al juego (solo admin)
  app.post("/api/games/:id/waitlist/:playerId/move", authMiddleware, roleMiddleware(UserRole.ADMIN), async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const playerId = parseInt(req.params.playerId);
      
      if (isNaN(gameId) || isNaN(playerId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      
      const moved = await storage.moveFromWaitListToGame(gameId, playerId);
      if (moved) {
        res.status(200).json({ message: "Jugador movido al juego exitosamente" });
      } else {
        res.status(404).json({ message: "Error al mover jugador de la lista de espera" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error al mover jugador" });
    }
  });
  
  // Actualizar la generación de parejas para requerir rol admin
  app.post("/api/pairings/generate", authMiddleware, roleMiddleware(UserRole.ADMIN), async (req, res) => {
    try {
      // Obtener parámetros de la solicitud
      const { gameDate, sets = 3, selectedCourtIds = [] } = req.body;
      
      // Resto del código de generación de parejas igual que antes...
      const allPlayers = await storage.getPlayers();
      const selectedPlayers = await storage.getSelectedPlayers();
      const players = selectedPlayers.length > 0 ? selectedPlayers : allPlayers;
      
      // Validación básica de jugadores
      if (players.length < 4) {
        return res.status(400).json({ 
          message: "Se necesitan al menos 4 jugadores para generar parejas" 
        });
      }
      
      // Obtener todas las canchas
      const allCourts = await storage.getCourts();
      
      // Filtrar canchas según selección o usar todas disponibles
      let availableCourts = [];
      if (selectedCourtIds && selectedCourtIds.length > 0) {
        // Usar canchas seleccionadas
        availableCourts = allCourts.filter(court => selectedCourtIds.includes(court.id));
      } else {
        // Usar todas las canchas disponibles
        availableCourts = allCourts;
      }
      
      // Verificar si hay suficientes canchas para los jugadores seleccionados
      // Cada cancha necesita exactamente 4 jugadores
      const maxPlayers = availableCourts.length * 4;
      
      // Si hay más jugadores que la capacidad máxima, solo tomamos el máximo posible
      const eligiblePlayers = players.slice(0, maxPlayers);
      
      // Verificar si quedaron jugadores fuera que deberían ir a la lista de espera
      const waitListPlayers = players.slice(maxPlayers);
      
      // Calculamos cuántas canchas realmente necesitamos (basado en jugadores elegibles)
      const requiredCourts = Math.floor(eligiblePlayers.length / 4);
      
      // Si no hay suficientes jugadores para al menos una cancha
      if (requiredCourts === 0) {
        return res.status(400).json({ 
          message: "Se necesitan al menos 4 jugadores para generar parejas" 
        });
      }
      
      // Verificar que los jugadores sean múltiplo de 4
      if (eligiblePlayers.length % 4 !== 0) {
        return res.status(400).json({ 
          message: `Se necesita un múltiplo de 4 jugadores para emparejamientos equitativos` 
        });
      }
      
      // Limitamos las canchas a las necesarias
      const selectedCourts = availableCourts.slice(0, requiredCourts);
      
      // Resto del código de generación igual que antes...
      // ... (el resto de la lógica de generación de pares)
      
      // Si hubiera jugadores en lista de espera, los manejaríamos aquí
      if (waitListPlayers.length > 0) {
        // Crear un juego para manejar esto
        const gameData = {
          gameDate: gameDate || new Date().toISOString().split('T')[0],
          courtIds: selectedCourts.map(c => c.id),
          status: "pending" as const,
          maxPlayers: selectedCourts.length * 4
        };
        
        const game = await storage.createGame(gameData);
        
        // Añadir los jugadores restantes a la lista de espera
        for (const player of waitListPlayers) {
          if (player.id !== undefined) {
            await storage.addToWaitList(game.id, player.id);
          }
        }
      }
      
      // Obtener los rankings para emparejar de forma equilibrada
      await storage.calculateRankings();
      const rankings = await storage.getPlayerRankings();
      
      // Función para obtener el ranking de un jugador
      const getPlayerRanking = (playerId: number) => {
        const ranking = rankings.find(r => r.playerId === playerId);
        return ranking ? ranking.points : 0;
      };
      
      // Ordenar jugadores por ranking
      const sortedPlayers = [...eligiblePlayers].sort((a, b) => {
        const rankingA = getPlayerRanking(a.id);
        const rankingB = getPlayerRanking(b.id);
        return rankingB - rankingA;
      });
      
      // Crear pares equilibrados (mejor con peor)
      const balancedPairs = [];
      for (let i = 0; i < sortedPlayers.length / 2; i++) {
        balancedPairs.push({
          player1: sortedPlayers[i],
          player2: sortedPlayers[sortedPlayers.length - 1 - i]
        });
      }
      
      // Ordenar parejas por puntuación combinada
      const sortedPairs = balancedPairs.sort((a, b) => {
        const scoreA = getPlayerRanking(a.player1.id) + getPlayerRanking(a.player2.id);
        const scoreB = getPlayerRanking(b.player1.id) + getPlayerRanking(b.player2.id);
        return scoreB - scoreA;
      });
      
      // Asignar parejas a canchas (0+3, 1+2, etc.)
      const pairings = [];
      for (let i = 0; i < selectedCourts.length && i * 2 < sortedPairs.length; i++) {
        const pairIndex1 = i;
        const pairIndex2 = sortedPairs.length - 1 - i;
        
        if (pairIndex1 >= pairIndex2) break;
        
        pairings.push({
          courtId: selectedCourts[i].id,
          courtName: selectedCourts[i].name,
          pair1: sortedPairs[pairIndex1],
          pair2: sortedPairs[pairIndex2],
          sets: Number(sets) || 3,
          gameDate: gameDate || new Date().toISOString().split('T')[0]
        });
      }
      
      const validatedPairings = pairingsSchema.parse(pairings);
      res.json(validatedPairings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Formato de datos inválido", errors: error.errors });
      } else {
        console.error("Error al generar emparejamientos:", error);
        res.status(500).json({ message: "Error al generar emparejamientos" });
      }
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}