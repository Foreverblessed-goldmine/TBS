import { Router } from "express";
import { z } from "zod";
import { knex } from "../db/knex.js";
import { bearer, allow } from "../common/middleware.js";
import { parse } from "../common/validate.js";

const router = Router();
router.use(bearer());

// Schema for photo validation
const PhotoSchema = z.object({
  projectId: z.number().int().positive("Project ID must be a positive integer"),
  caption: z.string().optional(),
  tag: z.enum(["before", "during", "after"]).default("during"),
  uploadedBy: z.string().min(1, "Uploaded by is required"),
});

const CreatePhotoSchema = z.object({
  body: PhotoSchema,
});

// GET /api/photos - List photos (with optional project filter)
router.get("/", allow("admin", "foreman", "worker", "contractor", "labourer"), async (req, res, next) => {
  try {
    let query = knex("Photos")
      .select(
        "Photos.id",
        "Photos.project_id",
        "Photos.caption",
        "Photos.tag",
        "Photos.uploaded_by",
        "Photos.created_at",
        "Projects.ref as project_ref",
        "Projects.address as project_address"
      )
      .leftJoin("Projects", "Photos.project_id", "Projects.id");

    // Apply project filter if provided
    if (req.query.project_id) {
      query = query.where("Photos.project_id", req.query.project_id);
    }

    // Apply tag filter if provided
    if (req.query.tag) {
      query = query.where("Photos.tag", req.query.tag);
    }

    const photos = await query.orderBy("Photos.created_at", "desc");
    res.json(photos);
  } catch (err) {
    next(err);
  }
});

// GET /api/photos/:id - Get a single photo
router.get("/:id", allow("admin", "foreman", "worker", "contractor", "labourer"), async (req, res, next) => {
  try {
    const photo = await knex("Photos")
      .select(
        "Photos.id",
        "Photos.project_id",
        "Photos.caption",
        "Photos.tag",
        "Photos.uploaded_by",
        "Photos.created_at",
        "Projects.ref as project_ref",
        "Projects.address as project_address"
      )
      .leftJoin("Projects", "Photos.project_id", "Projects.id")
      .where("Photos.id", req.params.id)
      .first();

    if (!photo) {
      return res.status(404).json({ error: "Photo not found" });
    }
    res.json(photo);
  } catch (err) {
    next(err);
  }
});

// POST /api/photos - Create a new photo
router.post("/", allow("admin", "foreman"), parse(CreatePhotoSchema), async (req, res, next) => {
  try {
    const { projectId, caption, tag, uploadedBy } = req.valid.body;

    global.logger.info("Creating new photo", { 
      projectId,
      caption,
      tag,
      uploadedBy,
      createdBy: req.user?.id 
    });

    // Validate project exists
    const project = await knex("Projects").where({ id: projectId }).first();
    if (!project) {
      global.logger.warn("Photo creation failed - project not found", { projectId });
      return res.status(400).json({ error: "Project not found" });
    }

    const [newPhoto] = await knex("Photos")
      .insert({
        project_id: projectId,
        caption: caption || null,
        tag: tag,
        uploaded_by: uploadedBy,
      })
      .returning("*");

    global.logger.info("Photo created successfully", { 
      photoId: newPhoto.id,
      projectId: newPhoto.project_id,
      createdBy: req.user?.id 
    });

    res.status(201).json(newPhoto);
  } catch (err) {
    global.logger.error("Failed to create photo", err, { 
      projectId: req.valid?.body?.projectId,
      createdBy: req.user?.id 
    });
    next(err);
  }
});

// PUT /api/photos/:id - Update a photo
router.put("/:id", allow("admin", "foreman"), parse(CreatePhotoSchema), async (req, res, next) => {
  try {
    const { caption, tag } = req.valid.body;

    const [updatedPhoto] = await knex("Photos")
      .where({ id: req.params.id })
      .update({
        caption,
        tag,
        updated_at: knex.fn.now(),
      })
      .returning("*");

    if (!updatedPhoto) {
      return res.status(404).json({ error: "Photo not found" });
    }

    global.logger.info("Photo updated successfully", { 
      photoId: updatedPhoto.id,
      updatedBy: req.user?.id 
    });

    res.json(updatedPhoto);
  } catch (err) {
    global.logger.error("Failed to update photo", err, { 
      photoId: req.params.id,
      updatedBy: req.user?.id 
    });
    next(err);
  }
});

// DELETE /api/photos/:id - Delete a photo
router.delete("/:id", allow("admin"), async (req, res, next) => {
  try {
    const photoId = req.params.id;

    global.logger.info("Attempting to delete photo", { 
      photoId,
      deletedBy: req.user?.id 
    });

    const deletedCount = await knex("Photos").where({ id: photoId }).del();

    if (deletedCount === 0) {
      global.logger.warn("Photo deletion failed - photo not found", { photoId });
      return res.status(404).json({ error: "Photo not found" });
    }

    global.logger.info("Photo deleted successfully", { 
      photoId,
      deletedBy: req.user?.id 
    });

    res.json({ message: "Photo deleted successfully" });
  } catch (err) {
    global.logger.error("Failed to delete photo", err, { 
      photoId: req.params.id,
      deletedBy: req.user?.id 
    });
    next(err);
  }
});

export { router as photos };
