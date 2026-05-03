const state = {
  podcasts: [],
  sections: [],
  activeSection: "all",
  favoritesOnly: false,
  audioSources: {},
  summaryData: {},
};

const els = {
  search: document.querySelector("#searchInput"),
  searchPanel: document.querySelector("#headerSearch"),
  searchToggle: document.querySelector("#searchToggle"),
  searchClose: document.querySelector("#searchClose"),
  themeToggle: document.querySelector("#themeToggle"),
  sort: document.querySelector("#sortSelect"),
  duration: document.querySelector("#durationFilter"),
  status: document.querySelector("#statusFilter"),
  favorites: document.querySelector("#favoritesToggle"),
  tabs: document.querySelector("#sectionTabs"),
  sections: document.querySelector("#podcastSections"),
  resultCount: document.querySelector("#resultCount"),
  totalTime: document.querySelector("#totalTime"),
  doneCount: document.querySelector("#doneCount"),
  progressText: document.querySelector("#progressText"),
  progressBar: document.querySelector("#progressBar"),
  template: document.querySelector("#cardTemplate"),
};

const authorsByWork = {
  "Discours de la servitude volontaire": "Étienne de La Boétie",
  "On ne badine pas avec l'amour": "Alfred de Musset",
  "La rage de l'expression": "Francis Ponge",
  "Sido": "Colette",
};

