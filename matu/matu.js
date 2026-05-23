(() => {
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
      id: makeId(`matu-${podcast.work}-${podcast.series || ""}-${podcast.title}-${workIndex}`),
      dateValue: parseDateValue(podcast.date),
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
  const yearEl = document.querySelector("#current-year");
  const sortSelect = document.querySelector("#sortSelect");
  const durationFilter = document.querySelector("#durationFilter");
  const statusFilter = document.querySelector("#statusFilter");
  const favoritesToggle = document.querySelector("#favoritesToggle");
  const sectionTabs = document.querySelector("#sectionTabs");

  let activeSection = "all";
  let favoritesOnly = false;
  let cards = [];

  initTheme();
  bindFilters();
  applyInitialSearch();
  buildTabs();
  render();
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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
    if (!searchPanel || !searchToggle) return;
    searchPanel.hidden = !open;
    searchToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("has-open-search", open);
  }

  function applyInitialSearch() {
    if (!searchInput) return;
    const query = new URLSearchParams(window.location.search).get("search");
    if (!query) return;

    searchInput.value = query;
    setSearchOpen(true);
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
          <h2 id="${makeId(`${work}-title`)}">${escapeHtml(work)}</h2>
          <span>${escapeHtml(groupItems[0].author || "")}</span>
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
        <h2>${escapeHtml(podcast.title)}</h2>
      </div>
      <p class="meta">${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join('<span class="dot" aria-hidden="true">·</span>')}</p>
      <div class="actions">
        <button class="favorite-button" type="button" aria-pressed="false" aria-label="Ajouter aux favoris" title="Ajouter aux favoris">
          <i class="fa-regular fa-heart" aria-hidden="true"></i>
        </button>
        <a class="source-link" href="${escapeHtml(podcast.url)}" target="_blank" rel="noreferrer" aria-label="Voir la source" title="Voir la source">
          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
        <button class="listen-button" type="button" aria-label="Écouter ici" title="Écouter ici" data-frame-src="${escapeHtml(frameSrc)}" data-frame-title="${escapeHtml(podcast.title)}" ${hasPlayer ? "" : "hidden"}>
          <i class="fa-solid fa-play" aria-hidden="true"></i>
        </button>
        <button class="summary-button" type="button" aria-label="Résumé" title="Résumé" ${summaryText ? "" : "hidden"}>
          <i class="fa-regular fa-file-lines" aria-hidden="true"></i>
        </button>
        <a class="quiz-link" href="${escapeHtml(quizHref)}" aria-label="Quiz : ${escapeHtml(podcast.title)}" title="Quiz" ${quizHref ? "" : "hidden"}>
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

  function initTheme() {
    if (!themeToggle) return;
    const saved = localStorage.getItem("bac-podcasts-theme");
    applyTheme(saved === "dark" ? "dark" : "light");
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("bac-podcasts-theme", theme);
    themeToggle.innerHTML = `<i class="fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"}" aria-hidden="true"></i>`;
    themeToggle.setAttribute("aria-label", theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre");
    themeToggle.title = theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre";
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
          summaryPanel.innerHTML = renderSummaryContent(summaryData[podcast?.id] || "");
        }
      });
    });
  }

  function renderProgress() {
    const listened = podcastData.filter((podcast) => isListened(podcast.id)).length;
    const total = podcastData.length;
    const percent = total ? Math.round((listened / total) * 100) : 0;

    if (progressText) progressText.textContent = `${listened}/${total} podcasts écoutés`;
    if (progressBar) progressBar.style.width = `${percent}%`;
  }

  function renderSummary(podcasts) {
    if (resultCount) resultCount.textContent = podcasts.length;
    if (totalTime) totalTime.textContent = formatDuration(podcasts.reduce((sum, podcast) => sum + Number(podcast.duration || 0), 0));
    if (doneCount) doneCount.textContent = podcasts.filter((podcast) => isListened(podcast.id)).length;
  }

  function renderFavoriteFilter() {
    if (!favoritesToggle) return;
    const favoritesCount = podcastData.filter((podcast) => isFavorite(podcast.id)).length;
    favoritesToggle.setAttribute("aria-pressed", favoritesOnly ? "true" : "false");
    favoritesToggle.innerHTML = `
      <i class="${favoritesOnly ? "fa-solid" : "fa-regular"} fa-heart" aria-hidden="true"></i>
      <span>Favoris${favoritesCount ? ` (${favoritesCount})` : ""}</span>
    `;
  }

  function renderTabs() {
    sectionTabs?.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-selected", button.dataset.section === activeSection ? "true" : "false");
    });
  }

  function updateFavoriteButton(button, favorite) {
    button.setAttribute("aria-pressed", favorite ? "true" : "false");
    button.setAttribute("aria-label", favorite ? "Retirer des favoris" : "Ajouter aux favoris");
    button.title = favorite ? "Retirer des favoris" : "Ajouter aux favoris";
    button.innerHTML = `<i class="${favorite ? "fa-solid" : "fa-regular"} fa-heart" aria-hidden="true"></i>`;
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
          src="${escapeHtml(src)}"
          controls
          preload="none"
          title="${escapeHtml(title)}"></audio>
      `;
    }

    const spotify = isSpotifyUrl(src);
    return `
      <iframe
        src="${escapeHtml(src)}"
        height="${getFrameHeight(src)}"
        frameborder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowfullscreen
        loading="lazy"
        title="${escapeHtml(title)}"></iframe>
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
    return localStorage.getItem(`bac-podcast:${id}`) === "1";
  }

  function setListened(id, listened) {
    setState(`bac-podcast:${id}`, listened);
  }

  function isFavorite(id) {
    return localStorage.getItem(`bac-podcast-favorite:${id}`) === "1";
  }

  function setFavorite(id, favorite) {
    setState(`bac-podcast-favorite:${id}`, favorite);
  }

  function setState(key, enabled) {
    if (enabled) {
      localStorage.setItem(key, "1");
    } else {
      localStorage.removeItem(key);
    }
  }

  function parseDateValue(date) {
    const match = String(date || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  function formatDuration(minutes) {
    if (!minutes) return "0 min";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours ? `${hours} h ${String(mins).padStart(2, "0")} min` : `${mins} min`;
  }

  function groupBy(items, key) {
    return items.reduce((map, item) => {
      const value = item[key];
      if (!map.has(value)) map.set(value, []);
      map.get(value).push(item);
      return map;
    }, new Map());
  }

  function makeId(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderSummaryContent(text) {
    const value = String(text || "").trim();
    if (/^<(h[1-6]|p|ul|ol|section|article|div)\b/i.test(value)) {
      return sanitizeSummaryHtml(value);
    }
    return renderMarkdown(value);
  }

  function renderMarkdown(text) {
    const lines = text.split(/\r?\n/);
    const html = [];
    let inList = false;

    lines.forEach((raw) => {
      const line = raw.trimEnd();
      if (line.startsWith("## ")) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        html.push(`<h3>${inlineMarkdown(line.slice(3))}</h3>`);
      } else if (line.startsWith("- ")) {
        if (!inList) {
          html.push("<ul>");
          inList = true;
        }
        html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      } else if (line.trim()) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        html.push(`<p>${inlineMarkdown(line)}</p>`);
      }
    });

    if (inList) html.push("</ul>");
    return html.join("");
  }

  function inlineMarkdown(value) {
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
})();
