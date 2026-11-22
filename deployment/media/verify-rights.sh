#!/usr/bin/env bash
# FamilyFlix By DemureGram - Playback Rights & Legal Clearance Enforcement
set -euo pipefail

CONTENT_ID="${1:-}"

if [[ -z "${CONTENT_ID}" ]]; then
    echo "Usage: $0 <content_id>"
    exit 1
fi

echo "=== Verifying Rights for Content ID: ${CONTENT_ID} ==="

QUERY="SELECT r.review_status, r.license_type, m.playback_status 
       FROM media_rights r 
       JOIN movies m ON m.id = r.movie_id 
       WHERE m.id = '${CONTENT_ID}' LIMIT 1;"

RESULT=$(sudo -u postgres psql -d familyflix -t -A -F "|" -c "${QUERY}" 2>/dev/null || echo "")

if [[ -z "${RESULT}" ]]; then
    echo "BLOCKED: No media rights record found in database. Public streaming disabled."
    exit 1
fi

IFS="|" read -r REVIEW_STATUS LICENSE_TYPE PLAYBACK_STATUS <<< "${RESULT}"

echo "Review Status: ${REVIEW_STATUS}"
echo "License Type: ${LICENSE_TYPE}"
echo "Playback Status: ${PLAYBACK_STATUS}"

if [[ "${REVIEW_STATUS}" == "cleared" || "${REVIEW_STATUS}" == "verified" ]] && [[ "${PLAYBACK_STATUS}" == "playable" || "${PLAYBACK_STATUS}" == "published" ]]; then
    echo "APPROVED: Content is cleared for public distribution and streaming."
    exit 0
else
    echo "DENIED: Content has not achieved verified public domain or CC clearance. Streaming restricted to private administrative inspection."
    exit 2
fi
