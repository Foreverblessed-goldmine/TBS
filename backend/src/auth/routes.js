import { Router } from "express";
import { z } from "zod";
import { parse } from "../common/validate.js";
import { login, rotate, logout } from "./service.js";

export const auth = Router();

const LoginSchema = z.object({ body: z.object({
  email: z.string().email(),
  password: z.string().min(4)
})});

auth.post("/login", parse(LoginSchema), async (req, res) => {
  const { email, password } = req.valid.body;
  const result = await login(email, password);
  if (!result) return res.status(401).json({ error:"Invalid credentials" });
  // HttpOnly refresh cookie
  res.cookie("rt", result.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/auth"
  });
  res.json({ accessToken: result.accessToken, user: { id: result.user.id, name: result.user.name, role: result.user.role, email: result.user.email } });
});

auth.post("/refresh", async (req, res) => {
  const token = req.cookies?.rt;
  const result = await rotate(token);
  if (!result) return res.status(401).json({ error:"Invalid refresh" });
  res.json({ accessToken: result.accessToken });
});

auth.post("/logout", async (req, res) => {
  const token = req.cookies?.rt;
  await logout(token);
  res.clearCookie("rt", { path:"/api/auth" });
  res.json({ ok:true });
});





