const CONTENT_FILES = [
  "src/content/utils/dom.js",
  "src/content/utils/color.js",
  "src/content/utils/selector.js",
  "src/content/rgaa-rules.js",
  "src/content/checks/contrast.js",
  "src/content/checks/semantics.js",
  "src/content/checks/navigation.js",
  "src/content/overlay.js",
  "src/content/analyzer.js",
  "src/content/content-script.js",
];

const els = {
  runBtn: document.getElementById("runBtn"),
  clearBtn: document.getElementById("clearBtn"),
  showAllToggle: document.getElementById("showAllToggle"),
  status: document.getElementById("status"),
  summary: document.getElementById("summary"),
  severityFilter: document.getElementById("severityFilter"),
  issueList: document.getElementById("issueList"),
  emptyState: document.getElementById("emptyState"),
  pageInfo: document.getElementById("pageInfo"),
};

let state = {
  results: [],
  themeFilter: "all",
  severityFilter: "all",
  pinnedId: null,
};

function setStatus(message, isError) {
  if (!message) {
    els.status.hidden = true;
    return;
  }
  els.status.hidden = false;
  els.status.textContent = message;
  els.status.className = "status" + (isError ? " error" : "");
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function isContentScriptReady(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => !!window.__RGAA_READY__,
    });
    return !!result;
  } catch (e) {
    return false;
  }
}

async function ensureContentScript(tabId) {
  const ready = await isContentScriptReady(tabId);
  if (ready) return;
  await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_FILES });
}

function sendToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function runAudit() {
  setStatus("");
  els.runBtn.disabled = true;
  els.runBtn.textContent = "Analyse en cours…";
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id) throw new Error("Aucun onglet actif détecté.");
    if (!/^https?:|^file:/i.test(tab.url || "")) {
      throw new Error("Cette page ne peut pas être auditée (page interne du navigateur ou de l'extension).");
    }

    await ensureContentScript(tab.id);
    const response = await sendToTab(tab.id, { type: "RGAA_RUN_AUDIT" });
    if (!response || !response.ok) {
      throw new Error((response && response.error) || "Échec de l'analyse.");
    }

    state.results = response.results;
    state.pinnedId = null;
    els.pageInfo.textContent = response.title || response.url || "";
    els.pageInfo.title = response.url || "";

    renderSummary();
    renderList();

    if (els.showAllToggle.checked) {
      await sendToTab(tab.id, { type: "RGAA_SHOW_ALL" });
    }

    const total = state.results.length;
    setStatus(
      total === 0
        ? "Aucune anomalie détectée par les contrôles automatisés. Une vérification manuelle reste recommandée."
        : `${total} anomalie${total > 1 ? "s" : ""} détectée${total > 1 ? "s" : ""}.`
    );
  } catch (err) {
    setStatus(err.message || String(err), true);
  } finally {
    els.runBtn.disabled = false;
    els.runBtn.textContent = "Lancer l'audit";
  }
}

async function clearOverlay() {
  try {
    const tab = await getActiveTab();
    if (tab && tab.id) await sendToTab(tab.id, { type: "RGAA_CLEAR_OVERLAY" });
  } catch (e) {
    // page non injectée : rien à effacer
  }
  els.showAllToggle.checked = false;
}

async function highlightOne(issue) {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;
    await sendToTab(tab.id, {
      type: "RGAA_SHOW_ONE",
      id: issue.id,
      label: `${issue.code || ""} ${issue.title}`.trim(),
      keepOthers: els.showAllToggle.checked,
    });
  } catch (e) {
    // ignore : l'utilisateur a peut-être changé d'onglet
  }
}

/** Revient à l'état de repères attendu quand plus rien n'est survolé/épinglé. */
async function resetOverlayToBaseState() {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;
    if (els.showAllToggle.checked) {
      await sendToTab(tab.id, { type: "RGAA_SHOW_ALL" });
    } else {
      await sendToTab(tab.id, { type: "RGAA_CLEAR_OVERLAY" });
    }
  } catch (e) {
    // ignore : l'utilisateur a peut-être changé d'onglet
  }
}

function themeCounts() {
  const counts = { all: state.results.length, couleurs: 0, semantique: 0, navigation: 0 };
  for (const r of state.results) {
    if (counts[r.theme] !== undefined) counts[r.theme]++;
  }
  return counts;
}

function renderSummary() {
  const counts = themeCounts();
  document.getElementById("countAll").textContent = counts.all;
  document.getElementById("countCouleurs").textContent = counts.couleurs;
  document.getElementById("countSemantique").textContent = counts.semantique;
  document.getElementById("countNavigation").textContent = counts.navigation;
  els.summary.hidden = false;
  els.severityFilter.hidden = false;
}

