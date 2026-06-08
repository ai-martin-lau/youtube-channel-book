#!/usr/bin/env bash
# 批量下载一批 YouTube 视频的英文字幕(json3)。
# 用法: fetch_subs.sh <urls.txt> <out_dir>
#   urls.txt: 每行一个 watch URL 或纯 video id
#
# 核心坑(2026 验证): YouTube 现在对字幕强制要 PO Token，默认/web/mweb 客户端
# 都会因缺 PO Token 而拿不到字幕。唯一稳定免 PO Token 的是 player_client=android_vr。
# 这是整个 skill 能跑通的关键。
set -uo pipefail

URLS="${1:?need urls file}"
OUT="${2:?need out dir}"
mkdir -p "$OUT"

# 找一个 >=3.10 的 python 来跑 yt-dlp zipapp；优先已下好的 /tmp/yt-dlp.pyz
PY=""
for p in python3.13 python3.12 python3.11 python3.10 python3; do
  v=$("$p" -c 'import sys;print(sys.version_info[:2]>=(3,10))' 2>/dev/null)
  [ "$v" = "True" ] && PY="$p" && break
done
[ -z "$PY" ] && { echo "需要 Python>=3.10 来运行 yt-dlp"; exit 1; }

YTDLP="${YTDLP:-/tmp/yt-dlp.pyz}"
if [ ! -f "$YTDLP" ]; then
  echo "下载 yt-dlp zipapp (GitHub release 走直连)..."
  env -u http_proxy -u https_proxy -u all_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY \
    curl -L --retry 5 --retry-all-errors -o "$YTDLP" \
    https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp || { echo "yt-dlp 下载失败"; exit 1; }
fi

# 归一化: 纯 id -> 完整 URL
TMPU="$(mktemp)"
sed -E 's#^([A-Za-z0-9_-]{11})$#https://www.youtube.com/watch?v=\1#' "$URLS" > "$TMPU"

"$PY" "$YTDLP" \
  -a "$TMPU" \
  --skip-download --write-auto-subs --write-subs \
  --sub-langs "en-orig,en,en-US" --sub-format json3 \
  --extractor-args "youtube:player_client=android_vr" \
  --sleep-requests 1 -i --no-warnings \
  -o "$OUT/%(id)s.%(ext)s"

rm -f "$TMPU"
echo "完成: $(ls "$OUT"/*.json3 2>/dev/null | sed -E 's#.*/([^.]+)\..*#\1#' | sort -u | wc -l) 个视频有字幕"
