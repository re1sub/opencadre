import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeviceLinkApproval from "./DeviceLinkApproval";

const h = vi.hoisted(() => ({
	initialLinks: [] as unknown[],
	approveLink: vi.fn(),
	rejectLink: vi.fn(),
	deviceId: () => "device-web",
}));

vi.mock("./VaultProvider", () => ({
	useVault: () => {
		const [deviceLinks] = createSignal<unknown[]>(h.initialLinks);
		return {
			deviceLinks,
			deviceId: h.deviceId,
			approveLink: h.approveLink,
			rejectLink: h.rejectLink,
		};
	},
}));

vi.mock("./deviceLinkApproval.css", () => ({
	row: "row",
	meta: "meta",
	heading: "heading",
	detail: "detail",
	actions: "actions",
	errorText: "errorText",
}));

const linkRow = (
	id: string,
	status: string,
	targetDeviceId: string | null = "device-web",
) => ({
	id,
	device_label: "Chrome on Android",
	status,
	target_device_id: targetDeviceId,
	expires_at: new Date(Date.now() + 60_000).toISOString(),
	created_at: new Date().toISOString(),
});

beforeEach(() => {
	vi.clearAllMocks();
	h.initialLinks = [];
	h.approveLink.mockResolvedValue(undefined);
	h.rejectLink.mockResolvedValue(undefined);
});

describe("DeviceLinkApproval", () => {
	it("prompts the trusted device to confirm a pending device", () => {
		h.initialLinks = [linkRow("req-1", "pending")];

		const view = render(() => <DeviceLinkApproval></DeviceLinkApproval>);

		expect(view.container.textContent).toContain("Confirm it's you");
		expect(view.container.textContent).toContain("Chrome on Android");
	});

	it("approves and rejects pending requests", async () => {
		h.initialLinks = [linkRow("req-1", "pending")];

		const view = render(() => <DeviceLinkApproval></DeviceLinkApproval>);
		const buttons = Array.from(view.container.querySelectorAll("wa-button"));
		const approve = buttons.find((el) => el.textContent === "Approve");
		const reject = buttons.find((el) => el.textContent === "Reject");
		if (!approve || !reject) throw new Error("approval buttons missing");

		fireEvent.click(approve);
		await waitFor(() => expect(h.approveLink).toHaveBeenCalledWith("req-1"));

		fireEvent.click(reject);
		await waitFor(() => expect(h.rejectLink).toHaveBeenCalledWith("req-1"));
	});

	it("ignores requests aimed at another device", () => {
		h.initialLinks = [linkRow("req-2", "pending", "device-other")];

		const view = render(() => <DeviceLinkApproval></DeviceLinkApproval>);

		expect(view.container.textContent).toBe("");
	});

	it("hides once the request is no longer pending", () => {
		h.initialLinks = [linkRow("req-1", "approved")];

		const view = render(() => <DeviceLinkApproval></DeviceLinkApproval>);

		expect(view.container.textContent).toBe("");
	});
});
