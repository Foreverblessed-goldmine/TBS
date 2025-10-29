import { knex } from "../db/knex.js";

export const listProjects = () => knex("Projects").select("*").orderBy("created_at","desc");
export const getProject  = (id) => knex("Projects").where({ id }).first();
export const createProject = (data, userId) =>
  knex("Projects").insert({ ...data, created_by: userId }).returning(["id"]);
export const updateProject = (id, patch) => knex("Projects").where({ id }).update(patch);





