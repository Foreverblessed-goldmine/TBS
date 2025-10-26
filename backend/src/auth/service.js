import jwt from "jsonwebtoken";
import { knex } from "../db/knex.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TTL_MIN = parseInt(process.env.ACCESS_TTL_MIN || "15", 10);
const REFRESH_TTL_D  = parseInt(process.env.REFRESH_TTL_DAYS || "7", 10);

function signAccess(user) {
  return jwt.sign({ id:user.id, role:user.role, name:user.name, email:user.email }, ACCESS_SECRET, { expiresIn: `${ACCESS_TTL_MIN}m` });
}
function signRefresh(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: `${REFRESH_TTL_D}d` });
}

export async function login(email, password) {
  const user = await knex("Users").where({ email }).first();
  if (!user || user.status !== "active") return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  const accessToken = signAccess(user);
  const rawRefresh = signRefresh({ id:user.id });
  const tokenHash = crypto.createHash("sha256").update(rawRefresh).digest("hex");
  const expires = new Date(Date.now() + REFRESH_TTL_D*24*3600*1000);

  await knex("RefreshTokens").insert({ user_id:user.id, token_hash:tokenHash, expires_at:expires });

  return { accessToken, refreshToken: rawRefresh, user };
}

export async function rotate(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const row = await knex("RefreshTokens").where({ token_hash:hash }).andWhere("revoked_at", null).first();
    if (!row) return null;
    if (new Date(row.expires_at) < new Date()) return null;

    const user = await knex("Users").where({ id: row.user_id }).first();
    if (!user || user.status !== "active") return null;

    const accessToken = signAccess(user);
    return { accessToken, user };
  } catch { return null; }
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await knex("RefreshTokens").where({ token_hash:hash, revoked_at:null }).update({ revoked_at: knex.fn.now() });
}




