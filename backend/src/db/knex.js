import knexLib from "knex";
import config from "../../knexfile.js";
const env = process.env.NODE_ENV || "development";
export const knex = knexLib(config[env]);



