import express from "express";
import { knex } from "../db/knex.js";
import { bearer, allow } from "../common/middleware.js";

const router = express.Router();

// Get all tasks
router.get("/", bearer(), allow("admin", "foreman", "worker", "contractor", "labourer"), async (req, res) => {
  try {
    const { project_id, status, assignee_staff_id, assignee_contractor_id } = req.query;
    
    let query = knex("Tasks")
      .select(
        "Tasks.*",
        "Projects.ref as project_ref",
        "Projects.address as project_address",
        "Staff.name as staff_name",
        "Contractors.company as contractor_company",
        "Contractors.contact_name as contractor_contact"
      )
      .leftJoin("Projects", "Tasks.project_id", "Projects.id")
      .leftJoin("Users as Staff", "Tasks.assignee_staff_id", "Staff.id")
      .leftJoin("Contractors", "Tasks.assignee_contractor_id", "Contractors.id");
    
    // Apply filters
    if (project_id) {
      query = query.where("Tasks.project_id", project_id);
    }
    if (status) {
      query = query.where("Tasks.status", status);
    }
    if (assignee_staff_id) {
      query = query.where("Tasks.assignee_staff_id", assignee_staff_id);
    }
    if (assignee_contractor_id) {
      query = query.where("Tasks.assignee_contractor_id", assignee_contractor_id);
    }
    
    const tasks = await query.orderBy("Tasks.priority", "desc").orderBy("Tasks.due_date", "asc");
    
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Get single task
router.get("/:id", bearer(), async (req, res) => {
  try {
    const task = await knex("Tasks")
      .select(
        "Tasks.*",
        "Projects.ref as project_ref",
        "Projects.address as project_address",
        "Staff.name as staff_name",
        "Contractors.company as contractor_company",
        "Contractors.contact_name as contractor_contact"
      )
      .leftJoin("Projects", "Tasks.project_id", "Projects.id")
      .leftJoin("Users as Staff", "Tasks.assignee_staff_id", "Staff.id")
      .leftJoin("Contractors", "Tasks.assignee_contractor_id", "Contractors.id")
      .where("Tasks.id", req.params.id)
      .first();
    
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    res.json(task);
  } catch (err) {
    console.error("Error fetching task:", err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// Create new task
router.post("/", bearer(), async (req, res) => {
  try {
    const {
      project_id,
      title,
      description,
      status = "todo",
      priority = "medium",
      assignee_staff_id,
      assignee_contractor_id,
      due_date,
      start_date,
      end_date,
      notes
    } = req.body;
    
    global.logger.info("Creating new task", { 
      projectId: project_id,
      title,
      priority,
      status,
      assigneeStaffId: assignee_staff_id,
      assigneeContractorId: assignee_contractor_id,
      createdBy: req.user?.id 
    });
    
    // Validate required fields
    if (!project_id || !title) {
      global.logger.warn("Task creation failed - missing required fields", { 
        projectId: !!project_id, 
        title: !!title 
      });
      return res.status(400).json({ 
        error: "Missing required fields: project_id, title" 
      });
    }
    
    // Validate project exists
    const project = await knex("Projects").where({ id: project_id }).first();
    if (!project) {
      global.logger.warn("Task creation failed - project not found", { projectId: project_id });
      return res.status(400).json({ error: "Project not found" });
    }
    
    // Validate assignee if provided
    if (assignee_staff_id) {
      const staff = await knex("Users").where({ id: assignee_staff_id }).first();
      if (!staff) {
        global.logger.warn("Task creation failed - staff member not found", { assigneeStaffId: assignee_staff_id });
        return res.status(400).json({ error: "Staff member not found" });
      }
    }
    
    if (assignee_contractor_id) {
      const contractor = await knex("Contractors").where({ id: assignee_contractor_id }).first();
      if (!contractor) {
        global.logger.warn("Task creation failed - contractor not found", { assigneeContractorId: assignee_contractor_id });
        return res.status(400).json({ error: "Contractor not found" });
      }
    }
    
    // Insert new task
    const [newTask] = await knex("Tasks")
      .insert({
        project_id,
        title,
        description: description || null,
        status,
        priority,
        assignee_staff_id: assignee_staff_id || null,
        assignee_contractor_id: assignee_contractor_id || null,
        due_date: due_date || null,
        start_date: start_date || null,
        end_date: end_date || null,
        notes: notes || null
      })
      .returning("*");
    
    global.logger.info("Task created successfully", { 
      taskId: newTask.id,
      title: newTask.title,
      projectId: newTask.project_id,
      priority: newTask.priority,
      createdBy: req.user?.id 
    });
    
    res.status(201).json(newTask);
  } catch (err) {
    global.logger.error("Failed to create task", err, { 
      projectId: req.body?.project_id,
      title: req.body?.title,
      createdBy: req.user?.id 
    });
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Update task
router.put("/:id", bearer(), async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      assignee_staff_id,
      assignee_contractor_id,
      due_date,
      start_date,
      end_date,
      notes
    } = req.body;
    
    // Check if task exists
    const existingTask = await knex("Tasks").where({ id: req.params.id }).first();
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Validate assignee if provided
    if (assignee_staff_id) {
      const staff = await knex("Users").where({ id: assignee_staff_id }).first();
      if (!staff) {
        return res.status(400).json({ error: "Staff member not found" });
      }
    }
    
    if (assignee_contractor_id) {
      const contractor = await knex("Contractors").where({ id: assignee_contractor_id }).first();
      if (!contractor) {
        return res.status(400).json({ error: "Contractor not found" });
      }
    }
    
    // Update task
    const [updatedTask] = await knex("Tasks")
      .where({ id: req.params.id })
      .update({
        title: title || existingTask.title,
        description: description !== undefined ? description : existingTask.description,
        status: status || existingTask.status,
        priority: priority || existingTask.priority,
        assignee_staff_id: assignee_staff_id !== undefined ? assignee_staff_id : existingTask.assignee_staff_id,
        assignee_contractor_id: assignee_contractor_id !== undefined ? assignee_contractor_id : existingTask.assignee_contractor_id,
        due_date: due_date !== undefined ? due_date : existingTask.due_date,
        start_date: start_date !== undefined ? start_date : existingTask.start_date,
        end_date: end_date !== undefined ? end_date : existingTask.end_date,
        notes: notes !== undefined ? notes : existingTask.notes,
        updated_at: knex.fn.now()
      })
      .returning("*");
    
    res.json(updatedTask);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Delete task (soft delete by setting status to 'done' or hard delete)
router.delete("/:id", bearer(), async (req, res) => {
  try {
    const { soft = true } = req.query;
    
    // Check if task exists
    const existingTask = await knex("Tasks").where({ id: req.params.id }).first();
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    if (soft) {
      // Soft delete - mark as done
      await knex("Tasks")
        .where({ id: req.params.id })
        .update({ 
          status: "done",
          updated_at: knex.fn.now()
        });
      
      res.json({ message: "Task marked as completed" });
    } else {
      // Hard delete
      await knex("Tasks").where({ id: req.params.id }).del();
      res.json({ message: "Task deleted successfully" });
    }
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Get tasks for a specific project
router.get("/project/:projectId", bearer(), async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = knex("Tasks")
      .select(
        "Tasks.*",
        "Staff.name as staff_name",
        "Contractors.company as contractor_company",
        "Contractors.contact_name as contractor_contact"
      )
      .leftJoin("Users as Staff", "Tasks.assignee_staff_id", "Staff.id")
      .leftJoin("Contractors", "Tasks.assignee_contractor_id", "Contractors.id")
      .where("Tasks.project_id", req.params.projectId);
    
    if (status) {
      query = query.where("Tasks.status", status);
    }
    
    const tasks = await query.orderBy("Tasks.priority", "desc").orderBy("Tasks.due_date", "asc");
    
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching project tasks:", err);
    res.status(500).json({ error: "Failed to fetch project tasks" });
  }
});

export { router as tasks };