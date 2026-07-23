/**
 * Signing with the project's identity key.
 *
 * moss holds the key and never hands it out; a plugin asks for the public key
 * and for signatures over bytes it builds itself. This is the same split as a
 * hardware wallet or a Nostr NIP-07 signer: your plugin is the app, moss is the
 * signer. You own the protocol — the record layout, the name derivation, the
 * transport; moss owns custody.
 *
 * **These calls are gated.** Your manifest must declare them or the host
 * refuses at runtime:
 *
 * ```json
 * { "requires": ["identity_sign"] }
 * ```
 *
 * One key, several encodings: moss's identity is a secp256k1 key, so the same
 * key serves Nostr/seta (BIP-340 Schnorr, x-only public key) and libp2p/IPNS
 * (ECDSA over SHA-256, compressed-SEC1 public key). Both describe the same
 * curve point, which is why an IPNS name derived here is provably the same
 * identity as the user's Nostr public key.
 *
 * @category Identity
 */

import { getTauriCore } from "./tauri.js";

/**
 * A signature scheme over the identity key.
 *
 * - `secp256k1-schnorr` — BIP-340. Public key: x-only, 32 bytes. Nostr events.
 * - `secp256k1-ecdsa` — ECDSA over SHA-256, DER-encoded and low-S normalized.
 *   Public key: compressed SEC1, 33 bytes. libp2p/IPNS records.
 * @category Identity
 */
export type SigningScheme = "secp256k1-schnorr" | "secp256k1-ecdsa";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * The project identity's public key, in the encoding the scheme implies.
 *
 * For `secp256k1-ecdsa` this is the 33-byte compressed key libp2p wraps in its
 * `PublicKey` protobuf — the input to an IPNS name. Because moss canonicalizes
 * the key to its even-Y form, the first byte is always `0x02` and the remaining
 * 32 bytes equal the x-only (Nostr) public key.
 *
 * @throws if the plugin's manifest does not declare `identity_sign`.
 * @category Identity
 */
export async function getIdentityPublicKey(scheme: SigningScheme): Promise<Uint8Array> {
  const res = await getTauriCore().invoke<{ publicKeyBase64: string }>(
    "identity_public_key",
    { scheme },
  );
  return fromBase64(res.publicKeyBase64);
}

/**
 * Sign `payload` with the project identity key.
 *
 * The bytes are yours to construct — moss does not interpret them. For an IPNS
 * record that means signing `"ipns-signature:" || <dag-cbor data>` under
 * `secp256k1-ecdsa`; the returned signature is DER-encoded and low-S, which is
 * what libp2p verification expects.
 *
 * @throws if the plugin's manifest does not declare `identity_sign`.
 * @category Identity
 */
export async function identitySign(
  scheme: SigningScheme,
  payload: Uint8Array,
): Promise<Uint8Array> {
  const res = await getTauriCore().invoke<{ signatureBase64: string }>("identity_sign", {
    scheme,
    payloadBase64: toBase64(payload),
  });
  return fromBase64(res.signatureBase64);
}
