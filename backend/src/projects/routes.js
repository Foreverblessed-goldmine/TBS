import { Router } from "express";
import { z } from "zod";
import { bearer, allow } from "../common/middleware.js";
import { parse } from "../common/validate.js";
import { listProjects, getProject, createProject, updateProject } from "./service.js";

export const projects = Router();
projects.use(bearer());

// GET /projects
projects.get("/", async (_req, res) => res.json(await listProjects()));

// GET /projects/:id
projects.get("/:id", async (req, res) => {
  const row = await getProject(req.params.id);
  if (!row) return res.status(404).json({ error:"Not found" });
  res.json(row);
});

// POST /projects (admin only)
const CreateSchema = z.object({ body: z.object({
  ref: z.string().min(1),
  address: z.string().min(1),
  client_name: z.string().optional(),
})});
projects.post("/", allow("admin"), parse(CreateSchema), async (req, res) => {
  const [{ id }] = await createProject(req.valid.body, req.user.id);
  res.status(201).json({ id });
});

// PATCH /projects/:id (admin + foreman)
const PatchSchema = z.object({ body: z.object({
  status: z.enum(["planned","active","on_hold","complete"]).optional(),
  notes: z.string().optional(),
})});
projects.patch("/:id", allow("admin","foreman"), parse(PatchSchema), async (req, res) => {
  await updateProject(req.params.id, req.valid.body);
  res.json({ ok:true });
});




