// Superposition visuelle des anomalies détectées, directement sur la page
// auditée (dans un Shadow DOM isolé pour ne pas hériter des styles du site).

(function () {
  const NS = (window.RGAAAuditor = window.RGAAAuditor || {});

  let hostEl = null;
  let shadow = null;
  let boxLayer = null;
  let currentIssues = [];
  let rafPending = false;
  let listenersAttached = false;

  function ensureHost() {
    if (hostEl && document.documentElement.contains(hostEl)) return;

    hostEl = document.createElement("div");
    hostEl.id = "__rgaa_auditor_overlay_host__";
    Object.assign(hostEl.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      pointerEvents: "none",
    });

    shadow = hostEl.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      .box {
        position: fixed;
        box-sizing: border-box;
        border-width: 2px;
        border-style: solid;
        border-radius: 3px;
        pointer-events: none;
      }
      .box.erreur { border-color: #e11d48; }
      .box.avertissement { border-color: #f59e0b; }
      .box.active { border-width: 3px; box-shadow: 0 0 0 3px rgba(37,99,235,.5); background: rgba(37,99,235,.12); }
      .label {
        position: fixed;
        transform: translateY(-100%);
        background: #111827;
        color: #fff;
        font: 600 11px/1.4 -apple-system, "Segoe UI", Roboto, sans-serif;
        padding: 2px 7px;
        border-radius: 3px;
        white-space: nowrap;
        max-width: 320px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .label.erreur { background: #e11d48; }
      .label.avertissement { background: #b45309; }
    `;
    shadow.appendChild(style);
    boxLayer = document.createElement("div");
    shadow.appendChild(boxLayer);
    document.documentElement.appendChild(hostEl);

    if (!listenersAttached) {
      window.addEventListener("scroll", scheduleRender, { passive: true, capture: true });
      window.addEventListener("resize", scheduleRender, { passive: true });
      listenersAttached = true;
    }
  }

  function scheduleRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      render();
    });
  }

  function render() {
    if (!boxLayer) return;
    boxLayer.innerHTML = "";
    for (const issue of currentIssues) {
      if (!issue.element || !issue.element.isConnected) continue;
      const rect = issue.element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      const box = document.createElement("div");
      box.className = "box " + issue.severity + (issue.active ? " active" : "");
      Object.assign(box.style, {
        left: rect.left + "px",
        top: rect.top + "px",
        width: rect.width + "px",
        height: rect.height + "px",
      });
      boxLayer.appendChild(box);

      if (issue.active && issue.label) {
        const label = document.createElement("div");
        label.className = "label " + issue.severity;
        label.style.left = Math.max(rect.left, 4) + "px";
        label.style.top = Math.max(rect.top, 18) + "px";
        label.textContent = issue.label;
        boxLayer.appendChild(label);
      }
    }
  }

  /** Affiche toutes les anomalies (mode "vue d'ensemble"). */
  function showAll(issues) {
    ensureHost();
    currentIssues = issues.map((i) => ({ ...i, active: false }));
    render();
  }

  /**
   * Met une anomalie en surbrillance forte et centre la page dessus.
   * Par défaut, seule cette anomalie est affichée (les autres repères sont
   * masqués) ; passez keepOthers=true pour garder toutes les anomalies
   * visibles en arrière-plan (mode "vue d'ensemble").
   */
  function showOne(id, issues, label, keepOthers) {
    ensureHost();
    const base = keepOthers ? issues : issues.filter((i) => i.id === id);
    currentIssues = base.map((i) => ({
      ...i,
      active: i.id === id,
      label: i.id === id ? label : undefined,
    }));
    render();
    const target = currentIssues.find((i) => i.id === id);
    if (target && target.element) {
      target.element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      setTimeout(scheduleRender, 350);
    }
  }

  function clear() {
    currentIssues = [];
    if (boxLayer) boxLayer.innerHTML = "";
    if (hostEl && hostEl.parentNode) hostEl.parentNode.removeChild(hostEl);
    hostEl = null;
  }

  NS.overlay = { showAll, showOne, clear, scheduleRender };
})();
