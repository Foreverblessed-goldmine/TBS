import express from "express";
import { knex } from "../db/knex.js";
import { bearer } from "../common/middleware.js";

const router = express.Router();

// Get all users with optional role filtering
router.get("/", bearer(), async (req, res) => {
  try {
    const { roles } = req.query;
    
    let query = knex("Users")
      .select("id", "name", "email", "role", "position", "phone", "status", "created_at")
      .where("status", "active")
      .orderBy("name");
    
    // Filter by roles if specified
    if (roles) {
      const roleList = roles.split(',').map(r => r.trim());
      query = query.whereIn("role", roleList);
    }
    
    const users = await query;
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get single user
router.get("/:id", bearer(), async (req, res) => {
  try {
    const user = await knex("Users")
      .select("id", "name", "email", "role", "position", "phone", "status", "created_at")
      .where({ id: req.params.id, status: "active" })
      .first();
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export { router as users };
