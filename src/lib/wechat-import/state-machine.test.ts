import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "./state-machine";

describe("WeChat import state machine", () => {
  it("allows the main workflow, rewrite retry, and failure retry paths", () => {
    for (const [from, to] of [["FETCH_QUEUED", "FETCHING"], ["FETCHING", "FETCHED"], ["FETCHED", "REWRITE_QUEUED"], ["REWRITE_QUEUED", "REWRITING"], ["REWRITING", "REWRITTEN"], ["REWRITTEN", "REWRITE_QUEUED"], ["REWRITTEN", "TRANSFER_QUEUED"], ["TRANSFER_QUEUED", "TRANSFERRING"], ["TRANSFERRING", "READY"], ["FAILED", "FETCH_QUEUED"]] as const) {
      expect(canTransition(from, to)).toBe(true);
    }
  });

  it("rejects terminal states and illegal shortcuts", () => {
    expect(() => assertTransition("FETCHED", "READY")).toThrow(/不允許/);
    expect(() => assertTransition("READY", "FETCH_QUEUED")).toThrow(/不允許/);
    expect(() => assertTransition("EXPIRED", "FETCH_QUEUED")).toThrow(/不允許/);
  });
});
