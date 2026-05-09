const { readFileSync, writeFileSync } = require("fs");

const INPUT_FILE = "summaries.json";
const OUTPUT_FILE = "summaries-clean.json";
const REPORT_FILE = "summaries-clean-report.json";

const raw = JSON.parse(readFileSync(INPUT_FILE, "utf8"));
const cleaned = {};
const report = {
  input: INPUT_FILE,
  output: OUTPUT_FILE,
  total: 0,
  withTranscript: 0,
  emptyTranscript: 0,
  changed: 0,
  corrections: {},
  entries: {},
};

for (const [id, entry] of Object.entries(raw)) {
  report.total += 1;
  const transcript = typeof entry.transcript === "string" ? entry.transcript : "";
  const nextEntry = { ...entry };
  const entryCorrections = {};

  for (const field of ["title", "summary"]) {
    if (typeof nextEntry[field] !== "string") continue;
    const result = cleanProperNouns(nextEntry[field]);
    nextEntry[field] = result.text;
    mergeCorrections(entryCorrections, result.corrections);
  }

  if (!transcript.trim()) {
    report.emptyTranscript += 1;
    if (Object.keys(entryCorrections).length) {
      report.changed += 1;
      report.entries[id] = {
        title: nextEntry.title || "",
        beforeLength: 0,
        afterLength: 0,
        corrections: entryCorrections,
      };
      mergeCorrections(report.corrections, entryCorrections);
    }
    cleaned[id] = nextEntry;
    continue;
  }

  report.withTranscript += 1;
  const result = cleanTranscript(transcript);
  nextEntry.transcript = result.text;
  mergeCorrections(entryCorrections, result.corrections);
  cleaned[id] = nextEntry;

  if (Object.keys(entryCorrections).length) {
    report.changed += 1;
    report.entries[id] = {
      title: nextEntry.title || "",
      beforeLength: transcript.length,
      afterLength: result.text.length,
      corrections: entryCorrections,
    };
    mergeCorrections(report.corrections, entryCorrections);
  }
}

writeFileSync(OUTPUT_FILE, JSON.stringify(cleaned, null, 2), "utf8");
writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");

console.log(`${report.withTranscript} transcriptions nettoyees`);
console.log(`${report.changed} entrees modifiees`);
console.log(`Resultat : ${OUTPUT_FILE}`);
console.log(`Rapport : ${REPORT_FILE}`);

