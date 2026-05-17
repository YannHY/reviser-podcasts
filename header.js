(() => {
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
  initTheme();
  initSearch();
  renderProgress();

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
    els.searchPanel.hidden = !open;
    els.searchToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("has-open-search", open);
  }

  function initTheme() {
    if (!els.themeToggle) return;
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
    const total = Number(els.progressPanel?.dataset.progressTotal || 103);
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
})();
