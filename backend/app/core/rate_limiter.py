import time
from collections import defaultdict
from fastapi import Request, HTTPException, status
from typing import Dict, List


class InMemoryRateLimiter:
    """Lightweight sliding window rate limiter."""
    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        self.window_seconds = 60
        self.history: Dict[str, List[float]] = defaultdict(list)

    def check(self, request: Request, custom_limit: int = None):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        limit = custom_limit or self.requests_per_minute

        # Prune older than window
        cutoff = now - self.window_seconds
        valid_timestamps = [t for t in self.history[client_ip] if t > cutoff]
        self.history[client_ip] = valid_timestamps

        if len(valid_timestamps) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down and try again shortly.",
                headers={"Retry-After": "60"}
            )
        self.history[client_ip].append(now)


auth_limiter = InMemoryRateLimiter(requests_per_minute=20)
scan_limiter = InMemoryRateLimiter(requests_per_minute=30)
api_limiter = InMemoryRateLimiter(requests_per_minute=120)
