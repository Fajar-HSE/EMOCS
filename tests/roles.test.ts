// Regression tests for lib/auth/roles.ts (pure helpers).
// Run: npm test (node:test, no extra dependencies).
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { hasRole, hasAnyRole } from "../lib/auth/roles.ts"

describe("hasRole", () => {
  it("matches a held role", () => {
    assert.equal(hasRole(["SALES"], "SALES"), true)
  })

  it("rejects an unheld role", () => {
    assert.equal(hasRole(["SALES"], "ADMIN"), false)
  })

  it("is safe for null/undefined/empty input", () => {
    assert.equal(hasRole(null, "SALES"), false)
    assert.equal(hasRole(undefined, "SALES"), false)
    assert.equal(hasRole([], "SALES"), false)
  })
})

describe("hasAnyRole", () => {
  it("matches when any allowed role is held", () => {
    assert.equal(hasAnyRole(["SALES"], ["ADMIN", "SALES"]), true)
  })

  it("rejects when none is held", () => {
    assert.equal(hasAnyRole(["SALES"], ["ADMIN", "FINANCE"]), false)
  })

  it("is safe for null/undefined input", () => {
    assert.equal(hasAnyRole(null, ["ADMIN"]), false)
    assert.equal(hasAnyRole(undefined, ["ADMIN"]), false)
  })
})
