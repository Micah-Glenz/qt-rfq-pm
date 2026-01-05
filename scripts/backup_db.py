#!/usr/bin/env python3
"""
SQLite Database Backup Script with Google Drive Cloud Storage

Features:
- SQLite online backup API (safe during database use)
- Rotational backup system (hourly/daily/weekly)
- Google Drive sync via rclone
- Automatic cleanup of old backups
"""

import os
import sqlite3
import subprocess
from datetime import datetime
from pathlib import Path
import logging

# Configuration
DB_PATH = Path(__file__).parent.parent / "app" / "quote_tracker.db"
BACKUP_ROOT = Path(__file__).parent.parent / "backups"
LOG_PATH = Path(__file__).parent.parent / "logs" / "backup.log"

# Backup retention settings
HOURLY_BACKUPS_TO_KEEP = 24  # Last 24 hours
DAILY_BACKUPS_TO_KEEP = 7    # Last 7 days
WEEKLY_BACKUPS_TO_KEEP = 4   # Last 4 weeks

# Google Drive (configure with rclone)
RCLONE_REMOTE = "gdrive"  # rclone remote name for Google Drive
CLOUD_BACKUP_PATH = "QtRFQM_Backups"  # Folder in Google Drive

# Setup logging
LOG_PATH.parent.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_PATH),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class BackupManager:
    """Manages SQLite database backups with rotation and cloud sync"""

    def __init__(self, db_path, backup_root):
        self.db_path = Path(db_path)
        self.backup_root = Path(backup_root)
        self.hourly_dir = self.backup_root / "hourly"
        self.daily_dir = self.backup_root / "daily"
        self.weekly_dir = self.backup_root / "weekly"

        # Create backup directories
        for directory in [self.hourly_dir, self.daily_dir, self.weekly_dir]:
            directory.mkdir(parents=True, exist_ok=True)

    def create_backup(self, backup_path):
        """
        Create atomic backup using SQLite online backup API
        Safe to run while database is in use
        """
        logger.info(f"Creating backup: {backup_path.name}")

        try:
            # Connect to source database
            source = sqlite3.connect(str(self.db_path))
            backup = sqlite3.connect(str(backup_path))

            # SQLite online backup - atomic and safe during writes
            source.backup(backup)

            backup.close()
            source.close()

            logger.info(f"✓ Backup completed: {backup_path.name}")
            return True

        except Exception as e:
            logger.error(f"✗ Backup failed: {e}")
            # Clean up failed backup
            if backup_path.exists():
                backup_path.unlink()
            return False

    def rotate_backups(self, directory, keep_count):
        """Remove oldest backups, keeping only the most recent N"""
        backups = sorted(directory.glob("*.db"), key=os.path.getmtime, reverse=True)

        for old_backup in backups[keep_count:]:
            try:
                old_backup.unlink()
                logger.info(f"Removed old backup: {old_backup.name}")
            except Exception as e:
                logger.error(f"Failed to remove {old_backup.name}: {e}")

    def run_backup_cycle(self):
        """Execute complete backup cycle with rotation"""
        now = datetime.now()
        timestamp = now.strftime("%Y%m%d_%H%M%S")

        logger.info("=" * 60)
        logger.info(f"Starting backup cycle: {now.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 60)

        # Verify database exists
        if not self.db_path.exists():
            logger.error(f"Database not found: {self.db_path}")
            return False

        # Create hourly backup
        hourly_backup = self.hourly_dir / f"quote_tracker_hourly_{timestamp}.db"
        if self.create_backup(hourly_backup):
            self.rotate_backups(self.hourly_dir, HOURLY_BACKUPS_TO_KEEP)

        # Create daily backup (at midnight)
        if now.hour == 0:
            daily_backup = self.daily_dir / f"quote_tracker_daily_{now.strftime('%Y%m%d')}.db"
            if self.create_backup(daily_backup):
                self.rotate_backups(self.daily_dir, DAILY_BACKUPS_TO_KEEP)

        # Create weekly backup (on Sunday at midnight)
        if now.hour == 0 and now.weekday() == 6:  # Sunday
            week_num = now.isocalendar()[1]
            weekly_backup = self.weekly_dir / f"quote_tracker_week{now.year}_{week_num}.db"
            if self.create_backup(weekly_backup):
                self.rotate_backups(self.weekly_dir, WEEKLY_BACKUPS_TO_KEEP)

        # Calculate backup size
        backup_size = sum(
            f.stat().st_size
            for f in self.backup_root.rglob("*.db")
        ) / (1024 * 1024)  # Convert to MB

        logger.info(f"Total backup size: {backup_size:.2f} MB")
        logger.info("Backup cycle completed successfully")

        return True


def sync_to_google_drive(backup_root, remote_name, cloud_path):
    """
    Sync backups to Google Drive using rclone
    """
    logger.info("=" * 60)
    logger.info("Syncing to Google Drive...")
    logger.info("=" * 60)

    try:
        # Check if rclone is installed
        result = subprocess.run(
            ["rclone", "version"],
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode != 0:
            logger.warning("rclone not found. Skipping Google Drive sync.")
            logger.info("Install rclone: https://rclone.org/install/")
            logger.info("Or configure rclone: rclone config")
            return False

        # Sync local backups to Google Drive
        cmd = [
            "rclone",
            "sync",
            str(backup_root),
            f"{remote_name}:{cloud_path}",
            "--progress",
            "--transfers", "4",
            "--create-empty-src-dirs"
        ]

        logger.info(f"Running: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )

        logger.info("✓ Google Drive sync completed successfully")
        logger.info(result.stdout)

        return True

    except subprocess.CalledProcessError as e:
        logger.error(f"✗ Google Drive sync failed: {e}")
        logger.error(f"stderr: {e.stderr}")
        return False
    except Exception as e:
        logger.error(f"✗ Google Drive sync error: {e}")
        return False


def main():
    """Main backup workflow"""
    logger.info("SQLite Backup System starting...")

    # Run backup cycle
    manager = BackupManager(DB_PATH, BACKUP_ROOT)
    success = manager.run_backup_cycle()

    if not success:
        logger.error("Backup cycle failed")
        return 1

    # Sync to Google Drive (if rclone configured)
    sync_to_google_drive(BACKUP_ROOT, RCLONE_REMOTE, CLOUD_BACKUP_PATH)

    logger.info("Backup workflow completed")
    return 0


if __name__ == "__main__":
    exit(main())
