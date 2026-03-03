import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCurrentKeyRate } from "./getCurrentKeyRate.ts";

describe("getCurrentKeyRate", () => {
	it("returns a positive number", async () => {
		const result = await getCurrentKeyRate();
		assert.ok(Number.isFinite(result));
		assert.ok(result > 0);
	});
});
