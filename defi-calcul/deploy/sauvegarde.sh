#!/bin/sh
# Sauvegarde quotidienne de la base (garde 30 jours). À lancer par cron.
mkdir -p /var/backups/defi-calcul
sqlite3 /var/lib/defi-calcul/defi-calcul.db ".backup '/var/backups/defi-calcul/defi-calcul-$(date +%F).db'"
find /var/backups/defi-calcul -name '*.db' -mtime +30 -delete
