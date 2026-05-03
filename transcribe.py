#!/usr/bin/env python3
"""
Transcription (Whisper local) + résumé (Minimax API) des podcasts BAC.

Usage :
    source ~/envs/whisper/bin/activate
    MINIMAX_TOKEN=ton_token python3 transcribe.py

Résultats sauvegardés dans summaries.json (reprise automatique si interrompu).
"""

import json
import os
import re
import sys
import tempfile
import urllib.request
from pathlib import Path

MINIMAX_TOKEN = os.environ.get("MINIMAX_TOKEN", "")
MINIMAX_URL = "https://api.minimax.io/v1/chat/completions"
MINIMAX_MODEL = "MiniMax-M2.7"
WHISPER_MODEL = "medium"

BASE_DIR = Path(__file__).parent
INDEX_HTML = BASE_DIR / "index.html"
OUTPUT_FILE = BASE_DIR / "summaries.json"


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
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        dest.write_bytes(resp.read())


def transcribe(mp3_path, model):
    result = model.transcribe(str(mp3_path), language="fr", fp16=False)
    return result["text"].strip()


def summarize(title, transcript):
    prompt = f"""Tu es un assistant pédagogique spécialisé en littérature française pour le baccalauréat.

Voici la transcription d'un podcast intitulé : "{title}"

Rédige un résumé structuré en français avec :
## Résumé
3-4 phrases présentant l'essentiel de l'émission.

## Points essentiels
- 5 à 7 bullet points avec les idées clés, arguments principaux ou informations importantes.

Transcription :
{transcript}"""

    body = json.dumps(
        {
            "model": MINIMAX_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "Tu es un assistant pédagogique expert en littérature française.",
                },
                {"role": "user", "content": prompt},
            ],
            "max_completion_tokens": 600,
            "temperature": 0.3,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        MINIMAX_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {MINIMAX_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read())

    return result["choices"][0]["message"]["content"]


def main():
    if not MINIMAX_TOKEN or MINIMAX_TOKEN == "ton_token":
        print("Erreur : définir MINIMAX_TOKEN avec ton vrai token avant de lancer le script")
        print("Exemple : MINIMAX_TOKEN=eyJ... python3 transcribe.py")
        sys.exit(1)

    audio_sources = load_audio_sources()
    to_process = {k: v for k, v in audio_sources.items() if v}
    print(f"{len(to_process)} podcasts avec MP3 sur {len(audio_sources)} total\n")

    summaries = {}
    if OUTPUT_FILE.exists():
        summaries = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        done = sum(1 for v in summaries.values() if "summary" in v)
        print(f"{done} déjà traités — reprise\n")

    print(f"Chargement du modèle Whisper ({WHISPER_MODEL})...")
    import whisper
    whisper_model = whisper.load_model(WHISPER_MODEL)
    print("Modèle chargé.\n")

    total = len(to_process)
    for i, (podcast_id, mp3_url) in enumerate(to_process.items(), 1):
        already = summaries.get(podcast_id, {})
        if "summary" in already:
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

            if "transcript" not in already:
                print("  ✎ Transcription Whisper...")
                transcript = transcribe(tmp_path, whisper_model)
                print(f"    {len(transcript)} caractères")
                summaries[podcast_id] = {"title": title, "url": mp3_url, "transcript": transcript}
                OUTPUT_FILE.write_text(
                    json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8"
                )
            else:
                transcript = already["transcript"]
                print("  ✎ Transcription déjà faite, résumé seulement")

            print("  ★ Résumé Minimax...")
            summary = summarize(title, transcript)
            summaries[podcast_id]["summary"] = summary
            OUTPUT_FILE.write_text(
                json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print("  ✓ Sauvegardé")

        except Exception as e:
            print(f"  ✗ Erreur : {e}")
            summaries[podcast_id] = {"title": title, "url": mp3_url, "error": str(e)}
            OUTPUT_FILE.write_text(
                json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        finally:
            tmp_path.unlink(missing_ok=True)

    done = sum(1 for v in summaries.values() if "summary" in v)
    errors = sum(1 for v in summaries.values() if "error" in v)
    print(f"\nTerminé : {done}/{total} résumés générés, {errors} erreurs")
    print(f"Résultats : {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
