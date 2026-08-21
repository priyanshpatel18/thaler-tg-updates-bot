import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { listUsers } from "./db.js";

function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  const queryToken = typeof req.query.key === "string" ? req.query.key : null;

  const token = bearerToken ?? queryToken;

  if (token !== config.api.secretKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function createServer() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(requireApiKey);

  app.get("/users", (_req, res) => {
    res.json({ users: listUsers() });
  });

  return app;
}
