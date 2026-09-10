import { describe, expect, it } from "vitest";
import {
	canCreatePages,
	canDeletePages,
	canDeleteWorkspace,
	canEditContent,
	canManageMembers,
	canModifyMember,
	canRenameWorkspace,
	isWorkspaceRole,
} from "./roles";

describe("isWorkspaceRole", () => {
	it("returns true for valid roles", () => {
		expect(isWorkspaceRole("owner")).toBe(true);
		expect(isWorkspaceRole("admin")).toBe(true);
		expect(isWorkspaceRole("member")).toBe(true);
		expect(isWorkspaceRole("guest")).toBe(true);
	});

	it("returns false for invalid roles", () => {
		expect(isWorkspaceRole("superadmin")).toBe(false);
		expect(isWorkspaceRole("")).toBe(false);
		expect(isWorkspaceRole(undefined)).toBe(false);
	});
});

describe("canEditContent", () => {
	it("allows owner, admin, member", () => {
		expect(canEditContent("owner")).toBe(true);
		expect(canEditContent("admin")).toBe(true);
		expect(canEditContent("member")).toBe(true);
	});

	it("denies guest", () => {
		expect(canEditContent("guest")).toBe(false);
	});
});

describe("canCreatePages", () => {
	it("allows owner, admin, member", () => {
		expect(canCreatePages("owner")).toBe(true);
		expect(canCreatePages("admin")).toBe(true);
		expect(canCreatePages("member")).toBe(true);
	});

	it("denies guest", () => {
		expect(canCreatePages("guest")).toBe(false);
	});
});

describe("canDeletePages", () => {
	it("allows owner and admin", () => {
		expect(canDeletePages("owner")).toBe(true);
		expect(canDeletePages("admin")).toBe(true);
	});

	it("denies member and guest", () => {
		expect(canDeletePages("member")).toBe(false);
		expect(canDeletePages("guest")).toBe(false);
	});
});

describe("canManageMembers", () => {
	it("allows owner and admin", () => {
		expect(canManageMembers("owner")).toBe(true);
		expect(canManageMembers("admin")).toBe(true);
	});

	it("denies member and guest", () => {
		expect(canManageMembers("member")).toBe(false);
		expect(canManageMembers("guest")).toBe(false);
	});
});

describe("canModifyMember", () => {
	it("allows admin to modify member and guest", () => {
		expect(canModifyMember("admin", "member")).toBe(true);
		expect(canModifyMember("admin", "guest")).toBe(true);
	});

	it("allows owner to modify admin, member, guest", () => {
		expect(canModifyMember("owner", "admin")).toBe(true);
		expect(canModifyMember("owner", "member")).toBe(true);
		expect(canModifyMember("owner", "guest")).toBe(true);
	});

	it("denies modifying owner", () => {
		expect(canModifyMember("admin", "owner")).toBe(false);
		expect(canModifyMember("owner", "owner")).toBe(false);
	});

	it("denies member and guest from modifying anyone", () => {
		expect(canModifyMember("member", "guest")).toBe(false);
		expect(canModifyMember("guest", "member")).toBe(false);
	});
});

describe("canRenameWorkspace", () => {
	it("allows only owner", () => {
		expect(canRenameWorkspace("owner")).toBe(true);
	});

	it("denies others", () => {
		expect(canRenameWorkspace("admin")).toBe(false);
		expect(canRenameWorkspace("member")).toBe(false);
		expect(canRenameWorkspace("guest")).toBe(false);
	});
});

describe("canDeleteWorkspace", () => {
	it("allows only owner", () => {
		expect(canDeleteWorkspace("owner")).toBe(true);
	});

	it("denies others", () => {
		expect(canDeleteWorkspace("admin")).toBe(false);
		expect(canDeleteWorkspace("member")).toBe(false);
		expect(canDeleteWorkspace("guest")).toBe(false);
	});
});
