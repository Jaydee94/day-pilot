"""Declarative base for all ORM models."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Common base class for every Day Pilot ORM model."""
