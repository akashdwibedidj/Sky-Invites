"""
Local admin CLI for granting or refunding user credits in the append-only ledger.
Usage:
  python backend/scripts/admin_credits.py --email user@example.com --type image --amount 5 --reason admin_grant --ref ticket-123 --note "Support grant"
"""

import argparse
import sys
from pathlib import Path

# Allow running from repo root or backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from credits import get_balances, record_ledger_entry
from db import User, get_session


def main() -> int:
    parser = argparse.ArgumentParser(description="Grant or refund user credits (append-only ledger).")
    parser.add_argument("--email", required=True, help="User email address")
    parser.add_argument("--type", required=True, choices=["image", "video"], help="Credit type")
    parser.add_argument("--amount", required=True, type=int, help="Credit amount (positive or negative, non-zero)")
    parser.add_argument("--reason", required=True, choices=["admin_grant", "refund", "purchase", "free_grant"], help="Ledger reason")
    parser.add_argument("--ref", required=True, help="Unique idempotency reference ID")
    parser.add_argument("--note", default="", help="Optional note recorded in ledger")
    args = parser.parse_args()

    if args.amount == 0:
        print("Error: --amount must be non-zero.", file=sys.stderr)
        return 1

    with get_session() as session:
        user = session.query(User).filter(User.email == args.email.strip().lower()).first()
        if not user:
            print(f"Error: User not found for email {args.email}", file=sys.stderr)
            return 1

        inserted = record_ledger_entry(
            session,
            user_id=user.id,
            credit_type=args.type,
            amount=args.amount,
            reason=args.reason,
            reference_id=args.ref.strip(),
            note=args.note.strip() or f"Admin CLI ({args.reason})",
        )
        if not inserted:
            print(f"Skipped: reference_id '{args.ref}' already exists (idempotent).")
        else:
            print(f"Recorded {args.amount:+d} {args.type} credit(s) for {user.email} (ref={args.ref}).")

        balances = get_balances(session, user.id)
        print(f"Current balance -> image: {balances['image']}, video: {balances['video']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
