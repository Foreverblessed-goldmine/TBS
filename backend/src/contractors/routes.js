import express from "express";
import { knex } from "../db/knex.js";
import { bearer } from "../common/middleware.js";

const router = express.Router();

// Get all contractors
router.get("/", bearer(), async (req, res) => {
  try {
    const contractors = await knex("Contractors")
      .select("*")
      .orderBy("company");
    
    res.json(contractors);
  } catch (err) {
    console.error("Error fetching contractors:", err);
    res.status(500).json({ error: "Failed to fetch contractors" });
  }
});

// Get single contractor
router.get("/:id", bearer(), async (req, res) => {
  try {
    const contractor = await knex("Contractors")
      .where({ id: req.params.id })
      .first();
    
    if (!contractor) {
      return res.status(404).json({ error: "Contractor not found" });
    }
    
    res.json(contractor);
  } catch (err) {
    console.error("Error fetching contractor:", err);
    res.status(500).json({ error: "Failed to fetch contractor" });
  }
});

// Add new contractor
router.post("/", bearer(), async (req, res) => {
  try {
    const { 
      company, 
      trade, 
      contactName, 
      phone, 
      email, 
      rating, 
      insuranceExpiry, 
      notes, 
      status = 'active' 
    } = req.body;
    
    // Validate required fields
    if (!company || !trade || !contactName || !phone || !email) {
      return res.status(400).json({ 
        error: "Missing required fields: company, trade, contactName, phone, email" 
      });
    }
    
    // Check if company already exists
    const existingContractor = await knex("Contractors")
      .where({ company, contactName })
      .first();
    
    if (existingContractor) {
      return res.status(400).json({ 
        error: "Contractor with this company and contact person already exists" 
      });
    }
    
    // Insert new contractor
    const [newContractor] = await knex("Contractors")
      .insert({
        company,
        trade,
        contact_name: contactName,
        phone,
        email,
        rating: rating || null,
        insurance_expiry: insuranceExpiry || null,
        notes: notes || null,
        status
      })
      .returning("*");
    
    res.status(201).json(newContractor);
  } catch (err) {
    console.error("Error adding contractor:", err);
    res.status(500).json({ error: "Failed to add contractor" });
  }
});

// Update contractor
router.put("/:id", bearer(), async (req, res) => {
  try {
    const { 
      company, 
      trade, 
      contactName, 
      phone, 
      email, 
      rating, 
      insuranceExpiry, 
      notes, 
      status 
    } = req.body;
    
    // Check if contractor exists
    const existingContractor = await knex("Contractors")
      .where({ id: req.params.id })
      .first();
    
    if (!existingContractor) {
      return res.status(404).json({ error: "Contractor not found" });
    }
    
    // Update contractor
    const [updatedContractor] = await knex("Contractors")
      .where({ id: req.params.id })
      .update({
        company: company || existingContractor.company,
        trade: trade || existingContractor.trade,
        contact_name: contactName || existingContractor.contact_name,
        phone: phone || existingContractor.phone,
        email: email || existingContractor.email,
        rating: rating !== undefined ? rating : existingContractor.rating,
        insurance_expiry: insuranceExpiry !== undefined ? insuranceExpiry : existingContractor.insurance_expiry,
        notes: notes !== undefined ? notes : existingContractor.notes,
        status: status || existingContractor.status
      })
      .returning("*");
    
    res.json(updatedContractor);
  } catch (err) {
    console.error("Error updating contractor:", err);
    res.status(500).json({ error: "Failed to update contractor" });
  }
});

// Remove contractor
router.delete("/:id", bearer(), async (req, res) => {
  try {
    // Check if contractor exists
    const existingContractor = await knex("Contractors")
      .where({ id: req.params.id })
      .first();
    
    if (!existingContractor) {
      return res.status(404).json({ error: "Contractor not found" });
    }
    
    // Delete contractor
    await knex("Contractors").where({ id: req.params.id }).del();
    
    res.json({ message: "Contractor removed successfully" });
  } catch (err) {
    console.error("Error removing contractor:", err);
    res.status(500).json({ error: "Failed to remove contractor" });
  }
});

export { router as contractors };