const quizLinks = {
  "discours-de-la-servitude-volontaire-discours-de-la-servitude-volontaire-d-etienne-de-la-boetie-episode-1-l-enigme-de-l-obeissance-0": "quiz/01-episode-1-l-enigme-de-l-obeissance.html",
  "discours-de-la-servitude-volontaire-discours-de-la-servitude-volontaire-d-etienne-de-la-boetie-episode-2-l-habitude-de-servir-1": "quiz/02-episode-2-l-habitude-de-servir.html",
  "discours-de-la-servitude-volontaire-discours-de-la-servitude-volontaire-d-etienne-de-la-boetie-episode-3-la-memoire-des-hommes-libres-2": "quiz/03-episode-3-la-memoire-des-hommes-libres.html",
  "discours-de-la-servitude-volontaire-discours-de-la-servitude-volontaire-d-etienne-de-la-boetie-episode-4-peuple-diverti-peuple-soumis-3": "quiz/04-episode-4-peuple-diverti-peuple-soumis.html",
  "discours-de-la-servitude-volontaire-discours-de-la-servitude-volontaire-d-etienne-de-la-boetie-episode-5-pas-d-amitie-sans-egalite-4": "quiz/05-episode-5-pas-d-amitie-sans-egalite.html",
  "discours-de-la-servitude-volontaire-la-servitude-volontaire-le-texte-visionnaire-d-un-adolescent-https-www-radiofrance-fr-franceculture-la-servitude-volontaire-le-texte-visionnaire-d-un-adolescent-5825000": "quiz/06-la-servitude-volontaire-le-texte-visionnaire-d-un-adolescent.html",
  "discours-de-la-servitude-volontaire-la-servitude-volontaire-une-hypothese-hautement-transgressive-en-philosophie-politique-https-www-radiofrance-fr-franceculture-podcasts-avec-philosophie-la-servitude-volontaire-une-hypothese-hautement-transgressive-en-philosophie-politique-9421477": "quiz/07-la-servitude-volontaire-une-hypothese-hautement-transgressive.html",
  "discours-de-la-servitude-volontaire-comment-la-servitude-peut-elle-etre-volontaire-https-www-radiofrance-fr-franceculture-podcasts-le-gai-savoir-comment-la-servitude-peut-elle-etre-volontaire-6093202": "quiz/08-comment-la-servitude-peut-elle-etre-volontaire.html",
  "discours-de-la-servitude-volontaire-comment-la-servitude-peut-elle-etre-volontaire-https-www-radiofrance-fr-franceculture-podcasts-le-pourquoi-du-comment-philo-comment-la-servitude-peut-elle-etre-volontaire-1333117": "quiz/09-comment-la-servitude-peut-elle-etre-volontaire.html",
  "discours-de-la-servitude-volontaire-tyrans-et-tyranophores-etienne-de-la-boetie-ou-les-tyranophores-c-est-nous-https-www-radiofrance-fr-franceculture-podcasts-les-quadrithemes-de-charles-dantzig-tyrans-et-tyranophores-etienne-de-la-boetie-ou-les-tyranophores-c-est-nous-7019483": "quiz/10-tyrans-et-tyranophores-la-boetie-ou-les-tyranophores-c-est-nous.html",
  "discours-de-la-servitude-volontaire-discours-de-la-servitude-volontaire-la-boetie-https-www-radiofrance-fr-franceculture-podcasts-le-gai-savoir-discours-de-la-servitude-volontaire-la-boetie-2507988": "quiz/11-discours-de-la-servitude-volontaire-la-boetie.html",
  "discours-de-la-servitude-volontaire-etienne-de-la-boetie-1530-1563-https-www-radiofrance-fr-franceculture-podcasts-le-mardi-des-auteurs-09-10-etienne-de-la-boetie-1530-1563-6592529": "quiz/12-etienne-de-la-boetie-1530-1563.html",
  "discours-de-la-servitude-volontaire-montaigne-et-la-boetie-parce-que-c-etait-lui-parce-que-c-etait-moi-https-www-radiofrance-fr-franceculture-podcasts-les-chemins-de-la-philosophie-montaigne-et-la-boetie-parce-que-c-etait-lui-parce-que-c-etait-moi-2010104": "quiz/13-montaigne-et-la-boetie-parce-que-c-etait-lui-parce-que-c-etait-moi.html",
  "discours-de-la-servitude-volontaire-montaigne-et-la-boetie-une-amitie-sans-egale-https-www-radiofrance-fr-franceinter-podcasts-intelligence-service-intelligence-service-du-samedi-09-avril-2022-9410201": "quiz/14-montaigne-et-la-boetie-une-amitie-sans-egale.html",
  "discours-de-la-servitude-volontaire-la-servitude-volontaire-comprendre-le-pouvoir-et-la-volonte-avec-etienne-de-la-boetie-https-www-radiofrance-fr-franceculture-podcasts-le-fil-philo-la-servitude-volontaire-comprendre-le-pouvoir-et-la-volonte-avec-etienne-de-la-boetie-3751863": "quiz/15-la-servitude-volontaire-comprendre-le-pouvoir-et-la-volonte.html",
  "on-ne-badine-pas-avec-l-amour-on-ne-badine-pas-avec-l-amour-d-alfred-de-musset-episode-1-acte-1-des-retrouvailles-contrariees-15": "quiz/16-episode-1-acte-1-des-retrouvailles-contrariees.html",
  "on-ne-badine-pas-avec-l-amour-on-ne-badine-pas-avec-l-amour-d-alfred-de-musset-episode-2-acte-2-le-rendez-vous-16": "quiz/17-episode-2-acte-2-le-rendez-vous.html",
  "on-ne-badine-pas-avec-l-amour-on-ne-badine-pas-avec-l-amour-d-alfred-de-musset-episode-3-acte-3-un-jeu-dangereux-17": "quiz/18-episode-3-acte-3-un-jeu-dangereux.html",
  "on-ne-badine-pas-avec-l-amour-on-ne-badine-pas-avec-l-amour-d-alfred-de-musset-episode-4-comprendre-on-ne-badine-pas-avec-l-amour-https-www-radiofrance-fr-franceculture-podcasts-fictions-theatre-et-cie-comprendre-on-ne-badine-pas-avec-l-amour-4354520": "quiz/19-episode-4-comprendre-on-ne-badine-pas-avec-l-amour.html",
  "on-ne-badine-pas-avec-l-amour-on-ne-badine-pas-avec-l-amour-d-alfred-de-musset-episode-5-on-ne-badine-pas-avec-l-amour-d-alfred-de-musset-l-integrale-19": "quiz/20-episode-5-on-ne-badine-pas-avec-l-amour-d-alfred-de-musset-l-integrale.html",
  "on-ne-badine-pas-avec-l-amour-on-ne-badine-pas-avec-l-amour-1-2-https-www-radiofrance-fr-franceinter-podcasts-la-chronique-de-juliette-arnaud-la-chronique-de-juliette-arnaud-du-mercredi-19-janvier-2022-5263326": "quiz/21-on-ne-badine-pas-avec-l-amour-1-2.html",
  "on-ne-badine-pas-avec-l-amour-on-ne-badine-pas-avec-l-amour-2-2-https-www-radiofrance-fr-franceinter-podcasts-la-chronique-de-juliette-arnaud-la-chronique-de-juliette-arnaud-du-mercredi-26-janvier-2022-1172119": "quiz/22-on-ne-badine-pas-avec-l-amour-2-2.html",
  "on-ne-badine-pas-avec-l-amour-on-ne-badine-pas-avec-l-amour-d-alfred-de-musset-aimer-sans-cliches-https-www-radiofrance-fr-franceculture-podcasts-l-instant-poesie-on-ne-badine-pas-avec-l-amour-d-alfred-de-musset-aimer-sans-cliches-3119504": "quiz/23-on-ne-badine-pas-avec-l-amour-d-alfred-de-musset-aimer-sans-cliches.html",
  "on-ne-badine-pas-avec-l-amour-episode-1-4-alfred-de-musset-on-ne-badine-pas-avec-le-coeur-https-www-radiofrance-fr-franceculture-podcasts-les-chemins-de-la-philosophie-musset-on-ne-badine-pas-avec-le-coeur-4931900": "quiz/24-alfred-de-musset-on-ne-badine-pas-avec-le-coeur.html",
  "on-ne-badine-pas-avec-l-amour-alfred-de-musset-https-www-radiofrance-fr-franceinter-podcasts-2000-ans-d-histoire-alfred-de-musset-4961350": "quiz/25-alfred-de-musset.html",
  "on-ne-badine-pas-avec-l-amour-george-sand-et-alfred-de-musset-une-passion-a-venise-https-www-radiofrance-fr-franceinter-podcasts-autant-en-emporte-l-histoire-autant-en-emporte-l-histoire-du-dimanche-27-avril-2025-9574500": "quiz/26-george-sand-et-alfred-de-musset-une-passion-a-venise.html",
  "la-rage-de-l-expression-francis-ponge-lire-la-rage-de-l-expression-https-www-radiofrance-fr-franceculture-podcasts-poesie-et-ainsi-de-suite-lire-la-rage-de-l-expression-avec-francis-ponge-7949420": "quiz/27-francis-ponge-lire-la-rage-de-l-expression.html",
  "la-rage-de-l-expression-entretiens-de-francis-ponge-avec-philippe-sollers-conditions-de-travail-de-quelqu-un-qu-on-appelle-encore-un-poete-https-www-radiofrance-fr-franceculture-podcasts-entretiens-avec-conditions-de-travail-de-quelqu-un-qu-on-appelle-encore-un-poete-1ere-partie-4540900": "quiz/28-conditions-de-travail-de-quelqu-un-qu-on-appelle-encore-un-poete-1.html",
  "la-rage-de-l-expression-entretiens-de-francis-ponge-avec-philippe-sollers-conditions-de-travail-de-quelqu-un-qu-on-appelle-encore-un-poete-https-www-radiofrance-fr-franceculture-podcasts-entretiens-avec-conditions-de-travail-de-quelqu-un-qu-on-appelle-encore-un-poete-2e-partie-8230300": "quiz/29-conditions-de-travail-de-quelqu-un-qu-on-appelle-encore-un-poete-2.html",
  "la-rage-de-l-expression-entretiens-de-francis-ponge-avec-philippe-sollers-le-debut-du-vingtieme-siecle-vecu-https-www-radiofrance-fr-franceculture-podcasts-entretiens-avec-le-debut-du-vingtieme-siecle-vecu-6253412": "quiz/30-le-debut-du-vingtieme-siecle-vecu.html",
  "la-rage-de-l-expression-entretiens-de-francis-ponge-avec-philippe-sollers-vie-et-travail-a-l-epoque-surrealiste-1917-1930-https-www-radiofrance-fr-franceculture-podcasts-entretiens-avec-vie-et-travail-a-l-epoque-surrealiste-1917-1930-5439492": "quiz/31-vie-et-travail-a-l-epoque-surrealiste-1917-1930.html",
  "la-rage-de-l-expression-entretiens-de-francis-ponge-avec-philippe-sollers-vie-et-travail-a-l-epoque-surrealiste-1930-1940-https-www-radiofrance-fr-franceculture-podcasts-entretiens-avec-vie-et-travail-a-l-epoque-surrealiste-1930-1940-8675983": "quiz/32-vie-et-travail-a-l-epoque-surrealiste-1930-1940.html",
  "la-rage-de-l-expression-entretiens-de-francis-ponge-avec-philippe-sollers-la-peinture-et-les-lettres-https-www-radiofrance-fr-franceculture-podcasts-entretiens-avec-la-peinture-et-les-lettres-3315022": "quiz/33-la-peinture-et-les-lettres.html",
  "la-rage-de-l-expression-entretiens-de-francis-ponge-avec-philippe-sollers-pratique-et-theorie-le-parti-pris-des-choses-https-www-radiofrance-fr-franceculture-podcasts-entretiens-avec-francis-ponge-lit-et-analyse-son-poeme-l-huitre-8547854": "quiz/34-pratique-et-theorie-le-parti-pris-des-choses.html",
  "la-rage-de-l-expression-entretiens-de-francis-ponge-avec-philippe-sollers-pratique-et-theorie-la-rage-de-l-expression-https-www-radiofrance-fr-franceculture-podcasts-entretiens-avec-pratique-et-theorie-la-rage-de-l-expression-2468158": "quiz/35-pratique-et-theorie-la-rage-de-l-expression.html",
  "la-rage-de-l-expression-entretiens-de-francis-ponge-avec-philippe-sollers-pratique-et-theorie-l-objeu-https-www-radiofrance-fr-franceculture-podcasts-entretiens-avec-pratique-et-theorie-l-objeu-7769279": "quiz/36-pratique-et-theorie-l-objeu.html",
  "la-rage-de-l-expression-entretiens-de-francis-ponge-avec-philippe-sollers-pour-un-malherbe-pour-une-nouvelle-culture-https-www-radiofrance-fr-franceculture-podcasts-entretiens-avec-pour-un-malherbe-pour-une-nouvelle-culture-4576126": "quiz/37-pour-un-malherbe-pour-une-nouvelle-culture.html",
  "la-rage-de-l-expression-entretiens-de-francis-ponge-avec-philippe-sollers-rupture-et-revolution-culturelle-un-materialisme-semantique-le-pre-https-www-radiofrance-fr-franceculture-podcasts-entretiens-avec-rupture-et-revolution-culturelle-un-materialisme-semantique-le-pre-6720966": "quiz/38-rupture-et-revolution-culturelle-un-materialisme-semantique-le-pre.html",
  "la-rage-de-l-expression-entretiens-de-francis-ponge-avec-philippe-sollers-l-ecriture-fonctionnement-objoie-le-savon-https-www-radiofrance-fr-franceculture-podcasts-entretiens-avec-l-ecriture-fonctionnement-objoie-le-savon-8822723": "quiz/39-l-ecriture-fonctionnement-objoie-le-savon.html",
  "la-rage-de-l-expression-francis-ponge-ou-la-rage-de-l-expression-https-www-radiofrance-fr-francemusique-podcasts-histoires-de-musique-francis-ponge-ou-la-rage-de-l-expression-9045238": "quiz/40-francis-ponge-ou-la-rage-de-l-expression.html",
  "la-rage-de-l-expression-francis-ponge-lit-le-pain-et-la-pomme-de-terre-https-www-radiofrance-fr-franceculture-francis-ponge-lit-le-pain-et-la-pomme-de-terre-6977360": "quiz/41-francis-ponge-lit-le-pain-et-la-pomme-de-terre.html",
  "sido-sido-de-colette-episode-1-la-couleur-des-etes-41": "quiz/42-episode-1-la-couleur-des-etes.html",
  "sido-sido-de-colette-episode-2-une-enfance-heureuse-42": "quiz/43-episode-2-une-enfance-heureuse.html",
  "sido-sido-de-colette-episode-3-le-capitaine-43": "quiz/44-episode-3-le-capitaine.html",
  "sido-sido-de-colette-episode-4-sido-et-le-capitaine-44": "quiz/45-episode-4-sido-et-le-capitaine.html",
  "sido-sido-de-colette-episode-5-les-sauvages-45": "quiz/46-episode-5-les-sauvages.html",
  "sido-les-vrilles-de-la-vigne-de-colette-episode-1-les-vrilles-de-la-vigne-nuit-blanche-et-le-dernier-feu-46": "quiz/47-episode-1-les-vrilles-de-la-vigne-nuit-blanche-et-le-dernier-feu.html",
  "sido-les-vrilles-de-la-vigne-de-colette-episode-2-amours-un-reve-et-nonoche-47": "quiz/48-episode-2-amours-un-reve-et-nonoche.html",
  "sido-les-vrilles-de-la-vigne-de-colette-episode-3-toby-chien-parle-et-dialogues-de-betes-48": "quiz/49-episode-3-toby-chien-parle-et-dialogues-de-betes.html",
  "sido-les-vrilles-de-la-vigne-de-colette-episode-4-maquillages-et-belles-de-jour-49": "quiz/50-episode-4-maquillages-et-belles-de-jour.html",
  "sido-les-vrilles-de-la-vigne-de-colette-episode-5-music-halls-et-le-miroir-50": "quiz/51-episode-5-music-halls-et-le-miroir.html",
  "sido-sido-et-les-vrilles-de-la-vigne-de-colette-https-www-radiofrance-fr-franceculture-podcasts-le-book-club-sido-et-les-vrilles-de-la-vigne-de-colette-4786349": "quiz/52-sido-et-les-vrilles-de-la-vigne-de-colette.html",
  "sido-l-amour-selon-colette-episode-1-ne-pas-se-laisser-faire-https-www-radiofrance-fr-franceculture-podcasts-salle-des-archives-ne-pas-se-laisser-faire-4757031": "quiz/53-episode-1-ne-pas-se-laisser-faire.html",
  "sido-l-amour-selon-colette-episode-2-explorer-les-interdits-https-www-radiofrance-fr-franceculture-podcasts-salle-des-archives-explorer-les-interdits-5280570": "quiz/54-episode-2-explorer-les-interdits.html",
  "sido-l-amour-selon-colette-episode-3-les-jouvenel-pere-et-fils-passions-limites-https-www-radiofrance-fr-franceculture-podcasts-salle-des-archives-les-jouvenel-pere-et-fils-passions-limites-5399695": "quiz/55-episode-3-les-jouvenel-pere-et-fils-passions-limites.html",
  "sido-l-amour-selon-colette-episode-4-aimer-comme-une-mere-https-www-radiofrance-fr-franceculture-podcasts-salle-des-archives-aimer-comme-une-mere-8317948": "quiz/56-episode-4-aimer-comme-une-mere.html",
  "sido-l-amour-selon-colette-episode-5-vieillir-ensemble-https-www-radiofrance-fr-franceculture-podcasts-salle-des-archives-vieillir-ensemble-4821840": "quiz/57-episode-5-vieillir-ensemble.html",
  "sido-l-amour-selon-colette-episode-6-la-vie-sauvage-https-www-radiofrance-fr-franceculture-podcasts-salle-des-archives-la-vie-sauvage-9986845": "quiz/58-episode-6-la-vie-sauvage.html",
  "sido-colette-et-la-nature-https-www-radiofrance-fr-franceinter-podcasts-co2-mon-amour-colette-et-la-nature-2148865": "quiz/59-colette-et-la-nature.html",
  "sido-un-ete-avec-colette-episode-1-pourquoi-colette-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-pourquoi-colette-3578342": "quiz/60-episode-1-pourquoi-colette.html",
  "sido-un-ete-avec-colette-episode-2-comment-colette-se-mit-a-ecrire-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-comment-colette-se-mis-a-ecrire-9796344": "quiz/61-episode-2-comment-colette-se-mit-a-ecrire.html",
  "sido-un-ete-avec-colette-episode-3-ce-chameau-de-willy-le-mari-de-colette-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-ce-chameau-de-willy-1938653": "quiz/62-episode-3-ce-chameau-de-willy-le-mari-de-colette.html",
  "sido-un-ete-avec-colette-episode-4-les-beaux-cheveux-d-or-de-colette-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-les-beaux-cheveux-d-or-de-colette-7265101": "quiz/63-episode-4-les-beaux-cheveux-d-or-de-colette.html",
  "sido-un-ete-avec-colette-episode-5-lesbos-ou-les-amours-saphiques-de-colette-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-vendredi-09-juillet-2021-6917230": "quiz/64-episode-5-lesbos-ou-les-amours-saphiques-de-colette.html",
  "sido-un-ete-avec-colette-episode-6-colette-et-sa-mere-sidonie-landoy-dite-sido-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-lundi-12-juillet-2021-1163438": "quiz/65-episode-6-colette-et-sa-mere-sidonie-landoy-dite-sido.html",
  "sido-un-ete-avec-colette-episode-7-les-betes-la-relation-de-colette-avec-les-animaux-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-mardi-13-juillet-2021-6979103": "quiz/66-episode-7-les-betes-la-relation-de-colette-avec-les-animaux.html",
  "sido-un-ete-avec-colette-episode-8-le-faune-ou-quand-colette-reclamait-la-liberte-de-son-corps-et-de-sa-plume-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-le-faune-4134202": "quiz/67-episode-8-le-faune-ou-quand-colette-reclamait-la-liberte-de-son-corps-et-de-sa-plume.html",
  "sido-un-ete-avec-colette-episode-9-colette-j-appartiens-a-missy-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-j-appartiens-a-missy-8304198": "quiz/68-episode-9-colette-j-appartiens-a-missy.html",
  "sido-un-ete-avec-colette-episode-10-music-hall-colette-et-la-musique-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-music-hall-colette-et-la-musique-2410036": "quiz/69-episode-10-music-hall-colette-et-la-musique.html",
  "sido-un-ete-avec-colette-episode-11-colette-et-son-pere-jules-la-vertu-d-etre-triste-a-bon-escient-et-de-ne-jamais-se-trahir-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-lundi-19-juillet-2021-7512268": "quiz/70-episode-11-colette-et-son-pere-jules-la-vertu-d-etre-triste-a-bon-escient-et-de-ne-jamais-se-trahir.html",
  "sido-un-ete-avec-colette-episode-12-colette-et-l-amour-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-mardi-20-juillet-2021-2287727": "quiz/71-episode-12-colette-et-l-amour.html",
  "sido-un-ete-avec-colette-episode-13-colette-la-sauvageonne-je-suis-restee-paysanne-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-mercredi-21-juillet-2021-3769107": "quiz/72-episode-13-colette-la-sauvageonne-je-suis-restee-paysanne.html",
  "sido-un-ete-avec-colette-episode-14-colette-et-paris-j-ai-trouve-dans-paris-encore-une-province-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-colette-et-paris-j-ai-trouve-dans-paris-encore-une-province-3972897": "quiz/73-episode-14-colette-et-paris-j-ai-trouve-dans-paris-encore-une-province.html",
  "sido-un-ete-avec-colette-episode-15-colette-et-son-amour-pour-henry-de-jouvenel-alias-le-pacha-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-vendredi-23-juillet-2021-3489672": "quiz/74-episode-15-colette-et-son-amour-pour-henry-de-jouvenel-alias-le-pacha.html",
  "sido-un-ete-avec-colette-episode-16-plus-qu-ecrivaine-colette-se-voyait-journaliste-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-lundi-26-juillet-2021-8661490": "quiz/75-episode-16-plus-qu-ecrivaine-colette-se-voyait-journaliste.html",
  "sido-un-ete-avec-colette-episode-17-colette-j-aime-etre-gourmande-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-mardi-27-juillet-2021-8541155": "quiz/76-episode-17-colette-j-aime-etre-gourmande.html",
  "sido-un-ete-avec-colette-episode-18-flore-et-pomone-la-botanique-poetique-de-colette-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-mercredi-28-juillet-2021-9583117": "quiz/77-episode-18-flore-et-pomone-la-botanique-poetique-de-colette.html",
  "sido-un-ete-avec-colette-episode-19-colette-percut-tres-tot-l-interet-du-septieme-art-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-jeudi-29-juillet-2021-9134278": "quiz/78-episode-19-colette-percut-tres-tot-l-interet-du-septieme-art.html",
  "sido-un-ete-avec-colette-episode-20-colette-feministe-avant-gardiste-et-paradoxale-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-vendredi-30-juillet-2021-4834604": "quiz/79-episode-20-colette-feministe-avant-gardiste-et-paradoxale.html",
  "sido-un-ete-avec-colette-episode-21-colette-reflechissait-deja-sur-le-genre-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-lundi-02-aout-2021-5603590": "quiz/80-episode-21-colette-reflechissait-deja-sur-le-genre.html",
  "sido-un-ete-avec-colette-episode-22-colette-choisit-la-litterature-contre-la-maternite-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-mardi-03-aout-2021-3173849": "quiz/81-episode-22-colette-choisit-la-litterature-contre-la-maternite.html",
  "sido-un-ete-avec-colette-episode-23-la-fratrie-de-colette-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-la-fraterie-de-colette-6605200": "quiz/82-episode-23-la-fratrie-de-colette.html",
  "sido-un-ete-avec-colette-episode-24-le-phalanstere-refuge-pour-colette-et-ses-amies-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-le-phalanstere-refuge-pour-colette-et-ses-amies-6146592": "quiz/83-episode-24-le-phalanstere-refuge-pour-colette-et-ses-amies.html",
  "sido-un-ete-avec-colette-episode-25-colette-dans-la-grande-guerre-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-colette-dans-la-grande-guerre-4005098": "quiz/84-episode-25-colette-dans-la-grande-guerre.html",
  "sido-un-ete-avec-colette-episode-26-quand-colette-ecrit-l-enfant-et-les-sortileges-livret-de-feerie-ballet-pour-opera-mis-en-musique-par-ravel-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-quand-colette-ecrit-l-enfant-et-les-sortileges-livret-de-feerie-ballet-pour-opera-mis-en-musique-par-ravel-6462159": "quiz/85-episode-26-quand-colette-ecrit-l-enfant-et-les-sortileges-livret-de-feerie-ballet-pour-opera-mis-en-musique-par-ravel.html",
  "sido-un-ete-avec-colette-episode-27-les-liaisons-de-colette-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-les-liaisons-de-colette-1193149": "quiz/86-episode-27-les-liaisons-de-colette.html",
  "sido-un-ete-avec-colette-episode-28-de-la-bretagne-au-midi-colette-sur-les-routes-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-de-la-bretagne-au-midi-colette-sur-les-routes-9489021": "quiz/87-episode-28-de-la-bretagne-au-midi-colette-sur-les-routes.html",
  "sido-un-ete-avec-colette-episode-29-colette-entre-ranc-ur-et-vengeances-conjugales-posthumes-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-colette-entre-rancoeur-et-vengeances-conjugales-posthumes-7919862": "quiz/88-episode-29-colette-entre-ranc-ur-et-vengeances-conjugales-posthumes.html",
  "sido-un-ete-avec-colette-episode-30-colette-conte-les-petites-existences-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-colette-conte-les-petites-existences-8084292": "quiz/89-episode-30-colette-conte-les-petites-existences.html",
  "sido-un-ete-avec-colette-episode-31-proust-et-colette-se-sont-connus-et-reconnus-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-lundi-16-aout-2021-2597209": "quiz/90-episode-31-proust-et-colette-se-sont-connus-et-reconnus.html",
  "sido-un-ete-avec-colette-episode-32-cheri-reflet-de-la-plume-de-colette-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-mardi-17-aout-2021-5265831": "quiz/91-episode-32-cheri-reflet-de-la-plume-de-colette.html",
  "sido-un-ete-avec-colette-episode-33-colette-et-l-occupation-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-mercredi-18-aout-2021-5966387": "quiz/92-episode-33-colette-et-l-occupation.html",
  "sido-un-ete-avec-colette-episode-34-colette-la-bonne-dame-du-palais-royal-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-jeudi-19-aout-2021-5611253": "quiz/93-episode-34-colette-la-bonne-dame-du-palais-royal.html",
  "sido-un-ete-avec-colette-episode-35-la-marque-colette-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-vendredi-20-aout-2021-4107862": "quiz/94-episode-35-la-marque-colette.html",
  "sido-un-ete-avec-colette-episode-36-colette-prend-de-l-age-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-lundi-23-aout-2021-2246447": "quiz/95-episode-36-colette-prend-de-l-age.html",
  "sido-un-ete-avec-colette-episode-37-colette-et-la-litterature-une-fausse-histoire-d-amour-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-mardi-24-aout-2021-9384945": "quiz/96-episode-37-colette-et-la-litterature-une-fausse-histoire-d-amour.html",
  "sido-un-ete-avec-colette-episode-38-gigi-le-rare-roman-de-colette-qui-finit-bien-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-mercredi-25-aout-2021-7046848": "quiz/97-episode-38-gigi-le-rare-roman-de-colette-qui-finit-bien.html",
  "sido-un-ete-avec-colette-episode-39-colette-attachee-aux-traditions-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-jeudi-26-aout-2021-6606095": "quiz/98-episode-39-colette-attachee-aux-traditions.html",
  "sido-un-ete-avec-colette-episode-40-le-bleu-la-couleur-de-colette-https-www-radiofrance-fr-franceinter-podcasts-un-ete-avec-colette-un-ete-avec-colette-du-vendredi-27-aout-2021-1315639": "quiz/99-episode-40-le-bleu-la-couleur-de-colette.html",
};

