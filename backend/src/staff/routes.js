import express from "express";
import bcrypt from "bcryptjs";
import { knex } from "../db/knex.js";
import { bearer } from "../common/middleware.js";

const router = express.Router();

// Get all staff members
router.get("/", bearer(), async (req, res) => {
  try {
    const staff = await knex("Users")
      .select("id", "name", "email", "role", "created_at")
      .orderBy("name");
    
    res.json(staff);
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({ error: "Failed to fetch staff members" });
  }
});

// Get single staff member
router.get("/:id", bearer(), async (req, res) => {
  try {
    const staff = await knex("Users")
      .select("id", "name", "email", "role", "created_at")
      .where({ id: req.params.id })
      .first();
    
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    
    res.json(staff);
  } catch (err) {
    console.error("Error fetching staff member:", err);
    res.status(500).json({ error: "Failed to fetch staff member" });
  }
});

// Add new staff member
router.post("/", bearer(), async (req, res) => {
  try {
    const { name, email, phone, role, position, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !role || !position || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Check if email already exists
    const existingUser = await knex("Users").where({ email }).first();
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new user
    const [newUser] = await knex("Users")
      .insert({
        name,
        email,
        phone: phone || null,
        role,
        position,
        password_hash: hashedPassword
      })
      .returning(["id", "name", "email", "role", "position", "created_at"]);
    
    res.status(201).json(newUser);
  } catch (err) {
    console.error("Error adding staff member:", err);
    res.status(500).json({ error: "Failed to add staff member" });
  }
});

// Update staff member
router.put("/:id", bearer(), async (req, res) => {
  try {
    const { name, email, phone, role, position } = req.body;
    
    // Check if user exists
    const existingUser = await knex("Users").where({ id: req.params.id }).first();
    if (!existingUser) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    
    // Check if email is being changed and if it already exists
    if (email && email !== existingUser.email) {
      const emailExists = await knex("Users").where({ email }).first();
      if (emailExists) {
        return res.status(400).json({ error: "Email already exists" });
      }
    }
    
    // Update user
    const [updatedUser] = await knex("Users")
      .where({ id: req.params.id })
      .update({
        name: name || existingUser.name,
        email: email || existingUser.email,
        phone: phone !== undefined ? phone : existingUser.phone,
        role: role || existingUser.role,
        position: position || existingUser.position
      })
      .returning(["id", "name", "email", "role", "position", "created_at"]);
    
    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating staff member:", err);
    res.status(500).json({ error: "Failed to update staff member" });
  }
});

// Remove staff member
router.delete("/:id", bearer(), async (req, res) => {
  try {
    // Check if user exists
    const existingUser = await knex("Users").where({ id: req.params.id }).first();
    if (!existingUser) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    
    // Prevent deletion of admin users (optional safety check)
    if (existingUser.role === "admin") {
      return res.status(400).json({ error: "Cannot delete admin users" });
    }
    
    // Delete user
    await knex("Users").where({ id: req.params.id }).del();
    
    res.json({ message: "Staff member removed successfully" });
  } catch (err) {
    console.error("Error removing staff member:", err);
    res.status(500).json({ error: "Failed to remove staff member" });
  }
});

export { router as staff };
