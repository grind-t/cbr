import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCurrentKeyRate } from "./getCurrentKeyRate.ts";

describe("getCurrentKeyRate (e2e)", () => {
	it("returns a positive number from CBR API", async () => {
		const result = await getCurrentKeyRate();
		assert.ok(Number.isFinite(result));
		assert.ok(result > 0);
	});
});
