const { createHash } = require("crypto");
const { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } = require("fs");
const http = require("http");
const { join } = require("path");

const ROOT = __dirname;
const SUMMARY_FILE = join(ROOT, "summaries.json");
const INDEX_FILE = join(ROOT, "index.html");
const QUIZ_FILE = join(ROOT, "quiz", "quiz-data.js");
const QUIZ_INDEX_FILE = join(ROOT, "quiz.html");
const QUIZ_DIR = join(ROOT, "quiz");
const CACHE_FILE = join(ROOT, ".quiz-generation-cache.json");

const MODEL = process.env.QUIZ_MODEL || "qwen3.6:latest";
const OLLAMA_URL = new URL(process.env.OLLAMA_URL || "http://127.0.0.1:11434");
const MAX_EXCERPT_CHARS = Number(process.env.QUIZ_EXCERPT_CHARS || 9000);
const FORCE = hasFlag("--force") || process.env.QUIZ_FORCE === "1";
const DRY_RUN = hasFlag("--dry-run") || process.env.QUIZ_DRY_RUN === "1";
const LIMIT = Number(process.env.QUIZ_LIMIT || getArg("--limit") || 0);
const WORK_FILTER = new Set(
  String(process.env.QUIZ_WORKS || getArg("--works") || "")
    .split(",")
    .map((work) => work.trim())
    .filter(Boolean),
);
const ID_FILTER = new Set(
  String(process.env.QUIZ_IDS || getArg("--ids") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

const bannedQuizText =
  /(quelle\s+date|date\s+de\s+(diffusion|publication)|dur[ée]e\s+de|combien\s+de\s+minutes|plateforme|origine\s+du\s+podcast|nom de l['’]?[ée]mission|France Culture|France Inter|Spotify|Radio France|ce podcast est int[ée]ressant|retenir seulement|rep[èe]res sans|pr[ée]sentation neutre|source\s+et\s+la\s+date)/i;

const MANUAL_QUIZ_OVERRIDES = {
  "matu-madame-bovary-madame-bovary-de-gustave-flaubert-episode-1-10-la-jeunesse-de-charles-0": [
    {
      prompt: "Quel effet produit le « nous » au début de l'épisode ?",
      choices: [
        "Il place Charles sous le regard collectif de la classe, donc sous un regard déjà moqueur et social.",
        "Il donne directement accès à la conscience intime de Charles.",
        "Il annonce que le roman sera raconté par Emma après coup.",
        "Il sert surtout à créer une neutralité documentaire sans ironie.",
      ],
      answer: 0,
      feedback:
        "Le « nous » installe une scène d'observation collective : Charles apparaît d'abord comme celui qu'on regarde, qu'on juge et qu'on ridiculise.",
    },
    {
      prompt: "Pourquoi la longue description de la casquette de Charles est-elle importante ?",
      choices: [
        "Elle prouve que Charles possède déjà une élégance provinciale sûre d'elle.",
        "Elle transforme un objet ridicule en portrait indirect : la casquette résume le mauvais goût, la gêne et l'inadaptation de Charles.",
        "Elle sert seulement à ralentir le récit avant l'arrivée d'Emma.",
        "Elle annonce que Charles deviendra un personnage mondain.",
      ],
      answer: 1,
      feedback:
        "La casquette fonctionne comme un portrait par l'objet : sa laideur composite rend visible la maladresse sociale de Charles.",
    },
    {
      prompt: "Que révèle l'épisode du nom « Charbovary » ?",
      choices: [
        "Charles impose immédiatement son autorité face aux autres élèves.",
        "Le roman associe d'emblée le nom Bovary à une scène de prestige familial.",
        "L'identité de Charles naît dans le malentendu, le bruit et l'humiliation publique.",
        "Flaubert donne une information généalogique essentielle sur les Bovary.",
      ],
      answer: 2,
      feedback:
        "Le nom mal entendu fait entrer Charles dans le roman par une humiliation sonore : avant même d'agir, il est déjà exposé au rire.",
    },
    {
      prompt: "Comment la transcription présente-t-elle les études de médecine de Charles à Rouen ?",
      choices: [
        "Comme une vocation brillante qui révèle une intelligence longtemps cachée.",
        "Comme une formation choisie librement contre la volonté familiale.",
        "Comme une ascension héroïque vers le savoir scientifique.",
        "Comme un apprentissage mécanique : Charles travaille, mais comprend mal et avance sans vraie maîtrise.",
      ],
      answer: 3,
      feedback:
        "Charles est appliqué plus qu'intelligent : l'image du cheval de manège montre une énergie qui tourne à vide.",
    },
    {
      prompt: "Quel rôle joue le premier mariage de Charles avec Héloïse ?",
      choices: [
        "Il montre un Charles déjà passif, pris dans les décisions de sa mère et les arrangements sociaux.",
        "Il constitue le grand amour romantique qui servira de modèle à Emma.",
        "Il prouve que Charles sait manipuler son entourage pour réussir.",
        "Il n'a aucune fonction dans la construction du personnage.",
      ],
      answer: 0,
      feedback:
        "Le mariage avec Héloïse renforce la passivité de Charles : sa vie se décide largement autour de lui, par intérêt et convenance.",
    },
    {
      prompt: "Pourquoi Emma n'apparaît-elle pas immédiatement dans cette première étape ?",
      choices: [
        "Parce que Flaubert veut d'abord installer le cadre médiocre auquel son désir d'absolu va se heurter.",
        "Parce que le roman s'intéresse finalement davantage à Héloïse qu'à Emma.",
        "Parce que l'épisode cherche à faire de Charles un héros romantique complet.",
        "Parce que l'intrigue principale commence seulement après la mort de Charles.",
      ],
      answer: 0,
      feedback:
        "Le détour par Charles prépare le contraste : avant le rêve d'Emma, Flaubert installe la banalité du monde qui l'attend.",
    },
    {
      prompt: "Quel contresens faut-il éviter sur Charles dans cet incipit ?",
      choices: [
        "Voir en Charles un simple faire-valoir comique, alors qu'il porte aussi une critique de la médiocrité ordinaire.",
        "Dire que Charles est présenté à travers des scènes d'humiliation.",
        "Relier la casquette à une forme de portrait indirect.",
        "Comprendre que l'ironie passe par des détails concrets.",
      ],
      answer: 0,
      feedback:
        "Charles est drôle, oui, mais pas seulement : il incarne un rapport pauvre au monde, aux désirs et au langage.",
    },
    {
      prompt: "Quelle phrase serait la plus solide dans une copie ?",
      choices: [
        "Charles est ridicule uniquement parce que ses camarades sont méchants avec lui.",
        "L'ouverture de Madame Bovary transforme l'entrée d'un collégien maladroit en diagnostic social : avant Emma, le roman donne à voir la médiocrité qui l'enfermera.",
        "La première scène sert surtout à expliquer objectivement le métier de médecin au XIXe siècle.",
        "La casquette est un détail pittoresque que l'on peut supprimer sans perdre le sens de l'incipit.",
      ],
      answer: 1,
      feedback:
        "Cette formulation relie détail narratif, portrait de Charles et enjeu global du roman : c'est exactement le type de phrase réutilisable.",
    },
  ],
  "matu-madame-bovary-madame-bovary-french-version-madame-bovary-french-version-part-1-18": [
    {
      prompt: "Que met en place l'ouverture consacrée à Charles au collège ?",
      choices: [
        "Un héros brillant, immédiatement admiré par ses camarades.",
        "Un personnage maladroit, observé par le groupe et déjà associé à la gêne sociale.",
        "Un rival de Rodolphe qui cherche à séduire Emma dès l'enfance.",
        "Un narrateur sûr de lui qui commente son propre passé.",
      ],
      answer: 1,
      feedback:
        "L'entrée de Charles, sa casquette et le nom mal entendu le placent d'emblée sous le signe du ridicule, de la passivité et du regard collectif.",
    },
    {
      prompt: "Pourquoi Emma se déçoit-elle si vite après son mariage avec Charles ?",
      choices: [
        "Parce que Charles refuse de vivre à la campagne et impose une vie mondaine.",
        "Parce que ses rêves nourris par les lectures romanesques se heurtent à une existence provinciale banale.",
        "Parce qu'elle comprend que Léon l'a déjà oubliée avant leur première rencontre.",
        "Parce que son père lui interdit toute forme de lecture après la noce.",
      ],
      answer: 1,
      feedback:
        "La transcription oppose les attentes d'Emma, formées par les romans et l'imaginaire sentimental, à la médiocrité quotidienne de son mariage.",
    },
    {
      prompt: "Quel effet produit le bal de la Vaubyessard sur Emma ?",
      choices: [
        "Il l'aide à accepter définitivement sa condition de femme de médecin.",
        "Il lui révèle que l'aristocratie est aussi pauvre que Yonville.",
        "Il cristallise son rêve d'une vie élégante et rend son quotidien encore plus insupportable.",
        "Il la pousse à rompre immédiatement avec toutes ses illusions romantiques.",
      ],
      answer: 2,
      feedback:
        "Le bal devient une scène de fascination : Emma y entrevoit un monde de luxe qui aggrave ensuite son dégoût de la vie ordinaire.",
    },
    {
      prompt: "Comment comprendre la relation entre Emma et Léon à Yonville ?",
      choices: [
        "Ils partagent les mêmes rêveries sentimentales, mais restent prisonniers de la timidité et des conventions.",
        "Léon manipule Emma avec cynisme dès leur première conversation.",
        "Emma voit en Léon un simple ami de Charles, sans trouble personnel.",
        "Leur relation sert surtout à montrer qu'Emma renonce à toute passion.",
      ],
      answer: 0,
      feedback:
        "Leur proximité vient de goûts communs et d'une même imagination romanesque, mais la relation demeure longtemps suspendue et inaboutie.",
    },
    {
      prompt: "Quelle stratégie Rodolphe emploie-t-il pour séduire Emma ?",
      choices: [
        "Il lui propose une vie domestique stable et sans discours amoureux.",
        "Il exploite son désir d'évasion en tenant un langage passionné, notamment pendant les comices agricoles.",
        "Il demande à Charles de défendre officiellement leur relation.",
        "Il cherche surtout à convertir Emma à la prudence bourgeoise.",
      ],
      answer: 1,
      feedback:
        "Rodolphe comprend la frustration d'Emma et se sert d'un vocabulaire de passion et de liberté, alors que le cadre public des comices souligne l'ironie de la scène.",
    },
  ],
  "matu-madame-bovary-madame-bovary-french-version-madame-bovary-french-version-part-2-19": [
    {
      prompt: "Que révèle la lettre du père Rouault au début de cette seconde partie du livre audio ?",
      choices: [
        "Elle rappelle à Emma un lien familial simple et affectueux qui contraste avec l'artifice de sa liaison.",
        "Elle annonce que Rouault souhaite ruiner volontairement Charles.",
        "Elle prouve que Rodolphe est sincèrement accepté par la famille d'Emma.",
        "Elle détourne définitivement Emma de toute nostalgie.",
      ],
      answer: 0,
      feedback:
        "La lettre, très concrète et tendre, fait revenir le monde d'origine d'Emma et trouble son imaginaire adultère.",
    },
    {
      prompt: "Pourquoi Rodolphe renonce-t-il au projet de fuite avec Emma ?",
      choices: [
        "Parce qu'il découvre que Charles prépare déjà le même départ.",
        "Parce qu'il aime Emma mais veut attendre l'accord de Rouault.",
        "Parce qu'il refuse les contraintes réelles d'une passion qu'il avait surtout traitée comme une aventure.",
        "Parce que Léon l'oblige à rompre par jalousie.",
      ],
      answer: 2,
      feedback:
        "Rodolphe séduit Emma mais recule devant l'engagement concret : sa lettre de rupture montre le calcul derrière le discours amoureux.",
    },
    {
      prompt: "Quel rôle joue la rencontre avec Léon à Rouen après la crise provoquée par Rodolphe ?",
      choices: [
        "Elle donne à Emma une seconde scène de passion où l'imaginaire romantique se réactive.",
        "Elle referme toutes les possibilités d'adultère et ramène Emma vers Charles.",
        "Elle transforme Léon en juge moral chargé de condamner Emma.",
        "Elle sert uniquement à expliquer la carrière juridique de Léon.",
      ],
      answer: 0,
      feedback:
        "Léon ranime chez Emma le désir d'un amour romanesque, notamment dans le contexte théâtral et urbain de Rouen.",
    },
    {
      prompt: "Comment Lheureux contribue-t-il à la catastrophe ?",
      choices: [
        "Il protège Emma des dépenses inutiles en refusant de lui faire crédit.",
        "Il convertit les désirs d'Emma en dettes, billets et dépendance financière.",
        "Il révèle immédiatement toutes les dépenses d'Emma à Charles pour la sauver.",
        "Il agit seulement comme un témoin neutre de la vie conjugale.",
      ],
      answer: 1,
      feedback:
        "Lheureux nourrit les achats d'Emma puis les transforme en piège juridique et financier, jusqu'à la saisie.",
    },
    {
      prompt: "Quel contresens faut-il éviter sur la fin du récit ?",
      choices: [
        "Croire que la mort d'Emma rétablit un ordre moral simple et juste.",
        "Voir dans Charles un personnage qui souffre après la mort d'Emma.",
        "Comprendre que Homais tire profit du monde bourgeois décrit par le roman.",
        "Relier la ruine d'Emma à ses dettes autant qu'à ses illusions.",
      ],
      answer: 0,
      feedback:
        "La fin est ironique et cruelle : Charles s'effondre, Berthe est sacrifiée socialement, tandis que Homais prospère.",
    },
  ],
};

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

async function main() {
  const summaries = JSON.parse(readFileSync(SUMMARY_FILE, "utf8"));
  const cache = readCache();
  const entries = selectEntries(summaries);
  const generated = [];

  console.log(`Modele Ollama: ${MODEL}`);
  console.log(`${entries.length} entree(s) avec transcription a traiter.`);

  for (const [index, [podcastId, entry]] of entries.entries()) {
    const hash = hashEntry(entry);
    const cached = cache[podcastId];

    if (!FORCE && cached?.model === MODEL && cached?.hash === hash && isValidGenerated(cached.generated)) {
      generated.push(makeQuiz(podcastId, entry, cached.generated));
      entry.summary = summaryToHtml(cached.generated.summaryMarkdown);
      console.log(`[${index + 1}/${entries.length}] cache: ${entry.work} - ${entry.title}`);
      continue;
    }

    console.log(`[${index + 1}/${entries.length}] generation: ${entry.work} - ${entry.title}`);
    const generatedContent = await generateFromTranscript(entry);
    generated.push(makeQuiz(podcastId, entry, generatedContent));
    entry.summary = summaryToHtml(generatedContent.summaryMarkdown);
    cache[podcastId] = {
      hash,
      model: MODEL,
      generatedAt: new Date().toISOString(),
      generated: generatedContent,
    };
    writeCache(cache);
  }

  if (DRY_RUN) {
    console.log("DRY RUN: aucun fichier public modifie.");
    console.log(JSON.stringify(generated.slice(0, 1), null, 2));
    return;
  }

  for (const entry of Object.values(summaries)) {
    if (entry.summary?.trim()) entry.summary = summaryToHtml(entry.summary);
  }

  writeFileSync(SUMMARY_FILE, `${JSON.stringify(summaries, null, 2)}\n`, "utf8");
  writeFileSync(QUIZ_FILE, `window.quizData = ${JSON.stringify(generated, null, 2)};\n`, "utf8");

  mkdirSync(QUIZ_DIR, { recursive: true });
  const expectedPages = new Set(generated.map((quiz) => `${quiz.id}.html`));
  for (const quiz of generated) {
    writeFileSync(join(QUIZ_DIR, `${quiz.id}.html`), makeQuizPage(quiz), "utf8");
  }
  removeStaleQuizPages(expectedPages);
  updateIndexHtml(summaries, generated);
  updateQuizIndex(generated);

  console.log(`${generated.length} quiz fondes sur transcription publies.`);
}

function selectEntries(summaries) {
  const selected = Object.entries(summaries).filter(([podcastId, entry]) => {
    if (!entry?.transcript?.trim()) return false;
    if (WORK_FILTER.size > 0 && !WORK_FILTER.has(entry.work)) return false;
    if (ID_FILTER.size > 0 && !ID_FILTER.has(podcastId) && !ID_FILTER.has(podcastId.replace(/^matu-/, ""))) return false;
    return true;
  });
  return LIMIT > 0 ? selected.slice(0, LIMIT) : selected;
}

async function generateFromTranscript(entry) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await callOllama(buildPrompt(entry, attempt, lastError));
      return normalizeGenerated(response);
    } catch (error) {
      lastError = error;
      console.warn(`  tentative ${attempt} invalide: ${error.message}`);
    }
  }
  throw new Error(`Generation impossible pour "${entry.title}": ${lastError?.message || "erreur inconnue"}`);
}

function buildPrompt(entry, attempt, lastError) {
  const retryInstruction = attempt > 1
    ? `\nLa reponse precedente etait invalide: ${lastError.message}. Corrige strictement le JSON et les consignes.\n`
    : "";
  return `Tu es professeur de francais en classe de maturite.
Reponds UNIQUEMENT avec un JSON valide, sans Markdown hors JSON.
Schema exact:
{
  "summaryMarkdown": "## Résumé\\n\\n...\\n\\n## Points essentiels\\n\\n- ...",
  "questions": [
    {
      "prompt": "...",
      "choices": ["...", "...", "...", "..."],
      "answer": 0,
      "feedback": "..."
    }
  ]
}

Objectif:
- Le resume et les questions doivent s'appuyer sur la transcription fournie.
- Cree exactement 5 QCM qui testent la comprehension du podcast: these centrale, nuance de l'intervenant, exemple analyse, role d'un personnage/idee, contresens a eviter.
- Chaque bonne reponse doit etre deduisible de la transcription.
- Les distracteurs doivent etre plausibles, mais faux ou moins precis que la bonne reponse.
- Le feedback explique en une phrase pourquoi la bonne reponse convient, en s'appuyant sur la transcription.

Interdictions absolues:
- Aucune question sur la date, la source, la duree, la plateforme, l'origine, le nom de l'emission ou l'ordre de l'episode.
- Aucune question dont la bonne reponse serait seulement le titre du podcast.
- Aucun choix du type "ce podcast est interessant", "retenir la date", "presentation neutre", "reperes sans probleme".
- N'invente pas un element qui ne figure pas dans la transcription.

Metadonnees:
- Oeuvre: ${entry.work || ""}
- Auteur: ${entry.author || ""}
- Titre du podcast: ${entry.title || ""}
- Serie: ${entry.series || ""}

Transcription ou extraits representatifs:
${makeTranscriptDossier(entry)}
${retryInstruction}`;
}

function makeTranscriptDossier(entry) {
  const clean = String(entry.transcript || "").replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_EXCERPT_CHARS) return clean;

  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 45 && sentence.length <= 320)
    .filter((sentence) => !/^\s*(France Culture|France Inter|Radio France|Vous ecoutez|Vous écoutez)/i.test(sentence));
  const keywords = getKeywords([entry.work, entry.author, entry.title, entry.series].filter(Boolean).join(" "));
  const selected = new Map();

  for (const sentence of sentences.slice(0, 12)) selected.set(sentence, true);
  for (const sentence of sentences.slice(-8)) selected.set(sentence, true);

  const scored = sentences
    .map((sentence, index) => ({ sentence, index, score: scoreSentence(sentence, keywords) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 34)
    .sort((a, b) => a.index - b.index);

  for (const item of scored) selected.set(item.sentence, true);

  let dossier = [...selected.keys()].join(" ");
  if (dossier.length > MAX_EXCERPT_CHARS) {
    dossier = dossier.slice(0, MAX_EXCERPT_CHARS).replace(/\s+\S*$/, "");
  }
  return dossier;
}

function getKeywords(value) {
  const stopwords = new Set([
    "avec", "dans", "des", "du", "une", "les", "pour", "sur", "est", "qui", "que", "quoi",
    "episode", "episodes", "partie", "madame", "fleurs", "mal", "mariage",
  ]);
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !stopwords.has(word));
}

