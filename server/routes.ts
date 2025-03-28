import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCourtSchema, insertPlayerSchema, pairingsSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
      
      // Mezclar jugadores para aleatorizar
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      const pairings = [];
      
      // Crear parejas para cada cancha
      for (let i = 0; i < selectedCourts.length && i * 4 < shuffledPlayers.length; i++) {
        const startIndex = i * 4;
        const courtPlayers = shuffledPlayers.slice(startIndex, startIndex + 4);
        
        const courtPairing = {
          courtId: selectedCourts[i].id,
          courtName: selectedCourts[i].name,
          pair1: {
            player1: courtPlayers[0],
            player2: courtPlayers[1]
          },
          pair2: {
            player1: courtPlayers[2],
            player2: courtPlayers[3]
          },
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
  
  const httpServer = createServer(app);
  return httpServer;
}