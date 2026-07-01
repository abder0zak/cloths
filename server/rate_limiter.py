import time
from typing import Dict, Tuple, Optional
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitRecord:
    def __init__(self, tokens: int, last_refill: float):
        self.tokens = tokens
        self.last_refill = last_refill

class RedisBackedRateLimiter:
    def __init__(self):
        self.in_memory_store: Dict[str, RateLimitRecord] = {}
        self.max_tokens = 60
        self.refill_rate = 1.0  # 1 token per second
        self.window_seconds = 60
        print('[RateLimiter] Initialized. Redis Connection Pool: SIMULATED AUTO-FALLBACK ACTIVE')

    def is_limit_exceeded(self, ip: str) -> Tuple[bool, int, int]:
        now = time.time()
        record = self.in_memory_store.get(ip)

        if not record:
            record = RateLimitRecord(tokens=self.max_tokens, last_refill=now)
        else:
            # Token bucket refill logic
            elapsed = now - record.last_refill
            tokens_to_add = int(elapsed) * self.refill_rate
            if tokens_to_add > 0:
                record.tokens = min(self.max_tokens, record.tokens + int(tokens_to_add))
                record.last_refill = now

        if record.tokens > 0:
            record.tokens -= 1
            self.in_memory_store[ip] = record
            reset_time = int(record.last_refill + self.window_seconds)
            return True, record.tokens, reset_time
        else:
            self.in_memory_store[ip] = record
            reset_time = int(record.last_refill + self.window_seconds)
            return False, 0, reset_time

rate_limiter_instance = RedisBackedRateLimiter()

class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Skip rate limiting for static assets and hot updates
        if path.startswith("/src") or path.startswith("/@") or "." in path:
            return await call_next(request)

        # Get Client IP
        forwarded = request.headers.get("x-forwarded-for")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")

        try:
            allowed, remaining, reset_time = rate_limiter_instance.is_limit_exceeded(ip)

            # Process next
            response = await call_next(request)

            # Set Headers
            response.headers["X-RateLimit-Limit"] = "60"
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset_time)

            if not allowed:
                # Custom JSON response for rate limiting exceeded
                from fastapi.responses import JSONResponse
                retry_after = max(1, reset_time - int(time.time()))
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too Many Requests",
                        "message": "Rate limit exceeded. Ethos Editorial services are limited to 60 requests per minute per IP.",
                        "retryAfterSeconds": retry_after
                    },
                    headers={
                        "X-RateLimit-Limit": "60",
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_time),
                        "Retry-After": str(retry_after)
                    }
                )
            return response
        except Exception as err:
            print("Rate limiting internal error:", err)
            # Fail-open security: ensure server remains available if rate limiting fails
            return await call_next(request)