init();

function init() {
  const source = document.querySelector("#podcastSource");
  const audioSource = document.querySelector("#audioSources");
  const summarySource = document.querySelector("#summaryData");
  const markdown = source ? source.value : "";

  state.audioSources = audioSource ? JSON.parse(audioSource.textContent) : {};
  state.summaryData = summarySource ? JSON.parse(summarySource.textContent) : {};
  state.podcasts = parseMarkdown(markdown);
  state.sections = [...new Set(state.podcasts.map((podcast) => podcast.section))];
  buildFilters();
  initTheme();
  bindEvents();
  render();
}

function parseMarkdown(markdown) {
  const clean = markdown.replace(/^---[\s\S]*?---\s*/, "");
  const lines = clean.split(/\r?\n/);
  const podcasts = [];
  let section = "";
  let pending = [];
  let order = 0;

  const flushPending = () => {
    if (!section || pending.length === 0) return;
    const parsed = parseStandaloneBlock(pending, section, order);
    if (parsed) {
      podcasts.push(parsed);
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
        const episode = parseEpisodeLine(content, section, order, pending);
        if (episode) {
          podcasts.push(episode);
          order += 1;
        }
      } else {
        pending.push(content);
      }
      continue;
    }

    if (/^Épisode\s+\d+/i.test(line) && (parseDuration(line) !== null || /\d{2}\/\d{2}\/\d{4}/.test(line))) {
      const episode = parseEpisodeLine(line, section, order, pending);
      if (episode) {
        podcasts.push(episode);
        order += 1;
      }
      continue;
    }

    pending.push(line);
  }

  flushPending();
  return podcasts;
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
  return {
    ...podcast,
    audioUrl: state.audioSources[podcast.id] || "",
    searchable: [
      podcast.title,
      podcast.section,
      podcast.author,
      podcast.station,
      podcast.series,
    ].join(" ").toLocaleLowerCase("fr-FR"),
  };
}

