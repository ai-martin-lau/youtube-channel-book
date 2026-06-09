<p align="center">
  <a href="README.md">简体中文</a> · <a href="README_EN.md">English</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_ES.md">Español</a>
</p>

<p align="center">
  <img src="assets/cover.png" alt="youtube-channel-book" width="100%">
</p>

# youtube-channel-book

> Introduce un canal de YouTube y rastrea automáticamente **los subtítulos de todos sus vídeos**, destilándolos en un **pequeño libro** apto para el estudio.
>
> Turn an entire YouTube channel into a small, learnable book — crawl every video's
> captions, then distill the channel's essence into structured chapters.

Esto es un **Skill** de [Claude Code](https://claude.com/claude-code). Colócalo en `.claude/skills/`
(a nivel de proyecto) o en `~/.claude/skills/` (global) y luego dile a Claude:

> «Resume el canal https://www.youtube.com/@DanKoeTalks en un pequeño libro»

Claude se encarga de todo: obtener la lista → descargar subtítulos → convertir a texto → destilar en paralelo → sintetizar en `BOOK.md`.

## Qué resuelve

En 2026, obtener subtítulos de YouTube de forma masiva ya es muy difícil (PO Token, listas virtualizadas, redes restringidas). Este skill fija todas las maniobras clave que de verdad funcionan:

- **Subtítulos sin PO Token**: usa `yt-dlp --extractor-args "youtube:player_client=android_vr"`
  —— actualmente el único cliente que funciona de forma estable sin PO Token. `web/mweb/tv` no consiguen subtítulos.
- **Lista completa del canal**: la nueva cuadrícula de YouTube está virtualizada y el DOM solo conserva ~30 tarjetas; el script va acumulando mientras hace scroll y captura todo.
- **No desborda el contexto**: los subtítulos de N vídeos pueden llegar a millones de tokens —— sub-Agentes en paralelo destilan por lotes y el hilo principal solo recoge la esencia.
- **Como un libro**: organizado en capítulos por tema, conservando los marcos, las cifras y las frases memorables propios del autor, en lugar de lugares comunes genéricos.

## Flujo de trabajo

```
@handle ──①list_videos.mjs──> videos.tsv
        ──②fetch_subs.sh────> subs/*.json3   (android_vr, sin PO Token)
        ──③json3_to_text.py─> txt/*.txt
        ──④sub-Agentes en paralelo──> esencia por lote
        ──⑤sintetizar───────> BOOK.md  📖
```

## Dependencias

- [Claude Code](https://claude.com/claude-code)
- El skill [`web-access`](https://github.com/eze-is/web-access) (se usa su CDP Proxy para rastrear la lista del canal)
- Python ≥ 3.10, `yt-dlp` (el script descarga la zipapp automáticamente)

## Archivos

| Ruta | Función |
|---|---|
| `SKILL.md` | Instrucciones de orquestación (esto es lo que lee Claude) |
| `scripts/list_videos.mjs` | Rastreo por CDP de id + título de todos los vídeos del canal |
| `scripts/fetch_subs.sh` | Descarga masiva de subtítulos con yt-dlp (android_vr) |
| `scripts/json3_to_text.py` | subtítulos json3 → texto plano |
| `references/extractor-prompt.md` | Plantilla de destilación del sub-Agente |
| `references/book-template.md` | Plantilla de estructura del libro |
| `references/troubleshooting.md` | Trampas anti-scraping y resolución de problemas |

## Ejecutarlo manualmente (también funciona sin Claude)

```bash
WORK=./out; SKILL=.
node "$SKILL/scripts/list_videos.mjs" "@DanKoeTalks" "$WORK/videos.tsv"   # requiere que el Proxy de web-access esté en ejecución
cut -f1 "$WORK/videos.tsv" > "$WORK/ids.txt"
bash "$SKILL/scripts/fetch_subs.sh" "$WORK/ids.txt" "$WORK/subs"
python3 "$SKILL/scripts/json3_to_text.py" "$WORK/subs" "$WORK/txt"
# después entrega txt/ a un LLM para destilar por lotes y sintetizar el libro
```

## License

MIT
