// Regression tests for lib/auth/navigation.ts — the single source of truth
// for role-based nav visibility. These lock the contracts behind findings
// #1 (master tab-bar leak), #2 (financial read separation), and #3 (one
// role matrix for sidebar / mobile nav / tabs). Run: npm test.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  APPROVAL_THRESHOLD_READ_ROLES,
  COST_CATEGORY_READ_ROLES,
  CUSTOMER_NAV_ROLES,
  MASTER_DATA_ROLES,
  MASTER_TABS,
  canViewMasterData,
  masterSectionHeading,
  visibleMasterTabs,
} from "../lib/auth/navigation.ts"

describe("canViewMasterData", () => {
  it("denies Sales (the reported bug: Sales saw all 11 master tabs)", () => {
    assert.equal(canViewMasterData(["SALES"]), false)
  })

  it("denies Sales Manager and Operations (no Master Data menu for them)", () => {
    assert.equal(canViewMasterData(["SALES_MANAGER"]), false)
    assert.equal(canViewMasterData(["OPERATIONS"]), false)
  })

  it("allows Ops Manager, Finance, Admin, Management", () => {
    for (const role of ["OPERATIONS_MANAGER", "FINANCE", "ADMIN", "MANAGEMENT"]) {
      assert.equal(canViewMasterData([role]), true, role)
    }
  })

  it("is safe for empty/null/undefined input", () => {
    assert.equal(canViewMasterData([]), false)
    assert.equal(canViewMasterData(null), false)
    assert.equal(canViewMasterData(undefined), false)
  })
})

describe("visibleMasterTabs", () => {
  it("shows Sales only the Customer tab", () => {
    const tabs = visibleMasterTabs(["SALES"])
    assert.equal(tabs.length, 1)
    assert.equal(tabs[0].href, "/master/customers")
  })

  it("shows the full 11-tab inventory to master roles", () => {
    const tabs = visibleMasterTabs(["ADMIN"])
    assert.equal(tabs.length, 11)
    const hrefs = tabs.map((t) => t.href)
    assert.ok(hrefs.includes("/master/approval-thresholds"))
    assert.ok(hrefs.includes("/master/cost-categories"))
  })

  it("locks the master tab inventory (MASTER_TABS)", () => {
    assert.equal(MASTER_TABS.length, 11)
  })
})

describe("masterSectionHeading", () => {
  it("hides the 'Master Data' heading from Sales", () => {
    assert.equal(masterSectionHeading(["SALES"]), null)
  })

  it("keeps the heading for master roles", () => {
    assert.equal(masterSectionHeading(["OPERATIONS_MANAGER"]), "Master Data")
  })
})

describe("role-list contracts", () => {
  it("MASTER_DATA_ROLES matches the sidebar/mobile Master Data contract", () => {
    assert.deepEqual(MASTER_DATA_ROLES, [
      "OPERATIONS_MANAGER",
      "FINANCE",
      "ADMIN",
      "MANAGEMENT",
    ])
  })

  it("CUSTOMER_NAV_ROLES covers the sales team", () => {
    assert.ok(CUSTOMER_NAV_ROLES.includes("SALES"))
    assert.ok(CUSTOMER_NAV_ROLES.includes("SALES_MANAGER"))
  })

  it("COST_CATEGORY_READ_ROLES mirrors 0040 RLS (Ops in, Sales out)", () => {
    assert.ok(COST_CATEGORY_READ_ROLES.includes("OPERATIONS"))
    assert.ok(!COST_CATEGORY_READ_ROLES.includes("SALES"))
    assert.ok(!COST_CATEGORY_READ_ROLES.includes("SALES_MANAGER"))
  })

  it("APPROVAL_THRESHOLD_READ_ROLES mirrors 0040 RLS (finance circle only)", () => {
    assert.ok(!APPROVAL_THRESHOLD_READ_ROLES.includes("SALES"))
    assert.ok(!APPROVAL_THRESHOLD_READ_ROLES.includes("SALES_MANAGER"))
    assert.ok(!APPROVAL_THRESHOLD_READ_ROLES.includes("OPERATIONS"))
    assert.ok(APPROVAL_THRESHOLD_READ_ROLES.includes("FINANCE"))
  })
})
