const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

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

server.listen(5000, () => console.log("Server running on port 5000"));
