import { secret } from "@/lib/env";

// AES-256-GCM through WebCrypto. The user id is bound as additional data, so a ciphertext copied into another
// user's row will not decrypt. Stored form: v1.<iv base64>.<ciphertext base64>.
const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function masterKey(): Promise<CryptoKey | null> {
  const raw = await secret("APP_ENCRYPTION_KEY");
  if (!raw) return null;
  const bytes = fromB64(raw);
  if (bytes.length !== 32) return null;
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptionReady(): Promise<boolean> {
  return (await masterKey()) !== null;
}

export async function encryptFor(userId: string, plaintext: string): Promise<string> {
  const key = await masterKey();
  if (!key) throw new Error("encryption key missing");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(`ai-key:${userId}`) }, key, enc.encode(plaintext)),
  );
  return `v1.${toB64(iv)}.${toB64(ciphertext)}`;
}

export async function decryptFor(userId: string, stored: string): Promise<string | null> {
  const key = await masterKey();
  const [version, ivText, dataText] = stored.split(".");
  if (!key || version !== "v1" || !ivText || !dataText) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(ivText), additionalData: enc.encode(`ai-key:${userId}`) },
      key,
      fromB64(dataText),
    );
    return dec.decode(plain);
  } catch {
    return null;
  }
}
