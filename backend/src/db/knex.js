import knexLib from "knex";
import knexConfig from "../../knexfile.cjs";
const env = process.env.NODE_ENV || "development";
const cfg = knexConfig[env] || knexConfig.development;
export const knex = knexLib(cfg);



