#!/usr/bin/env node
console.error(
  [
    "Ce generateur a ete remplace.",
    "Utilise maintenant : node matu/generate-transcript-study-data.js",
    "Il regenere les quiz uniquement pour les podcasts qui ont une transcription.",
  ].join("\n"),
);
process.exit(1);
