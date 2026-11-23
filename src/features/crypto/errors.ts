export class VaultError extends Error {
	readonly code: string;

	constructor(message: string, code = "vault_error") {
		super(message);
		this.name = new.target.name;
		this.code = code;
	}
}

export class VaultLockedError extends VaultError {
	constructor() {
		super(
			"Unlock your vault before accessing encrypted content.",
			"vault_locked",
		);
	}
}

export class VaultKeyMissingError extends VaultError {
	constructor(workspaceId: string) {
		super(
			`The encryption key for workspace ${workspaceId} is not available. Ask an owner to open the workspace while you are online.`,
			"vault_key_missing",
		);
	}
}

export class VaultDecryptionError extends VaultError {
	constructor(
		message = "This content could not be decrypted. It may have been changed or encrypted with another key.",
	) {
		super(message, "vault_decryption_failed");
	}
}

export class DeviceLinkExpiredError extends VaultError {
	constructor() {
		super("This device link request has expired.", "device_link_expired");
	}
}

export class DeviceLinkRejectedError extends VaultError {
	constructor() {
		super(
			"This device link request was rejected or already used.",
			"device_link_rejected",
		);
	}
}

export class RotationVerificationError extends VaultError {
	constructor() {
		super(
			"Workspace key rotation could not be verified. No key was retired.",
			"rotation_verification_failed",
		);
	}
}

export class RecoveryLockedError extends VaultError {
	constructor(lockedUntil: string) {
		super(`Recovery is locked until ${lockedUntil}.`, "recovery_locked");
	}
}
