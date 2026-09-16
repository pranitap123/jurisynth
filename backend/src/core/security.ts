/*
  Same design notes as the Python version — repeated here because they're
  the actual interview material, not boilerplate:

  - bcryptjs (pure JS, no native compilation — this is deliberately NOT the
    native `bcrypt` package, which needs node-gyp + a C++ toolchain and is
    a common source of "works on my machine" Docker build failures).
    Slightly slower per-hash than native bcrypt, which is an acceptable
    tradeoff for login-rate operations.
  - JWTs are signed, not encrypted — anyone can decode the payload, they
    just can't forge a valid signature without the secret. Never put
    secrets inside the payload.
  - TOTP (RFC 6238): otplib independently derives the same 6-digit code
    the client's authenticator app shows, from a shared secret + the
    current 30-second time window. `window: 1` tolerates +/-30s clock
    drift between server and client.

  FAILURE MODES to know:
  - No token revocation here — a leaked JWT is valid until it expires.
    Real production would add short-lived access tokens + refresh tokens.
  - Rate limiting on login/MFA attempts isn't implemented — see README.
*/
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { config } from "./config.js";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function createAccessToken(subject: string): string {
  // jsonwebtoken's types want a numeric seconds value or its own narrow
  // string-literal union for expiresIn, not a plain string from config —
  // cast through SignOptions since config.jwtExpiresIn ("30m", "7d", etc.)
  // is validated by the library itself at runtime.
  const options: jwt.SignOptions = { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] };
  return jwt.sign({ sub: subject }, config.jwtSecret, options);
}

export function decodeAccessToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, config.jwtSecret) as { sub: string };
  } catch {
    return null;
  }
}

// --- TOTP MFA ---

authenticator.options = { window: 1 }; // +/- one 30s step, tolerates clock drift

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function getTotpProvisioningUri(secret: string, userEmail: string): string {
  return authenticator.keyuri(userEmail, config.totpIssuer, secret);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}
