import 'dotenv/config';
import cluster from 'node:cluster';
import os from 'node:os';

const parsedWorkers = Number.parseInt(process.env.CLUSTER_WORKERS ?? '', 10);
const WORKER_COUNT =
  Number.isFinite(parsedWorkers) && parsedWorkers > 0
    ? Math.min(parsedWorkers, 16)
    : Math.max(2, Math.min(os.availableParallelism(), 4));

if (cluster.isPrimary) {
  console.log(
    `IdeaBridge cluster primary ${process.pid} starting ${WORKER_COUNT} load-balanced HTTP workers on port 3000...`
  );

  for (let i = 0; i < WORKER_COUNT; i++) {
    cluster.fork({ INSTANCE_ID: `cluster-worker-${i + 1}` });
  }

  let terminating = false;

  cluster.on('exit', (worker, code, signal) => {
    if (terminating) return;
    console.warn(
      `Worker ${worker.process.pid} exited (code=${code}, signal=${signal}). Spawning replacement...`
    );
    cluster.fork({ INSTANCE_ID: `cluster-worker-restarted-${Date.now()}` });
  });

  const shutdownCluster = (signal: string) => {
    if (terminating) return;
    terminating = true;
    console.log(`Primary ${process.pid} received ${signal}; shutting down workers cleanly...`);
    for (const worker of Object.values(cluster.workers ?? {})) {
      worker?.kill(signal);
    }
    setTimeout(() => process.exit(0), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdownCluster('SIGTERM'));
  process.on('SIGINT', () => shutdownCluster('SIGINT'));
} else {
  await import('../server.ts');
}
