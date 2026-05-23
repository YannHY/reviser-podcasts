const { execFileSync } = require("child_process");
const { readFileSync, writeFileSync } = require("fs");

const html = readFileSync("index.html", "utf8");
const sourceMatch = html.match(/<textarea id="podcastSource" hidden>([\s\S]*?)<\/textarea>/);
if (!sourceMatch) throw new Error("Source podcast introuvable dans index.html");

const markdown = sourceMatch[1];
const seriesCache = new Map();

const authorsByWork = {
  "Discours de la servitude volontaire": "Étienne de La Boétie",
  "On ne badine pas avec l'amour": "Alfred de Musset",
  "La rage de l'expression": "Francis Ponge",
  "Sido": "Colette",
};

const podcasts = parseMarkdown(markdown);
const audioSources = {};

for (const podcast of podcasts) {
  try {
    const audioUrl = podcast.url.includes("/podcasts/serie-")
      ? getEmbedFromSeries(podcast)
      : getEmbedFromPage(podcast.url);

    if (audioUrl) {
      audioSources[podcast.id] = audioUrl;
      console.log(`OK ${podcast.title}`);
    } else {
      console.log(`-- ${podcast.title}`);
    }
  } catch (error) {
    console.log(`!! ${podcast.title}: ${error.message}`);
  }
}

const json = JSON.stringify(audioSources, null, 2);
let nextHtml = html;
const block = `<script id="audioSources" type="application/json">\n${json}\n  </script>`;

if (nextHtml.includes('<script id="audioSources" type="application/json">')) {
  nextHtml = nextHtml.replace(
    /<script id="audioSources" type="application\/json">[\s\S]*?<\/script>/,
    block,
  );
} else {
  nextHtml = nextHtml.replace("  <template id=\"cardTemplate\">", `  ${block}\n\n  <template id="cardTemplate">`);
}

writeFileSync("index.html", nextHtml);
console.log(`${Object.keys(audioSources).length}/${podcasts.length} flux audio ajoutés`);

function getEmbedFromSeries(podcast) {
  const station = extractStation(podcast.url);
  if (!station) return "";

  if (!seriesCache.has(podcast.url)) {
    const page = curl(podcast.url);
    seriesCache.set(podcast.url, extractSeriesEpisodes(page));
  }

  const episodeNumber = podcast.title.match(/Épisode\s+(\d+)/i)?.[1];
  const episodes = seriesCache.get(podcast.url);
  const episode = episodes.find((item) => item.number === episodeNumber);
  if (!episode) return "";

  return `https://embed.radiofrance.fr/${station}/diffusion/${episode.id}`;
}

function getEmbedFromPage(url) {
  if (!url) return "";
  if (/^https:\/\/embed\.radiofrance\.fr\/[^/]+\/diffusion\/[0-9a-f-]{36}$/i.test(url)) {
    return url;
  }
  if (/^https:\/\/www\.podcastics\.com\/podcast\/episode\//i.test(url)) {
    return getPodcasticsEmbed(url);
  }
  const station = extractStation(url);
  if (!station) return "";
  const page = curl(url);
  const uuid = extractDiffusionId(page);
  if (!uuid) return "";
  return `https://embed.radiofrance.fr/${station}/diffusion/${uuid}`;
}

