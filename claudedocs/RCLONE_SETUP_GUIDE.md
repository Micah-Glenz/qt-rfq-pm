# Rclone + Google Drive Setup Guide

Complete guide to configure rclone with Google Drive for automated database backups.

## What You'll Get

- ✅ Automatic hourly backups to Google Drive
- ✅ 24 hourly snapshots + 7 daily + 4 weekly backups
- ✅ Offsite storage protects against local failures
- ✅ No manual intervention required

## Prerequisites

- Google account (Gmail or Google Workspace)
- Active internet connection for initial setup

## Step 1: Install Rclone

### On Linux (Ubuntu/Debian/WSL):
```bash
curl https://rclone.org/install.sh | sudo bash
```

### Verify Installation:
```bash
rclone version
```

Expected output:
```
rclone v1.65.0
- os/version: linux...
```

## Step 2: Configure Google Drive

Run the configuration wizard:
```bash
rclone config
```

You'll see this menu:
```
No remotes found - make a new one
n) New remote
s) Set configuration password
q) Quit config
n/s/q> n
```

### Follow These Steps:

**1. Enter remote name:**
```
name> gdrive
```

**2. Choose storage type:**
```
Type of storage to configure.
Choose a number from below, or type in your own value.
  1 / Alias for an existing remote
  2 / Amazon Drive
  ...
 18 / Google Drive
  ...
Storage> 18
```

**3. Google Application Client ID (leave blank):**
```
client_id> [PRESS ENTER]
```

**4. Google Application Client Secret (leave blank):**
```
client_secret> [PRESS ENTER]
```

**5. Choose scope (important!):**
```
Choose the number for your scope:
  1 / Full access to all files (except for .hidden files)
  2 / Read-only access to file metadata
  3 / Read-only access to file metadata and file contents
  4 / Read-write access to file metadata only
  5 / Read-write access to file metadata and file contents
  6 / Read-write access to file metadata and file contents in application-specific folder
scope> 1
```
**Select option 1** for full access to create backups anywhere.

**6. Root folder ID (leave blank):**
```
root_folder_id> [PRESS ENTER]
```

**7. Service Account Credentials (leave blank):**
```
service_account_file> [PRESS ENTER]
```

**8. Advanced config (use default):**
```
Edit advanced config? (y/n)
y/n> n
```

**9. Remote configuration:**
```
Remote config
Use auto config?
 * Say Y if not sure
 * Say N if you are working on a remote or headless machine
y/n> Y
```

**10. Browser Authentication:**
- A browser window will open automatically
- Sign in to your Google account if prompted
- Click "Allow" to grant rclone permission to access Google Drive

**11. Success message:**
```
Configure this as a team drive?
y/n> n

--------------------
[gdrive]
client_id =
client_secret =
scope = drive
root_folder_id =
service_account_file =
token = {"access_token":"...","token_type":"Bearer","refresh_token":"...","expiry":"..."}
--------------------
y) Yes this is OK
e) Edit this remote
d) Delete this remote
y/e/d> y
```

**12. Quit configuration:**
```
Current remotes:

Name                 Type
====                 ====
gdrive               drive

e) Edit existing remote
n) New remote
d) Delete remote
r) Rename remote
c) Copy remote
s) Set configuration password
q) Quit config
e/n/d/r/c/s/q> q
```

## Step 3: Test Rclone Connection

Verify rclone can access Google Drive:
```bash
rclone ls gdrive:
```

This should list your Google Drive root files/folders.

## Step 4: Test Backup Script

Manually run the backup script to test everything:
```bash
cd /home/micah/qt_rfq_pm
python3 scripts/backup_db.py
```

