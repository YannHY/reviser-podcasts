#!/usr/bin/env python3
"""
Transcription Whisper locale des podcasts BAC.

Usage :
    source ~/envs/whisper/bin/activate
    python3 transcribe.py

Résultats sauvegardés dans summaries.json (reprise automatique si interrompu).
"""

import json
import os
import re
import tempfile
import unicodedata
import urllib.request
from html import unescape
from pathlib import Path
from urllib.parse import parse_qs, urlparse

WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "medium")
WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "")
TRANSCRIBE_WORK = os.environ.get("TRANSCRIBE_WORK", "").strip()
TRANSCRIBE_IDS = {
    value.strip()
    for value in os.environ.get("TRANSCRIBE_IDS", "").split(",")
    if value.strip()
}

BASE_DIR = Path(__file__).parent
INDEX_HTML = Path(os.environ.get("TRANSCRIBE_INDEX_HTML", BASE_DIR / "index.html"))
OUTPUT_FILE = Path(os.environ.get("TRANSCRIBE_OUTPUT_FILE", BASE_DIR / "summaries.json"))
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
    if match:
        return {
            podcast_id: {"url": audio_url}
            for podcast_id, audio_url in json.loads(match.group(1)).items()
        }

    match = re.search(
        r'<script id="podcastData" type="application/json">\s*([\s\S]*?)\s*</script>',
        html,
    )
    if not match:
        raise ValueError("audioSources ou podcastData introuvable dans index.html")

    podcasts = json.loads(match.group(1))
    by_work_index = {}
    audio_sources = {}
    series_cache = {}
    for podcast in podcasts:
        work = podcast.get("work", "")
        by_work_index[work] = by_work_index.get(work, 0)
        podcast_id = make_id(
            f"matu-{work}-{podcast.get('series', '')}-{podcast.get('title', '')}-{by_work_index[work]}"
        )
        by_work_index[work] += 1

        audio_url = podcast.get("audioUrl") or podcast.get("iframe") or ""
        if not audio_url and "/podcasts/serie-" in podcast.get("url", ""):
            audio_url = get_embed_from_series(podcast, series_cache)

        audio_sources[podcast_id] = {
            "title": podcast.get("title") or id_to_title(podcast_id),
            "url": audio_url,
            "sourceUrl": podcast.get("url", ""),
            "work": work,
            "author": podcast.get("author", ""),
            "origin": podcast.get("origin", ""),
            "duration": podcast.get("duration", ""),
            "date": podcast.get("date", ""),
        }

    return audio_sources


def make_id(value):
    value = re.sub(r"['’]+", "-", value)
    value = unicodedata.normalize("NFD", value.lower())
    value = "".join(
        char for char in value if unicodedata.category(char) != "Mn"
    )
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def get_embed_from_series(podcast, series_cache):
    station = extract_station(podcast.get("url", ""))
    if not station:
        return ""

    url = podcast.get("url", "")
    if url not in series_cache:
        page = fetch_text(url)
        series_cache[url] = extract_series_episodes(page)

    target_title = podcast.get("title", "")
    number_match = re.search(r"Épisode\s+(\d+)", target_title, re.I)
    if not number_match:
        return ""

    for episode in series_cache[url]:
        if episode_matches_title(episode["title"], target_title, number_match.group(1)):
            return f"https://embed.radiofrance.fr/{station}/diffusion/{episode['id']}"

    return ""


def episode_matches_title(candidate, target, number):
    candidate = normalize_for_match(candidate)
    target = normalize_for_match(target)
    target_fraction = re.search(rf"episode\s+{number}\s*/\s*(\d+)", target)
    if target_fraction and not re.search(
        rf"episode\s+{number}\s*/\s*{target_fraction.group(1)}", candidate
    ):
        return False

    target_words = [
        word
        for word in re.sub(r"^episode\s+\d+\s*/\s*\d+\s*:?", "", target).split()
        if len(word) > 3
    ]
    return not target_words or any(word in candidate for word in target_words[:4])


