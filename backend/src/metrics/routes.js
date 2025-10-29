import { Router } from "express";
import { knex } from "../db/knex.js";
import { bearer, allow } from "../common/middleware.js";

const router = Router();
router.use(bearer());

// GET /api/metrics/overview - Get dashboard metrics
router.get("/overview", allow("admin", "foreman", "worker", "contractor", "labourer"), async (req, res, next) => {
  try {
    // Get project counts by status
    const projectCounts = await knex("Projects")
      .select("status")
      .count("* as count")
      .groupBy("status");

    // Get task counts by status
    const taskCounts = await knex("Tasks")
      .select("status")
      .count("* as count")
      .groupBy("status");

    // Get staff counts by role
    const staffCounts = await knex("Users")
      .select("role")
      .count("* as count")
      .groupBy("role");

    // Get contractor counts
    const contractorCount = await knex("Contractors")
      .count("* as count")
      .where("status", "active")
      .first();

    // Get recent activity (last 7 days)
    const recentActivity = await knex("Projects")
      .select("ref", "address", "created_at")
      .where("created_at", ">=", knex.raw("datetime('now', '-7 days')"))
      .orderBy("created_at", "desc")
      .limit(10);

    const metrics = {
      projects: {
        total: projectCounts.reduce((sum, p) => sum + parseInt(p.count), 0),
        byStatus: projectCounts.reduce((acc, p) => {
          acc[p.status] = parseInt(p.count);
          return acc;
        }, {})
      },
      tasks: {
        total: taskCounts.reduce((sum, t) => sum + parseInt(t.count), 0),
        byStatus: taskCounts.reduce((acc, t) => {
          acc[t.status] = parseInt(t.count);
          return acc;
        }, {})
      },
      staff: {
        total: staffCounts.reduce((sum, s) => sum + parseInt(s.count), 0),
        byRole: staffCounts.reduce((acc, s) => {
          acc[s.role] = parseInt(s.count);
          return acc;
        }, {})
      },
      contractors: {
        active: parseInt(contractorCount?.count || 0)
      },
      recentActivity: recentActivity.map(activity => ({
        type: "project_created",
        description: `New project '${activity.ref}' started`,
        timestamp: activity.created_at,
        user: "System"
      }))
    };

    global.logger.info("Dashboard metrics retrieved", { 
      userId: req.user?.id,
      metrics: {
        projects: metrics.projects.total,
        tasks: metrics.tasks.total,
        staff: metrics.staff.total
      }
    });

    res.json(metrics);
  } catch (err) {
    global.logger.error("Failed to get dashboard metrics", err, { 
      userId: req.user?.id 
    });
    next(err);
  }
});

export { router as metrics };

