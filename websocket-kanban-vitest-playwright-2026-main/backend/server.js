const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Support comma-separated list of allowed origins e.g. "https://myapp.vercel.app,http://localhost:3000"
const rawOrigins = process.env.FRONTEND_URL || "http://localhost:3000";
const allowedOrigins = rawOrigins.split(",").map((o) => o.trim());

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST"],
  },
});

app.use(express.json());

// In-memory task store
const tasks = [];

io.on("connection", (socket) => {
  console.log("A user connected");

  // Send all existing tasks to the newly connected client
  socket.emit("sync:tasks", tasks);

  socket.on("task:create", (task) => {
    tasks.push(task);
    io.emit("task:create", task);
  });

  socket.on("task:update", (updated) => {
    const idx = tasks.findIndex((t) => t.id === updated.id);
    if (idx !== -1) tasks[idx] = updated;
    io.emit("task:update", updated);
  });

  socket.on("task:move", ({ id, column }) => {
    const task = tasks.find((t) => t.id === id);
    if (task) task.column = column;
    io.emit("task:move", { id, column });
  });

  socket.on("task:delete", (id) => {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx !== -1) tasks.splice(idx, 1);
    io.emit("task:delete", id);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: ${allowedOrigins.join(", ")}`);

});
