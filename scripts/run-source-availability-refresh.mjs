import { runSourceAvailabilityRefresh } from "../server/sourceRefresh.ts";

const result = await runSourceAvailabilityRefresh();
console.log(JSON.stringify({ status: result.status, reachable: result.reachable, total: result.total, sources: result.sources.map(source => ({ name: source.name, reachable: source.reachable, status: source.status })) }));
process.exit(0);
