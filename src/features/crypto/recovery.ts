import { supabase } from "#/utils/supabase";
import { RecoveryLockedError } from "./errors";

export interface RecoveryAttemptState {
	failed_count: number;
	locked_until: string | null;
}

export async function checkRecoveryLock(): Promise<string | null> {
	const { data, error } = await supabase.rpc("check_recovery_lock");
	if (error) throw error;
	return (data as unknown as string | null) ?? null;
}

export async function assertRecoveryUnlocked(): Promise<void> {
	const lockedUntil = await checkRecoveryLock();
	if (lockedUntil && new Date(lockedUntil) > new Date()) {
		throw new RecoveryLockedError(lockedUntil);
	}
}

export async function recordRecoveryAttempt(
	success: boolean,
): Promise<RecoveryAttemptState> {
	const { data, error } = await supabase.rpc("record_recovery_attempt", {
		p_success: success,
	});
	if (error) throw error;
	return data as unknown as RecoveryAttemptState;
}
