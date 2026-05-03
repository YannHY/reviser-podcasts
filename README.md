# Réviser le bac français avec les podcasts

Site statique pour réviser le bac français à partir d'une sélection de podcasts consacrés aux oeuvres du programme. Chaque émission est classée par oeuvre, accompagnée de ses informations principales, et peut être écoutée, résumée, marquée comme faite ou prolongée par un quiz.

Le projet est disponible sur GitHub : [YannHY/reviser-podcasts](https://github.com/YannHY/reviser-podcasts).

## Objectif du site

Ce site aide les élèves à organiser leurs révisions du bac français autrement qu'avec de simples fiches. Il rassemble des podcasts de Radio France autour de quatre oeuvres ou parcours :

- **Discours de la servitude volontaire**, d'Étienne de La Boétie
- **On ne badine pas avec l'amour**, d'Alfred de Musset
- **La rage de l'expression**, de Francis Ponge
- **Sido**, de Colette

L'idée est simple : écouter, comprendre, mémoriser, puis vérifier ce que l'on a retenu.

## Fonctionnalités principales

### Catalogue de podcasts

La page d'accueil affiche les podcasts sous forme de cartes. Chaque carte indique le titre de l'émission, l'oeuvre associée, l'auteur, la durée, la date et la source quand ces informations sont disponibles.

### Classement par oeuvre

Les podcasts sont regroupés par objet d'étude ou par oeuvre. Des onglets permettent de passer rapidement d'un ensemble à l'autre, ou d'afficher tous les podcasts en même temps.

### Recherche

Une barre de recherche permet de retrouver rapidement un podcast à partir d'un titre, d'un auteur, d'une oeuvre, d'une émission ou d'une source. La recherche filtre directement les cartes affichées.

### Tri des épisodes

Le site propose plusieurs tris :

- par ordre d'origine ;
- du plus long au plus court ;
- du plus court au plus long ;
- du plus récent au plus ancien ;
- du plus ancien au plus récent.

Ce tri permet d'adapter les révisions au temps disponible.

### Filtre par durée

Un filtre permet de n'afficher que les podcasts de moins de 10, 30 ou 60 minutes. C'est pratique pour choisir une écoute rapide avant un cours, un devoir ou une épreuve.

### Suivi des podcasts écoutés

Chaque podcast peut être coché comme écouté. Le site garde cette information dans le navigateur grâce au stockage local, ce qui permet de retrouver sa progression lors d'une prochaine visite.

### Barre de progression

Un indicateur en haut de page affiche la progression globale : nombre de podcasts écoutés, nombre total de podcasts et pourcentage d'avancement.

### Filtre "À écouter" ou "Écoutés"

Un filtre d'état permet d'afficher seulement les podcasts restant à écouter ou seulement ceux qui ont déjà été terminés.

### Favoris

Chaque podcast peut être ajouté aux favoris. Un bouton permet ensuite de n'afficher que les podcasts favoris, par exemple pour préparer une liste de réécoute ou garder les épisodes les plus utiles.

### Lecteur intégré

Quand un flux audio est disponible, le podcast peut être lancé directement depuis la carte, sans quitter le site. Le lecteur intégré utilise les lecteurs embarqués de Radio France.

### Lien vers la source

Chaque carte peut renvoyer vers la page d'origine du podcast sur Radio France. Cela permet de consulter la description officielle, les informations complémentaires ou l'épisode sur le site source.

### Résumés pédagogiques

Certains podcasts disposent d'un résumé structuré. Ces résumés présentent l'essentiel de l'émission et les points importants à retenir pour les révisions.

### Quiz de révision

Le site contient près de 100 quiz associés aux podcasts. Chaque quiz propose des questions à choix multiples, une correction immédiate, un score et un retour explicatif pour consolider la compréhension.

### Pages de regroupement des quiz

Des pages de sommaire permettent d'accéder aux quiz par oeuvre. Elles facilitent une révision ciblée, par exemple uniquement sur La Boétie, Musset, Ponge ou Colette.

### Mode sombre

Un bouton permet de passer en mode sombre. Le choix est conservé dans le navigateur pour les visites suivantes.

### Interface responsive

La mise en page est prévue pour fonctionner sur ordinateur, tablette et mobile. Les contrôles, cartes, onglets et quiz s'adaptent à la largeur de l'écran.

## Structure du projet

```text
.
├── index.html              # Page principale du site et données des podcasts
├── app.js                  # Logique de recherche, filtres, favoris, progression et lecteur
├── styles.css              # Styles de l'application
├── liste.md                # Liste source des podcasts
├── summaries.json          # Transcriptions et résumés générés
├── build-audio-map.js      # Script d'intégration des lecteurs Radio France
├── build-summaries.js      # Script d'intégration des résumés dans la page
├── transcribe.py           # Script de transcription et résumé des podcasts
└── quiz/
    ├── quiz-data.js        # Données des quiz
    ├── quiz.js             # Moteur des quiz
    ├── quiz.css            # Styles des pages de quiz
    └── *.html              # Pages individuelles et sommaires des quiz
```

## Utilisation locale

Le site est statique : il peut être ouvert directement dans un navigateur avec `index.html`.

Pour le servir localement avec Python :

```bash
python3 -m http.server 8000
```

Puis ouvrir :

```text
http://localhost:8000
```

## Scripts utiles

### Intégrer les lecteurs audio

```bash
node build-audio-map.js
```

Ce script lit les podcasts présents dans `index.html`, récupère les identifiants Radio France et injecte les URLs d'embed dans le bloc `audioSources`.

### Intégrer les résumés

```bash
node build-summaries.js
```

Ce script lit `summaries.json`, nettoie les résumés disponibles et les intègre dans `index.html`.

### Générer transcriptions et résumés

```bash
MINIMAX_TOKEN=ton_token python3 transcribe.py
```

Ce script télécharge les audios disponibles, transcrit les podcasts avec Whisper local, puis génère des résumés pédagogiques avec l'API Minimax. Les résultats sont sauvegardés dans `summaries.json` et la reprise est automatique en cas d'interruption.

## Données et contenu

Les contenus audio restent hébergés par Radio France. Le site référence les épisodes, les affiche avec leurs métadonnées et, lorsque c'est possible, les intègre via un lecteur embarqué.

Les quiz et les résumés servent d'aide à la révision. Ils ne remplacent pas l'écoute des épisodes ni la lecture des oeuvres, mais offrent un support de mémorisation rapide.

## Technologies utilisées

- HTML
- CSS
- JavaScript sans framework
- Stockage local du navigateur pour la progression, les favoris et le thème
- Node.js pour les scripts d'intégration
- Python, Whisper et Minimax pour la génération des transcriptions et résumés

## Licence

Le site mentionne une licence Creative Commons **CC BY-SA** dans son pied de page.

## Auteur

Projet créé par [Yann Houry](https://www.linkedin.com/in/yann-houry-a2350651/).