function parseDuration(text) {
  if (!text) return null;
  const hourMatch = text.match(/(\d+)\s*h(?:\s*(\d+)\s*min)?/i);
  if (hourMatch) {
    return Number(hourMatch[1]) * 60 + Number(hourMatch[2] || 0);
  }
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
  return title
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeId(section, title, suffix) {
  return `${section}-${title}-${suffix}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildFilters() {
  els.tabs.innerHTML = "";
  ["all", ...state.sections].forEach((section) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = section === "all" ? "Tous" : frenchTypography(section);
    button.dataset.section = section;
    button.setAttribute("aria-selected", section === state.activeSection ? "true" : "false");
    els.tabs.append(button);
  });
}

function bindEvents() {
  [els.search, els.sort, els.duration, els.status].forEach((control) => {
    control.addEventListener("input", render);
  });

  els.searchToggle.addEventListener("click", () => {
    const willOpen = els.searchPanel.hidden;
    setSearchOpen(willOpen);
    if (willOpen) els.search.focus();
  });

  els.searchClose.addEventListener("click", () => {
    els.search.value = "";
    setSearchOpen(false);
    render();
  });

  els.search.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    els.search.value = "";
    setSearchOpen(false);
    render();
    els.searchToggle.focus();
  });

  els.themeToggle.addEventListener("click", toggleTheme);

  els.favorites.addEventListener("click", () => {
    state.favoritesOnly = !state.favoritesOnly;
    render();
  });

  els.tabs.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    state.activeSection = button.dataset.section;
    if (state.activeSection === "all") {
      els.search.value = "";
      setSearchOpen(false);
      els.status.value = "all";
      els.duration.value = "all";
      state.favoritesOnly = false;
    }
    render();
  });
}

function setSearchOpen(open) {
  els.searchPanel.hidden = !open;
  els.searchToggle.setAttribute("aria-expanded", open ? "true" : "false");
  document.body.classList.toggle("has-open-search", open);
}

function initTheme() {
  const saved = localStorage.getItem("bac-podcasts-theme");
  const theme = saved === "dark" ? "dark" : "light";
  applyTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("bac-podcasts-theme", theme);
  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  const dark = theme === "dark";
  els.themeToggle.setAttribute("aria-label", dark ? "Activer le mode clair" : "Activer le mode sombre");
  els.themeToggle.title = dark ? "Activer le mode clair" : "Activer le mode sombre";
  els.themeToggle.innerHTML = `<i class="fa-solid ${dark ? "fa-sun" : "fa-moon"}" aria-hidden="true"></i>`;
}

function render() {
  const visible = getVisiblePodcasts();
  renderProgress();
  renderFavoriteFilter();
  renderTabs();
  renderSummary(visible);
  renderSections(visible);
}

function getVisiblePodcasts() {
  const query = els.search.value.trim().toLocaleLowerCase("fr-FR");
  const listenedFilter = els.status.value;
  const maxDuration = els.duration.value;

  const filtered = state.podcasts.filter((podcast) => {
    const sectionMatch = state.activeSection === "all" || podcast.section === state.activeSection;
    const searchMatch = !query || podcast.searchable.includes(query);
    const listened = isListened(podcast.id);
    const favoriteMatch = !state.favoritesOnly || isFavorite(podcast.id);
    const statusMatch =
      listenedFilter === "all" ||
      (listenedFilter === "done" && listened) ||
      (listenedFilter === "todo" && !listened);
    const durationMatch = maxDuration === "all" || podcast.duration <= Number(maxDuration);
    return sectionMatch && searchMatch && favoriteMatch && statusMatch && durationMatch;
  });

  const sorters = {
    source: (a, b) => a.order - b.order,
    longest: (a, b) => b.duration - a.duration || a.order - b.order,
    shortest: (a, b) => a.duration - b.duration || a.order - b.order,
    newest: (a, b) => String(b.date).localeCompare(String(a.date)) || a.order - b.order,
    oldest: (a, b) => String(a.date).localeCompare(String(b.date)) || a.order - b.order,
  };

  return filtered.sort(sorters[els.sort.value]);
}

function renderFavoriteFilter() {
  const favoritesCount = state.podcasts.filter((podcast) => isFavorite(podcast.id)).length;
  els.favorites.setAttribute("aria-pressed", state.favoritesOnly ? "true" : "false");
  els.favorites.innerHTML = `
    <i class="${state.favoritesOnly ? "fa-solid" : "fa-regular"} fa-heart" aria-hidden="true"></i>
    <span>Favoris${favoritesCount ? ` (${favoritesCount})` : ""}</span>
  `;
}

function renderTabs() {
  els.tabs.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-selected", button.dataset.section === state.activeSection ? "true" : "false");
  });
}

function renderSummary(podcasts) {
  els.resultCount.textContent = podcasts.length;
  els.totalTime.textContent = formatDuration(podcasts.reduce((sum, podcast) => sum + podcast.duration, 0));
  els.doneCount.textContent = podcasts.filter((podcast) => isListened(podcast.id)).length;
}

function renderProgress() {
  const total = state.podcasts.length;
  const listened = state.podcasts.filter((podcast) => isListened(podcast.id)).length;
  const percent = total ? Math.round((listened / total) * 100) : 0;
  els.progressText.textContent = `${listened}/${total} podcasts écoutés`;
  els.progressBar.style.width = `${percent}%`;
}

function renderSections(podcasts) {
  els.sections.innerHTML = "";
  if (podcasts.length === 0) {
    els.sections.innerHTML = `<p class="empty">Aucun podcast ne correspond aux filtres.</p>`;
    return;
  }

  const grouped = groupBy(podcasts, "section");
  const sectionOrder = els.sort.value === "source"
    ? state.sections.filter((s) => grouped.has(s))
    : [...grouped.keys()];
  sectionOrder.forEach((section) => {
      const items = grouped.get(section);
      const wrapper = document.createElement("section");
      wrapper.className = "object-section";
      wrapper.innerHTML = `
        <div class="section-title">
          <h2>${escapeHtml(frenchTypography(section))}</h2>
          <span>${items.length} podcast${items.length > 1 ? "s" : ""}</span>
        </div>
        <div class="grid"></div>
      `;
      const grid = wrapper.querySelector(".grid");
      items.forEach((podcast) => grid.append(renderCard(podcast)));
      els.sections.append(wrapper);
    });
}

function renderCard(podcast) {
  const fragment = els.template.content.cloneNode(true);
  const card = fragment.querySelector(".card");
  const checkbox = fragment.querySelector("input[type='checkbox']");
  const favorite = fragment.querySelector(".favorite-button");
  const player = fragment.querySelector(".player");
  const summaryPanel = fragment.querySelector(".summary-panel");
  const button = fragment.querySelector(".listen-button");
  const summaryButton = fragment.querySelector(".summary-button");
  const quizLink = fragment.querySelector(".quiz-link");
  const source = fragment.querySelector(".source-link");

  card.classList.toggle("is-done", isListened(podcast.id));
  card.classList.toggle("is-favorite", isFavorite(podcast.id));
  const prefix = podcast.series ? podcast.series + " - " : "";
  const displayTitle = prefix && podcast.title.startsWith(prefix)
    ? podcast.title.slice(prefix.length)
    : podcast.title;
  fragment.querySelector("h2").textContent = frenchTypography(displayTitle);
  fragment.querySelector(".meta").innerHTML = metaHtml(podcast);
  checkbox.checked = isListened(podcast.id);
  updateFavoriteButton(favorite, isFavorite(podcast.id));
  source.href = podcast.url || "#";
  source.hidden = !podcast.url;
  source.title = "Voir sur Radio France";
  source.setAttribute("aria-label", "Voir sur Radio France");
  source.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>`;
  quizLink.href = quizLinks[podcast.id] || "#";
  quizLink.hidden = !quizLinks[podcast.id];
  quizLink.title = "Quiz";
  quizLink.setAttribute("aria-label", `Quiz : ${podcast.title}`);
  quizLink.innerHTML = `<i class="fa-solid fa-brain" aria-hidden="true"></i>`;
  button.title = "Écouter ici";
  button.setAttribute("aria-label", "Écouter ici");
  button.innerHTML = `<i class="fa-solid fa-play" aria-hidden="true"></i>`;
  button.hidden = !podcast.audioUrl;

  const summaryText = state.summaryData[podcast.id] || "";
  summaryButton.hidden = !summaryText;

  checkbox.addEventListener("change", () => {
    setListened(podcast.id, checkbox.checked);
    render();
  });

  favorite.addEventListener("click", () => {
    setFavorite(podcast.id, !isFavorite(podcast.id));
    render();
  });

  button.addEventListener("click", () => {
    const isOpen = !player.hidden;
    player.hidden = isOpen;
    button.title = isOpen ? "Écouter ici" : "Fermer";
    button.setAttribute("aria-label", isOpen ? "Écouter ici" : "Fermer");
    button.innerHTML = isOpen
      ? `<i class="fa-solid fa-play" aria-hidden="true"></i>`
      : `<i class="fa-solid fa-chevron-up" aria-hidden="true"></i>`;
    if (!isOpen && player.childElementCount === 0) {
      player.innerHTML = `<iframe src="${podcast.audioUrl}" width="100%" height="144" frameborder="0" allowtransparency="true" allowfullscreen title="${escapeHtml(frenchTypography(podcast.title))}"></iframe>`;
    }
  });

  summaryButton.title = "Résumé";
  summaryButton.setAttribute("aria-label", "Résumé");
  summaryButton.addEventListener("click", () => {
    const isOpen = !summaryPanel.hidden;
    summaryPanel.hidden = isOpen;
    summaryButton.title = isOpen ? "Résumé" : "Fermer le résumé";
    summaryButton.setAttribute("aria-label", isOpen ? "Résumé" : "Fermer le résumé");
    summaryButton.innerHTML = isOpen
      ? `<i class="fa-regular fa-file-lines" aria-hidden="true"></i>`
      : `<i class="fa-solid fa-chevron-up" aria-hidden="true"></i>`;
    if (!isOpen && summaryPanel.childElementCount === 0) {
      summaryPanel.innerHTML = renderMarkdown(summaryText);
    }
  });
  summaryButton.innerHTML = `<i class="fa-regular fa-file-lines" aria-hidden="true"></i>`;

  return fragment;
}

function renderMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const html = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("## ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3>${inlineMarkdown(line.slice(3))}</h3>`);
      continue;
    }
    if (line.startsWith("# ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3>${inlineMarkdown(line.slice(2))}</h3>`);
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }
    if (line.match(/^\d+\.\s/)) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${inlineMarkdown(line.replace(/^\d+\.\s/, ""))}</li>`);
      continue;
    }
    if (inList) { html.push("</ul>"); inList = false; }
    if (line === "" || line === "---") { continue; }
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  if (inList) html.push("</ul>");
  return html.join("\n");
}

function inlineMarkdown(text) {
  return frenchTypography(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}

function frenchTypography(value) {
  return String(value)
    .replace(/([^\s:;?!/])[\t \u00a0\u202f]*([:;?!])(?!\/)/g, "$1\u202f$2");
}

function updateFavoriteButton(button, favorite) {
  button.setAttribute("aria-pressed", favorite ? "true" : "false");
  button.setAttribute("aria-label", favorite ? "Retirer des favoris" : "Ajouter aux favoris");
  button.title = favorite ? "Retirer des favoris" : "Ajouter aux favoris";
  button.innerHTML = `<i class="${favorite ? "fa-solid" : "fa-regular"} fa-heart" aria-hidden="true"></i>`;
}

function metaHtml(podcast) {
  const parts = [
    formatDuration(podcast.duration),
    podcast.date ? formatDate(podcast.date) : null,
    podcast.station || null,
  ].filter(Boolean).map(p => `<span>${escapeHtml(p)}</span>`);
  return parts.join('<span class="dot" aria-hidden="true">·</span>');
}

function formatDuration(minutes) {
  if (!minutes) return "0 min";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours} h ${String(mins).padStart(2, "0")} min` : `${mins} min`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${date}T12:00:00`));
}

function groupBy(items, key) {
  return items.reduce((map, item) => {
    const value = item[key];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(item);
    return map;
  }, new Map());
}

function isListened(id) {
  return localStorage.getItem(`bac-podcast:${id}`) === "1";
}

function setListened(id, listened) {
  if (listened) {
    localStorage.setItem(`bac-podcast:${id}`, "1");
  } else {
    localStorage.removeItem(`bac-podcast:${id}`);
  }
}

function isFavorite(id) {
  return localStorage.getItem(`bac-podcast-favorite:${id}`) === "1";
}

function setFavorite(id, favorite) {
  if (favorite) {
    localStorage.setItem(`bac-podcast-favorite:${id}`, "1");
  } else {
    localStorage.removeItem(`bac-podcast-favorite:${id}`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
