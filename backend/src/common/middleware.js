import jwt from "jsonwebtoken";
import { unauthorized, forbidden } from "./errors.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

export function bearer() {
  return (req, _res, next) => {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return next(unauthorized());
    const token = auth.slice(7);
    try {
      req.user = jwt.verify(token, ACCESS_SECRET);
      next();
    } catch { next(unauthorized()); }
  };
}

export function allow(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.length || roles.includes(req.user.role)) return next();
    return next(forbidden());
  };
}




