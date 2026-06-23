<p align="center">
  <a href="README.md">English</a> · <a href="README_ZH.md">简体中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_ES.md">Español</a>
</p>

<p align="center">
  <img src="assets/cover.png" alt="YouTube Channel Book" width="100%">
</p>

# youtube-channel-book

> 输入一个 YouTube 频道，自动爬下它**全部视频的字幕**，蒸馏成一本可供学习的**小书**。
>
> Turn an entire YouTube channel into a small, learnable book — crawl every video's
> captions, then distill the channel's essence into structured chapters.

这是一个 [Claude Code](https://claude.com/claude-code) **Skill**。把它放进 `.claude/skills/`
（项目级）或 `~/.claude/skills/`（全局），然后对 Claude 说：

> 「把 https://www.youtube.com/@DanKoeTalks 这个频道总结成一本小书」

Claude 会自动完成：抓清单 → 下字幕 → 转文本 → 并行提炼 → 综合成 `BOOK.md`。

## 它解决了什么

2026 年要批量拿 YouTube 字幕已经很难（PO Token、虚拟化列表、受限网络）。这个 skill 把
踩通的关键招都固化好了：

- **免 PO Token 拿字幕**：用 `yt-dlp --extractor-args "youtube:player_client=android_vr"`
  —— 目前唯一稳定不需要 PO Token 的客户端。`web/mweb/tv` 都拿不到字幕。
- **抓全频道清单**：YouTube 新版网格虚拟化，DOM 只保留 ~30 个卡片；脚本边滚动边累加，抓全部。
- **不撑爆上下文**：N 个视频字幕可达上百万 token —— 用并行子 Agent 分批提炼，主线只收精华。
- **像一本书**：按主题成章，保留作者特有的框架、数字、金句，而非通用大道理。

## 流水线

```
@handle ──①list_videos.mjs──> videos.tsv
        ──②fetch_subs.sh────> subs/*.json3   (android_vr，免 PO Token)
        ──③json3_to_text.py─> txt/*.txt
        ──④并行子 Agent─────> 每批精华
        ──⑤综合─────────────> BOOK.md  📖
```

## 依赖

- [Claude Code](https://claude.com/claude-code)
- [`web-access`](https://github.com/eze-is/web-access) skill（用其 CDP Proxy 抓频道清单）
- Python ≥ 3.10、`yt-dlp`（脚本会自动下 zipapp）

## 文件

| 路径 | 作用 |
|---|---|
| `SKILL.md` | 编排说明（Claude 读这个） |
| `scripts/list_videos.mjs` | CDP 抓频道全部视频 id+标题 |
| `scripts/fetch_subs.sh` | yt-dlp 批量下字幕（android_vr） |
| `scripts/json3_to_text.py` | json3 字幕 → 纯文本 |
| `references/extractor-prompt.md` | 子 Agent 提炼模板 |
| `references/book-template.md` | 小书结构模板 |
| `references/troubleshooting.md` | 反爬坑与排错 |

## 手动跑（不经 Claude 也能用）

```bash
WORK=./out; SKILL=.
node "$SKILL/scripts/list_videos.mjs" "@DanKoeTalks" "$WORK/videos.tsv"   # 需 web-access Proxy 在跑
cut -f1 "$WORK/videos.tsv" > "$WORK/ids.txt"
bash "$SKILL/scripts/fetch_subs.sh" "$WORK/ids.txt" "$WORK/subs"
python3 "$SKILL/scripts/json3_to_text.py" "$WORK/subs" "$WORK/txt"
# 之后把 txt/ 交给 LLM 分批提炼、综合成书
```

## License

MIT

## Star 趋势

[![Star 趋势图](https://api.star-history.com/svg?repos=ai-martin-lau/youtube-channel-book&type=Date)](https://star-history.com/#ai-martin-lau/youtube-channel-book&Date)
