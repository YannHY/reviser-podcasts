(() => {
  const THEME_KEY = "bac-podcasts-theme";
  const LISTENED_PREFIX = "bac-podcast:";
  const FAVORITE_PREFIX = "bac-podcast-favorite:";

  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    } catch (error) {
      return "light";
    }
  }

  function applyTheme(theme, themeToggle) {
    const dark = theme === "dark";
    document.documentElement.toggleAttribute("data-theme", dark);
    if (dark) {
      document.documentElement.setAttribute("data-theme", "dark");
    }

    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch (error) {}

    updateThemeIcon(themeToggle, dark);
  }

  function initThemeToggle(themeToggle) {
    if (!themeToggle) return;
    applyTheme(getSavedTheme(), themeToggle);
    themeToggle.addEventListener("click", () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      applyTheme(dark ? "light" : "dark", themeToggle);
    });
  }

  function updateThemeIcon(themeToggle, dark) {
    if (!themeToggle) return;
    themeToggle.setAttribute("aria-label", dark ? "Activer le mode clair" : "Activer le mode sombre");
    themeToggle.title = dark ? "Activer le mode clair" : "Activer le mode sombre";
    themeToggle.innerHTML = `<i class="fa-solid ${dark ? "fa-sun" : "fa-moon"}" aria-hidden="true"></i>`;
  }

  function setSearchOpen(searchPanel, searchToggle, open) {
    if (!searchPanel || !searchToggle) return;
    searchPanel.hidden = !open;
    searchToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("has-open-search", open);
  }

  function applyInitialSearch(searchInput, openSearch) {
    if (!searchInput) return;
    const query = new URLSearchParams(window.location.search).get("search");
    if (!query) return;
    searchInput.value = query;
    openSearch();
  }

  function initHeaderMark() {
    const brand = document.querySelector(".topbar > div:first-child");
    if (!brand || brand.querySelector(".menu-microphone")) return;

    brand.classList.add("topbar-brand");
    const microphone = document.createElement("span");
    microphone.className = "menu-microphone";
    microphone.setAttribute("aria-hidden", "true");
    microphone.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
    brand.prepend(microphone);
  }

  function renderProgress(podcasts, els) {
    const total = podcasts.length;
    const listened = podcasts.filter((podcast) => isListened(podcast.id)).length;
    const percent = total ? Math.round((listened / total) * 100) : 0;
    if (els.progressText) els.progressText.textContent = `${listened}/${total} podcasts écoutés`;
    if (els.progressBar) els.progressBar.style.width = `${percent}%`;
  }

  function renderSummary(podcasts, els) {
    if (els.resultCount) els.resultCount.textContent = podcasts.length;
    if (els.totalTime) {
      els.totalTime.textContent = formatDuration(
        podcasts.reduce((sum, podcast) => sum + Number(podcast.duration || 0), 0),
      );
    }
    if (els.doneCount) {
      els.doneCount.textContent = podcasts.filter((podcast) => isListened(podcast.id)).length;
    }
  }

  function renderFavoriteFilter(button, favoritesOnly, podcasts) {
    if (!button) return;
    const favoritesCount = podcasts.filter((podcast) => isFavorite(podcast.id)).length;
    button.setAttribute("aria-pressed", favoritesOnly ? "true" : "false");
    button.innerHTML = `
      <i class="${favoritesOnly ? "fa-solid" : "fa-regular"} fa-heart" aria-hidden="true"></i>
      <span>Favoris${favoritesCount ? ` (${favoritesCount})` : ""}</span>
    `;
  }

  function renderTabs(container, activeSection) {
    container?.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-selected", button.dataset.section === activeSection ? "true" : "false");
    });
  }

  function updateFavoriteButton(button, favorite) {
    if (!button) return;
    button.setAttribute("aria-pressed", favorite ? "true" : "false");
    button.setAttribute("aria-label", favorite ? "Retirer des favoris" : "Ajouter aux favoris");
    button.title = favorite ? "Retirer des favoris" : "Ajouter aux favoris";
    button.innerHTML = `<i class="${favorite ? "fa-solid" : "fa-regular"} fa-heart" aria-hidden="true"></i>`;
  }

  function isListened(id) {
    return getStoredFlag(`${LISTENED_PREFIX}${id}`);
  }

  function setListened(id, listened) {
    setStoredFlag(`${LISTENED_PREFIX}${id}`, listened);
  }

  function isFavorite(id) {
    return getStoredFlag(`${FAVORITE_PREFIX}${id}`);
  }

  function setFavorite(id, favorite) {
    setStoredFlag(`${FAVORITE_PREFIX}${id}`, favorite);
  }

  function getStoredFlag(key) {
    try {
      return localStorage.getItem(key) === "1";
    } catch (error) {
      return false;
    }
  }

  function setStoredFlag(key, enabled) {
    try {
      if (enabled) {
        localStorage.setItem(key, "1");
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {}
  }

  function parseFrenchDateValue(date) {
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

  function makeSlug(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function frenchTypography(value) {
    return String(value)
      .replace(/([^\s:;?!/])[\t \u00a0\u202f]*([:;?!])(?!\/)/g, "$1\u202f$2");
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
    const lines = String(text || "").split(/\r?\n/);
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
      if (/^\d+\.\s/.test(line)) {
        if (!inList) { html.push("<ul>"); inList = true; }
        html.push(`<li>${inlineMarkdown(line.replace(/^\d+\.\s/, ""))}</li>`);
        continue;
      }
      if (inList) { html.push("</ul>"); inList = false; }
      if (line === "" || line === "---") continue;
      html.push(`<p>${inlineMarkdown(line)}</p>`);
    }

    if (inList) html.push("</ul>");
    return html.join("\n");
  }

  function inlineMarkdown(value) {
    return escapeHtml(frenchTypography(value))
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/_([^_]+)_/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function sanitizeSummaryHtml(value) {
    return String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
      .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "");
  }

  function setCurrentYear(selector = "#current-year") {
    const yearEl = document.querySelector(selector);
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  window.BacPodcastUtils = {
    THEME_KEY,
    LISTENED_PREFIX,
    FAVORITE_PREFIX,
    getSavedTheme,
    applyTheme,
    initThemeToggle,
    setSearchOpen,
    applyInitialSearch,
    initHeaderMark,
    renderProgress,
    renderSummary,
    renderFavoriteFilter,
    renderTabs,
    updateFavoriteButton,
    isListened,
    setListened,
    isFavorite,
    setFavorite,
    parseFrenchDateValue,
    formatDuration,
    groupBy,
    makeSlug,
    frenchTypography,
    escapeHtml,
    renderSummaryContent,
    renderMarkdown,
    inlineMarkdown,
    sanitizeSummaryHtml,
    setCurrentYear,
  };
})();
