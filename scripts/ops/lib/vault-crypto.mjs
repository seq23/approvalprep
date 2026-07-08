import crypto from "node:crypto";

const MAGIC = "approvalprep-vault-v1";
const KDF = "scrypt";
const CIPHER = "aes-256-gcm";

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, 32, { N: 16384, r: 8, p: 1 });
}

export function encryptVaultJson(vault, passphrase) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(passphrase, salt);
  const cipher = crypto.createCipheriv(CIPHER, key, iv);
  const plaintext = Buffer.from(JSON.stringify(vault, null, 2), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    magic: MAGIC,
    kdf: KDF,
    cipher: CIPHER,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64")
  }, null, 2);
}

export function decryptVaultPayload(payloadText, passphrase) {
  const payload = JSON.parse(payloadText);
  if (payload.magic !== MAGIC || payload.kdf !== KDF || payload.cipher !== CIPHER) {
    throw new Error("Unsupported ApprovalPrep vault format.");
  }
  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  const key = deriveKey(passphrase, salt);
  const decipher = crypto.createDecipheriv(CIPHER, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext);
}
