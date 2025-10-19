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
      t.string("name").notNullable();
      t.string("stage");
      t.date("start_date");
      t.date("end_date");
      t.decimal("man_days_est", 6, 2);
      t.enu("status", ["todo","in_progress","blocked","done"]).defaultTo("todo");
      t.text("notes");
      t.timestamp("created_at").defaultTo(knex.fn.now());
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
}



