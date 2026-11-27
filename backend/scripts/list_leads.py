"""CLI script to inspect waitlist, contact, and business enquiry entries."""

import argparse
import csv
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import text

# Allow running from repo root or backend/
_BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND_DIR))
load_dotenv(_BACKEND_DIR / ".env")

from db import get_session  # noqa: E402

_QUERIES = {
    "waitlist": {
        "cols": ["id", "name", "email", "whatsapp", "event_type", "created_at"],
        "table": "waitlist",
    },
    "contact": {
        "cols": ["id", "name", "email", "reason", "subject", "message", "created_at"],
        "table": "contact_messages",
    },
    "business": {
        "cols": [
            "id",
            "business_name",
            "contact_name",
            "email",
            "whatsapp",
            "business_type",
            "volume_per_month",
            "message",
            "created_at",
        ],
        "table": "business_enquiries",
    },
}


def main() -> None:
    parser = argparse.ArgumentParser(description="List saved lead entries from Postgres.")
    parser.add_argument(
        "--type",
        choices=["waitlist", "contact", "business"],
        default="waitlist",
        help="Which table to query (default: waitlist)",
    )
    parser.add_argument(
        "--since",
        type=str,
        default=None,
        help="Filter entries created on or after YYYY-MM-DD",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Maximum rows to return (default: 50)",
    )
    parser.add_argument(
        "--csv",
        action="store_true",
        help="Output as CSV",
    )
    args = parser.parse_args()

    since_dt = None
    if args.since:
        since_dt = datetime.fromisoformat(args.since)

    spec = _QUERIES[args.type]
    cols_sql = ", ".join(spec["cols"])
    where_sql = "WHERE created_at >= :since " if since_dt else ""
    sql = f"SELECT {cols_sql} FROM {spec['table']} {where_sql}ORDER BY created_at DESC LIMIT :limit"

    params: dict = {"limit": args.limit}
    if since_dt:
        params["since"] = since_dt

    with get_session() as db:
        rows = db.execute(text(sql), params).fetchall()

    if args.csv:
        writer = csv.writer(sys.stdout)
        writer.writerow(spec["cols"])
        for row in rows:
            writer.writerow(list(row))
        return

    if not rows:
        print(f"No {args.type} entries found.")
        return

    for row in rows:
        record = dict(zip(spec["cols"], row))
        print("-" * 60)
        for k, v in record.items():
            print(f"{k}: {v}")


if __name__ == "__main__":
    main()
