#!/usr/bin/env node

const apiBase = process.env.API_URL ?? "http://127.0.0.1:7777";
const webBase = process.env.WEB_URL ?? "http://127.0.0.1:3000";
const adminBase = process.env.ADMIN_URL ?? "http://127.0.0.1:3001/admin.html";
const timeoutMs = Number(process.env.HEALTH_TIMEOUT_MS ?? 5000);

async function probe(name, url, validate) {
  const startedAt = performance.now();
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs)
    });
    const body = await response.text();
    const valid = response.ok && validate(body);
    return {
      name,
      ok: valid,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      ...(valid ? {} : { error: "unexpected response" })
    };
  } catch (error) {
    return {
      name,
      ok: false,
      durationMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

const results = await Promise.all([
  probe("api", `${apiBase}/health`, (body) => {
    try {
      return JSON.parse(body).status === "ok";
    } catch {
      return false;
    }
  }),
  probe("web", webBase, (body) => body.includes('id="root"')),
  probe("admin", adminBase, (body) => body.includes('id="root"'))
]);

for (const result of results) {
  const marker = result.ok ? "OK" : "FAIL";
  const detail = result.ok
    ? `${result.status} in ${result.durationMs}ms`
    : result.error;
  console.log(`${marker.padEnd(4)} ${result.name.padEnd(6)} ${detail}`);
}

if (results.some((result) => !result.ok)) {
  process.exitCode = 1;
}
