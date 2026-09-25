(() => {
  "use strict";

  const BATCH_SIZE = 60;
  const FAV_KEY = "pae:favorites";
  const THEME_KEY = "pae:theme";

  const state = {
    all: [],
    filtered: [],
    rendered: 0,
    category: "",
    auth: "",
    https: "",
    cors: "",
    sort: "name",
    query: "",
    favOnly: false,
    favorites: loadFavorites(),
  };

  const el = {
    grid: document.getElementById("grid"),
    sentinel: document.getElementById("sentinel"),
    emptyState: document.getElementById("emptyState"),
    resultCount: document.getElementById("resultCount"),
    activeChips: document.getElementById("activeChips"),
    heroStats: document.getElementById("heroStats"),
    categoryList: document.getElementById("categoryList"),
    searchInput: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),
    authFilter: document.getElementById("authFilter"),
    httpsFilter: document.getElementById("httpsFilter"),
    corsFilter: document.getElementById("corsFilter"),
    sortSelect: document.getElementById("sortSelect"),
    favOnly: document.getElementById("favOnly"),
    resetFilters: document.getElementById("resetFilters"),
    themeToggle: document.getElementById("themeToggle"),
    backToTop: document.getElementById("backToTop"),
  };

  function loadFavorites() {
    try {
      return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
    } catch {
      return new Set();
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...state.favorites]));
    } catch {
      /* storage unavailable; favorites stay session-only */
    }
  }

  function favKey(item) {
    return `${item.category}::${item.name}`;
  }

  function initTheme() {
    let theme = null;
    try {
      theme = localStorage.getItem(THEME_KEY);
    } catch {
      /* ignore */
    }
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const current = document.documentElement.getAttribute("data-theme");
    const isDark =
      current === "dark" ||
      (!current && window.matchMedia("(prefers-color-scheme: dark)").matches);
    el.themeToggle.textContent = isDark ? "☀️" : "🌙";
  }

  el.themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const isDark =
      current === "dark" ||
      (!current && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    updateThemeIcon();
  });

  async function loadData() {
    const res = await fetch("data/apis.json");
    state.all = await res.json();
  }

  function buildCategorySidebar() {
    const counts = new Map();
    for (const item of state.all) {
      counts.set(item.category, (counts.get(item.category) || 0) + 1);
    }
    const categories = [...counts.keys()].sort((a, b) => a.localeCompare(b));

    const allLi = document.createElement("li");
    allLi.appendChild(makeCategoryButton("All categories", "", state.all.length));
    el.categoryList.appendChild(allLi);

    for (const cat of categories) {
      const li = document.createElement("li");
      li.appendChild(makeCategoryButton(cat, cat, counts.get(cat)));
      el.categoryList.appendChild(li);
    }
  }

  function makeCategoryButton(label, value, count) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.value = value;
    if (value === state.category) btn.classList.add("active");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = label;
    const countSpan = document.createElement("span");
    countSpan.className = "count";
    countSpan.textContent = count;
    btn.appendChild(nameSpan);
    btn.appendChild(countSpan);
    btn.addEventListener("click", () => {
      state.category = value;
      syncCategoryButtons();
      applyFilters();
    });
    return btn;
  }

  function syncCategoryButtons() {
    el.categoryList.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === state.category);
    });
  }

  function buildAuthOptions() {
    const authValues = new Set();
    for (const item of state.all) authValues.add(item.auth || "No");
    const sorted = [...authValues].sort((a, b) => {
      if (a === "No") return -1;
      if (b === "No") return 1;
      return a.localeCompare(b);
    });
    for (const val of sorted) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      el.authFilter.appendChild(opt);
    }
  }

  function normalize(str) {
    return (str || "").toLowerCase();
  }

  function applyFilters() {
    const q = normalize(state.query);
    let list = state.all;

    if (state.category) list = list.filter((i) => i.category === state.category);
    if (state.auth) list = list.filter((i) => (i.auth || "No") === state.auth);
    if (state.https) list = list.filter((i) => i.https === state.https);
    if (state.cors) list = list.filter((i) => i.cors === state.cors);
    if (state.favOnly) list = list.filter((i) => state.favorites.has(favKey(i)));
    if (q) {
      list = list.filter(
        (i) => normalize(i.name).includes(q) || normalize(i.description).includes(q)
      );
    }

    list = list.slice().sort((a, b) => {
      if (state.sort === "category") {
        const c = a.category.localeCompare(b.category);
        return c !== 0 ? c : a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

    state.filtered = list;
    state.rendered = 0;
    el.grid.innerHTML = "";
    renderChips();
    renderResultCount();
    renderNextBatch();
  }

  function renderResultCount() {
    const n = state.filtered.length;
    el.resultCount.textContent = `${n.toLocaleString()} API${n === 1 ? "" : "s"} found`;
    el.emptyState.hidden = n !== 0;
  }

  function renderChips() {
    el.activeChips.innerHTML = "";
    const chips = [];
    if (state.category) chips.push(["category", `Category: ${state.category}`]);
    if (state.auth) chips.push(["auth", `Auth: ${state.auth}`]);
    if (state.https) chips.push(["https", `HTTPS: ${state.https}`]);
    if (state.cors) chips.push(["cors", `CORS: ${state.cors}`]);
    if (state.favOnly) chips.push(["favOnly", "Favorites only"]);
    if (state.query) chips.push(["query", `"${state.query}"`]);

    for (const [key, label] of chips) {
      const chip = document.createElement("span");
      chip.className = "chip";
      const text = document.createElement("span");
      text.textContent = label;
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.textContent = "×";
      closeBtn.setAttribute("aria-label", `Remove filter ${label}`);
      closeBtn.addEventListener("click", () => clearFilter(key));
      chip.appendChild(text);
      chip.appendChild(closeBtn);
      el.activeChips.appendChild(chip);
    }
  }

  function clearFilter(key) {
    if (key === "category") {
      state.category = "";
      syncCategoryButtons();
    } else if (key === "auth") {
      state.auth = "";
      el.authFilter.value = "";
    } else if (key === "https") {
      state.https = "";
      el.httpsFilter.value = "";
    } else if (key === "cors") {
      state.cors = "";
      el.corsFilter.value = "";
    } else if (key === "favOnly") {
      state.favOnly = false;
      el.favOnly.checked = false;
    } else if (key === "query") {
      state.query = "";
      el.searchInput.value = "";
    }
    applyFilters();
  }

  function badgeClass(value) {
    if (value === "Yes") return "ok";
    if (value === "No") return "no";
    return "neutral";
  }

  function renderNextBatch() {
    const start = state.rendered;
    const end = Math.min(start + BATCH_SIZE, state.filtered.length);
    const fragment = document.createDocumentFragment();

    for (let idx = start; idx < end; idx++) {
      fragment.appendChild(buildCard(state.filtered[idx]));
    }

    el.grid.appendChild(fragment);
    state.rendered = end;
  }

  function buildCard(item) {
    const card = document.createElement("article");
    card.className = "card";

    const head = document.createElement("div");
    head.className = "card-head";

    const title = document.createElement("h3");
    title.className = "card-title";
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = item.name;
    title.appendChild(link);

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "fav-btn";
    const isFav = state.favorites.has(favKey(item));
    favBtn.classList.toggle("active", isFav);
    favBtn.textContent = isFav ? "★" : "☆";
    favBtn.setAttribute("aria-label", isFav ? "Remove from favorites" : "Add to favorites");
    favBtn.addEventListener("click", () => {
      const key = favKey(item);
      if (state.favorites.has(key)) {
        state.favorites.delete(key);
      } else {
        state.favorites.add(key);
      }
      saveFavorites();
      favBtn.classList.toggle("active");
      favBtn.textContent = favBtn.classList.contains("active") ? "★" : "☆";
      if (state.favOnly && !state.favorites.has(key)) {
        applyFilters();
      }
    });

    head.appendChild(title);
    head.appendChild(favBtn);

    const cat = document.createElement("div");
    cat.className = "card-cat";
    cat.textContent = item.category;

    const desc = document.createElement("p");
    desc.className = "card-desc";
    desc.textContent = item.description;

    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";

    const authBadge = document.createElement("span");
    authBadge.className = "badge neutral";
    authBadge.textContent = `Auth: ${item.auth || "No"}`;

    const httpsBadge = document.createElement("span");
    httpsBadge.className = `badge ${badgeClass(item.https)}`;
    httpsBadge.textContent = `HTTPS: ${item.https}`;

    const corsBadge = document.createElement("span");
    corsBadge.className = `badge ${badgeClass(item.cors)}`;
    corsBadge.textContent = `CORS: ${item.cors}`;

    badgeRow.appendChild(authBadge);
    badgeRow.appendChild(httpsBadge);
    badgeRow.appendChild(corsBadge);

    card.appendChild(head);
    card.appendChild(cat);
    card.appendChild(desc);
    card.appendChild(badgeRow);

    return card;
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function wireEvents() {
    el.searchInput.addEventListener(
      "input",
      debounce((e) => {
        state.query = e.target.value.trim();
        applyFilters();
      }, 150)
    );

    el.clearSearch.addEventListener("click", () => {
      el.searchInput.value = "";
      state.query = "";
      applyFilters();
      el.searchInput.focus();
    });

    el.authFilter.addEventListener("change", (e) => {
      state.auth = e.target.value;
      applyFilters();
    });
    el.httpsFilter.addEventListener("change", (e) => {
      state.https = e.target.value;
      applyFilters();
    });
    el.corsFilter.addEventListener("change", (e) => {
      state.cors = e.target.value;
      applyFilters();
    });
    el.sortSelect.addEventListener("change", (e) => {
      state.sort = e.target.value;
      applyFilters();
    });
    el.favOnly.addEventListener("change", (e) => {
      state.favOnly = e.target.checked;
      applyFilters();
    });

    el.resetFilters.addEventListener("click", () => {
      state.category = "";
      state.auth = "";
      state.https = "";
      state.cors = "";
      state.query = "";
      state.favOnly = false;
      el.searchInput.value = "";
      el.authFilter.value = "";
      el.httpsFilter.value = "";
      el.corsFilter.value = "";
      el.favOnly.checked = false;
      syncCategoryButtons();
      applyFilters();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== el.searchInput) {
        e.preventDefault();
        el.searchInput.focus();
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && state.rendered < state.filtered.length) {
          renderNextBatch();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(el.sentinel);

    window.addEventListener("scroll", () => {
      el.backToTop.hidden = window.scrollY < 500;
    });
    el.backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  async function init() {
    initTheme();
    wireEvents();
    try {
      await loadData();
    } catch (err) {
      el.heroStats.textContent = "Failed to load API data.";
      return;
    }
    const categoryCount = new Set(state.all.map((i) => i.category)).size;
    el.heroStats.textContent = `${state.all.length.toLocaleString()} free APIs across ${categoryCount} categories — search, filter, and save favorites.`;
    buildCategorySidebar();
    buildAuthOptions();
    applyFilters();
  }

  init();
})();
