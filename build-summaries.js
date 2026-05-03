const { readFileSync, writeFileSync } = require("fs");

const html = readFileSync("index.html", "utf8");
const raw = JSON.parse(readFileSync("summaries.json", "utf8"));

const summaries = {};
for (const [id, entry] of Object.entries(raw)) {
  const summary = (entry.summary || "").replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
  if (summary) summaries[id] = summary;
}

const json = JSON.stringify(summaries, null, 2);
const block = `<script id="summaryData" type="application/json">\n${json}\n  </script>`;

let nextHtml = html;
if (nextHtml.includes('<script id="summaryData" type="application/json">')) {
  nextHtml = nextHtml.replace(
    /<script id="summaryData" type="application\/json">[\s\S]*?<\/script>/,
    block,
  );
} else {
  nextHtml = nextHtml.replace(
    `  <template id="cardTemplate">`,
    `  ${block}\n\n  <template id="cardTemplate">`,
  );
}

writeFileSync("index.html", nextHtml);
console.log(`${Object.keys(summaries).length} résumés intégrés.`);
