(() => {
  const shared = window.BacPodcastUtils;
  const dataSource = document.querySelector("#podcastData");
  const summarySource = document.querySelector("#summaryData");
  const quizLinkSource = document.querySelector("#quizLinks");
  const rawPodcastData = dataSource ? JSON.parse(dataSource.textContent) : [];
  const summaryData = summarySource ? JSON.parse(summarySource.textContent) : {};
  const quizLinks = quizLinkSource ? JSON.parse(quizLinkSource.textContent) : {};
  const workIndexes = new Map();
  const podcastData = rawPodcastData.map((podcast, index) => {
    const workIndex = workIndexes.get(podcast.work) || 0;
    workIndexes.set(podcast.work, workIndex + 1);
    return {
      ...podcast,
      order: index,
      id: podcast.id || makeId(`matu-${podcast.work}-${podcast.series || ""}-${podcast.title}-${workIndex}`),
      dateValue: shared.parseFrenchDateValue(podcast.date),
    };
  });

  const sections = document.querySelector("#podcasts");
  const progressText = document.querySelector("#progressText");
  const progressBar = document.querySelector("#progressBar");
  const resultCount = document.querySelector("#resultCount");
  const totalTime = document.querySelector("#totalTime");
  const doneCount = document.querySelector("#doneCount");
  const searchInput = document.querySelector("#searchInput");
  const searchPanel = document.querySelector("#headerSearch");
  const searchToggle = document.querySelector("#searchToggle");
  const searchClose = document.querySelector("#searchClose");
  const themeToggle = document.querySelector("#themeToggle");
  const sortSelect = document.querySelector("#sortSelect");
  const durationFilter = document.querySelector("#durationFilter");
  const statusFilter = document.querySelector("#statusFilter");
  const favoritesToggle = document.querySelector("#favoritesToggle");
  const sectionTabs = document.querySelector("#sectionTabs");

  let activeSection = "all";
  let favoritesOnly = false;
  let cards = [];

  shared.initThemeToggle(themeToggle);
  bindFilters();
  applyInitialSearch();
  buildTabs();
  render();
  shared.setCurrentYear();

  function bindFilters() {
    [searchInput, sortSelect, durationFilter, statusFilter].forEach((control) => {
      control?.addEventListener("input", render);
    });

    searchToggle?.addEventListener("click", () => {
      const willOpen = searchPanel?.hidden;
      setSearchOpen(willOpen);
      if (willOpen) searchInput?.focus();
    });

    searchClose?.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      setSearchOpen(false);
      render();
    });

    searchInput?.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      searchInput.value = "";
      setSearchOpen(false);
      render();
      searchToggle?.focus();
    });

    favoritesToggle?.addEventListener("click", () => {
      favoritesOnly = !favoritesOnly;
      render();
    });

    sectionTabs?.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      activeSection = button.dataset.section;
      if (activeSection === "all" && searchInput && statusFilter && durationFilter) {
        searchInput.value = "";
        setSearchOpen(false);
        statusFilter.value = "all";
        durationFilter.value = "all";
        favoritesOnly = false;
      }
      render();
    });
  }

  function setSearchOpen(open) {
    shared.setSearchOpen(searchPanel, searchToggle, open);
  }

  function applyInitialSearch() {
    shared.applyInitialSearch(searchInput, () => setSearchOpen(true));
  }

  function buildTabs() {
    if (!sectionTabs || podcastData.length === 0) return;
    const works = ["all", ...new Set(podcastData.map((podcast) => podcast.work))];
    sectionTabs.innerHTML = "";

    works.forEach((work) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.section = work;
      button.textContent = work === "all" ? "Tous" : work;
      button.setAttribute("aria-selected", work === activeSection ? "true" : "false");
      sectionTabs.append(button);
    });
  }

  function render() {
    if (!sections || podcastData.length === 0) {
      renderProgress();
      return;
    }

    const visible = getVisiblePodcasts();
    renderPodcastCards(visible, sections);
    cards = [...document.querySelectorAll("[data-podcast-id]")];
    initPodcastState();
    renderProgress();
    renderFavoriteFilter();
    renderTabs();
    renderSummary(visible);
  }

  function getVisiblePodcasts() {
    const query = (searchInput?.value || "").trim().toLocaleLowerCase("fr-FR");
    const maxDuration = durationFilter?.value || "all";
    const listenedFilter = statusFilter?.value || "all";

    const filtered = podcastData.filter((podcast) => {
      const sectionMatch = activeSection === "all" || podcast.work === activeSection;
      const searchable = [
        podcast.work,
        podcast.author,
        podcast.title,
        podcast.series,
        podcast.origin,
        podcast.date,
      ].filter(Boolean).join(" ").toLocaleLowerCase("fr-FR");
      const searchMatch = !query || searchable.includes(query);
      const durationMatch = maxDuration === "all" || Number(podcast.duration || 0) <= Number(maxDuration);
      const listened = isListened(podcast.id);
      const statusMatch =
        listenedFilter === "all" ||
        (listenedFilter === "done" && listened) ||
        (listenedFilter === "todo" && !listened);
      const favoriteMatch = !favoritesOnly || isFavorite(podcast.id);

      return sectionMatch && searchMatch && durationMatch && statusMatch && favoriteMatch;
    });

    const sorters = {
      source: (a, b) => a.order - b.order,
      longest: (a, b) => Number(b.duration || 0) - Number(a.duration || 0) || a.order - b.order,
      shortest: (a, b) => Number(a.duration || 0) - Number(b.duration || 0) || a.order - b.order,
      newest: (a, b) => String(b.dateValue).localeCompare(String(a.dateValue)) || a.order - b.order,
      oldest: (a, b) => String(a.dateValue).localeCompare(String(b.dateValue)) || a.order - b.order,
    };

    return filtered.sort(sorters[sortSelect?.value] || sorters.source);
  }

  function renderPodcastCards(items, container) {
    container.innerHTML = "";

    if (items.length === 0) {
      container.innerHTML = `<p class="empty">Aucun podcast ne correspond aux filtres.</p>`;
      return;
    }

    const groups = groupBy(items, "work");
    const sectionOrder = sortSelect?.value === "source"
      ? [...new Set(podcastData.map((podcast) => podcast.work))].filter((work) => groups.has(work))
      : [...groups.keys()];

    sectionOrder.forEach((work) => {
      const groupItems = groups.get(work);
      const wrapper = document.createElement("section");
      wrapper.className = "object-section";
      wrapper.setAttribute("aria-labelledby", makeId(`${work}-title`));
      wrapper.innerHTML = `
        <div class="section-title">
          <h2 id="${makeId(`${work}-title`)}">${shared.escapeHtml(work)}</h2>
          <span>${shared.escapeHtml(groupItems[0].author || "")}</span>
        </div>
        <div class="grid matu-grid"></div>
      `;

      const grid = wrapper.querySelector(".grid");
      groupItems.forEach((podcast) => grid.append(createCard(podcast)));
      container.append(wrapper);
    });
  }

  function createCard(podcast) {
    const card = document.createElement("article");
    const frameSrc = getFrameSrc(podcast);
    const summaryText = summaryData[podcast.id] || "";
    const quizHref = quizLinks[podcast.id] || "";
    card.className = "card";
    card.dataset.podcastId = podcast.id;
    card.dataset.duration = podcast.duration || 0;

    const meta = [
      podcast.duration ? formatDuration(podcast.duration) : "Durée non renseignée",
      podcast.date || "Date non renseignée",
      podcast.origin || null,
    ].filter(Boolean);
    const hasPlayer = Boolean(frameSrc);

    card.innerHTML = `
      <div class="card-head">
        <label class="listened"><input type="checkbox"><span>Écouté</span></label>
      <h2>${shared.escapeHtml(podcast.title)}</h2>
      </div>
      <p class="meta">${meta.map((item) => `<span>${shared.escapeHtml(item)}</span>`).join('<span class="dot" aria-hidden="true">·</span>')}</p>
      <div class="actions">
        <button class="favorite-button" type="button" aria-pressed="false" aria-label="Ajouter aux favoris" title="Ajouter aux favoris">
          <i class="fa-regular fa-heart" aria-hidden="true"></i>
        </button>
        <a class="source-link" href="${shared.escapeHtml(podcast.url)}" target="_blank" rel="noreferrer" aria-label="Voir la source" title="Voir la source">
          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
        <button class="listen-button" type="button" aria-label="Écouter ici" title="Écouter ici" data-frame-src="${shared.escapeHtml(frameSrc)}" data-frame-title="${shared.escapeHtml(podcast.title)}" ${hasPlayer ? "" : "hidden"}>
          <i class="fa-solid fa-play" aria-hidden="true"></i>
        </button>
        <button class="summary-button" type="button" aria-label="Résumé" title="Résumé" ${summaryText ? "" : "hidden"}>
          <i class="fa-regular fa-file-lines" aria-hidden="true"></i>
        </button>
        <a class="quiz-link" href="${shared.escapeHtml(quizHref)}" aria-label="Quiz : ${shared.escapeHtml(podcast.title)}" title="Quiz" ${quizHref ? "" : "hidden"}>
          <i class="fa-solid fa-brain" aria-hidden="true"></i>
        </a>
      </div>
      <div class="card-extra">
        <div class="player" hidden></div>
        <div class="summary-panel" hidden></div>
      </div>
    `;
    return card;
  }

  function initPodcastState() {
    cards.forEach((card) => {
      const id = card.dataset.podcastId;
      const checkbox = card.querySelector(".listened input");
      const favoriteButton = card.querySelector(".favorite-button");
      const listenButton = card.querySelector(".listen-button");
      const summaryButton = card.querySelector(".summary-button");
      const player = card.querySelector(".player");
      const summaryPanel = card.querySelector(".summary-panel");
      const podcast = podcastData.find((item) => item.id === id);

      checkbox.checked = isListened(id);
      card.classList.toggle("is-done", checkbox.checked);
      updateFavoriteButton(favoriteButton, isFavorite(id));
      card.classList.toggle("is-favorite", isFavorite(id));

      checkbox.addEventListener("change", () => {
        setListened(id, checkbox.checked);
        render();
      });

      favoriteButton.addEventListener("click", () => {
        setFavorite(id, !isFavorite(id));
        render();
      });

      listenButton?.addEventListener("click", () => {
        const isOpen = !player.hidden;
        player.hidden = isOpen;
        listenButton.title = isOpen ? "Écouter ici" : "Fermer";
        listenButton.setAttribute("aria-label", isOpen ? "Écouter ici" : "Fermer");
        listenButton.innerHTML = isOpen
          ? '<i class="fa-solid fa-play" aria-hidden="true"></i>'
          : '<i class="fa-solid fa-chevron-up" aria-hidden="true"></i>';

        if (!isOpen && player.childElementCount === 0) {
          const frameSrc = listenButton.dataset.frameSrc;
          player.classList.toggle("is-spotify", isSpotifyUrl(frameSrc));
          player.classList.toggle("is-spotify-large", isSpotifyLargeUrl(frameSrc));
          player.classList.toggle("is-acast", isAcastUrl(frameSrc));
          player.classList.toggle("is-video", isVideoUrl(frameSrc));
          player.classList.toggle("is-audio-file", isAudioFileUrl(frameSrc));
          player.innerHTML = renderPlayerFrame(
            frameSrc,
            listenButton.dataset.frameTitle,
          );
        }
      });

      summaryButton?.addEventListener("click", () => {
        const isOpen = !summaryPanel.hidden;
        summaryPanel.hidden = isOpen;
        summaryButton.title = isOpen ? "Résumé" : "Fermer le résumé";
        summaryButton.setAttribute("aria-label", isOpen ? "Résumé" : "Fermer le résumé");
        summaryButton.innerHTML = isOpen
          ? '<i class="fa-regular fa-file-lines" aria-hidden="true"></i>'
          : '<i class="fa-solid fa-chevron-up" aria-hidden="true"></i>';

        if (!isOpen && summaryPanel.childElementCount === 0) {
          summaryPanel.innerHTML = shared.renderSummaryContent(summaryData[podcast?.id] || "");
        }
      });
    });
  }

  function renderProgress() {
    shared.renderProgress(podcastData, { progressText, progressBar });
  }

  function renderSummary(podcasts) {
    shared.renderSummary(podcasts, { resultCount, totalTime, doneCount });
  }

  function renderFavoriteFilter() {
    shared.renderFavoriteFilter(favoritesToggle, favoritesOnly, podcastData);
  }

  function renderTabs() {
    shared.renderTabs(sectionTabs, activeSection);
  }

  function updateFavoriteButton(button, favorite) {
    shared.updateFavoriteButton(button, favorite);
  }

  function getFrameSrc(podcast) {
    const src = podcast.iframe || podcast.audioUrl || "";
    if (!isSpotifyUrl(src)) return src;

    const url = new URL(src);
    if (!url.searchParams.has("utm_source")) {
      url.searchParams.set("utm_source", "generator");
    }
    return url.toString();
  }

  function renderPlayerFrame(src, title) {
    if (isAudioFileUrl(src)) {
      return `
        <audio
          src="${shared.escapeHtml(src)}"
          controls
          preload="none"
          title="${shared.escapeHtml(title)}"></audio>
      `;
    }

    const spotify = isSpotifyUrl(src);
    return `
      <iframe
        src="${shared.escapeHtml(src)}"
        height="${getFrameHeight(src)}"
        frameborder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowfullscreen
        loading="lazy"
        title="${shared.escapeHtml(title)}"></iframe>
    `;
  }

  function isSpotifyUrl(src) {
    return /^https:\/\/open\.spotify\.com\/embed\//i.test(src || "");
  }

  function isSpotifyLargeUrl(src) {
    return /^https:\/\/open\.spotify\.com\/embed\/(album|playlist|show)\//i.test(src || "");
  }

  function isAcastUrl(src) {
    return /^https:\/\/embed\.acast\.com\//i.test(src || "");
  }

  function isVideoUrl(src) {
    return /^https:\/\/(player\.vimeo\.com|www\.youtube\.com|youtube\.com)\//i.test(src || "");
  }

  function isAudioFileUrl(src) {
    return /\.(mp3|m4a|ogg|wav)(?:[?#].*)?$/i.test(src || "");
  }

  function getFrameHeight(src) {
    if (isSpotifyLargeUrl(src)) return 352;
    if (isSpotifyUrl(src)) return 152;
    if (isAcastUrl(src)) return 190;
    if (isVideoUrl(src)) return 360;
    return 144;
  }

  function isListened(id) {
    return shared.isListened(id);
  }

  function setListened(id, listened) {
    shared.setListened(id, listened);
  }

  function isFavorite(id) {
    return shared.isFavorite(id);
  }

  function setFavorite(id, favorite) {
    shared.setFavorite(id, favorite);
  }

  function formatDuration(minutes) {
    return shared.formatDuration(minutes);
  }

  function groupBy(items, key) {
    return shared.groupBy(items, key);
  }

  function makeId(value) {
    return shared.makeSlug(value);
  }

  function escapeHtml(value) {
    return shared.escapeHtml(value);
  }
})();
