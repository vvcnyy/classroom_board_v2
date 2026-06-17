import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function colorize(color, value) {
  if (!process.stdout.isTTY) return value;
  return `${color}${value}${colors.reset}`;
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.length > 0) return realIp;

  return req.socket.remoteAddress ?? "-";
}

function getStatusColor(statusCode) {
  if (statusCode >= 500) return colors.red;
  if (statusCode >= 400) return colors.yellow;
  if (statusCode >= 300) return colors.cyan;
  return colors.green;
}

function logRequest(req, res, startedAt, note = "") {
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const status = String(res.statusCode).padStart(3, " ");
  const method = (req.method ?? "GET").padEnd(6, " ");
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] ?? "-";
  const contentLength = res.getHeader("content-length");
  const size = contentLength ? `${contentLength}b` : "-";
  const suffix = note ? ` ${colorize(colors.dim, note)}` : "";

  console.log(
    [
      colorize(colors.gray, new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false })),
      colorize(getStatusColor(res.statusCode), status),
      colorize(colors.cyan, method),
      url.pathname + url.search,
      colorize(colors.gray, `${durationMs.toFixed(1)}ms`),
      colorize(colors.gray, size),
      colorize(colors.gray, ip),
      colorize(colors.dim, `"${userAgent}"`),
    ].join(" ") + suffix
  );
}

function shouldBlockPagePost(req) {
  if (req.method !== "POST") return false;

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/socket.io/")) return false;

  return true;
}

function scopeRoom(scope) {
  return `class:${scope.year}:${scope.grade}:${scope.classNum}`;
}

await app.prepare();

const httpServer = createServer((req, res) => {
  const startedAt = process.hrtime.bigint();
  let logNote = "";

  res.on("finish", () => logRequest(req, res, startedAt, logNote));

  if (shouldBlockPagePost(req)) {
    const actionId = req.headers["next-action"];
    logNote = actionId ? `(stale server action: ${actionId})` : "(blocked page POST)";
    res.writeHead(actionId ? 410 : 405, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ ok: false, error: "This endpoint does not accept page POST requests." }));
    return;
  }

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
