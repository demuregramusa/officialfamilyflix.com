#!/usr/bin/env bash
# FamilyFlix By DemureGram - Self-Hosted Multi-Bitrate HLS Transcoding Pipeline
set -euo pipefail

INPUT_FILE="${1:-}"
CONTENT_ID="${2:-}"
OUTPUT_BASE_DIR="${3:-/var/media/familyflix/hls}"

if [[ -z "${INPUT_FILE}" || -z "${CONTENT_ID}" ]]; then
    echo "Usage: $0 <input_file> <content_id> [output_base_dir]"
    exit 1
fi

DEST_DIR="${OUTPUT_BASE_DIR}/${CONTENT_ID}"
mkdir -p "${DEST_DIR}"

echo "=== Transcoding ${INPUT_FILE} -> ${DEST_DIR} ==="

ffmpeg -i "${INPUT_FILE}" \
  -filter_complex \
  "[0:v]split=4[v1,v2,v3,v4]; \
   [v1]scale=w=1920:h=1080[v1out]; \
   [v2]scale=w=1280:h=720[v2out]; \
   [v3]scale=w=854:h=480[v3out]; \
   [v4]scale=w=640:h=360[v4out]" \
  -map "[v1out]" -c:v:0 libx264 -b:v:0 4500k -maxrate:v:0 4800k -bufsize:v:0 9000k -preset medium -g 48 -sc_threshold 0 \
  -map "[v2out]" -c:v:1 libx264 -b:v:1 2500k -maxrate:v:1 2700k -bufsize:v:1 5000k -preset medium -g 48 -sc_threshold 0 \
  -map "[v3out]" -c:v:2 libx264 -b:v:2 1200k -maxrate:v:2 1300k -bufsize:v:2 2400k -preset medium -g 48 -sc_threshold 0 \
  -map "[v4out]" -c:v:3 libx264 -b:v:3 600k  -maxrate:v:3 650k  -bufsize:v:3 1200k -preset medium -g 48 -sc_threshold 0 \
  -map a:0 -c:a:0 aac -b:a:0 128k -ac 2 \
  -map a:0 -c:a:1 aac -b:a:1 128k -ac 2 \
  -map a:0 -c:a:2 aac -b:a:2 96k  -ac 2 \
  -map a:0 -c:a:3 aac -b:a:3 64k  -ac 2 \
  -f hls \
  -hls_time 6 \
  -hls_playlist_type vod \
  -hls_flags independent_segments \
  -hls_segment_type mpegts \
  -hls_segment_filename "${DEST_DIR}/stream_%v_data%04d.ts" \
  -master_pl_name "master.m3u8" \
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3" \
  "${DEST_DIR}/stream_%v.m3u8"

echo "=== Transcode Complete. Master playlist generated at: ${DEST_DIR}/master.m3u8 ==="