function scoreSentence(sentence, keywords) {
  const normalized = normalize(sentence);
  let score = 0;
  for (const keyword of keywords) {
    if (normalized.includes(keyword)) score += 4;
  }
  if (/[A-Z][a-z]+/.test(sentence)) score += 1;
  if (/(donc|mais|parce|ainsi|cependant|en revanche|c'est-a-dire|c’est-à-dire|montre|explique|signifie|revele|révèle)/i.test(sentence)) {
    score += 2;
  }
  if (sentence.length > 110 && sentence.length < 240) score += 1;
  return score;
}

function callOllama(prompt) {
  const body = JSON.stringify({
    model: MODEL,
    prompt,
    stream: false,
    format: "json",
    think: false,
    keep_alive: "30m",
    options: {
      temperature: 0.18,
      top_p: 0.9,
      num_ctx: 16384,
      num_predict: 2600,
    },
  });

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: OLLAMA_URL.hostname,
        port: OLLAMA_URL.port || 11434,
        path: "/api/generate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 180000,
      },
      (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) reject(new Error(parsed.error));
            else resolve(parsed.response || "");
          } catch (error) {
            reject(new Error(`Reponse Ollama non JSON: ${error.message}`));
          }
        });
      },
    );
    request.on("timeout", () => {
      request.destroy(new Error("Delai Ollama depasse"));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

function normalizeGenerated(rawResponse) {
  const parsed = parseJsonResponse(rawResponse);
  const questions = parsed.questions || parsed.qcm || parsed.quiz || parsed.QCM;
  const summaryMarkdown =
    parsed.summaryMarkdown || parsed.summary_markdown || parsed.summary || parsed.resume || parsed["résumé"];

  if (!Array.isArray(questions)) throw new Error("champ questions manquant");
  if (questions.length !== 5) throw new Error(`5 questions attendues, recu ${questions.length}`);
  if (!summaryMarkdown || typeof summaryMarkdown !== "string") throw new Error("summaryMarkdown manquant");

  const normalizedQuestions = questions.map((question, index) => normalizeQuestion(question, index));
  return {
    summaryMarkdown: normalizeSummary(summaryMarkdown),
    questions: normalizedQuestions,
  };
}

function parseJsonResponse(rawResponse) {
  const cleaned = String(rawResponse)
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/```(?:json)?/g, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("aucun objet JSON trouve");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeQuestion(question, index) {
  const prompt = cleanText(question.prompt || question.question || question.intitule || question.intitulé);
  const choices = question.choices || question.options || question.reponses || question.réponses;
  if (!prompt) throw new Error(`question ${index + 1}: prompt manquant`);
  if (bannedQuizText.test(prompt)) throw new Error(`question ${index + 1}: prompt interdit`);
  if (!Array.isArray(choices) || choices.length !== 4) throw new Error(`question ${index + 1}: 4 choix attendus`);

  const cleanChoices = choices.map(cleanText);
  if (cleanChoices.some((choice) => !choice)) throw new Error(`question ${index + 1}: choix vide`);
  if (new Set(cleanChoices.map((choice) => normalize(choice))).size !== cleanChoices.length) {
    throw new Error(`question ${index + 1}: choix dupliques`);
  }
  if (cleanChoices.some((choice) => bannedQuizText.test(choice))) {
    throw new Error(`question ${index + 1}: choix interdit`);
  }

  const answer = parseAnswer(question.answer ?? question.correct ?? question.correctAnswer ?? question.bonne_reponse, cleanChoices);
  if (!Number.isInteger(answer) || answer < 0 || answer >= cleanChoices.length) {
    throw new Error(`question ${index + 1}: index de reponse invalide`);
  }

  const feedback = cleanText(question.feedback || question.explication || question.explanation);
  if (!feedback) throw new Error(`question ${index + 1}: feedback manquant`);

  return {
    prompt,
    choices: cleanChoices,
    answer,
    feedback: feedback.replace(/^(Correct|Exact|Bien joue|Bien joué)\s*[.!]?\s*/i, ""),
  };
}

function parseAnswer(value, choices) {
  if (typeof value === "number") return value;
  const text = cleanText(value);
  if (/^[A-D]$/i.test(text)) return text.toUpperCase().charCodeAt(0) - 65;
  if (/^[0-3]$/.test(text)) return Number(text);
  const exact = choices.findIndex((choice) => normalize(choice) === normalize(text));
  if (exact >= 0) return exact;
  return NaN;
}

function normalizeSummary(value) {
  let summary = String(value).trim();
  if (!/^##\s+Résumé/m.test(summary)) summary = `## Résumé\n\n${summary}`;
  if (!/##\s+Points essentiels/m.test(summary)) {
    summary += "\n\n## Points essentiels\n\n- Retenir l'idee directrice, un exemple precise par la transcription et une nuance d'interpretation.";
  }
  return summary.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
}

function makeQuiz(podcastId, entry, generatedContent) {
  const quizId = podcastId.replace(/^matu-/, "");
  return {
    id: quizId,
    podcastId,
    title: entry.title,
    work: entry.work,
    duration: entry.duration ? `${entry.duration} min` : "",
    source: [entry.origin, entry.date].filter(Boolean).join(", "),
    questions: MANUAL_QUIZ_OVERRIDES[podcastId] || generatedContent.questions,
  };
}

function makeQuizPage(quiz) {
  const title = escapeHtml(quiz.title);
  const meta = escapeHtml([quiz.work, quiz.duration, quiz.source, `${quiz.questions.length} questions`].filter(Boolean).join(" • "));
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Quiz - ${title}</title>
  <link rel="icon" href="data:,">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="../../styles.css?v=20260516-7">
  <link rel="stylesheet" href="../../quiz/quiz.css?v=20260509-2">
  <link rel="stylesheet" href="../matu.css">
</head>
<body class="quiz-page matu-page">
  <header class="topbar">
    <div>
      <p class="eyebrow">Quiz</p>
      <h1 id="quizTitle">${title}</h1>
      <p id="quizMeta" class="meta">${meta}</p>
      <nav class="quick-menu" aria-label="Accès rapides">
        <a href="../index.html">Podcasts</a>
        <a href="../quiz.html" aria-current="page">Quiz</a>
        <a href="../fiches.html">Fiches</a>
      </nav>
    </div>
    <div class="topbar-tools"><div class="topbar-main"><div class="header-actions"><button id="themeToggle" class="icon-button theme-toggle" type="button" aria-label="Activer le mode sombre" title="Activer le mode sombre"><i class="fa-solid fa-moon" aria-hidden="true"></i></button></div></div></div>
  </header>
  <main>
    <div class="quiz-layout">
      <div class="quiz-actions">
        <button id="checkBtn" class="quiz-primary" type="button"><i class="fa-solid fa-check" aria-hidden="true"></i> Corriger</button>
        <button id="resetBtn" class="quiz-secondary" type="button"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Réinitialiser</button>
        <a class="quiz-secondary" href="../quiz.html"><i class="fa-solid fa-list" aria-hidden="true"></i> Tous les quiz</a>
      </div>
      <section id="quizRoot" class="quiz-panel" aria-live="polite"></section>
    </div>
  </main>
  <script>window.QUIZ_ID = ${JSON.stringify(quiz.id)};</script>
  <script src="quiz-data.js"></script>
  <script src="../../quiz/quiz.js?v=20260428-1"></script>
  <script src="../../header.js?v=20260523-1" defer></script>
</body>
</html>
`;
}

function removeStaleQuizPages(expectedPages) {
  for (const file of readdirSync(QUIZ_DIR)) {
    if (!file.endsWith(".html")) continue;
    if (!expectedPages.has(file)) unlinkSync(join(QUIZ_DIR, file));
  }
}

function updateIndexHtml(allSummaries, allQuizzes) {
  const summaryData = {};
  const quizLinks = {};

  for (const [id, entry] of Object.entries(allSummaries)) {
    if (entry.transcript?.trim() && entry.summary?.trim()) {
      summaryData[id] = summaryToHtml(entry.summary);
    }
  }

  for (const quiz of allQuizzes) {
    quizLinks[quiz.podcastId] = `quiz/${quiz.id}.html`;
  }

  let html = readFileSync(INDEX_FILE, "utf8");
  html = replaceJsonScript(html, "summaryData", summaryData);
  html = replaceJsonScript(html, "quizLinks", quizLinks);
  writeFileSync(INDEX_FILE, html, "utf8");
}

function updateQuizIndex(allQuizzes) {
  const grouped = new Map();
  for (const quiz of allQuizzes) {
    if (!grouped.has(quiz.work)) grouped.set(quiz.work, []);
    grouped.get(quiz.work).push(quiz);
  }

  const section = [
    '    <section class="quiz-dropdowns" aria-label="Questionnaires par œuvre">',
    ...[...grouped.entries()].map(([work, quizzes], index) => makeQuizDropdown(work, quizzes, index === 0)),
    "    </section>",
  ].join("\n");

  let html = readFileSync(QUIZ_INDEX_FILE, "utf8");
  html = html.replace(
    /    <section class="quiz-dropdowns" aria-label="Questionnaires par œuvre">[\s\S]*?    <\/section>/,
    section,
  );
  writeFileSync(QUIZ_INDEX_FILE, html, "utf8");
}

function makeQuizDropdown(work, quizzes, open) {
  const links = quizzes
    .map((quiz) => {
      return `          <a href="quiz/${escapeHtml(quiz.id)}.html"><strong>${escapeHtml(quiz.title)}</strong><span>${quiz.questions.length} questions</span></a>`;
    })
    .join("\n");

  return `      <details class="quiz-dropdown"${open ? " open" : ""}>
        <summary>
          <span>
            <strong>${escapeHtml(work)}</strong>
            <span>${quizzes.length} questionnaires</span>
          </span>
        </summary>
        <div class="quiz-index-list quiz-dropdown-list">
${links}
        </div>
      </details>`;
}

function replaceJsonScript(html, id, data) {
  const block = `<script id="${id}" type="application/json">\n${JSON.stringify(data, null, 2)}\n  </script>`;
  return html.replace(
    new RegExp(`<script id="${id}" type="application/json">[\\s\\S]*?<\\/script>`),
    block,
  );
}

function summaryToHtml(value) {
  const text = String(value || "").replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
  if (!text) return "";
  if (/^\s*<(h[1-6]|p|ul|ol|section|article|div)\b/i.test(text)) return sanitizeSummaryHtml(text);

  const lines = text.split(/\r?\n/);
  const html = [];
  let listType = "";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(4, Number(heading[1].length) + 1);
      html.push(`<h${level}>${inlineSummaryMarkup(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      openList("ul");
      html.push(`<li>${inlineSummaryMarkup(bullet[1])}</li>`);
      continue;
    }

    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (numbered) {
      openList("ol");
      html.push(`<li>${inlineSummaryMarkup(numbered[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${inlineSummaryMarkup(line)}</p>`);
  }

  closeList();
  return html.join("");

  function openList(type) {
    if (listType === type) return;
    closeList();
    listType = type;
    html.push(`<${type}>`);
  }

  function closeList() {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = "";
  }
}

function inlineSummaryMarkup(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function sanitizeSummaryHtml(value) {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "");
}

function isValidGenerated(value) {
  try {
    return Boolean(value?.summaryMarkdown && Array.isArray(value.questions) && value.questions.length === 5);
  } catch (error) {
    return false;
  }
}

function readCache() {
  if (!existsSync(CACHE_FILE)) return {};
  return JSON.parse(readFileSync(CACHE_FILE, "utf8"));
}

function writeCache(cache) {
  writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

function hashEntry(entry) {
  return createHash("sha256")
    .update([entry.work, entry.title, entry.transcript].filter(Boolean).join("\n"))
    .digest("hex");
}

function getArg(name) {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+([:;?!])/g, "\u202f$1")
    .trim();
}

function normalize(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