Expected output:
```
2024-12-31 14:23:45 - INFO - SQLite Backup System starting...
============================================================
2024-12-31 14:23:45 - INFO - Starting backup cycle: 2024-12-31 14:23:45
============================================================
2024-12-31 14:23:45 - INFO - Creating backup: quote_tracker_hourly_20241231_142345.db
2024-12-31 14:23:46 - INFO - ✓ Backup completed: quote_tracker_hourly_20241231_142345.db
2024-12-31 14:23:46 - INFO - Total backup size: 0.25 MB
2024-12-31 14:23:46 - INFO - Backup cycle completed successfully
============================================================
2024-12-31 14:23:46 - INFO - Syncing to Google Drive...
============================================================
2024-12-31 14:23:46 - INFO - Running: rclone sync /home/micah/qt_rfq_pm/backups gdrive:QtRFQM_Backups --progress --transfers 4 --create-empty-src-dirs
Transferred:        256 KiB / 256 KiB, 100%, 512 KiB/s, ETA 0s
Checks:                 2 / 2, 100%
Transferred:            1 / 1, 100%
Elapsed time:         0.5s
2024-12-31 14:23:47 - INFO - ✓ Google Drive sync completed successfully
2024-12-31 14:23:47 - INFO - Backup workflow completed
```

## Step 5: Verify Google Drive Backups

1. Open Google Drive in your browser: https://drive.google.com
2. Look for a folder named `QtRFQM_Backups`
3. Inside you should see:
   - `hourly/` folder with backup files
   - `daily/` folder (empty initially)
   - `weekly/` folder (empty initially)

## Step 6: Setup Automated Backups (Optional)

Use cron to run backups automatically every hour:

```bash
# Edit crontab
crontab -e

# Add this line to run backup every hour at minute 0
0 * * * * /usr/bin/python3 /home/micah/qt_rfq_pm/scripts/backup_db.py
```

This will:
- Run backup every hour at :00 minutes
- Create hourly snapshots (keeps 24)
- Create daily snapshots at midnight (keeps 7)
- Create weekly snapshots on Sunday (keeps 4)
- Sync everything to Google Drive automatically

## Troubleshooting

### "rclone: command not found"
Install rclone first:
```bash
curl https://rclone.org/install.sh | sudo bash
```

### "Authentication failed"
- Make sure you selected scope option 1 (full access)
- Try running `rclone config` again and delete/recreate the remote
- Check that browser pop-up wasn't blocked

### "Google Drive sync failed"
- Check internet connection
- Verify rclone config: `rclone config show gdrive`
- Test manually: `rclone ls gdrive:`

### "Permission denied"
Make script executable:
```bash
chmod +x /home/micah/qt_rfq_pm/scripts/backup_db.py
```

### Cron job not running
Check cron logs:
```bash
# View cron logs
grep CRON /var/log/syslog

# Or test manually first
python3 /home/micah/qt_rfq_pm/scripts/backup_db.py
```

## Backup Retention Policy

The system automatically maintains:
- **Hourly**: Last 24 backups (1 per hour)
- **Daily**: Last 7 backups (1 per day at midnight)
- **Weekly**: Last 4 backups (1 per week on Sunday)

Old backups are automatically deleted to save space.

## Restoring from Backup

### From local backups:
```bash
# Stop the application first
# Then restore from backup
cp /home/micah/qt_rfq_pm/backups/hourly/quote_tracker_hourly_20241231_1400.db \
   /home/micah/qt_rfq_pm/app/quote_tracker.db
```

### From Google Drive:
```bash
# Download specific backup
rclone copy gdrive:QtRFQM_Backups/hourly/quote_tracker_hourly_20241231_1400.db \
   /home/micah/qt_rfq_pm/app/quote_tracker.db
```

## Security Notes

- Rclone tokens are stored in `~/.config/rclone/rclone.conf`
- This file should be backed up securely
- Tokens have read/write access to your Google Drive
- Keep your rclone config file private

## Next Steps

Once configured and tested:
1. ✅ Backups run automatically every hour
2. ✅ Copies synced to Google Drive
3. ✅ Old backups cleaned up automatically
4. ✅ Your database is safe from local failures

For questions or issues, check the backup log:
```bash
tail -f /home/micah/qt_rfq_pm/logs/backup.log
```
