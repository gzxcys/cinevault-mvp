import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!SECRET) {
  throw new Error(
    "❌ JWT_SECRET не задан в .env — сервер не может безопасно подписывать токены",
  );
}

export function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, SECRET, {
    expiresIn: EXPIRES_IN,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}
