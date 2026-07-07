const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

// in-memory 한도: 단일 Node 프로세스 기준이며 재시작 시 초기화된다.
// 다중 인스턴스(serverless) 배포에서는 인스턴스별로 따로 계산되므로
// 실제 상용 전에는 Redis 등 공유 저장소로 이관해야 한다.
type RateLimitBucket = {
  minuteWindowStart: number;
  minuteCount: number;
  dayWindowStart: number;
  dayCount: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; scope: "minute" | "day"; retryAfterSeconds: number };

const buckets = new Map<string, RateLimitBucket>();

function readPositiveIntEnv(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  return Number.isInteger(raw) && raw > 0 ? raw : fallback;
}

export function getAiRateLimits() {
  return {
    perMinute: readPositiveIntEnv("AI_RATE_LIMIT_PER_MINUTE", 10),
    perDay: readPositiveIntEnv("AI_RATE_LIMIT_PER_DAY", 200)
  };
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function pruneStaleBuckets(now: number) {
  if (buckets.size < 5000) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (now - bucket.dayWindowStart >= DAY_MS) {
      buckets.delete(key);
    }
  }
}

export function checkAiRateLimit(request: Request, route: string): RateLimitResult {
  const { perMinute, perDay } = getAiRateLimits();
  const now = Date.now();
  const key = `${route}:${getClientIp(request)}`;

  pruneStaleBuckets(now);

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { minuteWindowStart: now, minuteCount: 0, dayWindowStart: now, dayCount: 0 };
    buckets.set(key, bucket);
  }

  if (now - bucket.minuteWindowStart >= MINUTE_MS) {
    bucket.minuteWindowStart = now;
    bucket.minuteCount = 0;
  }

  if (now - bucket.dayWindowStart >= DAY_MS) {
    bucket.dayWindowStart = now;
    bucket.dayCount = 0;
  }

  if (bucket.dayCount >= perDay) {
    return {
      allowed: false,
      scope: "day",
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.dayWindowStart + DAY_MS - now) / 1000))
    };
  }

  if (bucket.minuteCount >= perMinute) {
    return {
      allowed: false,
      scope: "minute",
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.minuteWindowStart + MINUTE_MS - now) / 1000))
    };
  }

  bucket.minuteCount += 1;
  bucket.dayCount += 1;
  return { allowed: true };
}

export function getRateLimitMessage(scope: "minute" | "day") {
  return scope === "day"
    ? "오늘 사용할 수 있는 생성 요청 한도를 모두 사용했어요. 내일 다시 시도해 주세요."
    : "생성 요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.";
}

export function resetAiRateLimitBuckets() {
  buckets.clear();
}
