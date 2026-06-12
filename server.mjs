import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

function scopeRoom(scope) {
  return `class:${scope.year}:${scope.grade}:${scope.classNum}`;
}

await app.prepare();

const httpServer = createServer((req, res) => {
  handler(req, res);
});

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN || false,
  },
});

globalThis.__classroomIo = io;

io.on("connection", (socket) => {
  socket.on("join-class", (scope) => {
    if (!scope?.year || !scope?.grade || !scope?.classNum) return;
    socket.join(scopeRoom(scope));
  });

  socket.on("leave-class", (scope) => {
    if (!scope?.year || !scope?.grade || !scope?.classNum) return;
    socket.leave(scopeRoom(scope));
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});
