(() => {
  const headerScript = document.currentScript;

  loadShared().finally(initHeader);

  function loadShared() {
    if (window.BacPodcastUtils) return Promise.resolve();
    const sharedUrl = `${getSiblingScriptUrl("shared.js")}?v=20260523-1`;

    return injectSharedScript(sharedUrl)
      .then(() => window.BacPodcastUtils ? undefined : evaluateSharedScript(sharedUrl))
      .catch(() => evaluateSharedScript(sharedUrl));
  }

  function injectSharedScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  async function evaluateSharedScript(src) {
    if (window.BacPodcastUtils) return;
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Unable to load ${src}`);
    const code = await response.text();
    (0, eval)(code);
  }

  function getSiblingScriptUrl(filename) {
    const base = new URL(headerScript?.src || "header.js", window.location.href);
    base.pathname = base.pathname.replace(/[^/]*$/, filename);
    base.search = "";
    return base.toString();
  }

  function initHeader() {
  const shared = window.BacPodcastUtils;

  if (document.body.classList.contains("matu-page")) {
    ensureMatuHeaderTools();
  }

  const els = {
    search: document.querySelector("#searchInput"),
    searchPanel: document.querySelector("#headerSearch"),
    searchToggle: document.querySelector("#searchToggle"),
    searchClose: document.querySelector("#searchClose"),
    themeToggle: document.querySelector("#themeToggle"),
    progressText: document.querySelector("#progressText"),
    progressBar: document.querySelector("#progressBar"),
    progressPanel: document.querySelector(".progress-panel"),
  };

  initHeaderMark();
  ensureHomeLink();
  initTheme();
  initSearch();
  renderProgress();

  function initHeaderMark() {
    if (shared?.initHeaderMark) {
      shared.initHeaderMark();
      return;
    }

    const brand = document.querySelector(".topbar > div:first-child");
    if (!brand || brand.querySelector(".menu-microphone")) return;

    brand.classList.add("topbar-brand");
    const microphone = document.createElement("span");
    microphone.className = "menu-microphone";
    microphone.setAttribute("aria-hidden", "true");
    microphone.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
    brand.prepend(microphone);
  }

  function ensureHomeLink() {
    const menu = document.querySelector(".quick-menu");
    if (!menu || [...menu.querySelectorAll("a")].some((link) => link.textContent.trim() === "Accueil")) {
      return;
    }

    const homeLink = document.createElement("a");
    homeLink.href = getRootRelativeHref(menu, "index.html");
    homeLink.textContent = "Accueil";
    menu.prepend(homeLink);
  }

  function getRootRelativeHref(menu, filename) {
    const podcastLink = [...menu.querySelectorAll("a")]
      .find((link) => link.textContent.trim() === "Podcasts");
    const podcastHref = podcastLink?.getAttribute("href") || "index.html";
    const sectionPrefix = podcastHref.replace(/index\.html(?:[?#].*)?$/, "");
    return `${sectionPrefix}../${filename}`;
  }

  function ensureMatuHeaderTools() {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;

    let tools = topbar.querySelector(".topbar-tools");
    if (!tools) {
      tools = document.createElement("div");
      tools.className = "topbar-tools";
      topbar.append(tools);
    }

    let main = tools.querySelector(".topbar-main");
    if (!main) {
      main = document.createElement("div");
      main.className = "topbar-main";
      tools.prepend(main);
    }

    let actions = main.querySelector(".header-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "header-actions";
      main.prepend(actions);
    }

    if (!actions.querySelector("#searchToggle")) {
      const searchToggle = document.createElement("button");
      searchToggle.id = "searchToggle";
      searchToggle.className = "icon-button search-toggle";
      searchToggle.type = "button";
      searchToggle.setAttribute("aria-label", "Rechercher");
      searchToggle.setAttribute("aria-expanded", "false");
      searchToggle.setAttribute("aria-controls", "headerSearch");
      searchToggle.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';
      actions.prepend(searchToggle);
    }

    if (!actions.querySelector("#themeToggle")) {
      const themeToggle = document.createElement("button");
      themeToggle.id = "themeToggle";
      themeToggle.className = "icon-button theme-toggle";
      themeToggle.type = "button";
      themeToggle.setAttribute("aria-label", "Activer le mode sombre");
      themeToggle.title = "Activer le mode sombre";
      themeToggle.innerHTML = '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
      actions.append(themeToggle);
    }

    if (!main.querySelector(".progress-panel")) {
      const progressPanel = document.createElement("div");
      progressPanel.className = "progress-panel";
      progressPanel.dataset.progressTotal = "109";
      progressPanel.setAttribute("aria-live", "polite");
      progressPanel.innerHTML = `
        <span id="progressText">Chargement...</span>
        <div class="progress-track" aria-hidden="true">
          <span id="progressBar"></span>
        </div>
      `;
      main.append(progressPanel);
    }

    if (!tools.querySelector("#headerSearch")) {
      const searchPanel = document.createElement("form");
      searchPanel.id = "headerSearch";
      searchPanel.className = "header-search";
      searchPanel.hidden = true;
      searchPanel.action = getPodcastIndexHref(topbar);
      searchPanel.innerHTML = `
        <label for="searchInput" class="sr-only">Rechercher</label>
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input id="searchInput" type="search" placeholder="Auteur, titre, émission...">
        <button id="searchClose" class="icon-button search-close" type="button" aria-label="Fermer la recherche">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      `;
      tools.append(searchPanel);
    }
  }

  function getPodcastIndexHref(topbar) {
    const podcastLink = [...topbar.querySelectorAll(".quick-menu a")]
      .find((link) => /podcasts/i.test(link.textContent) || /(^|\/)index\.html(?:$|[?#])/.test(link.getAttribute("href") || ""));

    return podcastLink?.getAttribute("href") || "index.html";
  }

  function initSearch() {
    if (!els.search || !els.searchPanel || !els.searchToggle) return;

    els.searchToggle.addEventListener("click", () => {
      const willOpen = els.searchPanel.hidden;
      setSearchOpen(willOpen);
      if (willOpen) els.search.focus();
    });

    els.searchClose?.addEventListener("click", () => {
      els.search.value = "";
      setSearchOpen(false);
      els.searchToggle.focus();
    });

    els.search.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        goToPodcastSearch();
        return;
      }
      if (event.key !== "Escape") return;
      els.search.value = "";
      setSearchOpen(false);
      els.searchToggle.focus();
    });

    els.searchPanel.addEventListener("submit", (event) => {
      event.preventDefault();
      goToPodcastSearch();
    });
  }

  function goToPodcastSearch() {
    const query = els.search.value.trim();
    const baseUrl = els.searchPanel.getAttribute("action") || "index.html";
    const url = query ? `${baseUrl}?search=${encodeURIComponent(query)}` : baseUrl;
    window.location.href = url;
  }

  function setSearchOpen(open) {
    if (shared?.setSearchOpen) {
      shared.setSearchOpen(els.searchPanel, els.searchToggle, open);
      return;
    }

    els.searchPanel.hidden = !open;
    els.searchToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("has-open-search", open);
  }

  function initTheme() {
    if (!els.themeToggle) return;
    if (shared?.initThemeToggle) {
      shared.initThemeToggle(els.themeToggle);
      return;
    }

    const saved = localStorage.getItem("bac-podcasts-theme");
    applyTheme(saved === "dark" ? "dark" : "light");
    els.themeToggle.addEventListener("click", () => {
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
    updateThemeIcon(theme);
  }

  function updateThemeIcon(theme) {
    if (!els.themeToggle) return;
    const dark = theme === "dark";
    els.themeToggle.setAttribute("aria-label", dark ? "Activer le mode clair" : "Activer le mode sombre");
    els.themeToggle.title = dark ? "Activer le mode clair" : "Activer le mode sombre";
    els.themeToggle.innerHTML = `<i class="fa-solid ${dark ? "fa-sun" : "fa-moon"}" aria-hidden="true"></i>`;
  }

  function renderProgress() {
    if (!els.progressText || !els.progressBar) return;
    const total = Number(els.progressPanel?.dataset.progressTotal || 109);
    let listened = 0;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("bac-podcast:") && localStorage.getItem(key) === "1") {
        listened += 1;
      }
    }
    const percent = total ? Math.round((listened / total) * 100) : 0;
    els.progressText.textContent = `${listened}/${total} podcasts écoutés`;
    els.progressBar.style.width = `${percent}%`;
  }
  }
})();
