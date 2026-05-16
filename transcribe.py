#!/usr/bin/env python3
"""
Transcription Whisper locale des podcasts BAC.

Usage :
    source ~/envs/whisper/bin/activate
    python3 transcribe.py

Résultats sauvegardés dans summaries.json (reprise automatique si interrompu).
"""

import json
import re
import tempfile
import urllib.request
from html import unescape
from pathlib import Path
from urllib.parse import parse_qs, urlparse

WHISPER_MODEL = "medium"

BASE_DIR = Path(__file__).parent
INDEX_HTML = BASE_DIR / "index.html"
OUTPUT_FILE = BASE_DIR / "summaries.json"
MEDIA_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5",
    "Range": "bytes=0-",
}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def load_audio_sources():
    html = INDEX_HTML.read_text(encoding="utf-8")
    match = re.search(
        r'<script id="audioSources" type="application/json">\s*([\s\S]*?)\s*</script>',
        html,
    )
    if not match:
        raise ValueError("audioSources introuvable dans index.html")
    return json.loads(match.group(1))


def id_to_title(podcast_id):
    title = re.sub(r"-\d+$", "", podcast_id)
    return title.replace("-", " ").title()


def download_mp3(url, dest):
    url = resolve_audio_url(url)
    req = urllib.request.Request(url, headers=MEDIA_HEADERS)
    with urllib.request.urlopen(req, timeout=120) as resp:
        dest.write_bytes(resp.read())


def resolve_audio_url(url):
    if not url.startswith("https://player.podcastics.com/"):
        return url

    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        html = resp.read().decode("utf-8", errors="replace")

    audio_match = re.search(r'<meta property="og:audio" content="([^"]+)"', html)
    if audio_match:
        return resolve_podcastics_track_url(unescape(audio_match.group(1)))

    file_match = re.search(r"file:\s*'([^']+)'", html)
    if file_match:
        return resolve_podcastics_track_url(unescape(file_match.group(1)))

    raise ValueError(f"URL audio introuvable dans le player Podcastics : {url}")


def resolve_podcastics_track_url(url):
    if not url.startswith("https://track.podcastics.com/"):
        return url

    opener = urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(url, headers=MEDIA_HEADERS)
    try:
        opener.open(req, timeout=120)
    except urllib.error.HTTPError as error:
        if error.code not in {301, 302, 303, 307, 308}:
            raise
        location = error.headers.get("Location", "")
        podcast_url = parse_qs(urlparse(location).query).get("podcastUrl", [""])[0]
        if podcast_url:
            return podcast_url
        return location

    return url


def transcribe(mp3_path, model):
    result = model.transcribe(str(mp3_path), language="fr", fp16=False)
    return result["text"].strip()


def main():
    audio_sources = load_audio_sources()
    to_process = {k: v for k, v in audio_sources.items() if v}
    print(f"{len(to_process)} podcasts avec MP3 sur {len(audio_sources)} total\n")

    summaries = {}
    if OUTPUT_FILE.exists():
        summaries = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        done = sum(1 for v in summaries.values() if "transcript" in v)
        print(f"{done} déjà traités — reprise\n")

    print(f"Chargement du modèle Whisper ({WHISPER_MODEL})...")
    import whisper
    whisper_model = whisper.load_model(WHISPER_MODEL)
    print("Modèle chargé.\n")

    total = len(to_process)
    for i, (podcast_id, mp3_url) in enumerate(to_process.items(), 1):
        already = summaries.get(podcast_id, {})
        if "transcript" in already:
            print(f"[{i}/{total}] Déjà traité — {podcast_id[:70]}")
            continue

        title = id_to_title(podcast_id)
        print(f"\n[{i}/{total}] {title[:80]}")

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp_path = Path(tmp.name)

        try:
            print("  ↓ Téléchargement...")
            download_mp3(mp3_url, tmp_path)
            size_mb = tmp_path.stat().st_size / 1_000_000
            print(f"    {size_mb:.1f} Mo")

            print("  ✎ Transcription Whisper...")
            transcript = transcribe(tmp_path, whisper_model)
            print(f"    {len(transcript)} caractères")
            summaries[podcast_id] = {
                **already,
                "title": already.get("title", title),
                "url": already.get("url", mp3_url),
                "transcript": transcript,
            }
            summaries[podcast_id].pop("error", None)
            OUTPUT_FILE.write_text(
                json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print("  ✓ Transcription sauvegardée")

        except Exception as e:
            print(f"  ✗ Erreur : {e}")
            summaries[podcast_id] = {"title": title, "url": mp3_url, "error": str(e)}
            OUTPUT_FILE.write_text(
                json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        finally:
            tmp_path.unlink(missing_ok=True)

    done = sum(1 for v in summaries.values() if "transcript" in v)
    errors = sum(1 for v in summaries.values() if "error" in v)
    print(f"\nTerminé : {done}/{total} transcriptions générées, {errors} erreurs")
    print(f"Résultats : {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