function getPodcasticsEmbed(url) {
  const page = curl(url);
  const playerMatch = page.match(/https:\/\/player\.podcastics\.com\/(?:light|wide|extended)\/(\d+)\/?(\d+)?[^"]*/);
  const episodeMatch = url.match(/-(\d+)\/?(?:\?|$)/);
  if (!playerMatch || !episodeMatch) return "";

  const podcastId = playerMatch[1];
  const episodeId = playerMatch[2] || episodeMatch[1];
  const search = new URL(url).searchParams;
  const suffix = search.has("s") ? `?s=${search.get("s")}` : "";
  return `https://player.podcastics.com/light/${podcastId}/${episodeId}${suffix}`;
}

function extractStation(url) {
  const match = url.match(/radiofrance\.fr\/(france[a-z]+)\//i);
  return match ? match[1] : "";
}

function extractDiffusionId(page) {
  const patterns = [
    /id="covertitle-([0-9a-f-]{36})"/,
    /id="playstate-([0-9a-f-]{36})"/,
    /aria-labelledby="play-([0-9a-f-]{36})/,
  ];
  for (const pattern of patterns) {
    const match = page.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function extractSeriesEpisodes(page) {
  const episodes = [];
  const domRegex = /data-element-id="([0-9a-f-]{36})"[\s\S]{0,4200}?<!--\[!-->(Épisode\s+\d+[^<"]+)/g;
  let domMatch;

  while ((domMatch = domRegex.exec(page))) {
    const title = decodeJsString(domMatch[2]);
    const number = title.match(/Épisode\s+(\d+)/i)?.[1];
    if (number && !episodes.some((episode) => episode.id === domMatch[1])) {
      episodes.push({ id: domMatch[1], number, title });
    }
  }

  const expressionRegex = /id:"([0-9a-f-]{36})"[\s\S]{0,2600}?titleProps:\{[\s\S]{0,1000}?title:"([^"]+)"/g;
  let match;

  while ((match = expressionRegex.exec(page))) {
    const title = decodeJsString(match[2]);
    const number = title.match(/Épisode\s+(\d+)/i)?.[1];
    if (number && !episodes.some((episode) => episode.id === match[1])) {
      episodes.push({ id: match[1], number, title });
    }
  }

  // Fallback: use cardtitle order for series whose episodes aren't titled "Épisode N"
  if (episodes.length === 0) {
    const cardRegex = /id="cardtitle-([0-9a-f-]{36})"/g;
    let cardMatch;
    let pos = 1;
    const seen = new Set();
    while ((cardMatch = cardRegex.exec(page))) {
      const id = cardMatch[1];
      if (!seen.has(id)) {
        seen.add(id);
        episodes.push({ id, number: String(pos), title: `Épisode ${pos}` });
        pos++;
      }
    }
  }

  return episodes;
}

function curl(url) {
  return execFileSync("curl", ["-L", "-sS", url], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function decodeJsString(value) {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function parseMarkdown(markdown) {
  const clean = markdown.replace(/^---[\s\S]*?---\s*/, "");
  const lines = clean.split(/\r?\n/);
  const parsed = [];
  let section = "";
  let pending = [];
  let order = 0;

  const flushPending = () => {
    if (!section || pending.length === 0) return;
    const podcast = parseStandaloneBlock(pending, section, order);
    if (podcast) {
      parsed.push(podcast);
      order += 1;
    }
    pending = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushPending();
      continue;
    }

    const heading = line.match(/^#\s+(.+)/);
    if (heading) {
      flushPending();
      section = heading[1].trim();
      continue;
    }

    if (line.startsWith("- ")) {
      const content = line.slice(2).trim();
      const looksLikeEpisode =
        /^Épisode\s+\d+/i.test(content) ||
        (/\d{2}\/\d{2}\/\d{4}/.test(content) && parseDuration(content) !== null);

      if (looksLikeEpisode) {
        const podcast = parseEpisodeLine(content, section, order, pending);
        if (podcast) {
          parsed.push(podcast);
          order += 1;
        }
      } else {
        pending.push(content);
      }
      continue;
    }

    if (/^Épisode\s+\d+/i.test(line) && (parseDuration(line) !== null || /\d{2}\/\d{2}\/\d{4}/.test(line))) {
      const podcast = parseEpisodeLine(line, section, order, pending);
      if (podcast) {
        parsed.push(podcast);
        order += 1;
      }
      continue;
    }

    pending.push(line);
  }

  flushPending();
  return parsed;
}

function parseStandaloneBlock(lines, section, order) {
  const url = lines.find((line) => /^https?:\/\//.test(line)) || "";
  const durationLine = lines.find((line) => parseDuration(line) !== null);
  const dateLine = lines.find((line) => parseDate(line) !== null);
  const station = lines.find((line) => /^France\s+/i.test(line)) || "";
  const nestedTitle = lines.find((line) => line.startsWith("- ") && !parseDuration(line) && !parseDate(line));
  const title = cleanTitle((nestedTitle || lines[0] || "").replace(/^- /, ""));

  if (!title || durationLine === undefined) return null;

  return enrichPodcast({
    id: makeId(section, title, url || String(order)),
    title,
    section,
    author: authorsByWork[section] || "",
    station,
    duration: parseDuration(durationLine || ""),
    date: parseDate(dateLine || ""),
    url,
    series: "",
    order,
  });
}

function parseEpisodeLine(text, section, order, contextLines) {
  const urlMatch = text.match(/https?:\/\/\S+/);
  const url = urlMatch ? urlMatch[0] : "";
  const metadataMatch = text.match(/\(([^()]*(?:\d{2}\/\d{2}\/\d{4})[^()]*)\)/);
  const metadata = metadataMatch ? metadataMatch[1] : text;
  const station = contextLines.find((line) => /^France\s+/i.test(line)) || "";
  const series = contextLines[0] ? cleanTitle(contextLines[0]) : "";
  const titleText = text
    .replace(/https?:\/\/\S+/, "")
    .replace(/\([^()]*\d{2}\/\d{2}\/\d{4}[^()]*\)/, "")
    .trim();

  const title = cleanTitle(series ? `${series} - ${titleText}` : titleText);
  const duration = parseDuration(metadata);
  const date = parseDate(metadata);

  if (!title || duration === null) return null;

  return enrichPodcast({
    id: makeId(section, title, url || String(order)),
    title,
    section,
    author: authorsByWork[section] || "",
    station,
    duration,
    date,
    url: url || contextLines.find((line) => /^https?:\/\//.test(line)) || "",
    series,
    order,
  });
}

function enrichPodcast(podcast) {
  return podcast;
}

function parseDuration(text) {
  if (!text) return null;
  const hourMatch = text.match(/(\d+)\s*h(?:\s*(\d+)\s*min)?/i);
  if (hourMatch) return Number(hourMatch[1]) * 60 + Number(hourMatch[2] || 0);
  const minuteMatch = text.match(/(\d+)\s*min/i);
  return minuteMatch ? Number(minuteMatch[1]) : null;
}

function parseDate(text) {
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function cleanTitle(title) {
  return title.replace(/["“”]/g, "").replace(/\s+/g, " ").trim();
}

function makeId(section, title, suffix) {
  return `${section}-${title}-${suffix}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
