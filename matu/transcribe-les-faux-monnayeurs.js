#!/usr/bin/env node

const { execFileSync, spawnSync } = require("child_process");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { tmpdir } = require("os");
const { join } = require("path");

const ROOT = __dirname;
const INDEX = join(ROOT, "index.html");
const SUMMARIES = join(ROOT, "summaries.json");
const CACHE = join(tmpdir(), "codex-bac-transcription-les-faux-monnayeurs");
const AUDIO_DIR = join(CACHE, "audio");
const WAV_DIR = join(CACHE, "wav");
const OUT_DIR = join(CACHE, "output");
const MODEL_SOURCE = join(ROOT, ".transcription-cache", "models", "ggml-large-v3-turbo-q5_0.bin");
const MODEL = join(CACHE, "models", "ggml-large-v3-turbo-q5_0.bin");
const MODEL_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin";
const FINAL = join(ROOT, "transcriptions-les-faux-monnayeurs.md");
const SPOTIFY_RSS = "https://anchor.fm/s/fbb85c6c/podcast/rss";

for (const dir of [CACHE, AUDIO_DIR, WAV_DIR, OUT_DIR]) mkdirSync(dir, { recursive: true });
mkdirSync(join(CACHE, "models"), { recursive: true });
if (!existsSync(MODEL)) {
  if (existsSync(MODEL_SOURCE)) {
    console.log("Copie du modele Whisper dans le cache temporaire");
    execFileSync("cp", [MODEL_SOURCE, MODEL]);
  } else {
    console.log("Telechargement du modele Whisper dans le cache temporaire");
    run("curl", ["-L", "--fail", "-o", MODEL, MODEL_URL]);
  }
}

const entries = loadPodcastData().filter((entry) => entry.work === "Les faux-monnayeurs");
const summaries = JSON.parse(readFileSync(SUMMARIES, "utf8"));
const completed = [];

for (const [index, entry] of entries.entries()) {
  const id = makeId(`matu-${entry.work}-${entry.series || ""}-${entry.title || ""}-${index}`);
  const audioPath = join(AUDIO_DIR, `${id}.mp3`);
  const wavPath = join(WAV_DIR, `${id}.wav`);
  const outBase = join(OUT_DIR, id);
  const outText = `${outBase}.txt`;

  console.log(`\n[${index + 1}/${entries.length}] ${entry.title}`);
  const mediaUrl = resolveMediaUrl(entry);
  if (!mediaUrl) throw new Error(`Aucun media telechargeable trouve pour ${entry.url}`);

  if (!existsSync(audioPath)) {
    console.log(`  Telechargement: ${mediaUrl}`);
    run("curl", ["-L", "--fail", "-o", audioPath, mediaUrl]);
  }

  if (!existsSync(wavPath)) {
    console.log("  Conversion WAV 16 kHz");
    run("ffmpeg", ["-y", "-i", audioPath, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wavPath], { quiet: true });
  }

  if (!existsSync(outText)) {
    console.log("  Transcription Whisper");
    run("whisper-cli", [
      "-m",
      MODEL,
      "-f",
      wavPath,
      "-l",
      "fr",
      "-otxt",
      "-of",
      outBase,
      "-pp",
      "-t",
      "8",
      "--prompt",
      "Andre Gide, André Gide, Les Faux-Monnayeurs, Edouard, Édouard, Bernard, Olivier, La Compagnie des auteurs, Guillaume Gallienne.",
    ]);
  }

  const transcript = cleanupTranscript(readFileSync(outText, "utf8"));
  summaries[id] = {
    ...(summaries[id] || {}),
    title: entry.title,
    url: entry.url,
    audioUrl: mediaUrl,
    work: entry.work,
    author: entry.author || "",
    origin: entry.origin || "",
    duration: entry.duration || "",
    date: entry.date || "",
    transcript,
  };
  delete summaries[id].error;
  completed.push({ ...entry, id, audioUrl: mediaUrl, transcription: transcript });
  writeFileSync(SUMMARIES, JSON.stringify(summaries, null, 2), "utf8");
  writeFileSync(FINAL, renderMarkdown(completed), "utf8");
}

writeFileSync(SUMMARIES, JSON.stringify(summaries, null, 2), "utf8");
writeFileSync(FINAL, renderMarkdown(completed), "utf8");
console.log(`\nTranscriptions ecrites dans ${FINAL}`);
console.log(`Donnees mises a jour dans ${SUMMARIES}`);

function loadPodcastData() {
  const html = readFileSync(INDEX, "utf8");
  const match = html.match(/<script id="podcastData" type="application\/json">\s*([\s\S]*?)\s*<\/script>/);
  if (!match) throw new Error("podcastData introuvable dans index.html");
  return JSON.parse(match[1]);
}

function resolveMediaUrl(entry) {
  if (entry.origin === "Spotify") {
    const xml = curlText(SPOTIFY_RSS);
    const item = xml.split(/<item>/).find((block) => block.includes("Les faux Monnayeurs"));
    return item?.match(/<enclosure url="([^"]+)"/)?.[1] || "";
  }

  if (entry.url.includes("radiofrance.fr")) {
    const html = curlText(entry.url);
    const mp3s = [...html.matchAll(/https:\/\/[^"\\ ]+?\.mp3/g)].map((match) => match[0]);
    return mp3s.find((url) => url.includes("media.radiofrance-podcast.net")) || mp3s[0] || "";
  }

  if (entry.audioUrl || entry.iframe) return entry.audioUrl || entry.iframe;
  return "";
}

function renderMarkdown(items) {
  const today = new Date().toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const parts = [
    "# Transcriptions - Les faux-monnayeurs",
    "",
    `Transcriptions générées avec Whisper local (\`large-v3-turbo-q5_0\`) le ${today}.`,
    "",
  ];

  for (const item of items) {
    parts.push(`## ${item.title}`);
    parts.push(`- Origine: ${item.origin}`);
    parts.push(`- Date: ${item.date}`);
    parts.push(`- Durée: ${item.duration} min`);
    parts.push(`- URL: ${item.url}`);
    parts.push(`- Audio: ${item.audioUrl}`);
    parts.push("");
    parts.push("### Transcription");
    parts.push("");
    parts.push(item.transcription);
    parts.push("");
  }

  return `${parts.join("\n").trim()}\n`;
}

function cleanupTranscript(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\[[^\]]*(Musique|Applaudissements|Rires)[^\]]*\]/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function curlText(url) {
  return execFileSync("curl", ["-L", "-s", url], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: options.quiet ? "ignore" : "inherit" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}

function makeId(value) {
  return value
    .replace(/['’]+/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
