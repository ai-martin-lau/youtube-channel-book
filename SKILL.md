---
name: youtube-channel-book
description: >
  输入一个 YouTube 账号(频道名/@handle/链接)，自动爬取该频道全部视频的字幕，
  提炼整个频道的精华，输出成一本可供学习的「小书」(结构化 Markdown，含章节、
  核心框架、可执行清单、金句)。当用户说「把某个 YouTube 频道总结成一本书/小册子」
  「爬取某频道所有字幕做总结」「把某 up 主/创作者的视频精华整理出来」
  「summarize this YouTube channel into a book」时使用。
  也适用于只给一个频道名/@handle 并说「读一遍/总结一下这个频道」。
metadata:
  author: martin
  version: "1.0"
  license: MIT
---

# youtube-channel-book

把一个 YouTube 频道的**全部长视频字幕**爬下来，蒸馏成一本**可供学习的小书**。

整条流水线已在真实环境(2026)踩通，关键的反爬坑都已固化进脚本，照着做即可。

## 成功标准

产出一份 `BOOK.md`：像一本小册子，有**前言 → 分主题章节 → 每章含此频道的核心论点/框架/步骤/金句 → 行动清单 → 一页速查**。读者读完这本书 ≈ 看完整个频道。

## 前置依赖

- **web-access skill**：用它的 CDP Proxy(默认 `http://localhost:3456`)抓频道视频清单。
  先按 web-access 指引跑一遍 `check-deps.mjs` 确保 Proxy 就绪。
- **Python ≥ 3.10**：跑 yt-dlp。系统自带的 `python3` 若是 3.9，换 `python3.11`/`python3.12`。
- **yt-dlp**：脚本会自动下 zipapp 到 `/tmp/yt-dlp.pyz`(GitHub release，走直连)。

## 流水线(5 步)

设工作目录 `WORK=<某个输出目录>`，下面命令里的 `SKILL` 指本 skill 根目录。

### ① 解析频道 + 抓全部视频清单

YouTube 新版网格**会虚拟化**(DOM 里只保留约 30 个卡片)，必须边滚动边累加，否则只拿到 30 个。脚本已处理：

```bash
node "$SKILL/scripts/list_videos.mjs" "@某handle 或 频道URL 或 频道名" "$WORK/videos.tsv"
```

- 输出 `videos.tsv`：每行 `videoId<TAB>标题`。
- **默认抓全量** = `/videos`(长视频) + `/shorts`(短视频)。用户说"全部/全集/所有视频"
  时**必须含 Shorts**，不要自作主张排除（教训：曾默默砍掉 Shorts 被用户纠正）。
  Shorts 页同法滚动累加，选择器 `a[href*="/shorts/"]`，id 用 `/shorts/<id>` 提取；
  下载时 watch URL 用 `https://www.youtube.com/shorts/<id>` 或 `watch?v=<id>` 均可。
  只有用户明确说"只要长视频"时才跳过 Shorts。
- 若只给了频道名(非 @handle)：先用 web-access 搜一下定位到 `@handle` 再传入。

### ② 批量下字幕(关键：android_vr 客户端)

```bash
cut -f1 "$WORK/videos.tsv" > "$WORK/ids.txt"
bash "$SKILL/scripts/fetch_subs.sh" "$WORK/ids.txt" "$WORK/subs"
```

**为什么是 android_vr**：2026 年 YouTube 对字幕强制 PO Token，`web/mweb/tv` 客户端都会
报 "subtitles require a PO Token" 而拿不到；浏览器内直接 fetch timedtext 返回空；
get_transcript API 报 FAILED_PRECONDITION。**唯一稳定免 PO Token 的是
`--extractor-args "youtube:player_client=android_vr"`** —— 已写死在 fetch_subs.sh 里。

- 视频多时(>100)耗时较长(每个视频约 3-5s)，用 `run_in_background` 跑，轮询
  `ls subs/*.json3 | …| sort -u | wc -l` 看进度。
- 个别视频无字幕会被 `-i` 跳过，正常。

### ③ json3 → 纯文本

```bash
python3 "$SKILL/scripts/json3_to_text.py" "$WORK/subs" "$WORK/txt"
```

每个视频得到一份 `txt/<videoId>.txt`(已去时间轴、合并空白、多语言去重)。

### ④ 分流子 Agent 并行提炼(不要自己把所有字幕读进主上下文)

N 个长视频字幕加起来可达上百万 token，**绝不能全塞进主上下文**。按批分给并行子 Agent，
每个 Agent 读一批 txt、只回**结构化精华**(而非原文)。

- 批次大小：每个 Agent 约 12–18 个视频；总量 ÷ 15 ≈ Agent 数(一般 8–14 个)。
- 用 **Agent 工具**(general-purpose)并行发起(同一条消息里发多个 Agent 调用)。
- 给每个 Agent 的 prompt 用 `references/extractor-prompt.md` 的模板，附上：
  该批的 `videoId + 标题` 列表、`txt` 目录绝对路径、要求其逐个 `Read` 后输出。
- 每个 Agent 返回：核心主题、可复用框架/模型、具体步骤与数字、反直觉观点、金句(附视频标题)。

### ⑤ 综合成小书

把所有子 Agent 的精华汇总，**归纳去重**(这类频道常高度重复，同一观点会反复出现——
重复本身说明它是作者的核心信念，应作为主线，而非简单合并)，按 `references/book-template.md`
组织成 `BOOK.md`。原则：

- 按**主题**组织，不按视频组织。
- 提炼作者**独有**的观点/框架/术语，而非通用大道理。
- 保留**具体数字、步骤、案例、金句**——细节是书的价值所在。
- 标注核心观点出自哪些视频(标题)，便于读者回看。
- 中文输出(除非用户要英文)；金句可中英对照。

## 产物清单

`videos.tsv`(清单) · `subs/`(原始 json3) · `txt/`(纯文本) · 各 Agent 精华 · **`BOOK.md`(最终小书)**

## 参考

- `references/extractor-prompt.md` —— 子 Agent 提炼模板
- `references/book-template.md` —— 小书结构模板
- `references/troubleshooting.md` —— 反爬坑与排错(android_vr / PO Token / 虚拟化列表 / python 版本 / GitHub 限速)
