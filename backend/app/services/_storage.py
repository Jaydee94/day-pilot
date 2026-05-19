import fcntl
import json
import os
import tempfile
from contextlib import contextmanager
from typing import Any


@contextmanager
def file_lock(path: str):
    """POSIX advisory lock on a sidecar .lock file so the data file itself stays unmodified during lock acquisition."""
    lock_path = path + ".lock"
    os.makedirs(os.path.dirname(os.path.abspath(lock_path)) or ".", exist_ok=True)
    fd = os.open(lock_path, os.O_RDWR | os.O_CREAT, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)


def atomic_write_json(path: str, data: Any, *, indent: int = 2, mode: int | None = None) -> None:
    """Write JSON to *path* atomically via tempfile + os.replace."""
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    dirpath = os.path.dirname(os.path.abspath(path)) or "."
    fd, tmp_path = tempfile.mkstemp(prefix=".tmp-", dir=dirpath)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=indent, ensure_ascii=False)
            fh.flush()
            os.fsync(fh.fileno())
        if mode is not None:
            os.chmod(tmp_path, mode)
        os.replace(tmp_path, path)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise
