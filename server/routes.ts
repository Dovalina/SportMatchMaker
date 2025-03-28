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
      const allPlayers = await storage.getPlayers();
      const selectedPlayers = await storage.getSelectedPlayers();
      const players = selectedPlayers.length > 0 ? selectedPlayers : allPlayers;
      const courts = await storage.getCourts();
      
      // Validation for pairings
      if (players.length < courts.length * 4) {
        return res.status(400).json({ 
          message: `Need at least ${courts.length * 4} players for ${courts.length} courts` 
        });
      }
      
      if (players.length % 4 !== 0) {
        return res.status(400).json({ 
          message: `Need a multiple of 4 players for even pairings (currently ${players.length})` 
        });
      }
      
      // Shuffle players
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      const pairings = [];
      
      // Create pairs for each court
      for (let i = 0; i < courts.length && i * 4 < shuffledPlayers.length; i++) {
        const startIndex = i * 4;
        const courtPlayers = shuffledPlayers.slice(startIndex, startIndex + 4);
        
        const courtPairing = {
          courtId: courts[i].id,
          courtName: courts[i].name,
          pair1: {
            player1: courtPlayers[0],
            player2: courtPlayers[1]
          },
          pair2: {
            player1: courtPlayers[2],
            player2: courtPlayers[3]
          }
        };
        
        pairings.push(courtPairing);
      }
      
      // Validate the response with our schema
      const validatedPairings = pairingsSchema.parse(pairings);
      res.json(validatedPairings);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data format", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to generate pairings" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}