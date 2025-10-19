import express from "express";
import { z } from "zod";
import { knex } from "../db/knex.js";
import { bearer, allow } from "../common/middleware.js";
import { parse } from "../common/validate.js";

const router = express.Router();

// Get tasks for calendar (date range)
router.get("/calendar/events", bearer(), async (req, res) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({ error: "from and to dates are required" });
    }
    
    const tasks = await knex("Tasks")
      .select(
        "Tasks.id",
        "Tasks.name as title",
        "Tasks.start_date as start",
        "Tasks.end_date as end",
        "Tasks.status",
        "Tasks.notes",
        "Tasks.project_id",
        "Projects.ref as project_ref",
        "Projects.address as project_address"
      )
      .leftJoin("Projects", "Tasks.project_id", "Projects.id")
      .whereBetween("Tasks.start_date", [from, to])
      .orderBy("Tasks.start_date");
    
    // Get assignments for each task
    const taskIds = tasks.map(t => t.id);
    const assignments = await knex("Assignments")
      .select("task_id", "user_id", "Users.name as user_name", "Users.role as user_role")
      .leftJoin("Users", "Assignments.user_id", "Users.id")
      .whereIn("task_id", taskIds);
    
    // Group assignments by task
    const assignmentsByTask = {};
    assignments.forEach(assignment => {
      if (!assignmentsByTask[assignment.task_id]) {
        assignmentsByTask[assignment.task_id] = [];
      }
      assignmentsByTask[assignment.task_id].push({
        id: assignment.user_id,
        name: assignment.user_name,
        role: assignment.user_role
      });
    });
    
    // Format for calendar
    const events = tasks.map(task => ({
      id: `t-${task.id}`,
      projectId: `p-${task.project_id}`,
      title: task.title,
      start: task.start,
      end: task.end,
      status: task.status,
      assignees: assignmentsByTask[task.id] || [],
      notes: task.notes || "",
      project: {
        id: task.project_id,
        ref: task.project_ref,
        address: task.project_address
      }
    }));
    
    res.json(events);
  } catch (err) {
    console.error("Error fetching calendar events:", err);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

// Get all tasks
router.get("/", bearer(), async (req, res) => {
  try {
    const tasks = await knex("Tasks")
      .select(
        "Tasks.*",
        "Projects.ref as project_ref",
        "Projects.address as project_address"
      )
      .leftJoin("Projects", "Tasks.project_id", "Projects.id")
      .orderBy("Tasks.created_at", "desc");
    
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
        "Projects.address as project_address"
      )
      .leftJoin("Projects", "Tasks.project_id", "Projects.id")
      .where("Tasks.id", req.params.id)
      .first();
    
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Get assignments
    const assignments = await knex("Assignments")
      .select("user_id", "Users.name as user_name", "Users.role as user_role")
      .leftJoin("Users", "Assignments.user_id", "Users.id")
      .where("task_id", req.params.id);
    
    task.assignees = assignments.map(a => ({
      id: a.user_id,
      name: a.user_name,
      role: a.user_role
    }));
    
    res.json(task);
  } catch (err) {
    console.error("Error fetching task:", err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// Create new task (admin only)
const CreateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    projectId: z.number().int().positive(),
    start: z.string().datetime(),
    end: z.string().datetime(),
    status: z.enum(["planned", "active", "blocked", "done"]).default("planned"),
    assignees: z.array(z.string()).default([]),
    notes: z.string().optional()
  })
});

router.post("/", allow("admin"), parse(CreateTaskSchema), async (req, res) => {
  try {
    const { title, projectId, start, end, status, assignees, notes } = req.valid.body;
    
    // Create task
    const [task] = await knex("Tasks")
      .insert({
        name: title,
        project_id: projectId,
        start_date: start.split('T')[0],
        end_date: end.split('T')[0],
        status: status,
        notes: notes
      })
      .returning("*");
    
    // Create assignments
    if (assignees && assignees.length > 0) {
      const assignmentData = assignees.map(userId => ({
        task_id: task.id,
        user_id: parseInt(userId.replace('u-', '')),
        role_on_task: 'assigned'
      }));
      
      await knex("Assignments").insert(assignmentData);
    }
    
    res.status(201).json({ id: task.id });
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Update task (admin + foreman)
const UpdateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    status: z.enum(["planned", "active", "blocked", "done"]).optional(),
    assignees: z.array(z.string()).optional(),
    notes: z.string().optional()
  })
});

router.patch("/:id", allow("admin", "foreman"), parse(UpdateTaskSchema), async (req, res) => {
  try {
    const { title, start, end, status, assignees, notes } = req.valid.body;
    
    // Check if task exists
    const existingTask = await knex("Tasks").where("id", req.params.id).first();
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Update task
    const updateData = {};
    if (title) updateData.name = title;
    if (start) updateData.start_date = start.split('T')[0];
    if (end) updateData.end_date = end.split('T')[0];
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    
    if (Object.keys(updateData).length > 0) {
      await knex("Tasks").where("id", req.params.id).update(updateData);
    }
    
    // Update assignments if provided
    if (assignees) {
      // Remove existing assignments
      await knex("Assignments").where("task_id", req.params.id).del();
      
      // Add new assignments
      if (assignees.length > 0) {
        const assignmentData = assignees.map(userId => ({
          task_id: parseInt(req.params.id),
          user_id: parseInt(userId.replace('u-', '')),
          role_on_task: 'assigned'
        }));
        
        await knex("Assignments").insert(assignmentData);
      }
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Delete task (admin only)
router.delete("/:id", allow("admin"), async (req, res) => {
  try {
    const task = await knex("Tasks").where("id", req.params.id).first();
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Delete task (assignments will be deleted via CASCADE)
    await knex("Tasks").where("id", req.params.id).del();
    
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export { router as tasks };
