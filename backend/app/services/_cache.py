"""Optional Redis cache backend.

When ``REDIS_URL`` is configured a shared Redis instance is used as a key/value
cache (currently for the weather forecast); otherwise callers fall back to an
in-process cache. All Redis errors are swallowed and surfaced as a cache miss
so a flaky/absent Redis never breaks a request.
"""
import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

_client = None
_initialised = False


def get_redis():
    """Return a connected Redis client, or None when Redis is not configured."""
    global _client, _initialised
    if _initialised:
        return _client
    _initialised = True
    if not settings.REDIS_URL:
        _client = None
        return None
    try:
        import redis  # imported lazily so the dependency is optional at runtime

        _client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        _client.ping()
        logger.info("Redis cache backend connected")
    except Exception as exc:
        logger.warning("Redis unavailable (%s); falling back to in-process cache", exc)
        _client = None
    return _client


def cache_get(key: str) -> Optional[str]:
    client = get_redis()
    if client is None:
        return None
    try:
        return client.get(key)
    except Exception as exc:
        logger.warning("Redis GET failed for %s: %s", key, exc)
        return None


def cache_set(key: str, value: str) -> bool:
    """Store *value* under *key*. Returns True if it was written to Redis."""
    client = get_redis()
    if client is None:
        return False
    try:
        client.set(key, value)
        return True
    except Exception as exc:
        logger.warning("Redis SET failed for %s: %s", key, exc)
        return False
