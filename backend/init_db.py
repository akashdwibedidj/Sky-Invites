"""
init_db.py
One-time script to create PostgreSQL tables (invitations and scenes).
"""

import sys
from pathlib import Path

# Make backend/ importable
sys.path.insert(0, str(Path(__file__).resolve().parent))

from db import create_tables


def main() -> None:
    print("Creating tables in PostgreSQL...")
    create_tables()
    print("Tables created successfully.")


if __name__ == "__main__":
    main()
