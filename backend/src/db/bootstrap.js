import { knex } from "./knex.js";

export async function ensureSchema() {
  // Users
  if (!(await knex.schema.hasTable("Users"))) {
    await knex.schema.createTable("Users", t => {
      t.increments("id").primary();
      t.string("name").notNullable();
      t.string("email").notNullable().unique();
      t.string("phone");
      t.enu("role", ["admin","foreman","worker","contractor","labourer"]).notNullable();
      t.string("position");
      t.string("password_hash").notNullable();
      t.enu("status", ["active","disabled"]).notNullable().defaultTo("active");
      t.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }
  if (!(await knex.schema.hasTable("RefreshTokens"))) {
    await knex.schema.createTable("RefreshTokens", t => {
      t.increments("id").primary();
      t.integer("user_id").references("Users.id").onDelete("CASCADE");
      t.string("token_hash").notNullable();
      t.timestamp("expires_at").notNullable();
      t.timestamp("revoked_at");
      t.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }
  if (!(await knex.schema.hasTable("Projects"))) {
    await knex.schema.createTable("Projects", t => {
      t.increments("id").primary();
      t.string("ref").notNullable().unique();
      t.string("address").notNullable();
      t.string("client_name");
      t.enu("status", ["planned","active","on_hold","complete"]).defaultTo("planned");
      t.date("start_date");
      t.date("end_date_est");
      t.text("notes");
      t.integer("created_by").references("Users.id");
      t.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }
  if (!(await knex.schema.hasTable("Tasks"))) {
    await knex.schema.createTable("Tasks", t => {
      t.increments("id").primary();
      t.integer("project_id").references("Projects.id").onDelete("CASCADE");
      t.string("title").notNullable();
      t.text("description");
      t.enu("status", ["todo","in_progress","blocked","done"]).defaultTo("todo");
      t.enu("priority", ["low","medium","high","urgent"]).defaultTo("medium");
      t.integer("assignee_staff_id").references("Users.id").onDelete("SET NULL");
      t.integer("assignee_contractor_id").references("Contractors.id").onDelete("SET NULL");
      t.datetime("due_date");
      t.datetime("start_date");
      t.datetime("end_date");
      t.text("notes");
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }
  if (!(await knex.schema.hasTable("Assignments"))) {
    await knex.schema.createTable("Assignments", t => {
      t.increments("id").primary();
      t.integer("task_id").references("Tasks.id").onDelete("CASCADE");
      t.integer("user_id").references("Users.id").onDelete("CASCADE");
      t.string("role_on_task");
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.unique(["task_id","user_id"]);
    });
  }
  if (!(await knex.schema.hasTable("Photos"))) {
    await knex.schema.createTable("Photos", t => {
      t.increments("id").primary();
      t.integer("project_id").references("Projects.id").onDelete("CASCADE");
      t.integer("task_id").references("Tasks.id").onDelete("SET NULL");
      t.integer("uploaded_by").references("Users.id").onDelete("SET NULL");
      t.string("file_path").notNullable();
      t.string("caption");
      t.enu("tag", ["before","during","after"]);
      t.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }
  if (!(await knex.schema.hasTable("Contractors"))) {
    await knex.schema.createTable("Contractors", t => {
      t.increments("id").primary();
      t.string("company").notNullable();
      t.string("trade").notNullable();
      t.string("contact_name").notNullable();
      t.string("phone").notNullable();
      t.string("email").notNullable();
      t.decimal("rating", 2, 1);
      t.date("insurance_expiry");
      t.text("notes");
      t.enu("status", ["active","inactive"]).defaultTo("active");
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.unique(["company", "contact_name"]);
    });
  }
  if (!(await knex.schema.hasTable("CalendarEvents"))) {
    await knex.schema.createTable("CalendarEvents", t => {
      t.increments("id").primary();
      t.integer("task_id").references("Tasks.id").onDelete("CASCADE");
      t.integer("project_id").references("Projects.id").onDelete("CASCADE");
      t.string("title").notNullable();
      t.datetime("start").notNullable();
      t.datetime("end");
      t.text("description");
      t.string("location");
      t.enu("event_type", ["task","meeting","deadline","milestone"]).defaultTo("task");
      t.boolean("all_day").defaultTo(false);
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // Photos table
  if (!(await knex.schema.hasTable("Photos"))) {
    await knex.schema.createTable("Photos", t => {
      t.increments("id").primary();
      t.integer("project_id").references("Projects.id").onDelete("CASCADE");
      t.string("caption");
      t.enu("tag", ["before","during","after"]).defaultTo("during");
      t.string("uploaded_by").notNullable();
      t.string("file_path"); // For storing file path when file upload is implemented
      t.string("file_name"); // Original filename
      t.integer("file_size"); // File size in bytes
      t.string("mime_type"); // MIME type of the file
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // Seed users (idempotent)
  const existing = await knex("Users").count({ c: "*" }).first();
  if (!existing.c) {
    const bcrypt = (await import("bcryptjs")).default;
    const hash = (p) => bcrypt.hashSync(p, 10);
    await knex("Users").insert([
      { name:"Danny Tighe", email:"danny@tbs.local", role:"admin", position:"Managing Director", password_hash:hash("password123") },
      { name:"Pat",   email:"pat@tbs.local",   role:"foreman", position:"Foreman", password_hash:hash("password123") },
      { name:"Adam",  email:"adam@tbs.local",  role:"foreman", position:"Foreman", password_hash:hash("password123") },
      { name:"Charlie", email:"charlie@tbs.local", role:"labourer", position:"Labourer", password_hash:hash("password123") }
    ]);
  }

  // Seed projects (idempotent)
  const existingProjects = await knex("Projects").count({ c: "*" }).first();
  if (!existingProjects.c) {
    await knex("Projects").insert([
      { 
        id: 1,
        ref: "82-WALPOLE", 
        address: "82 Walpole Road, Great Yarmouth", 
        client_name: "Private Residential",
        status: "active",
        start_date: "2025-10-01",
        end_date_est: "2025-12-31",
        notes: "Foundation phase construction project with structural work",
        created_by: 1
      },
      { 
        id: 2,
        ref: "CROWN-ROAD", 
        address: "15 Crown Road, Norwich", 
        client_name: "Commercial Client",
        status: "active",
        start_date: "2025-09-15",
        end_date_est: "2026-02-28",
        notes: "Commercial renovation project",
        created_by: 1
      }
    ]);
  }
}



