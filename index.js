import os from 'node:os';
import { exec } from 'node:child_process';

/** Current rounded CPU usage percent, computed from a CPU-time delta. */
function sampleCpu() {
  const cores = os.cpus();
  let idle = 0;
  let total = 0;
  for (const core of cores) {
    idle += core.times.idle;
    total += core.times.user + core.times.nice + core.times.sys + core.times.idle + core.times.irq;
  }
  const now = { idle, total };
  let pct = 0;
  if (lastCpu) {
    const dIdle = idle - lastCpu.idle;
    const dTotal = total - lastCpu.total;
    if (dTotal > 0) pct = (1 - dIdle / dTotal) * 100;
    pct = Math.max(0, Math.min(100, pct));
  }
  lastCpu = now;
  return Math.round(pct);
}

/** Current rounded memory usage percent. */
function sampleMem() {
  const total = os.totalmem();
  const free = os.freemem();
  if (total <= 0) return 0;
  return Math.round(((total - free) / total) * 100);
}

function sampleGpu() {
  exec(
    'nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits',
    { timeout: 1500 },
    (error, stdout) => {
      try {
        if (!error && stdout) {
          const n = Number.parseFloat(String(stdout).trim());
          lastGpu = Number.isFinite(n)
            ? Math.max(0, Math.min(100, Math.round(n)))
            : null;
        } else {
          lastGpu = null;
        }
      } catch {
        lastGpu = null;
      }
    },
  );
}

let lastCpu = null;
let lastGpu = null;

export const inject = ['connection'];

export function apply(ctx) {
  // Keep a cached GPU sample so every Web request is cheap.
  ctx.effect(() => {
    sampleGpu();
    const timer = setInterval(sampleGpu, 2000);
    return () => clearInterval(timer);
  });

  // Serve live stats to the browser client.
  ctx.effect(() =>
    ctx.connection.fetch.register({
      path: '/api/system-monitor',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () =>
        new Response(
          JSON.stringify({ cpu: sampleCpu(), gpu: lastGpu, mem: sampleMem() }),
          {
            headers: {
              'content-type': 'application/json',
              'cache-control': 'no-store',
            },
          },
        ),
    }),
  );
}
