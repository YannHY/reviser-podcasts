#!/usr/bin/env node

const { execFileSync, spawnSync } = require("child_process");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { basename, join } = require("path");

const ROOT = __dirname;
const PODCASTS = join(ROOT, "podcasts.md");
const CACHE = join(ROOT, ".transcription-cache");
const AUDIO_DIR = join(CACHE, "audio");
const WAV_DIR = join(CACHE, "wav");
const OUT_DIR = join(CACHE, "output");
const MODEL = join(CACHE, "models", "ggml-large-v3-turbo-q5_0.bin");
const FINAL = join(ROOT, "transcriptions-la-prose-du-transsiberien.md");

for (const dir of [CACHE, AUDIO_DIR, WAV_DIR, OUT_DIR]) mkdirSync(dir, { recursive: true });

const entries = parsePodcastSection(readFileSync(PODCASTS, "utf8"));
const completed = [];

for (const [index, entry] of entries.entries()) {
  const id = slug(`${entry.title}-${index}`);
  const audioPath = join(AUDIO_DIR, `${id}.mp3`);
  const wavPath = join(WAV_DIR, `${id}.wav`);
  const outBase = join(OUT_DIR, id);
  const outText = `${outBase}.txt`;

  console.log(`\n[${index + 1}/${entries.length}] ${entry.title}`);
  const mediaUrl = resolveMediaUrl(entry);

  if (!mediaUrl) {
    console.warn(`  Aucun media telechargeable trouve pour ${entry.url}`);
    completed.push({ ...entry, audioUrl: "", transcription: "[Transcription non générée : audio non récupérable automatiquement.]" });
    continue;
  }

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
      "Blaise Cendrars, La Prose du Transsibérien, Sonia Delaunay, Jehanne, Novgorod, Transsibérien.",
    ]);
  }

  const transcription = existsSync(outText)
    ? cleanupTranscript(readFileSync(outText, "utf8"))
    : "[Transcription non générée.]";
  completed.push({ ...entry, audioUrl: mediaUrl, transcription });
  writeFileSync(FINAL, renderMarkdown(completed), "utf8");
}

writeFileSync(FINAL, renderMarkdown(completed), "utf8");
console.log(`\nTranscriptions ecrites dans ${FINAL}`);

function parsePodcastSection(markdown) {
  const start = markdown.indexOf("# La Prose du Transsibérien");
  const next = markdown.indexOf("\n# ", start + 1);
  const section = markdown.slice(start, next === -1 ? undefined : next);
  const blocks = section.split(/\n(?=## )/).slice(1);

  return blocks.map((block) => {
    const lines = block.trim().split(/\n/);
    const title = lines[0].replace(/^##\s+/, "").trim();
    const entry = { title };
    for (const line of lines.slice(1)) {
      const match = line.match(/^- ([^:]+):\s*(.*)$/);
      if (match) entry[match[1].toLowerCase()] = match[2].trim();
    }
    return {
      title,
      duration: entry.duree || "",
      date: entry.date || "",
      origin: entry.origine || "",
      url: entry.url || "",
      iframe: entry.iframe || "",
    };
  });
}

function resolveMediaUrl(entry) {
  if (/\.(mp3|m4a|wav|ogg)(\?|$)/i.test(entry.iframe)) return entry.iframe;

  if (entry.url.includes("radiofrance.fr")) {
    const html = curlText(entry.url);
    const mp3s = [...html.matchAll(/https:\/\/[^"\\ ]+?\.mp3/g)].map((match) => match[0]);
    const podcast = mp3s.find((url) => url.includes("media.radiofrance-podcast.net"));
    if (podcast) return podcast;
    if (mp3s[0]) return mp3s[0];
  }

  if (entry.url.includes("rts.ch")) {
    const html = curlText(entry.url);
    const urn = html.match(/urn:rts:audio:\d+/)?.[0] || entry.iframe.match(/urn:rts:audio:\d+/)?.[0];
    if (urn) {
      const metadata = JSON.parse(
        curlText(`https://il.srgssr.ch/integrationlayer/2.0/mediaComposition/byUrn/${urn}`),
      );
      const matchingChapter =
        metadata.chapterList?.find((chapter) => chapter.urn === urn || chapter.id === urn.split(":").pop()) ||
        metadata.chapterList?.find((chapter) => chapter.resourceList?.some((resource) => resource.url?.includes(urn.split(":").pop())));
      const resource = matchingChapter?.resourceList?.find((item) => item.mimeType === "audio/mpeg") || matchingChapter?.resourceList?.[0];
      if (resource?.url) return resource.url;
    }
  }

  const resolved = spawnSync("yt-dlp", ["--no-playlist", "--get-url", entry.url], { encoding: "utf8" });
  if (resolved.status === 0) {
    const url = resolved.stdout
      .split(/\n/)
      .map((line) => line.trim())
      .find(Boolean);
    if (url) return url;
  }

  if (entry.iframe) {
    const iframeResolved = spawnSync("yt-dlp", ["--no-playlist", "--get-url", entry.iframe], { encoding: "utf8" });
    if (iframeResolved.status === 0) {
      const url = iframeResolved.stdout
        .split(/\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (url) return url;
    }
  }

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
    "# Transcriptions - La Prose du Transsibérien",
    "",
    `Transcriptions générées avec Whisper local (\`large-v3-turbo-q5_0\`) le ${today}.`,
    "",
  ];

  for (const item of items) {
    parts.push(`## ${item.title}`);
    parts.push(`- Origine: ${item.origin}`);
    parts.push(`- Date: ${item.date}`);
    parts.push(`- Durée: ${item.duration}`);
    parts.push(`- URL: ${item.url}`);
    if (item.audioUrl) parts.push(`- Audio: ${item.audioUrl}`);
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

function slug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
