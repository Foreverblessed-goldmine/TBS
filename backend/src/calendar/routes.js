import express from "express";
import { knex } from "../db/knex.js";
import { bearer } from "../common/middleware.js";

const router = express.Router();

// Get calendar events for a date range
router.get("/events", bearer(), async (req, res) => {
  try {
    const { from, to, project_id, assignee_id } = req.query;
    
    let query = knex("CalendarEvents")
      .select(
        "CalendarEvents.*",
        "Tasks.title as task_title",
        "Tasks.status as task_status",
        "Tasks.priority as task_priority",
        "Projects.ref as project_ref",
        "Projects.address as project_address"
      )
      .leftJoin("Tasks", "CalendarEvents.task_id", "Tasks.id")
      .leftJoin("Projects", "CalendarEvents.project_id", "Projects.id");
    
    // Apply date range filter
    if (from) {
      query = query.where("CalendarEvents.start", ">=", from);
    }
    if (to) {
      query = query.where("CalendarEvents.start", "<=", to);
    }
    
    // Apply project filter
    if (project_id) {
      query = query.where("CalendarEvents.project_id", project_id);
    }
    
    // Apply assignee filter (if we had user assignments)
    if (assignee_id) {
      query = query.whereExists(function() {
        this.select("*")
          .from("Assignments")
          .whereRaw("Assignments.task_id = CalendarEvents.task_id")
          .andWhere("Assignments.user_id", assignee_id);
      });
    }
    
    const events = await query.orderBy("CalendarEvents.start", "asc");
    
    // Transform to FullCalendar format
    const calendarEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.all_day,
      description: event.description,
      location: event.location,
      eventType: event.event_type,
      taskId: event.task_id,
      projectId: event.project_id,
      projectRef: event.project_ref,
      taskTitle: event.task_title,
      taskStatus: event.task_status,
      taskPriority: event.task_priority,
      backgroundColor: getEventColor(event.event_type, event.task_priority),
      borderColor: getEventColor(event.event_type, event.task_priority),
      textColor: '#ffffff'
    }));
    
    res.json(calendarEvents);
  } catch (err) {
    console.error("Error fetching calendar events:", err);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

// Create calendar event from task
router.post("/events", bearer(), async (req, res) => {
  try {
    const {
      task_id,
      project_id,
      title,
      start,
      end,
      description,
      location,
      event_type = "task",
      all_day = false
    } = req.body;
    
    // Validate required fields
    if (!task_id || !title || !start) {
      return res.status(400).json({ 
        error: "Missing required fields: task_id, title, start" 
      });
    }
    
    // Check if task exists
    const task = await knex("Tasks").where({ id: task_id }).first();
    if (!task) {
      return res.status(400).json({ error: "Task not found" });
    }
    
    // Check if calendar event already exists for this task
    const existingEvent = await knex("CalendarEvents")
      .where({ task_id })
      .first();
    
    if (existingEvent) {
      return res.status(400).json({ error: "Calendar event already exists for this task" });
    }
    
    // Create calendar event
    const [newEvent] = await knex("CalendarEvents")
      .insert({
        task_id,
        project_id: project_id || task.project_id,
        title,
        start,
        end: end || null,
        description: description || task.description,
        location: location || null,
        event_type,
        all_day
      })
      .returning("*");
    
    res.status(201).json(newEvent);
  } catch (err) {
    console.error("Error creating calendar event:", err);
    res.status(500).json({ error: "Failed to create calendar event" });
  }
});

// Update calendar event
router.put("/events/:id", bearer(), async (req, res) => {
  try {
    const {
      title,
      start,
      end,
      description,
      location,
      all_day
    } = req.body;
    
    // Check if event exists
    const existingEvent = await knex("CalendarEvents")
      .where({ id: req.params.id })
      .first();
    
    if (!existingEvent) {
      return res.status(404).json({ error: "Calendar event not found" });
    }
    
    // Update event
    const [updatedEvent] = await knex("CalendarEvents")
      .where({ id: req.params.id })
      .update({
        title: title || existingEvent.title,
        start: start || existingEvent.start,
        end: end !== undefined ? end : existingEvent.end,
        description: description !== undefined ? description : existingEvent.description,
        location: location !== undefined ? location : existingEvent.location,
        all_day: all_day !== undefined ? all_day : existingEvent.all_day,
        updated_at: knex.fn.now()
      })
      .returning("*");
    
    res.json(updatedEvent);
  } catch (err) {
    console.error("Error updating calendar event:", err);
    res.status(500).json({ error: "Failed to update calendar event" });
  }
});

// Delete calendar event
router.delete("/events/:id", bearer(), async (req, res) => {
  try {
    // Check if event exists
    const existingEvent = await knex("CalendarEvents")
      .where({ id: req.params.id })
      .first();
    
    if (!existingEvent) {
      return res.status(404).json({ error: "Calendar event not found" });
    }
    
    // Delete event
    await knex("CalendarEvents").where({ id: req.params.id }).del();
    
    res.json({ message: "Calendar event deleted successfully" });
  } catch (err) {
    console.error("Error deleting calendar event:", err);
    res.status(500).json({ error: "Failed to delete calendar event" });
  }
});

// Push task to calendar (convenience endpoint)
router.post("/tasks/:taskId/push", bearer(), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { start, end, all_day = false } = req.body;
    
    // Get task details
    const task = await knex("Tasks")
      .select(
        "Tasks.*",
        "Projects.ref as project_ref",
        "Projects.address as project_address"
      )
      .leftJoin("Projects", "Tasks.project_id", "Projects.id")
      .where("Tasks.id", taskId)
      .first();
    
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Check if calendar event already exists
    const existingEvent = await knex("CalendarEvents")
      .where({ task_id: taskId })
      .first();
    
    if (existingEvent) {
      return res.status(400).json({ error: "Task is already on the calendar" });
    }
    
    // Determine event times
    const eventStart = start || task.due_date || task.start_date || new Date();
    const eventEnd = end || task.end_date || (all_day ? null : new Date(new Date(eventStart).getTime() + 2 * 60 * 60 * 1000)); // Default 2 hours
    
    // Create calendar event
    const [newEvent] = await knex("CalendarEvents")
      .insert({
        task_id: taskId,
        project_id: task.project_id,
        title: task.title,
        start: eventStart,
        end: eventEnd,
        description: task.description,
        location: task.project_address,
        event_type: "task",
        all_day
      })
      .returning("*");
    
    res.status(201).json(newEvent);
  } catch (err) {
    console.error("Error pushing task to calendar:", err);
    res.status(500).json({ error: "Failed to push task to calendar" });
  }
});

// Helper function to get event colors
function getEventColor(eventType, priority) {
  const colors = {
    task: {
      urgent: '#dc2626',
      high: '#ea580c',
      medium: '#3b82f6',
      low: '#10b981'
    },
    meeting: '#8b5cf6',
    deadline: '#f59e0b',
    milestone: '#06b6d4'
  };
  
  return colors[eventType]?.[priority] || colors.task.medium;
}

export { router as calendar };
