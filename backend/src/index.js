import "dotenv/config.js";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { ensureSchema } from "./db/bootstrap.js";
import { auth } from "./auth/routes.js";
import { projects } from "./projects/routes.js";
import { staff } from "./staff/routes.js";
import { users } from "./users/routes.js";
import { tasks } from "./tasks/routes.js";
import { bearer } from "./common/middleware.js";
import { knex } from "./db/knex.js";

const app = express();
const PORT = process.env.PORT || 8080;

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(helmet({
  contentSecurityPolicy: false, // Let Netlify handle CSP
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ 
  origin: [
    "http://localhost:3000", 
    "http://localhost:5173",
    "https://lucent-biscotti-9e0a64.netlify.app"
  ], 
  credentials: true 
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Health
app.get("/api/health", (_req, res) => res.json({ ok:true }));

// Auth
app.use("/api/auth", auth);

// Me
app.get("/api/me", bearer(), async (req, res) => {
  const me = await knex("Users").where({ id: req.user.id }).first();
  res.json({ id: me.id, name: me.name, email: me.email, role: me.role });
});

// Projects
app.use("/api/projects", projects);

// Staff
app.use("/api/staff", staff);

// Users
app.use("/api/users", users);

// Tasks
app.use("/api/tasks", tasks);

// TODO: assignments, photos (Phase 1b/2)

// Error handler
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Server error" });
});

await ensureSchema();
app.listen(PORT, () => console.log(`TBS API listening on http://localhost:${PORT}`));

