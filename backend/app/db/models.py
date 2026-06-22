"""ORM models for Day Pilot's persistent state.

Column types are kept dialect-neutral (String / DateTime(timezone=True) /
Boolean / JSON) so the same models work on both PostgreSQL (production) and
SQLite (development & tests).
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Event(Base):
    """A locally created calendar event (source="local")."""

    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source: Mapped[str] = mapped_column(String, nullable=False, default="local")
    assigned_to: Mapped[Optional[str]] = mapped_column(String, nullable=True)


class Todo(Base):
    """A locally created task (source="local")."""

    __tablename__ = "todos"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    due: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    priority: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String, nullable=False, default="local")
    recurrence: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(String, nullable=True)


class ShoppingItem(Base):
    __tablename__ = "shopping_items"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False, default="Sonstiges")
    quantity: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    checked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class FamilyMember(Base):
    __tablename__ = "family_members"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[list] = mapped_column(JSON, nullable=False, default=list)


class UserSetting(Base):
    """Key/value store backing the user-settings overlay."""

    __tablename__ = "user_settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[object] = mapped_column(JSON, nullable=True)


class NotificationDedup(Base):
    """Single-row marker recording the date of the last daily push."""

    __tablename__ = "notification_dedup"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    date: Mapped[Optional[str]] = mapped_column(String, nullable=True)
