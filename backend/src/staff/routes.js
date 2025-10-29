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
    
    global.logger.info("Creating new staff member", { 
      name, 
      email, 
      role,
      position,
      userId: req.user?.id 
    });
    
    // Validate required fields
    if (!name || !email || !role || !position || !password) {
      global.logger.warn("Staff creation failed - missing required fields", { 
        name: !!name, 
        email: !!email, 
        role: !!role, 
        position: !!position, 
        password: !!password 
      });
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Check if email already exists (case-insensitive)
    const existingUser = await knex("Users").whereRaw("LOWER(email) = LOWER(?)", [email]).first();
    if (existingUser) {
      global.logger.warn("Staff creation failed - email already exists", { email });
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
    
    global.logger.info("Staff member created successfully", { 
      staffId: newUser.id, 
      name: newUser.name,
      role: newUser.role,
      createdBy: req.user?.id 
    });
    
    res.status(201).json(newUser);
  } catch (err) {
    global.logger.error("Failed to create staff member", err, { 
      name: req.body?.name,
      email: req.body?.email,
      userId: req.user?.id 
    });
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
    
    // Check if email is being changed and if it already exists (case-insensitive)
    if (email && email.toLowerCase() !== existingUser.email.toLowerCase()) {
      const emailExists = await knex("Users").whereRaw("LOWER(email) = LOWER(?)", [email]).first();
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
    const staffId = req.params.id;
    
    global.logger.info("Attempting to delete staff member", { 
      staffId,
      deletedBy: req.user?.id 
    });
    
    // Check if user exists
    const existingUser = await knex("Users").where({ id: staffId }).first();
    if (!existingUser) {
      global.logger.warn("Staff deletion failed - user not found", { staffId });
      return res.status(404).json({ error: "Staff member not found" });
    }
    
    // Prevent deletion of admin users (optional safety check)
    if (existingUser.role === "admin") {
      global.logger.warn("Staff deletion failed - cannot delete admin users", { 
        staffId, 
        role: existingUser.role 
      });
      return res.status(400).json({ error: "Cannot delete admin users" });
    }
    
    // Delete user
    await knex("Users").where({ id: staffId }).del();
    
    global.logger.info("Staff member deleted successfully", { 
      staffId,
      name: existingUser.name,
      role: existingUser.role,
      deletedBy: req.user?.id 
    });
    
    res.json({ message: "Staff member removed successfully" });
  } catch (err) {
    global.logger.error("Failed to delete staff member", err, { 
      staffId: req.params.id,
      deletedBy: req.user?.id 
    });
    res.status(500).json({ error: "Failed to remove staff member" });
  }
});

export { router as staff };
