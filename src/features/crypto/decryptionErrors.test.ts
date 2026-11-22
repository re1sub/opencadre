import { describe, expect, it } from "vitest";
import {
	clearDecryptionErrorsFor,
	decryptionErrors,
	hasDecryptionErrors,
	reportDecryptionError,
} from "./decryptionErrors";
import { VaultDecryptionError } from "./errors";

describe("decryption error reporting", () => {
	it("reports a scoped failure and clears it for the active workspace", () => {
		clearDecryptionErrorsFor("ws-1");
		reportDecryptionError(
			"ws-1:page:page-1:title",
			new VaultDecryptionError("The ciphertext was altered."),
		);

		expect(decryptionErrors().get("ws-1:page:page-1:title")).toBe(
			"The ciphertext was altered.",
		);
		expect(hasDecryptionErrors("ws-1")).toBe(true);
		expect(hasDecryptionErrors("ws-2")).toBe(false);

		clearDecryptionErrorsFor("ws-1");
		expect(hasDecryptionErrors("ws-1")).toBe(false);
	});
});
