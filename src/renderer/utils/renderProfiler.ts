export type RenderPhase = "mount" | "update" | "nested-update";

export interface RenderProfileSample {
  id: string;
  phase: RenderPhase;
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  recordedAt: number;
}

export interface RenderProfileSummary {
  id: string;
  commits: number;
  totalActualMs: number;
  avgActualMs: number;
  p95ActualMs: number;
  maxActualMs: number;
}

const MAX_SAMPLES = 5000;
const samples: RenderProfileSample[] = [];

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

export function clearRenderProfileSamples(): void {
  samples.length = 0;
}

export function getRenderProfileSamples(): RenderProfileSample[] {
  return [...samples];
}

export function getRenderProfileSummary(): RenderProfileSummary[] {
  const byId = new Map<string, number[]>();
  for (const sample of samples) {
    const list = byId.get(sample.id) ?? [];
    list.push(sample.actualDuration);
    byId.set(sample.id, list);
  }

  return [...byId.entries()]
    .map(([id, durations]) => {
      const totalActualMs = durations.reduce((sum, n) => sum + n, 0);
      const commits = durations.length;
      return {
        id,
        commits,
        totalActualMs: Number(totalActualMs.toFixed(3)),
        avgActualMs: Number((totalActualMs / commits).toFixed(3)),
        p95ActualMs: Number(percentile(durations, 95).toFixed(3)),
        maxActualMs: Number(Math.max(...durations).toFixed(3)),
      };
    })
    .sort((a, b) => b.totalActualMs - a.totalActualMs);
}

export function recordRenderProfileSample(sample: Omit<RenderProfileSample, "recordedAt">): void {
  samples.push({ ...sample, recordedAt: Date.now() });
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
}

export function initRenderProfilerApi(enabled: boolean): void {
  if (!enabled) return;

  window.__DBA_RENDER_PROFILER__ = {
    clear: clearRenderProfileSamples,
    samples: getRenderProfileSamples,
    summary: getRenderProfileSummary,
  };

  // Surface one-time usage guidance in devtools for manual profiling runs.
  console.info(
    "[render-profiler] enabled. Use window.__DBA_RENDER_PROFILER__.summary() and .samples() in devtools.",
  );
}
