from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Literal

from sqlalchemy.orm import Session, joinedload, selectinload

from backend.app.models import Task, TimeEntry

Bucket = Literal["day", "week", "month"]

MAX_RANGE_DAYS = 10_000


def _bucket_start(d: date, bucket: Bucket) -> date:
    if bucket == "day":
        return d
    if bucket == "week":
        return d - timedelta(days=d.weekday())
    if bucket == "month":
        return d.replace(day=1)
    raise ValueError(f"Unknown bucket: {bucket}")


def _bucket_label(start: date, bucket: Bucket) -> str:
    if bucket == "day":
        return start.strftime("%b %d")
    if bucket == "week":
        return f"{start.strftime('%b %d')} – {(start + timedelta(days=6)).strftime('%b %d')}"
    if bucket == "month":
        return start.strftime("%b %Y")
    raise ValueError(f"Unknown bucket: {bucket}")


def _breakdown(rows, key_fn, label_fn, emoji_fn=lambda _row: None, color_fn=lambda _row: None) -> list[dict]:
    counts: dict = defaultdict(int)
    first_seen: dict = {}
    for row in rows:
        key = key_fn(row)
        counts[key] += 1
        first_seen.setdefault(key, row)
    items = [
        {
            "id": key if isinstance(key, int) else None,
            "label": label_fn(first_seen[key]),
            "emoji": emoji_fn(first_seen[key]),
            "color": color_fn(first_seen[key]),
            "count": count,
        }
        for key, count in counts.items()
    ]
    return sorted(items, key=lambda item: -item["count"])


def get_overview(db: Session, since: date | None, until: date, bucket: Bucket) -> dict:
    all_tasks = (
        db.query(Task)
        .options(
            joinedload(Task.type),
            joinedload(Task.priority),
            joinedload(Task.reporter),
            selectinload(Task.time_entries),
        )
        .all()
    )

    if since is None:
        created_dates = [t.created_at.date() for t in all_tasks]
        since = min(created_dates) if created_dates else until
    if since > until:
        since = until
    if (until - since).days > MAX_RANGE_DAYS:
        raise ValueError(f"Range too wide — pick {MAX_RANGE_DAYS} days or fewer")

    open_tasks = [t for t in all_tasks if t.closed_at is None]
    closed_in_range = [
        t for t in all_tasks if t.closed_at is not None and since <= t.closed_at.date() <= until
    ]

    span_days = (until - since).days + 1
    bucket_starts = sorted({_bucket_start(since + timedelta(days=i), bucket) for i in range(span_days)})

    closed_by_bucket: dict = defaultdict(int)
    for task in closed_in_range:
        closed_by_bucket[_bucket_start(task.closed_at.date(), bucket)] += 1

    entries: list[TimeEntry] = [e for t in all_tasks for e in t.time_entries]
    entries_in_range = [e for e in entries if since <= e.logged_date <= until]
    hours_by_bucket: dict = defaultdict(float)
    for entry in entries_in_range:
        hours_by_bucket[_bucket_start(entry.logged_date, bucket)] += entry.hours

    buckets = [
        {
            "label": _bucket_label(start, bucket),
            "period_start": start,
            "tasks_closed": closed_by_bucket.get(start, 0),
            "hours_logged": round(hours_by_bucket.get(start, 0.0), 2),
        }
        for start in bucket_starts
    ]

    close_durations_hours = [
        (task.closed_at - task.created_at).total_seconds() / 3600 for task in closed_in_range
    ]
    avg_close_hours = (
        round(sum(close_durations_hours) / len(close_durations_hours), 1) if close_durations_hours else None
    )
    avg_closed_per_bucket = round(len(closed_in_range) / len(bucket_starts), 2) if bucket_starts else 0.0

    by_type = _breakdown(
        all_tasks,
        lambda t: t.type_id,
        lambda t: t.type.name if t.type else "Unassigned",
        lambda t: t.type.emoji if t.type else None,
        lambda t: t.type.color if t.type else None,
    )
    by_priority = _breakdown(
        all_tasks,
        lambda t: t.priority_id,
        lambda t: t.priority.name,
        lambda t: t.priority.emoji,
        lambda t: t.priority.color,
    )
    by_reporter = _breakdown(
        all_tasks,
        lambda t: t.reporter_id,
        lambda t: t.reporter.name if t.reporter else "Unassigned",
    )[:8]

    return {
        "since": since,
        "until": until,
        "bucket": bucket,
        "open_tasks": len(open_tasks),
        "closed_tasks": len(closed_in_range),
        "total_tasks": len(all_tasks),
        "avg_close_hours": avg_close_hours,
        "avg_closed_per_bucket": avg_closed_per_bucket,
        "total_hours_logged": round(sum(e.hours for e in entries_in_range), 2),
        "buckets": buckets,
        "by_type": by_type,
        "by_priority": by_priority,
        "by_reporter": by_reporter,
    }
