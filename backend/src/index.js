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
import { contractors } from "./contractors/routes.js";
import { calendar } from "./calendar/routes.js";
import { photos } from "./photos/routes.js";
import { metrics } from "./metrics/routes.js";
import { bearer } from "./common/middleware.js";
import { knex } from "./db/knex.js";

// Enhanced logging configuration
const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
  },
  error: (message, error = {}, meta = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, { error: error.message, stack: error.stack, ...meta });
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
    }
  }
};

// Make logger available globally
global.logger = logger;

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

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };
    
    if (req.user) {
      logData.userId = req.user.id;
      logData.userRole = req.user.role;
    }
    
    if (res.statusCode >= 400) {
      logger.error(`Request failed`, {}, logData);
    } else {
      logger.info(`Request completed`, logData);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
});

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

// Contractors
app.use("/api/contractors", contractors);

// Users
app.use("/api/users", users);

// Tasks
app.use("/api/tasks", tasks);

// Project tasks (alternative endpoint)
app.use("/api/projects/:projectId/tasks", tasks);

// Calendar
app.use("/api/tasks/calendar", calendar);

// Photos
app.use("/api/photos", photos);

// Metrics
app.use("/api/metrics", metrics);

// TODO: assignments (Phase 1b/2)

// Error handler
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  
  // Log error details
  logger.error(`Unhandled error`, err, {
    method: req.method,
    path: req.path,
    status: status,
    userId: req.user?.id,
    userRole: req.user?.role
  });
  
  res.status(status).json({ 
    error: err.message || "Server error",
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize database schema
logger.info("Initializing database schema...");
await ensureSchema();
logger.info("Database schema initialized successfully");

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`TBS API server started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  console.log(`TBS API listening on http://0.0.0.0:${PORT}`);
});