function cleanTranscript(value) {
  const result = cleanProperNouns(value);
  const corrections = result.corrections;
  let text = result.text;

  text = removePattern(
    text,
    /\s*Sous-titres? réalisés? par la communauté d'Amara\.org\.?\s*$/i,
    "remove Amara subtitle credit",
    corrections,
  );
  text = removePattern(
    text,
    /\s*Sous-titrage\s+ST['’]\s*501\s*$/i,
    "remove ST501 subtitle credit",
    corrections,
  );
  text = removePattern(
    text,
    /\s*(?:La première partie est terminée\.?\s*){2,}$/i,
    "remove repeated first part ending",
    corrections,
  );
  text = removePattern(
    text,
    /\s*(?:La seconde partie est terminée\.?\s*){2,}$/i,
    "remove repeated second part ending",
    corrections,
  );
  text = removePattern(
    text,
    /\s*(?:La troisième partie est terminée\.?\s*){2,}$/i,
    "remove repeated third part ending",
    corrections,
  );
  text = removePattern(
    text,
    /\s*(?:La première partie(?: de la série)? est terminée\.?\s*|La deuxième partie est terminée\.?\s*|La seconde partie est terminée\.?\s*|La troisième partie est terminée\.?\s*){2,}$/i,
    "remove repeated part endings",
    corrections,
  );

  text = trimRepeatedTail(text, corrections);
  text = normalizeWhitespace(text);

  return { text, corrections };
}

function cleanProperNouns(value) {
  const corrections = {};
  let text = value;

  text = replaceAll(text, /\bEtienne De La Boetie\b/g, "Étienne de La Boétie", "title Etienne De La Boetie -> Etienne de La Boetie", corrections);
  text = replaceAll(text, /\bLa Boetie\b/g, "La Boétie", "title La Boetie -> La Boetie", corrections);
  text = replaceAll(text, /\bHomer\b/g, "Homère", "Homer -> Homere", corrections);
  text = replaceAll(
    text,
    /\bEtienne de (?:la|La) Bo[eé]tie\b/g,
    "Étienne de La Boétie",
    "Etienne de la Boetie -> Etienne de La Boetie",
    corrections,
  );
  text = replaceAll(
    text,
    /\bÉtienne de la Boétie\b/g,
    "Étienne de La Boétie",
    "Etienne de la Boetie capitalization",
    corrections,
  );
  text = replaceAll(text, /\bLa Boeotie\b/g, "La Boétie", "Boeotie -> Boetie", corrections);
  text = replaceAll(text, /\bBoeotie\b/g, "Boétie", "Boeotie -> Boetie", corrections);
  text = replaceAll(
    text,
    /\b(?:la\s+)?Boey(?:si|ssi|sie|sier)\b/gi,
    "La Boétie",
    "Boeysi variants -> La Boetie",
    corrections,
  );
  text = replaceAll(
    text,
    /\b(?:E|É)?l?aboessi\b/gi,
    "La Boétie",
    "Laboessi -> La Boetie",
    corrections,
  );
  text = replaceAll(text, /\bLaboesi\b/g, "La Boétie", "Laboesi -> La Boetie", corrections);
  text = replaceAll(
    text,
    /\bl['’]Aboeïsie\b/gi,
    "La Boétie",
    "Aboeisie -> La Boetie",
    corrections,
  );
  text = replaceAll(
    text,
    /\bDelaboessy\b/g,
    "de La Boétie",
    "Delaboessy -> de La Boetie",
    corrections,
  );
  text = replaceAll(
    text,
    /\blaboessienne\b/gi,
    "la boétienne",
    "laboessienne -> la boetienne",
    corrections,
  );
  text = replaceAll(
    text,
    /\blaboéciste\b/gi,
    "boétien",
    "laboeciste -> boetien",
    corrections,
  );
  text = replaceAll(
    text,
    /\bpara la communauté d'Amara\.org\b/gi,
    "par la communauté d'Amara.org",
    "para la communaute -> par la communaute",
    corrections,
  );

  text = normalizeWhitespace(text);

  return { text, corrections };
}

function replaceAll(text, pattern, replacement, label, corrections) {
  let count = 0;
  const next = text.replace(pattern, () => {
    count += 1;
    return replacement;
  });
  if (count) corrections[label] = (corrections[label] || 0) + count;
  return next;
}

function removePattern(text, pattern, label, corrections) {
  const next = text.replace(pattern, "");
  if (next !== text) corrections[label] = (corrections[label] || 0) + 1;
  return next;
}

function normalizeWhitespace(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([.!?])([A-ZÉÈÀÂÊÎÔÛÇ])/g, "$1 $2")
    .trim();
}

function mergeCorrections(target, source) {
  for (const [name, count] of Object.entries(source)) {
    target[name] = (target[name] || 0) + count;
  }
}

function trimRepeatedTail(text, corrections) {
  const words = text.match(/\S+/g) || [];
  for (let size = 3; size <= 12; size += 1) {
    if (words.length < size * 8) continue;
    const phrase = words.slice(-size).join(" ").toLowerCase();
    let repeats = 1;
    for (let offset = size * 2; offset <= size * 30; offset += size) {
      const start = words.length - offset;
      const end = start + size;
      if (start < 0) break;
      if (words.slice(start, end).join(" ").toLowerCase() !== phrase) break;
      repeats += 1;
    }
    if (repeats >= 4) {
      const keep = words.length - size * (repeats - 1);
      corrections["trim repeated tail"] = (corrections["trim repeated tail"] || 0) + 1;
      return words.slice(0, keep).join(" ");
    }
  }
  return text;
}
