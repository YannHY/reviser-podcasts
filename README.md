# Réviser avec les podcasts

Site statique pour réviser la littérature française à partir de podcasts, de quiz et de fiches. Le projet propose désormais plusieurs parcours depuis une page d'accueil commune : bac français, maturité cantonale suisse et une section IB en préparation.

## Objectif

Le site aide les élèves à organiser leurs révisions autrement qu'avec une liste de cours. Chaque parcours rassemble des émissions classées par oeuvre, permet d'écouter les épisodes disponibles, de suivre sa progression, puis de vérifier ce qui a été retenu avec des quiz et des fiches.

Le principe reste simple : choisir un parcours, écouter, comprendre, mémoriser, puis s'entraîner.

## Parcours disponibles

### Accueil

La page `index.html` sert de porte d'entrée vers les trois espaces du site :

- **Bac français** : parcours principal historique.
- **Maturité** : nouveau parcours pour la maturité cantonale.
- **IB** : page d'attente pour une future section International Baccalaureate.

### Bac français

Le parcours bac français comprend les pages principales suivantes :

- `fr/index.html` : catalogue de podcasts.
- `fr/quiz.html` : sommaire des questionnaires.
- `fr/fiches.html` : sommaire des fiches de révision.

Les oeuvres et parcours couverts sont :

- **Discours de la servitude volontaire**, d'Étienne de La Boétie.
- **On ne badine pas avec l'amour**, d'Alfred de Musset.
- **La rage de l'expression**, de Francis Ponge.
- **Sido**, de Colette.
- **Manon Lescaut**, de l'Abbé Prévost.

Le sommaire des quiz du bac compte **114 questionnaires**, répartis ainsi :

- Discours de la servitude volontaire : 19 questionnaires.
- On ne badine pas avec l'amour : 11 questionnaires.
- La rage de l'expression : 15 questionnaires.
- Sido : 58 questionnaires.
- Manon Lescaut : 11 questionnaires.

Le parcours bac contient aussi des fiches HTML dédiées à La Boétie et Montaigne, notamment sur l'hypothèse de la servitude volontaire, le parcours associé, la stratégie argumentative du Discours et l'amitié entre Montaigne et La Boétie.

### Maturité cantonale

Le nouveau dossier `matu/` contient un espace complet pour la maturité cantonale :

- `matu/index.html` : catalogue de podcasts.
- `matu/quiz.html` : sommaire des questionnaires.
- `matu/fiches.html` : sommaire des fiches.
- `matu/matu.js` et `matu/matu.css` : logique et styles propres à ce parcours.

Le catalogue Maturité contient **154 podcasts**, répartis entre :

- Candide : 14 épisodes ou émissions.
- Les Fleurs du mal : 42 épisodes ou émissions.
- Madame Bovary : 26 épisodes ou émissions.
- Le mariage de Figaro : 18 épisodes ou émissions.
- Hernani : 9 épisodes ou émissions.
- Incendies : 9 épisodes ou émissions.
- Jacques le fataliste : 22 épisodes ou émissions.
- La Prose du Transsibérien : 10 épisodes ou émissions.
- Les faux-monnayeurs : 4 épisodes ou émissions.

Le sommaire des quiz Maturité couvre actuellement :

- Candide : 14 questionnaires.
- Les Fleurs du mal : 42 questionnaires.
- Madame Bovary : 25 questionnaires.
- Le mariage de Figaro : 18 questionnaires.
- Hernani : 9 questionnaires.
- Incendies : 9 questionnaires.

Une fiche de révision est disponible pour **Candide de Voltaire**.

### IB

Le dossier `IB/` contient une page `IB/index.html` indiquant que la section IB est en préparation. Elle est déjà reliée à la page d'accueil et prête à accueillir de futurs contenus.

## Fonctionnalités

### Catalogue de podcasts

Les catalogues affichent les podcasts sous forme de cartes. Chaque carte peut présenter le titre, l'oeuvre, l'auteur, la série, la durée, la date, la source et le lien d'origine.

### Classement par oeuvre

Les podcasts sont regroupés par oeuvre ou objet d'étude. Des onglets permettent de passer rapidement d'un ensemble à l'autre ou d'afficher tous les contenus.

### Recherche

Une recherche permet de retrouver un contenu à partir d'un titre, d'un auteur, d'une oeuvre, d'une émission ou d'une source. Depuis les pages de quiz et de fiches, la recherche renvoie vers le catalogue.

### Tris et filtres

Les catalogues proposent :

- un tri par ordre d'origine ;
- un tri du plus long au plus court ;
- un tri du plus court au plus long ;
- un tri du plus récent au plus ancien ;
- un tri du plus ancien au plus récent ;
- un filtre par durée maximale : 10, 30 ou 60 minutes ;
- un filtre par état : tous, à écouter, écoutés.

### Progression locale

