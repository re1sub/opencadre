import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
	from: vi.fn(),
	delete: vi.fn(),
	eq: vi.fn(),
	neq: vi.fn(),
	select: vi.fn(),
}));

vi.mock("#/utils/supabase", () => ({ supabase: { from: h.from } }));

import { forgetDevice } from "./vault";

const makeBuilder = (result: { data: unknown; error: unknown }) => {
	const builder: Record<string, unknown> = {};
	builder.delete = () => {
		h.delete();
		return builder;
	};
	builder.eq = (column: string, value: unknown) => {
		h.eq(column, value);
		return builder;
	};
	builder.neq = (column: string, value: unknown) => {
		h.neq(column, value);
		return builder;
	};
	builder.select = (columns: string) => {
		h.select(columns);
		return builder;
	};
	// biome-ignore lint/suspicious/noThenProperty: Supabase query builders are awaited as thenables.
	Object.defineProperty(builder, "then", {
		value: (resolve: (value: typeof result) => unknown) =>
			Promise.resolve(result).then(resolve),
	});
	return builder;
};

describe("forgetDevice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		h.from.mockReturnValue(
			makeBuilder({ data: [{ id: "device-2" }], error: null }),
		);
	});

	it("deletes only the selected device and keeps the current one", async () => {
		await forgetDevice("device-2", "device-1");

		expect(h.from).toHaveBeenCalledWith("user_devices");
		expect(h.delete).toHaveBeenCalled();
		expect(h.eq).toHaveBeenCalledWith("id", "device-2");
		expect(h.neq).toHaveBeenCalledWith("id", "device-1");
		expect(h.select).toHaveBeenCalledWith("id");
	});

	it("refuses the current device before touching the database", async () => {
		await expect(forgetDevice("device-1", "device-1")).rejects.toThrow(
			"You cannot untrust this device",
		);
		expect(h.from).not.toHaveBeenCalled();
	});

	it("surfaces a database error instead of silently succeeding", async () => {
		h.from.mockReturnValue(
			makeBuilder({ data: null, error: { message: "offline" } }),
		);

		await expect(forgetDevice("device-2", "device-1")).rejects.toMatchObject({
			message: "offline",
		});
	});

	it("throws when no row was deleted", async () => {
		h.from.mockReturnValue(makeBuilder({ data: [], error: null }));

		await expect(forgetDevice("device-2", "device-1")).rejects.toThrow(
			"That device is no longer trusted",
		);
	});
});
