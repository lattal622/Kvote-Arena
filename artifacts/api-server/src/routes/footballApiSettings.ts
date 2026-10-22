import { getAuth } from "@clerk/express";
import { DeleteFootballApiKeyResponse, GetFootballApiSettingsResponse, SaveFootballApiKeyBody, SaveFootballApiKeyResponse } from "@workspace/api-zod";
import { db, footballApiCredentials } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  createCipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function requireUserId(req: Request, res: Response): string | null {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Sign-in required" });
    return null;
  }

  return userId;
}

function getEncryptionKey(): Buffer {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("Credential encryption is not configured");
  }

  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(sessionSecret, "utf8"),
      Buffer.from("kvote-arena-api-credentials-v1", "utf8"),
      Buffer.from("football-api-key-aes-256-gcm", "utf8"),
      32,
    ),
  );
}

function encryptApiKey(
  apiKey: string,
  userId: string,
): { encryptedKey: string; encryptionIv: string; authenticationTag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  cipher.setAAD(Buffer.from(`kvote-arena:football-api:${userId}`, "utf8"));
  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);

  return {
    encryptedKey: encrypted.toString("base64"),
    encryptionIv: iv.toString("base64"),
    authenticationTag: cipher.getAuthTag().toString("base64"),
  };
}

router.use("/settings/football-api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.get("/settings/football-api", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const [credential] = await db
      .select({ updatedAt: footballApiCredentials.updatedAt })
      .from(footballApiCredentials)
      .where(eq(footballApiCredentials.userId, userId))
      .limit(1);

    const result = GetFootballApiSettingsResponse.parse({
      configured: Boolean(credential),
      lastUpdated: credential?.updatedAt ?? null,
    });

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Could not load Football API settings");
    res.status(500).json({ error: "Could not load API settings" });
  }
});

router.put("/settings/football-api", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = SaveFootballApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid Football API key" });
    return;
  }

  const apiKey = parsed.data.apiKey.trim();
  const trimmed = SaveFootballApiKeyBody.safeParse({ apiKey });
  if (!trimmed.success) {
    res.status(400).json({ error: "Enter a valid Football API key" });
    return;
  }

  try {
    const encrypted = encryptApiKey(apiKey, userId);
    const updatedAt = new Date();

    await db
      .insert(footballApiCredentials)
      .values({ userId, ...encrypted, updatedAt })
      .onConflictDoUpdate({
        target: footballApiCredentials.userId,
        set: { ...encrypted, updatedAt },
      });

    res.json(
      SaveFootballApiKeyResponse.parse({
        configured: true,
        lastUpdated: updatedAt,
      }),
    );
  } catch (error) {
    logger.error({ err: error }, "Could not save Football API settings");
    res.status(500).json({ error: "Could not save API settings" });
  }
});

router.delete("/settings/football-api", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    await db
      .delete(footballApiCredentials)
      .where(eq(footballApiCredentials.userId, userId));

    res.json(
      DeleteFootballApiKeyResponse.parse({
        configured: false,
        lastUpdated: null,
      }),
    );
  } catch (error) {
    logger.error({ err: error }, "Could not remove Football API settings");
    res.status(500).json({ error: "Could not remove API settings" });
  }
});

export default router;