def normalize_for_match(value):
    return (
        unicodedata.normalize("NFD", value.lower())
        .encode("ascii", "ignore")
        .decode("ascii")
    )


def extract_station(url):
    match = re.search(r"radiofrance\.fr/(france[a-z]+)/", url, re.I)
    return match.group(1) if match else ""


def extract_series_episodes(page):
    episodes = []
    seen = set()
    patterns = [
        r'data-element-id="([0-9a-f-]{36})"[\s\S]{0,4200}?<!--\[!-->(Épisode\s+\d+[^<"]+)',
        r'id:"([0-9a-f-]{36})"[\s\S]{0,2600}?titleProps:\{[\s\S]{0,1000}?title:"([^"]+)"',
    ]

    for pattern in patterns:
        for episode_id, title in re.findall(pattern, page):
            title = decode_js_string(title)
            number_match = re.search(r"Épisode\s+(\d+)", title, re.I)
            if number_match and episode_id not in seen:
                seen.add(episode_id)
                episodes.append(
                    {"id": episode_id, "number": number_match.group(1), "title": title}
                )

    return episodes


def fetch_text(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read().decode("utf-8", errors="replace")


def decode_js_string(value):
    value = value.replace('\\"', '"')
    return re.sub(
        r"\\u([0-9a-fA-F]{4})",
        lambda match: chr(int(match.group(1), 16)),
        value,
    )


def id_to_title(podcast_id):
    title = re.sub(r"-\d+$", "", podcast_id)
    return title.replace("-", " ").title()


def download_mp3(url, dest):
    url = resolve_audio_url(url)
    req = urllib.request.Request(url, headers=MEDIA_HEADERS)
    with urllib.request.urlopen(req, timeout=120) as resp:
        content_type = resp.headers.get("Content-Type", "")
        if content_type and not content_type.lower().startswith(("audio/", "video/")):
            raise ValueError(f"L'URL ne pointe pas vers un flux audio ({content_type})")
        dest.write_bytes(resp.read())


def resolve_audio_url(url):
    if "open.spotify.com/" in url:
        raise ValueError("Flux audio Spotify non téléchargeable directement")

    if url.startswith("https://embed.radiofrance.fr/"):
        return resolve_radiofrance_embed_url(url)

    if "audiomeans.fr/player-v2/" in url:
        return resolve_audiomeans_player_url(url)

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


def resolve_radiofrance_embed_url(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        html = resp.read().decode("utf-8", errors="replace")

    audio_match = re.search(r'__typename:"ManifestationAudio",url:"([^"]+)"', html)
    if audio_match:
        return unescape(audio_match.group(1))

    audio_match = re.search(r'"__typename":"ManifestationAudio","url":"([^"]+)"', html)
    if audio_match:
        return unescape(audio_match.group(1))

    raise ValueError(f"URL audio introuvable dans l'embed Radio France : {url}")


def resolve_audiomeans_player_url(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        html = resp.read().decode("utf-8", errors="replace")

    data_match = re.search(
        r"<script>window\.__INITIAL_DATA__\s*=\s*([\s\S]*?)</script>",
        html,
    )
    if data_match:
        data = json.loads(unescape(data_match.group(1)))
        audio_url = data.get("episode", {}).get("audio", {}).get("path", "")
        if audio_url:
            return audio_url

    audio_match = re.search(r'"path":"([^"]+\.mp3[^"]*)"', html)
    if audio_match:
        return unescape(audio_match.group(1))

    raise ValueError(f"URL audio introuvable dans le player Audiomeans : {url}")


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
    use_fp16 = WHISPER_DEVICE not in {"", "cpu"}
    result = model.transcribe(str(mp3_path), language="fr", fp16=use_fp16)
    return result["text"].strip()


def main():
    audio_sources = load_audio_sources()
    if TRANSCRIBE_WORK:
        audio_sources = {
            podcast_id: podcast
            for podcast_id, podcast in audio_sources.items()
            if podcast.get("work") == TRANSCRIBE_WORK
        }
    if TRANSCRIBE_IDS:
        audio_sources = {
            podcast_id: podcast
            for podcast_id, podcast in audio_sources.items()
            if podcast_id in TRANSCRIBE_IDS
        }
    to_process = {k: v for k, v in audio_sources.items() if v.get("url")}
    print(f"{len(to_process)} podcasts avec MP3 sur {len(audio_sources)} total\n")

    summaries = {}
    if OUTPUT_FILE.exists():
        summaries = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        done = sum(1 for v in summaries.values() if v.get("transcript"))
        print(f"{done} déjà traités — reprise\n")

    missing_audio = 0
    for podcast_id, podcast in audio_sources.items():
        if podcast.get("url") or summaries.get(podcast_id, {}).get("transcript"):
            continue
        missing_audio += 1
        summaries[podcast_id] = {
            **summaries.get(podcast_id, {}),
            "title": podcast.get("title") or id_to_title(podcast_id),
            "url": podcast.get("sourceUrl", ""),
            "work": podcast.get("work", ""),
            "author": podcast.get("author", ""),
            "origin": podcast.get("origin", ""),
            "duration": podcast.get("duration", ""),
            "date": podcast.get("date", ""),
            "error": "URL audio introuvable",
        }

    if missing_audio:
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_FILE.write_text(
            json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"{missing_audio} podcasts sans URL audio exploitable\n")

    if not to_process:
        print("Aucun podcast à transcrire.")
        return

    print(f"Chargement du modèle Whisper ({WHISPER_MODEL})...")
    import whisper
    whisper_model = whisper.load_model(WHISPER_MODEL, device=WHISPER_DEVICE or None)
    print("Modèle chargé.\n")

    total = len(to_process)
    for i, (podcast_id, podcast) in enumerate(to_process.items(), 1):
        mp3_url = podcast["url"]
        already = summaries.get(podcast_id, {})
        if already.get("transcript"):
            print(f"[{i}/{total}] Déjà traité — {podcast_id[:70]}")
            continue

        title = podcast.get("title") or id_to_title(podcast_id)
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
                "title": title,
                "url": podcast.get("sourceUrl") or already.get("url", mp3_url),
                "audioUrl": mp3_url,
                "work": podcast.get("work", already.get("work", "")),
                "author": podcast.get("author", already.get("author", "")),
                "origin": podcast.get("origin", already.get("origin", "")),
                "duration": podcast.get("duration", already.get("duration", "")),
                "date": podcast.get("date", already.get("date", "")),
                "transcript": transcript,
            }
            summaries[podcast_id].pop("error", None)
            OUTPUT_FILE.write_text(
                json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print("  ✓ Transcription sauvegardée")

        except Exception as e:
            print(f"  ✗ Erreur : {e}")
            summaries[podcast_id] = {
                "title": title,
                "url": podcast.get("sourceUrl") or mp3_url,
                "audioUrl": mp3_url,
                "work": podcast.get("work", ""),
                "author": podcast.get("author", ""),
                "origin": podcast.get("origin", ""),
                "duration": podcast.get("duration", ""),
                "date": podcast.get("date", ""),
                "error": str(e),
            }
            OUTPUT_FILE.write_text(
                json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        finally:
            tmp_path.unlink(missing_ok=True)

    done = sum(
        1
        for podcast_id in to_process
        if summaries.get(podcast_id, {}).get("transcript")
    )
    errors = sum(
        1
        for podcast_id in audio_sources
        if summaries.get(podcast_id, {}).get("error")
    )
    print(f"\nTerminé : {done}/{total} podcasts de la sélection transcrits, {errors} erreurs")
    print(f"Résultats : {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
