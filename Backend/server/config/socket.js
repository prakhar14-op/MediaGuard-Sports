import { Server } from "socket.io";

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173", 
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`🔌 [Socket] Client connected: ${socket.id}`);

    // Client joins a room for a specific hunt job to receive targeted updates
    socket.on("join:hunt", (jobId) => {
      socket.join(`hunt:${jobId}`);
      console.log(`📡 [Socket] Client ${socket.id} joined hunt room: ${jobId}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 [Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log("✅ [Socket.io] Initialized");
  return io;
};

/**
 * getIO — call this anywhere in the app to emit events.
 *
 * Usage in a route/worker:
 *   import { getIO } from "../config/socket.js";
 *   getIO().to(`hunt:${jobId}`).emit("hunt:threat_found", { incident });
 */
export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized. Call initSocket(httpServer) first.");
  return io;
};