function filteredResults() {
  return state.results.filter((r) => {
    if (state.themeFilter !== "all" && r.theme !== state.themeFilter) return false;
    if (state.severityFilter !== "all" && r.severity !== state.severityFilter) return false;
    return true;
  });
}

function renderList() {
  const list = filteredResults();
  els.issueList.innerHTML = "";
  els.emptyState.hidden = state.results.length > 0;

  if (state.results.length > 0 && list.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "Aucune anomalie pour ce filtre.";
    els.issueList.appendChild(li);
    return;
  }

  for (const issue of list) {
    els.issueList.appendChild(renderIssueCard(issue));
  }
}

function renderIssueCard(issue) {
  const li = document.createElement("li");
  li.className = "issue-card " + issue.severity;
  li.dataset.id = issue.id;
  if (state.pinnedId === issue.id) li.classList.add("pinned");

  const head = document.createElement("div");
  head.className = "issue-head";

  const badge = document.createElement("span");
  badge.className = "badge " + issue.severity;
  badge.textContent = issue.severity === "erreur" ? "Erreur" : "Avertissement";
  head.appendChild(badge);

  if (issue.code) {
    const code = document.createElement("span");
    code.className = "issue-code";
    code.textContent = `RGAA ${issue.code}`;
    head.appendChild(code);
  }
  li.appendChild(head);

  const title = document.createElement("p");
  title.className = "issue-title";
  title.textContent = issue.title;
  li.appendChild(title);

  if (issue.selector) {
    const sel = document.createElement("p");
    sel.className = "issue-selector";
    sel.textContent = `<${issue.tag}> ${issue.selector}`;
    li.appendChild(sel);
  }

  if (state.pinnedId === issue.id) {
    li.appendChild(renderDetails(issue));
  }

  li.addEventListener("mouseenter", () => {
    if (!state.pinnedId) highlightOne(issue);
  });
  li.addEventListener("mouseleave", () => {
    if (!state.pinnedId) resetOverlayToBaseState();
  });
  li.addEventListener("focus", () => {
    if (!state.pinnedId) highlightOne(issue);
  });
  li.addEventListener("blur", () => {
    if (!state.pinnedId) resetOverlayToBaseState();
  });
  li.setAttribute("tabindex", "0");
  li.addEventListener("click", () => {
    state.pinnedId = state.pinnedId === issue.id ? null : issue.id;
    renderList();
    if (state.pinnedId) {
      highlightOne(issue);
    } else {
      resetOverlayToBaseState();
    }
  });
  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      li.click();
    }
  });

  return li;
}

function renderDetails(issue) {
  const wrap = document.createElement("dl");
  wrap.className = "issue-details";

  if (issue.description) {
    const dt = document.createElement("dt");
    dt.textContent = "Constat";
    const dd = document.createElement("dd");
    dd.textContent = issue.description;
    wrap.append(dt, dd);
  }

  if (issue.extra) {
    const dt = document.createElement("dt");
    dt.textContent = "Détail";
    const dd = document.createElement("dd");
    dd.textContent = formatExtra(issue.extra);
    wrap.append(dt, dd);
  }

  if (issue.fix) {
    const dt = document.createElement("dt");
    dt.textContent = "Comment corriger";
    const dd = document.createElement("dd");
    dd.textContent = issue.fix;
    wrap.append(dt, dd);
  }

  return wrap;
}

function formatExtra(extra) {
  if (extra.ratio !== undefined) {
    return `Ratio mesuré ${extra.ratio}:1 (minimum requis ${extra.required}:1) — texte ${extra.fg} sur fond ${extra.bg}${extra.large ? ", texte considéré comme grand" : ""}.`;
  }
  return Object.entries(extra)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

els.runBtn.addEventListener("click", runAudit);
els.clearBtn.addEventListener("click", clearOverlay);

els.showAllToggle.addEventListener("change", async () => {
  const tab = await getActiveTab();
  if (!tab || !tab.id) return;
  if (els.showAllToggle.checked) {
    await sendToTab(tab.id, { type: "RGAA_SHOW_ALL" }).catch(() => {});
  } else {
    await sendToTab(tab.id, { type: "RGAA_CLEAR_OVERLAY" }).catch(() => {});
  }
});

els.summary.addEventListener("click", (e) => {
  const card = e.target.closest(".theme-card");
  if (!card) return;
  state.themeFilter = card.dataset.theme;
  for (const c of els.summary.querySelectorAll(".theme-card")) {
    c.classList.toggle("active", c === card);
  }
  renderList();
});

els.severityFilter.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state.severityFilter = chip.dataset.severity;
  for (const c of els.severityFilter.querySelectorAll(".chip")) {
    c.classList.toggle("active", c === chip);
  }
  renderList();
});

document.querySelector('.theme-card[data-theme="all"]').classList.add("active");
