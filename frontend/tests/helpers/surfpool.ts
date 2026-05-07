import { type ChildProcess, spawn } from "node:child_process";

export interface SurfpoolHandle {
  proc: ChildProcess;
  url: string;
  stop: () => Promise<void>;
}

export async function startSurfpool(port = 8899): Promise<SurfpoolHandle> {
  const proc = spawn(
    "surfpool",
    ["start", "--fork", "mainnet", "--port", String(port)],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Surfpool start timeout (10s)"));
    }, 10_000);
    proc.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      if (text.includes("listening") || text.includes("started")) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
  return {
    proc,
    url: `http://localhost:${port}`,
    stop: async () => {
      proc.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 200));
      if (!proc.killed) proc.kill("SIGKILL");
    },
  };
}
