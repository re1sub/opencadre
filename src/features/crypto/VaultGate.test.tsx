import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VaultGate from "./VaultGate";

const h = vi.hoisted(() => ({
	setStatus: (_: string) => {},
	setHasDevice: (_: boolean) => {},
	setPendingRecoveryCode: (_: string | null) => {},
	setDeviceLinks: (_: unknown[]) => {},
	setTrustedDevices: (_: unknown[]) => {},
	setError: (_: string | null) => {},
	startLink: vi.fn(),
	consumeLink: vi.fn(),
	rejectLink: vi.fn(),
	refreshDeviceLinks: vi.fn(),
	refreshTrustedDevices: vi.fn(),
	clearPendingRecoveryCode: vi.fn(),
	setup: vi.fn(),
	unlockWithRecoveryCode: vi.fn(),
	unlockFromDevice: vi.fn(),
	localLinkRequestIds: vi.fn(),
	initialDeviceLinks: [] as unknown[],
	initialTrustedDevices: [] as unknown[],
}));

vi.mock("./VaultProvider", () => ({
	useVault: () => {
		const [status, setStatus] = createSignal("locked");
		const [hasDevice, setHasDevice] = createSignal(false);
		const [pendingRecoveryCode, setPendingRecoveryCode] = createSignal<
			string | null
		>(null);
		const [deviceLinks, setDeviceLinks] = createSignal<unknown[]>(
			h.initialDeviceLinks,
		);
		const [trustedDevices, setTrustedDevices] = createSignal<unknown[]>(
			h.initialTrustedDevices,
		);
		const [error, setError] = createSignal<string | null>(null);
		h.setStatus = setStatus;
		h.setHasDevice = setHasDevice;
		h.setPendingRecoveryCode = setPendingRecoveryCode;
		h.setDeviceLinks = setDeviceLinks;
		h.setTrustedDevices = setTrustedDevices;
		h.setError = setError;
		return {
			status,
			hasDevice,
			pendingRecoveryCode,
			deviceLinks,
			trustedDevices,
			error,
			startLink: h.startLink,
			consumeLink: h.consumeLink,
			rejectLink: h.rejectLink,
			refreshDeviceLinks: h.refreshDeviceLinks,
			refreshTrustedDevices: h.refreshTrustedDevices,
			clearPendingRecoveryCode: h.clearPendingRecoveryCode,
			setup: h.setup,
			unlockWithRecoveryCode: h.unlockWithRecoveryCode,
			unlockFromDevice: h.unlockFromDevice,
		};
	},
}));

vi.mock("./vault", () => ({
	localLinkRequestIds: h.localLinkRequestIds,
}));

vi.mock("#/utils/download", () => ({
	downloadBlob: vi.fn(),
}));

vi.mock("./vaultGate.css", () => ({
	gate: "gate",
	card: "card",
	title: "title",
	quietText: "quietText",
	errorText: "errorText",
	body: "body",
	actions: "actions",
	recoveryCode: "recoveryCode",
	footer: "footer",
	waiting: "waiting",
	deviceList: "deviceList",
	deviceRow: "deviceRow",
	deviceMeta: "deviceMeta",
	deviceName: "deviceName",
	deviceHint: "deviceHint",
}));

const linkRow = (
	id: string,
	status: string,
	deviceLabel: string,
	targetDeviceId: string | null = "device-web",
) => ({
	id,
	device_label: deviceLabel,
	status,
	target_device_id: targetDeviceId,
	expires_at: new Date(Date.now() + 60_000).toISOString(),
	created_at: new Date().toISOString(),
});

const trustedDevice = (
	id: string,
	label: string,
	lastUsed = new Date().toISOString(),
) => ({
	id,
	device_label: label,
	status: "active",
	last_used_at: lastUsed,
	created_at: new Date().toISOString(),
});

beforeEach(() => {
	vi.clearAllMocks();
	h.initialDeviceLinks = [];
	h.initialTrustedDevices = [];
	h.localLinkRequestIds.mockReturnValue([]);
	h.startLink.mockResolvedValue({ requestId: "req-1" });
	h.consumeLink.mockResolvedValue({});
	h.rejectLink.mockResolvedValue(undefined);
	h.refreshDeviceLinks.mockResolvedValue(undefined);
	h.refreshTrustedDevices.mockImplementation(async () => {
		h.setTrustedDevices(h.initialTrustedDevices);
	});
	vi.stubGlobal("navigator", {
		userAgent:
			"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
		platform: "",
	});
});

afterEach(() => vi.unstubAllGlobals());

describe("VaultGate device linking", () => {
	it("auto-sends to the only trusted device and names that device", async () => {
		h.initialTrustedDevices = [
			trustedDevice("device-web", "OpenCadre on Linux"),
		];

		const view = render(() => <VaultGate onSignOut={() => {}} />);

		await waitFor(() =>
			expect(h.startLink).toHaveBeenCalledWith(
				"Chrome on Android",
				"device-web",
			),
		);
		expect(view.container.textContent).toContain(
			"Confirm your account on OpenCadre on Linux",
		);

		h.setDeviceLinks([
			linkRow("req-1", "pending", "Chrome on Android", "device-web"),
		]);
		await waitFor(() =>
			expect(view.container.textContent).toContain(
				"Waiting for approval on OpenCadre on Linux.",
			),
		);
	});

	it("shows a chooser with two trusted devices and does not auto-send", async () => {
		h.initialTrustedDevices = [
			trustedDevice("device-web", "OpenCadre on Linux"),
			trustedDevice("device-android", "Chrome on Android"),
		];

		const view = render(() => <VaultGate onSignOut={() => {}} />);

		await waitFor(() =>
			expect(view.container.textContent).toContain(
				"Choose a device to confirm your account",
			),
		);
		expect(view.container.textContent).toContain("OpenCadre on Linux");
		expect(view.container.textContent).toContain("Chrome on Android");
		expect(view.container.textContent).toContain("Last used");
		expect(h.startLink).not.toHaveBeenCalled();

		const useButtons = Array.from(view.container.querySelectorAll("wa-button"));
		const webButton = useButtons.find(
			(el) => el.textContent === "Use this device",
		);
		if (!webButton) throw new Error("device button missing");
		fireEvent.click(webButton);
		await waitFor(() =>
			expect(h.startLink).toHaveBeenCalledWith(
				"Chrome on Android",
				"device-web",
			),
		);
	});

	it("unlocks automatically when the link request becomes approved", async () => {
		h.initialTrustedDevices = [
			trustedDevice("device-web", "OpenCadre on Linux"),
		];
		render(() => <VaultGate onSignOut={() => {}} />);
		await waitFor(() => expect(h.startLink).toHaveBeenCalled());

		h.setDeviceLinks([
			linkRow("req-1", "approved", "Chrome on Android", "device-web"),
		]);

		await waitFor(() => expect(h.consumeLink).toHaveBeenCalledWith("req-1"));
	});

	it("adopts a pending request from this browser instead of sending a duplicate", async () => {
		h.initialDeviceLinks = [
			linkRow("req-1", "pending", "Chrome on Android", "device-web"),
		];
		h.initialTrustedDevices = [
			trustedDevice("device-web", "OpenCadre on Linux"),
		];
		h.localLinkRequestIds.mockReturnValue(["req-1"]);

		const view = render(() => <VaultGate onSignOut={() => {}} />);

		await waitFor(() =>
			expect(view.container.textContent).toContain(
				"Waiting for approval on OpenCadre on Linux.",
			),
		);
		expect(h.startLink).not.toHaveBeenCalled();
	});
});
