import { check, sleep } from "k6";
import http from "k6/http";

const BASE_URL = __ENV.E2E_BASE_URL || "http://localhost:3000";
const PROGRAM_ID =
  __ENV.CLOAK_PROGRAM_ID || "Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h";

export const options = {
  vus: Number(__ENV.K6_VUS || 5),
  iterations: Number(__ENV.K6_ITERATIONS || 20),
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: __VU,
    method: "getSignaturesForAddress",
    params: [PROGRAM_ID, { limit: 200 }],
  });
  const res = http.post(`${BASE_URL}/api/rpc`, body, {
    headers: { "content-type": "application/json" },
  });
  check(res, {
    "status 200": (r) => r.status === 200,
  });
  sleep(1);
}
