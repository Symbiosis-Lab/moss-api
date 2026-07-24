/**
 * Signing with the project's identity key.
 *
 * moss holds the key and never hands it out. Your plugin asks for a public key,
 * or for a signature over bytes it built itself. This is the arrangement a
 * hardware wallet or a Nostr NIP-07 signer uses: your plugin is the app, moss
 * is the signer.
 *
 * **Where the line falls.** moss owns the key, the signature algorithm, and the
 * *domain tag* — a short prefix mixed in before signing that binds a signature
 * to one protocol. Everything inside that tag is yours: the record structure,
 * the serialization, how you derive a name or address from the public key, when
 * you sign, and where you publish.
 *
 * The tag has to be moss's, not yours. moss signs seta authentication and the
 * site owner's moderation events with this same key, so a plugin that could
 * choose its own prefix — or none — could mint credentials as the user. Because
 * moss prepends the tag, a signature you obtain is only ever valid inside the
 * purpose you asked for.
 *
 * The practical consequence: purposes are a list moss recognizes, and a protocol
 * moss has not registered cannot be signed for yet. That list grows by adding a
 * protocol to moss, not by declaring one in your manifest.
 *
 * **These calls are gated.** Declare them or the host refuses at runtime:
 *
 * ```json
 * { "requires": ["identity_sign"] }
 * ```
 *
 * @category Identity
 */

import { getTauriCore } from "./tauri.js";

/**
 * What a signature is for. moss mixes the purpose's domain tag into the bytes
 * it signs, so a signature obtained for one purpose is not valid for another —
 * nor for moss's own internal signing.
 *
 * - `ipns` — IPNS records. moss prepends the IPNS spec's own separator
 *   (`ipns-signature:`), so the signature is spec-exact: pass just the
 *   DAG-CBOR record data and the result verifies as a real IPNS signature.
 *
 * @category Identity
 */
export type SigningPurpose = "ipns";

/**
 * A signature scheme over the identity key.
 *
 * - `secp256k1-schnorr` — BIP-340. Public key: x-only, 32 bytes. Nostr events.
 * - `secp256k1-ecdsa` — ECDSA over SHA-256, DER-encoded and low-S normalized.
 *   Public key: compressed SEC1, 33 bytes. libp2p/IPNS records.
 *
 * Both are the same key seen two ways, so an address you derive from the
 * compressed key is provably the same identity as the user's Nostr public key.
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
 * `PublicKey` protobuf — the input to an IPNS name. moss canonicalizes the key
 * to its even-Y form, so the first byte is always `0x02` and the remaining 32
 * bytes equal the x-only (Nostr) public key.
 *
 * @throws if the manifest does not declare `identity_sign`, or the purpose is unknown.
 * @category Identity
 */
export async function getIdentityPublicKey(
  purpose: SigningPurpose,
  scheme: SigningScheme,
): Promise<Uint8Array> {
  const res = await getTauriCore().invoke<{ publicKeyBase64: string }>(
    "identity_public_key",
    { purpose, scheme },
  );
  return fromBase64(res.publicKeyBase64);
}

/**
 * Sign `payload` with the project identity key, for `purpose`.
 *
 * Pass only the bytes that live *inside* the purpose's domain tag — moss
 * prepends the tag itself. For `ipns` that means passing the DAG-CBOR record
 * data alone (not `"ipns-signature:" || data`); the returned signature is
 * DER-encoded and low-S, which is what libp2p verification expects.
 *
 * @throws if the manifest does not declare `identity_sign`, or the purpose is unknown.
 * @category Identity
 */
export async function identitySign(
  purpose: SigningPurpose,
  scheme: SigningScheme,
  payload: Uint8Array,
): Promise<Uint8Array> {
  const res = await getTauriCore().invoke<{ signatureBase64: string }>("identity_sign", {
    purpose,
    scheme,
    payloadBase64: toBase64(payload),
  });
  return fromBase64(res.signatureBase64);
}
