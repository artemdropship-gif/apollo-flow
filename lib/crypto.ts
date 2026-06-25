import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.VAULT_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error(
      "VAULT_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)",
    );
  }
  return Buffer.from(key, "hex");
}

export interface EncryptedPayload {
  valueEnc: string;
  iv: string;
  authTag: string;
}

export function encryptSecret(plain: string): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    valueEnc: enc.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const decipher = crypto.createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(payload.valueEnc, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
