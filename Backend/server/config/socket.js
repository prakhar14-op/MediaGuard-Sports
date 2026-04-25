import { Server } from "socket.io";

let io = null;

export const initSocket = (httpServer) => {
  // Accept both the deployed frontend URL and localhost for dev
  const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`🔌 [Socket] Connected: ${socket.id}`);

    socket.on("join:hunt", (jobId) => {
      socket.join(`hunt:${jobId}`);
    });

    socket.on("join:ingest", (jobId) => {
      socket.join(`ingest:${jobId}`);
    });

    socket.on("join:adjudicate", (jobId) => {
      socket.join(`hunt:${jobId}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 [Socket] Disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
