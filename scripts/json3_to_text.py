#!/usr/bin/env python3
"""把 subs/*.json3 字幕转成每个视频一份纯文本 txt。
用法: python3 json3_to_text.py <subs_dir> <txt_out_dir>
同一视频有多语言文件时优先级: en > en-orig > en-US。
去掉时间轴、合并空白，少于 200 字符的丢弃(多为空字幕)。
"""
import json, os, re, glob, sys

src = sys.argv[1] if len(sys.argv) > 1 else "subs"
out = sys.argv[2] if len(sys.argv) > 2 else "txt"
os.makedirs(out, exist_ok=True)

ids = {}
for f in glob.glob(os.path.join(src, "*.json3")):
    b = os.path.basename(f)
    m = re.match(r"(.+?)\.(en(?:-orig|-US)?)\.json3$", b)
    if not m:
        continue
    vid, lang = m.group(1), m.group(2)
    ids.setdefault(vid, {})[lang] = f

pref = ["en", "en-orig", "en-US"]
written = 0
for vid, langs in ids.items():
    f = next((langs[l] for l in pref if l in langs), list(langs.values())[0])
    try:
        j = json.load(open(f))
    except Exception:
        continue
    evs = [e for e in j.get("events", []) if "segs" in e]
    txt = " ".join("".join(s.get("utf8", "") for s in e["segs"]) for e in evs)
    txt = re.sub(r"\s+", " ", txt).strip()
    if len(txt) < 200:
        continue
    open(os.path.join(out, vid + ".txt"), "w").write(txt)
    written += 1

total = sum(os.path.getsize(os.path.join(out, x)) for x in os.listdir(out) if x.endswith(".txt"))
print(f"{written} transcripts -> {out}/  (total {total} chars)")
