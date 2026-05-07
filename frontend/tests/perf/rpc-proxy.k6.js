import { check } from "k6";
import http from "k6/http";

const BASE_URL = __ENV.E2E_BASE_URL || "http://localhost:3000";

export const options = {
  scenarios: {
    burst: {
      executor: "constant-vus",
      vus: Number(__ENV.K6_VUS || 30),
      duration: __ENV.K6_DURATION || "60s",
    },
  },
  thresholds: {
    "http_req_duration{method:getLatestBlockhash}": ["p(95)<400"],
    "http_req_duration{method:sendTransaction}": ["p(95)<800"],
    http_req_failed: ["rate<0.02"],
  },
};

export default function () {
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: __VU,
    method: "getLatestBlockhash",
  });
  const res = http.post(`${BASE_URL}/api/rpc`, payload, {
    headers: { "content-type": "application/json" },
    tags: { method: "getLatestBlockhash" },
  });
  check(res, {
    "status 200": (r) => r.status === 200,
    "body has jsonrpc": (r) =>
      typeof r.body === "string" && r.body.includes("jsonrpc"),
  });
}
