"""
The Vault — Automated SQLite Backup Script.

Uses Python's sqlite3.backup() (the SQLite Online Backup API) to create a
consistent snapshot of the production database even while the app is running.

Usage:
    python backup.py                         # manual backup
    python backup.py --db vault.db           # specify database path
    python backup.py --keep 30               # keep last 30 backups

Scheduling (cron / Task Scheduler):
    0 2 * * * cd /path/to/backend && python backup.py --keep 30

The script is idempotent: running it multiple times in the same minute simply
overwrites the same timestamped file.
"""

import os
import sys
import sqlite3
import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path

# ── Configuration ────────────────────────────────────────────────────────────
DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "instance", "vault.db")
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [BACKUP] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)


def create_backup(db_path: str, backup_dir: str, keep: int = 30) -> str | None:
    """
    Create a timestamped backup of the SQLite database.

    Args:
        db_path:    Absolute path to the source .db file.
        backup_dir: Directory where backup snapshots are stored.
        keep:       Number of recent backups to retain (oldest are purged).

    Returns:
        Path to the backup file on success, None on failure.
    """
    # ── Validate source ──────────────────────────────────────────────────────
    if not os.path.exists(db_path):
        logger.error("Source database not found: %s", db_path)
        return None

    # ── Create backup directory ──────────────────────────────────────────────
    os.makedirs(backup_dir, exist_ok=True)

    # ── Generate timestamped filename ────────────────────────────────────────
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"vault_backup_{timestamp}.db"
    backup_path = os.path.join(backup_dir, backup_filename)

    # ── Perform online backup ────────────────────────────────────────────────
    try:
        logger.info("Starting backup: %s → %s", db_path, backup_path)

        source_conn = sqlite3.connect(db_path)
        dest_conn = sqlite3.connect(backup_path)

        # sqlite3.backup() uses the SQLite Online Backup API under the hood.
        # pages=0 means copy all pages in a single step; for very large DBs
        # you could use pages=100 + a progress callback.
        source_conn.backup(dest_conn, pages=0)

        dest_conn.close()
        source_conn.close()

        backup_size = os.path.getsize(backup_path)
        logger.info(
            "Backup complete: %s (%.2f MB)",
            backup_filename,
            backup_size / (1024 * 1024),
        )

    except Exception as exc:
        logger.error("Backup failed: %s", exc)
        # Clean up partial backup
        if os.path.exists(backup_path):
            os.remove(backup_path)
        return None

    # ── Prune old backups ────────────────────────────────────────────────────
    _prune_old_backups(backup_dir, keep)

    return backup_path


def _prune_old_backups(backup_dir: str, keep: int) -> None:
    """Remove the oldest backups, keeping only the *keep* most recent."""
    backups = sorted(
        Path(backup_dir).glob("vault_backup_*.db"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for old_backup in backups[keep:]:
        logger.info("Pruning old backup: %s", old_backup.name)
        old_backup.unlink()


def verify_backup(backup_path: str) -> bool:
    """Run a quick integrity check on the backup database."""
    try:
        conn = sqlite3.connect(backup_path)
        cursor = conn.execute("PRAGMA integrity_check;")
        result = cursor.fetchone()[0]
        conn.close()

        if result == "ok":
            logger.info("Integrity check PASSED: %s", backup_path)
            return True
        else:
            logger.error("Integrity check FAILED: %s — %s", backup_path, result)
            return False
    except Exception as exc:
        logger.error("Integrity check error: %s", exc)
        return False


# ── CLI ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="The Vault — SQLite online backup utility"
    )
    parser.add_argument(
        "--db",
        default=DEFAULT_DB_PATH,
        help="Path to the source SQLite database (default: instance/vault.db)",
    )
    parser.add_argument(
        "--dir",
        default=BACKUP_DIR,
        help="Directory to store backups (default: backups/)",
    )
    parser.add_argument(
        "--keep",
        type=int,
        default=30,
        help="Number of recent backups to retain (default: 30)",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Run an integrity check after the backup completes",
    )
    args = parser.parse_args()

    backup_path = create_backup(args.db, args.dir, args.keep)
    if backup_path is None:
        sys.exit(1)

    if args.verify:
        if not verify_backup(backup_path):
            sys.exit(1)

    logger.info("All done.")


if __name__ == "__main__":
    main()
