// Contrôles de structuration et sémantique (RGAA thématiques 1, 8, 9, 11, 12).

(function () {
  const NS = (window.RGAAAuditor = window.RGAAAuditor || {});
  const { isVisible, accessibleNameLength } = NS.dom;

  const KNOWN_ARIA_ROLES = new Set([
    "alert","alertdialog","application","article","banner","button","cell",
    "checkbox","columnheader","combobox","complementary","contentinfo",
    "definition","dialog","directory","document","feed","figure","form",
    "grid","gridcell","group","heading","img","link","list","listbox",
    "listitem","log","main","marquee","math","menu","menubar","menuitem",
    "menuitemcheckbox","menuitemradio","navigation","none","note",
    "option","presentation","progressbar","radio","radiogroup","region",
    "row","rowgroup","rowheader","scrollbar","search","searchbox",
    "separator","slider","spinbutton","status","switch","tab","table",
    "tablist","tabpanel","term","textbox","timer","toolbar","tooltip",
    "tree","treegrid","treeitem",
  ]);

  const GENERIC_ALT_PATTERNS = [
    /^image\s*\d*$/i,
    /^photo\s*\d*$/i,
    /^picture\s*\d*$/i,
    /^img[\s_-]?\d+$/i,
    /\.(png|jpe?g|gif|svg|webp)$/i,
  ];

  function checkSemantics(root) {
    root = root || document;
    const issues = [];

    // 8.3 — langue de la page
    const htmlEl = document.documentElement;
    const lang = htmlEl.getAttribute("lang");
    if (!lang || !lang.trim()) {
      issues.push({ ruleId: "html-lang-missing", element: htmlEl, severity: "erreur" });
    }

    // 8.5 — titre de page
    const title = document.title;
    if (!title || !title.trim()) {
      issues.push({ ruleId: "page-title-missing", element: htmlEl, severity: "erreur" });
    }

    // 8.2 — identifiants dupliqués
    const seenIds = new Map();
    root.querySelectorAll("[id]").forEach((el) => {
      const id = el.getAttribute("id");
      if (!id) return;
      if (seenIds.has(id)) {
        issues.push({ ruleId: "duplicate-id", element: el, severity: "avertissement", extra: { id } });
      } else {
        seenIds.set(id, el);
      }
    });

    // 1.1 — images sans alternative
    root.querySelectorAll("img").forEach((img) => {
      if (!isVisible(img)) return;
      const role = img.getAttribute("role");
      if (role === "presentation" || role === "none") return;
      if (!img.hasAttribute("alt")) {
        issues.push({ ruleId: "img-alt-missing", element: img, severity: "erreur" });
        return;
      }
      const alt = img.getAttribute("alt").trim();
      if (alt && GENERIC_ALT_PATTERNS.some((re) => re.test(alt))) {
        issues.push({ ruleId: "img-alt-suspect", element: img, severity: "avertissement", extra: { alt } });
      }
    });

    // 9.1 — hiérarchie des titres
    const headings = Array.from(root.querySelectorAll("h1,h2,h3,h4,h5,h6")).filter(isVisible);
    let previousLevel = 0;
    let h1Count = 0;
    headings.forEach((h) => {
      const level = parseInt(h.tagName[1], 10);
      if (level === 1) h1Count++;
      if (!h.textContent.trim()) {
        issues.push({ ruleId: "heading-empty", element: h, severity: "erreur" });
      }
      if (previousLevel > 0 && level > previousLevel + 1) {
        issues.push({
          ruleId: "heading-skip",
          element: h,
          severity: "avertissement",
          extra: { from: previousLevel, to: level },
        });
      }
      previousLevel = level;
    });
    if (h1Count > 1) {
      const firstH1 = headings.find((h) => h.tagName === "H1");
      issues.push({ ruleId: "multiple-h1", element: firstH1, severity: "avertissement", extra: { count: h1Count } });
    }

    // 12.6 — zone de contenu principal
    if (!document.querySelector('main, [role="main"]')) {
      issues.push({ ruleId: "landmark-main-missing", element: document.body, severity: "avertissement" });
    }

    // 11.1 / 11.2 — champs de formulaire sans étiquette
    root.querySelectorAll("input, select, textarea").forEach((field) => {
      if (!isVisible(field)) return;
      const type = (field.getAttribute("type") || "").toLowerCase();
      if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;

      let labelled = false;
      if (field.id && document.querySelector(`label[for="${CSS.escape(field.id)}"]`)) {
        labelled = true;
      }
      if (!labelled && field.closest("label")) labelled = true;
      if (!labelled && field.getAttribute("aria-label")?.trim()) labelled = true;
      if (!labelled && field.getAttribute("aria-labelledby")) labelled = true;
      if (!labelled && field.getAttribute("title")?.trim()) labelled = true;

      if (!labelled) {
        issues.push({ ruleId: "form-label-missing", element: field, severity: "erreur" });
      }
    });

    // 6.1 — liens sans intitulé accessible
    root.querySelectorAll("a[href]").forEach((link) => {
      if (!isVisible(link)) return;
      if (accessibleNameLength(link) === 0) {
        issues.push({ ruleId: "link-name-missing", element: link, severity: "erreur" });
      }
    });

    // Boutons sans intitulé accessible
    root.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]').forEach((btn) => {
      if (!isVisible(btn)) return;
      if (accessibleNameLength(btn) === 0) {
        issues.push({ ruleId: "button-name-missing", element: btn, severity: "erreur" });
      }
    });

    // 7.1 — rôles ARIA invalides
    root.querySelectorAll("[role]").forEach((el) => {
      const roles = el.getAttribute("role").trim().split(/\s+/);
      const invalid = roles.filter((r) => r && !KNOWN_ARIA_ROLES.has(r.toLowerCase()));
      if (invalid.length) {
        issues.push({ ruleId: "aria-invalid-role", element: el, severity: "erreur", extra: { role: invalid.join(", ") } });
      }
    });

    return issues;
  }

  NS.checkSemantics = checkSemantics;
})();
