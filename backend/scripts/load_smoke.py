import argparse
import json
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor


CLASSIFY_BODY = {
    "array_id": "A1",
    "efficiency_pct": 65.0,
    "irradiance_kwh_m2": 3.5,
    "cloud_cover_pct": 15.0,
    "humidity_pct": 75.0,
    "rainfall_mm": 0.0,
    "soiling_loss_pct": 32.0,
}


def request(method: str, url: str, api_key: str | None, body: dict | None = None) -> tuple[int, float]:
    headers = {"User-Agent": "solarguard-load-smoke/1.0"}
    data = None
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    start = time.perf_counter()
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            response.read()
            status = response.status
    except urllib.error.HTTPError as exc:
        exc.read()
        status = exc.code
    return status, (time.perf_counter() - start) * 1000


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, round((pct / 100) * (len(ordered) - 1)))
    return ordered[index]


def main() -> int:
    parser = argparse.ArgumentParser(description="Authenticated backend load smoke test.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--requests", type=int, default=60)
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--max-p95-ms", type=float, default=750.0)
    args = parser.parse_args()
    if args.requests <= 0:
        parser.error("--requests must be greater than zero")
    if args.concurrency <= 0:
        parser.error("--concurrency must be greater than zero")

    endpoints = [
        ("GET", f"{args.base_url}/", None, {200}),
        ("GET", f"{args.base_url}/api/market/hormuz", None, {200}),
        ("POST", f"{args.base_url}/api/sensor/classify", CLASSIFY_BODY, {200, 429}),
    ]

    jobs = [
        endpoints[index % len(endpoints)]
        for index in range(args.requests)
    ]
    with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        results = list(
            executor.map(
                lambda item: (*item, request(item[0], item[1], args.api_key, item[2])),
                jobs,
            )
        )

    statuses = [result[4][0] for result in results]
    latencies = [result[4][1] for result in results]
    unexpected = [
        (method, url, status)
        for method, url, body, expected, (status, latency) in results
        if status not in expected
    ]
    p95 = percentile(latencies, 95)

    print(f"requests={len(results)} concurrency={args.concurrency}")
    print(f"status_counts={{{', '.join(f'{status}: {statuses.count(status)}' for status in sorted(set(statuses)))}}}")
    print(f"latency_ms min={min(latencies):.2f} mean={statistics.mean(latencies):.2f} p95={p95:.2f} max={max(latencies):.2f}")

    if unexpected:
        print(f"unexpected_statuses={unexpected[:5]}")
        return 1
    if p95 > args.max_p95_ms:
        print(f"p95 latency {p95:.2f}ms exceeded {args.max_p95_ms:.2f}ms")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
