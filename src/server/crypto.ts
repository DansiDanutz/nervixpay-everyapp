const encoder = new TextEncoder();
function bytes(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
async function key(secret: string) {
  const raw = bytes(secret);
  if (raw.length !== 32)
    throw new Error("Connection encryption key must be 32 bytes.");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function seal(value: string, secret: string, owner: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(owner) },
    await key(secret),
    encoder.encode(value),
  );
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(encrypted)));
}
export async function unseal(value: string, secret: string, owner: string) {
  const packed = bytes(value);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: packed.slice(0, 12),
      additionalData: encoder.encode(owner),
    },
    await key(secret),
    packed.slice(12),
  );
  return new TextDecoder().decode(decrypted);
}
