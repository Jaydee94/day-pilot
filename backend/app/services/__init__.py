"""Service package exports."""

# Ensure `app.services.scheduler` is resolvable for tests that patch it.
from app.services import scheduler  # noqa: F401
