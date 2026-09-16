import { Router } from "express";
import { z } from "zod";
import { prisma } from "../core/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  generateTotpSecret,
  getTotpProvisioningUri,
  verifyTotpCode,
} from "../core/security.js";

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authRouter.post("/signup", asyncHandler(async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ detail: parsed.error.issues[0].message });
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ detail: "Email already registered" });
  }

  const user = await prisma.user.create({
    data: { email, hashedPassword: await hashPassword(password) },
  });

  res.status(201).json({ access_token: createAccessToken(user.id) });
}));

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totp_code: z.string().optional(),
});

authRouter.post("/login", asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ detail: parsed.error.issues[0].message });
  }
  const { email, password, totp_code } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Same error for "no such user" and "wrong password" — a different
  // message for each would let an attacker enumerate registered emails.
  const invalid = () => res.status(401).json({ detail: "Invalid email or password" });

  if (!user || !(await verifyPassword(password, user.hashedPassword))) {
    return invalid();
  }

  if (user.mfaEnabled) {
    if (!totp_code) {
      return res.status(401).json({ detail: "MFA code required" });
    }
    if (!user.totpSecret || !verifyTotpCode(user.totpSecret, totp_code)) {
      return res.status(401).json({ detail: "Invalid MFA code" });
    }
  }

  res.json({ access_token: createAccessToken(user.id) });
}));

authRouter.post("/mfa/enroll", requireAuth, asyncHandler(async (req, res) => {
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: req.user!.id }, data: { totpSecret: secret } });
  res.json({ provisioning_uri: getTotpProvisioningUri(secret, req.user!.email) });
}));

const verifyMfaSchema = z.object({ totp_code: z.string() });

authRouter.post("/mfa/verify", requireAuth, asyncHandler(async (req, res) => {
  const parsed = verifyMfaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ detail: parsed.error.issues[0].message });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.totpSecret) {
    return res.status(400).json({ detail: "Call /auth/mfa/enroll first" });
  }
  if (!verifyTotpCode(user.totpSecret, parsed.data.totp_code)) {
    return res.status(400).json({ detail: "Invalid code" });
  }

  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
  res.json({ mfa_enabled: true });
}));