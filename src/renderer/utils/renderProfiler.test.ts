import { describe, it, expect, beforeEach } from "vitest";
import {
  clearRenderProfileSamples,
  getRenderProfileSummary,
  recordRenderProfileSample,
} from "./renderProfiler";

describe("renderProfiler", () => {
  beforeEach(() => {
    clearRenderProfileSamples();
  });

  it("aggregates summaries by component id", () => {
    recordRenderProfileSample({
      id: "AppRoot",
      phase: "mount",
      actualDuration: 10,
      baseDuration: 10,
      startTime: 1,
      commitTime: 2,
    });
    recordRenderProfileSample({
      id: "AppRoot",
      phase: "update",
      actualDuration: 5,
      baseDuration: 7,
      startTime: 3,
      commitTime: 4,
    });
    recordRenderProfileSample({
      id: "QueryView",
      phase: "mount",
      actualDuration: 2,
      baseDuration: 2,
      startTime: 5,
      commitTime: 6,
    });

    const summary = getRenderProfileSummary();

    expect(summary[0].id).toBe("AppRoot");
    expect(summary[0].commits).toBe(2);
    expect(summary[0].totalActualMs).toBe(15);
    expect(summary[0].avgActualMs).toBe(7.5);

    expect(summary[1].id).toBe("QueryView");
    expect(summary[1].commits).toBe(1);
    expect(summary[1].totalActualMs).toBe(2);
  });
});
