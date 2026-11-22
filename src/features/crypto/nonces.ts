import { supabase } from "#/utils/supabase";
import { randomBytes, toBase64 } from "./crypto";

export type KeyScope = "workspace" | "user";

const BATCH_SIZE = 12;
const pools = new Map<string, string[]>();

const poolKey = (scope: KeyScope, keyId: string) => `${scope}:${keyId}`;

const makeIv = (): string => toBase64(randomBytes(12));

export async function reserveNonceBatch(
	keyScope: KeyScope,
	keyId: string,
	count = BATCH_SIZE,
): Promise<string[]> {
	const ivs = Array.from({ length: count }, makeIv);
	const { data, error } = await supabase.rpc("reserve_nonces", {
		p_key_scope: keyScope,
		p_key_id: keyId,
		p_ivs: ivs,
	});
	if (error) throw error;
	const inserted = data as unknown as number;
	if (inserted !== ivs.length) {
		throw new Error("A reserved nonce collided. Please retry the write.");
	}
	return ivs;
}

export async function reserveNonce(
	keyScope: KeyScope,
	keyId: string,
): Promise<string> {
	const [iv] = await reserveNonceBatch(keyScope, keyId, 1);
	return iv;
}

export async function nonceFor(
	keyScope: KeyScope,
	keyId: string,
): Promise<string> {
	const key = poolKey(keyScope, keyId);
	const pool = pools.get(key);
	if (pool && pool.length > 0) return pool.shift() as string;
	const reserved = await reserveNonceBatch(keyScope, keyId);
	pools.set(key, reserved.slice(1));
	return reserved[0];
}

export const clearNoncePool = (keyId?: string): void => {
	if (!keyId) {
		pools.clear();
		return;
	}
	for (const key of pools.keys()) {
		if (key.endsWith(`:${keyId}`)) pools.delete(key);
	}
};
