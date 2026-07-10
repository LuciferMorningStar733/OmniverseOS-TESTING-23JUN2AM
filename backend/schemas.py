"""
OmniverseOS — Structured AI Output Schemas
============================================
Pydantic models for every AI response that gets written to MongoDB.
These are the ONLY shapes Instructor is allowed to hand back — raw AI JSON
must never reach the database directly (see structured_ai.py).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

CORTEX_MEMORY_CATEGORIES = [
    "Personal", "Preferences", "Devices", "Vehicles", "Projects",
    "Work", "Contacts", "Locations", "Other",
]


class ExtractedMemoryItem(BaseModel):
    title: str = Field(..., max_length=60, description="5 words max")
    content: str = Field(..., min_length=1, max_length=500, description="one sentence fact")
    category: Literal[
        "Personal", "Preferences", "Devices", "Vehicles", "Projects",
        "Work", "Contacts", "Locations", "Other",
    ] = "Other"
    importance_score: float = Field(0.6, ge=0.0, le=1.0)


class ExtractedMemoryList(BaseModel):
    items: list[ExtractedMemoryItem] = Field(default_factory=list, max_length=5)


class SearchRerankResult(BaseModel):
    indices: list[int] = Field(
        default_factory=list,
        description="0-based candidate indices ordered most-relevant first",
    )