Chaque podcast peut être marqué comme écouté. La progression est conservée dans le navigateur grâce au stockage local. Une barre de progression affiche le nombre d'épisodes terminés, le total et le pourcentage d'avancement.

### Favoris

Les podcasts peuvent être ajoutés aux favoris. Un filtre permet ensuite de n'afficher que cette sélection.

### Lecteur intégré

Quand un lecteur est disponible, l'écoute peut se faire directement depuis la carte grâce aux intégrations Radio France.

### Résumés pédagogiques

Certains contenus disposent de résumés structurés ou de transcriptions nettoyées. Ces données alimentent les pages de révision et les scripts de génération.

### Quiz

Les quiz proposent des questions à choix multiples, une correction immédiate, un score et des explications. Les questionnaires sont accessibles depuis les sommaires par oeuvre.

### Fiches

Les pages de fiches complètent les podcasts et les quiz avec des repères synthétiques : notions, auteurs, citations, enjeux d'argumentation ou éléments d'analyse.

### Mode sombre

Le site dispose d'un mode sombre. Le choix est conservé dans le navigateur.

### Interface responsive

Les pages sont pensées pour fonctionner sur ordinateur, tablette et mobile.

## Structure du projet

```text
.
├── index.html                # Page d'entrée vers Bac, Maturité et IB
├── header.js                 # Recherche, thème et progression partagés
├── styles.css                # Styles communs
├── assets/                   # Logos et éléments graphiques
├── fr/                       # Parcours Bac français
│   ├── index.html            # Catalogue Bac français
│   ├── quiz.html             # Sommaire des quiz Bac français
│   ├── fiches.html           # Sommaire des fiches Bac français
│   ├── app.js                # Logique du catalogue Bac
│   ├── liste.md              # Liste source des podcasts Bac
│   ├── summaries.json        # Transcriptions et résumés Bac
│   ├── summaries-clean.json  # Transcriptions nettoyées
│   ├── summaries-clean-report.json
│   ├── build-audio-map.js    # Script d'intégration des lecteurs Radio France
│   ├── build-summaries.js    # Script d'intégration des résumés
│   ├── clean-transcripts.js  # Script de nettoyage des transcriptions
│   ├── transcribe.py         # Script de transcription
│   ├── fiches/               # Fiches Bac français
│   └── quiz/                 # Quiz Bac français
├── matu/                     # Parcours Maturité cantonale
│   ├── index.html
│   ├── quiz.html
│   ├── fiches.html
│   ├── matu.css
│   ├── matu.js
│   ├── summaries.json
│   ├── podcasts.md
│   ├── fiches/
│   └── quiz/
└── IB/
    └── index.html            # Section IB en préparation
```

## Utilisation locale

Le site est statique. Il peut être ouvert directement dans un navigateur depuis `index.html`, ou servi localement avec Python :

```bash
python3 -m http.server 8000
```

Puis ouvrir :

```text
http://localhost:8000/
```

## Scripts utiles

### Intégrer les lecteurs audio

```bash
cd fr
node build-audio-map.js
```

Ce script lit les podcasts présents dans `index.html`, récupère les identifiants Radio France et injecte les URLs d'embed dans le bloc `audioSources`.

### Intégrer les résumés

```bash
cd fr
node build-summaries.js
```

Ce script lit `summaries.json`, nettoie les résumés disponibles et les intègre dans `index.html`.

### Nettoyer les transcriptions

```bash
cd fr
node clean-transcripts.js
```

Ce script lit `summaries.json` et produit `summaries-clean.json`, sans modifier le fichier original. Il normalise les espaces, corrige quelques noms propres récurrents et retire certaines mentions parasites. Un rapport détaillé est écrit dans `summaries-clean-report.json`.

### Générer les transcriptions

```bash
cd fr
python3 transcribe.py
```

Ce script télécharge les audios disponibles et transcrit les podcasts avec Whisper local. Les résultats sont sauvegardés dans `summaries.json` et la reprise est automatique en cas d'interruption.

### Générer les données Maturité

```bash
node matu/generate-transcript-study-data.js
node matu/generate-madame-bovary-study-data.js
```

Ces scripts servent à produire ou enrichir des données de révision pour le parcours Maturité.

## Données et contenus

Les contenus audio restent hébergés par leurs plateformes d'origine, notamment Radio France. Le site référence les épisodes, affiche leurs métadonnées et, lorsque c'est possible, les intègre via un lecteur embarqué.

Les quiz, fiches, résumés et transcriptions servent d'aide à la révision. Ils ne remplacent pas l'écoute des épisodes ni la lecture des oeuvres.

## Technologies

- HTML
- CSS
- JavaScript sans framework
- Stockage local du navigateur
- Font Awesome pour les icônes
- Node.js pour les scripts de génération et d'intégration
- Python et Whisper pour la transcription

## Licence

Le site mentionne une licence Creative Commons **CC BY-SA** dans son pied de page.

## Auteur

Projet créé par [Yann Houry](https://www.linkedin.com/in/yann-houry-a2350651/).
