#!/usr/bin/env python3
"""
scripts/claim_invitations.py <email>

Assigns all orphaned invitations (user_id IS NULL) to the user with the given email.
Run after creating your account via the app to adopt test invitations.

Usage:
    python backend/scripts/claim_invitations.py you@example.com
"""

import sys
from pathlib import Path

# Make backend/ importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db import Invitation, User, get_session, create_tables


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python claim_invitations.py <email>")
        sys.exit(1)

    email = sys.argv[1].strip().lower()
    create_tables()

    with get_session() as session:
        user = session.query(User).filter(User.email == email).first()
        if not user:
            print(f"No user found with email: {email}")
            sys.exit(1)

        orphans = (
            session.query(Invitation)
            .filter(Invitation.user_id.is_(None))
            .all()
        )

        if not orphans:
            print("No orphaned invitations found.")
            return

        for inv in orphans:
            inv.user_id = user.id

        print(f"Assigned {len(orphans)} invitation(s) to {email}")


if __name__ == "__main__":
    main()
