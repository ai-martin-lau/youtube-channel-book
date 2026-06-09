<p align="center">
  <a href="README.md">简体中文</a> · <a href="README_EN.md">English</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_ES.md">Español</a>
</p>

# youtube-channel-book

> YouTube チャンネルを 1 つ入力するだけで、その**全動画の字幕**を自動でクロールし、学習用の**小さな本**に蒸留します。
>
> Turn an entire YouTube channel into a small, learnable book — crawl every video's
> captions, then distill the channel's essence into structured chapters.

これは [Claude Code](https://claude.com/claude-code) の **Skill** です。`.claude/skills/`
（プロジェクト単位）または `~/.claude/skills/`（グローバル）に置いて、Claude にこう伝えてください：

> 「https://www.youtube.com/@DanKoeTalks このチャンネルを 1 冊の小さな本にまとめて」

Claude が自動でこなします：リスト取得 → 字幕ダウンロード → テキスト変換 → 並列で抽出 → `BOOK.md` に統合。

## 何を解決するのか

2026 年、YouTube の字幕を一括取得するのはすでに困難です（PO Token、仮想化リスト、制限されたネットワーク）。この skill は、突破に必要な要所をすべて固めてあります：

- **PO Token なしで字幕を取得**：`yt-dlp --extractor-args "youtube:player_client=android_vr"`
  を使用 —— 現時点で PO Token なしに安定して動作する唯一のクライアントです。`web/mweb/tv` はいずれも字幕を取得できません。
- **チャンネル全リストを取得**：YouTube の新しいグリッドは仮想化されており、DOM には約 30 枚のカードしか残りません。スクリプトはスクロールしながら累積し、すべてを取得します。
- **コンテキストを溢れさせない**：N 本の動画の字幕は数百万トークンに達することがあります —— 並列のサブ Agent でバッチ抽出し、メインスレッドはエッセンスだけを受け取ります。
- **1 冊の本のように**：テーマごとに章立てし、汎用的な一般論ではなく、著者特有のフレームワーク・数字・名言を残します。

## パイプライン

```
@handle ──①list_videos.mjs──> videos.tsv
        ──②fetch_subs.sh────> subs/*.json3   (android_vr、PO Token 不要)
        ──③json3_to_text.py─> txt/*.txt
        ──④並列サブ Agent───> バッチごとのエッセンス
        ──⑤統合─────────────> BOOK.md  📖
```

## 依存関係

- [Claude Code](https://claude.com/claude-code)
- [`web-access`](https://github.com/eze-is/web-access) skill（その CDP Proxy でチャンネルリストを取得）
- Python ≥ 3.10、`yt-dlp`（スクリプトが自動で zipapp をダウンロードします）

## ファイル

| パス | 役割 |
|---|---|
| `SKILL.md` | オーケストレーション説明（Claude がこれを読みます） |
| `scripts/list_videos.mjs` | CDP でチャンネル全動画の id + タイトルを取得 |
| `scripts/fetch_subs.sh` | yt-dlp で字幕を一括ダウンロード（android_vr） |
| `scripts/json3_to_text.py` | json3 字幕 → プレーンテキスト |
| `references/extractor-prompt.md` | サブ Agent 抽出テンプレート |
| `references/book-template.md` | 小冊子の構成テンプレート |
| `references/troubleshooting.md` | スクレイピング対策の落とし穴とトラブルシューティング |

## 手動で実行（Claude を介さずに使えます）

```bash
WORK=./out; SKILL=.
node "$SKILL/scripts/list_videos.mjs" "@DanKoeTalks" "$WORK/videos.tsv"   # web-access Proxy が起動している必要があります
cut -f1 "$WORK/videos.tsv" > "$WORK/ids.txt"
bash "$SKILL/scripts/fetch_subs.sh" "$WORK/ids.txt" "$WORK/subs"
python3 "$SKILL/scripts/json3_to_text.py" "$WORK/subs" "$WORK/txt"
# その後 txt/ を LLM に渡し、バッチで抽出して 1 冊の本に統合します
```

## License

MIT

## スター推移

[![スター推移グラフ](https://api.star-history.com/svg?repos=ai-martin-lau/youtube-channel-book&type=Date)](https://star-history.com/#ai-martin-lau/youtube-channel-book&Date)
