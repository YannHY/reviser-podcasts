(() => {
  const shared = window.BacPodcastUtils;

  function init(options) {
    const state = {
      podcasts: options.podcasts || [],
      sections: options.sections || [],
      activeSection: "all",
      favoritesOnly: false,
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
      sections: document.querySelector("#podcasts"),
      resultCount: document.querySelector("#resultCount"),
      totalTime: document.querySelector("#totalTime"),
      doneCount: document.querySelector("#doneCount"),
      progressText: document.querySelector("#progressText"),
      progressBar: document.querySelector("#progressBar"),
    };
    options.state = state;
    options.els = els;

    shared.initHeaderMark();
    shared.initThemeToggle(els.themeToggle);
    bindEvents(state, els, options);
    applyInitialSearch(els);
    buildTabs(state, els);
    render(state, els, options);
    shared.setCurrentYear();
  }

  function bindEvents(state, els, options) {
    [els.search, els.sort, els.duration, els.status].forEach((control) => {
      control?.addEventListener("input", () => render(state, els, options));
    });

    els.searchToggle?.addEventListener("click", () => {
      const willOpen = els.searchPanel?.hidden;
      setSearchOpen(els, willOpen);
      if (willOpen) els.search?.focus();
    });

    els.searchClose?.addEventListener("click", () => {
      if (els.search) els.search.value = "";
      setSearchOpen(els, false);
      render(state, els, options);
    });

    els.search?.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      els.search.value = "";
      setSearchOpen(els, false);
      render(state, els, options);
      els.searchToggle?.focus();
    });

    els.favorites?.addEventListener("click", () => {
      state.favoritesOnly = !state.favoritesOnly;
      render(state, els, options);
    });

    els.tabs?.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      state.activeSection = button.dataset.section;
      if (state.activeSection === "all") {
        if (els.search) els.search.value = "";
        if (els.status) els.status.value = "all";
        if (els.duration) els.duration.value = "all";
        state.favoritesOnly = false;
        setSearchOpen(els, false);
      }
      render(state, els, options);
    });
  }

  function applyInitialSearch(els) {
    shared.applyInitialSearch(els.search, () => setSearchOpen(els, true));
  }

  function setSearchOpen(els, open) {
    shared.setSearchOpen(els.searchPanel, els.searchToggle, open);
  }

  function buildTabs(state, els) {
    if (!els.tabs) return;
    els.tabs.innerHTML = "";
    ["all", ...state.sections].forEach((section) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.section = section;
      button.textContent = section === "all" ? "Tous" : shared.frenchTypography(section);
      button.setAttribute("aria-selected", section === state.activeSection ? "true" : "false");
      els.tabs.append(button);
    });
  }

  function render(state, els, options = {}) {
    const visible = getVisiblePodcasts(state, els);
    shared.renderProgress(state.podcasts, els);
    shared.renderFavoriteFilter(els.favorites, state.favoritesOnly, state.podcasts);
    shared.renderTabs(els.tabs, state.activeSection);
    shared.renderSummary(visible, els);
    renderSections(visible, state, els, options);
  }

  function getVisiblePodcasts(state, els) {
    const query = shared.normalizeSearchText(els.search?.value || "").trim();
    const listenedFilter = els.status?.value || "all";
    const maxDuration = els.duration?.value || "all";

    const filtered = state.podcasts.filter((podcast) => {
      const sectionMatch = state.activeSection === "all" || podcast.section === state.activeSection;
      const searchMatch = !query || podcast.searchable.includes(query);
      const listened = shared.isListened(podcast.id);
      const favoriteMatch = !state.favoritesOnly || shared.isFavorite(podcast.id);
      const statusMatch =
        listenedFilter === "all" ||
        (listenedFilter === "done" && listened) ||
        (listenedFilter === "todo" && !listened);
      const durationMatch = maxDuration === "all" || Number(podcast.duration || 0) <= Number(maxDuration);
      return sectionMatch && searchMatch && favoriteMatch && statusMatch && durationMatch;
    });

    const sorters = {
      source: (a, b) => a.order - b.order,
      longest: (a, b) => Number(b.duration || 0) - Number(a.duration || 0) || a.order - b.order,
      shortest: (a, b) => Number(a.duration || 0) - Number(b.duration || 0) || a.order - b.order,
      newest: (a, b) => String(b.dateValue || b.date).localeCompare(String(a.dateValue || a.date)) || a.order - b.order,
      oldest: (a, b) => String(a.dateValue || a.date).localeCompare(String(b.dateValue || b.date)) || a.order - b.order,
    };

    return filtered.sort(sorters[els.sort?.value] || sorters.source);
  }

  function renderSections(podcasts, state, els, options) {
    if (!els.sections) return;
    els.sections.innerHTML = "";
    if (podcasts.length === 0) {
      els.sections.innerHTML = `<p class="empty">Aucun podcast ne correspond aux filtres.</p>`;
      return;
    }

    const grouped = shared.groupBy(podcasts, "section");
    const sectionOrder = els.sort?.value === "source"
      ? state.sections.filter((section) => grouped.has(section))
      : [...grouped.keys()];

    sectionOrder.forEach((section) => {
      const items = grouped.get(section);
      const titleId = shared.makeSlug(`${section}-title`);
      const wrapper = document.createElement("section");
      wrapper.className = "object-section";
      wrapper.setAttribute("aria-labelledby", titleId);
      wrapper.innerHTML = `
        <div class="section-title">
          <h2 id="${titleId}">${shared.escapeHtml(shared.frenchTypography(section))}</h2>
          <span>${shared.escapeHtml(items[0].author || "")}</span>
        </div>
        <div class="grid ${options.gridClass || ""}"></div>
      `;
      const grid = wrapper.querySelector(".grid");
      items.forEach((podcast) => grid.append(createCard(podcast, options)));
      els.sections.append(wrapper);
    });
  }

  function createCard(podcast, options) {
    const card = document.createElement("article");
    const frameSrc = getFrameSrc(podcast);
    const summaryText = options.summaryData?.[podcast.id] || "";
    const quizHref = options.quizLinks?.[podcast.id] || "";
    const displayTitle = getDisplayTitle(podcast, options);
    card.className = "card";
    card.dataset.podcastId = podcast.id;
    card.dataset.duration = podcast.duration || 0;
    card.classList.toggle("is-done", shared.isListened(podcast.id));
    card.classList.toggle("is-favorite", shared.isFavorite(podcast.id));
    card.innerHTML = `
      <div class="card-head">
        <label class="listened"><input type="checkbox"><span>Écouté</span></label>
        <h2>${shared.escapeHtml(shared.frenchTypography(displayTitle))}</h2>
      </div>
      <p class="meta">${metaHtml(podcast)}</p>
      <div class="actions">
        <button class="favorite-button" type="button" aria-pressed="false" aria-label="Ajouter aux favoris" title="Ajouter aux favoris">
          <i class="fa-regular fa-heart" aria-hidden="true"></i>
        </button>
        <a class="source-link" href="${shared.escapeHtml(podcast.url || "#")}" target="_blank" rel="noreferrer" aria-label="Voir la source" title="Voir la source" ${podcast.url ? "" : "hidden"}>
          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
        <button class="listen-button" type="button" aria-label="Écouter ici" title="Écouter ici" data-frame-src="${shared.escapeHtml(frameSrc)}" data-frame-title="${shared.escapeHtml(podcast.title)}" ${frameSrc ? "" : "hidden"}>
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

    bindCard(card, podcast, summaryText, options);
    return card;
  }

  function bindCard(card, podcast, summaryText, options) {
    const checkbox = card.querySelector(".listened input");
    const favoriteButton = card.querySelector(".favorite-button");
    const listenButton = card.querySelector(".listen-button");
    const summaryButton = card.querySelector(".summary-button");
    const player = card.querySelector(".player");
    const summaryPanel = card.querySelector(".summary-panel");

    checkbox.checked = shared.isListened(podcast.id);
    shared.updateFavoriteButton(favoriteButton, shared.isFavorite(podcast.id));

    checkbox.addEventListener("change", () => {
      shared.setListened(podcast.id, checkbox.checked);
      render(options.state, options.els, options);
    });

    favoriteButton.addEventListener("click", () => {
      shared.setFavorite(podcast.id, !shared.isFavorite(podcast.id));
      render(options.state, options.els, options);
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
        player.classList.toggle("is-podcastics", frameSrc.includes("player.podcastics.com"));
        player.classList.toggle("is-spotify", isSpotifyUrl(frameSrc));
        player.classList.toggle("is-spotify-large", isSpotifyLargeUrl(frameSrc));
        player.classList.toggle("is-acast", isAcastUrl(frameSrc));
        player.classList.toggle("is-video", isVideoUrl(frameSrc));
        player.classList.toggle("is-audio-file", isAudioFileUrl(frameSrc));
        player.innerHTML = renderPlayerFrame(frameSrc, listenButton.dataset.frameTitle);
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
        summaryPanel.innerHTML = (options.renderSummary || shared.renderSummaryContent)(summaryText);
      }
    });
  }

  function metaHtml(podcast) {
    const parts = [
      podcast.duration ? shared.formatDuration(podcast.duration) : "Durée non renseignée",
      podcast.displayDate || formatDate(podcast.date) || "Date non renseignée",
      podcast.station || podcast.origin || null,
    ].filter(Boolean).map((part) => `<span>${shared.escapeHtml(part)}</span>`);
    return parts.join('<span class="dot" aria-hidden="true">·</span>');
  }

  function formatDate(date) {
    if (!date) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${date}T12:00:00`));
  }

  function getDisplayTitle(podcast, options) {
    if (options.getDisplayTitle) return options.getDisplayTitle(podcast);
    return podcast.title;
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

    return `
      <iframe
        src="${shared.escapeHtml(src)}"
        width="100%"
        height="${getFrameHeight(src)}"
        frameborder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowtransparency="true"
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

  window.BacPodcastPage = { init };
})();
