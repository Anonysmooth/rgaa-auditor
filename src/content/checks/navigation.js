// Contrôles de navigation et d'accessibilité au clavier (RGAA thématique 12,
// et thématique 7 pour les composants interactifs scriptés).

(function () {
  const NS = (window.RGAAAuditor = window.RGAAAuditor || {});
  const { isVisible, isFocusableNatively } = NS.dom;

  const INTERACTIVE_ROLES = new Set([
    "button", "link", "checkbox", "radio", "switch", "tab", "menuitem",
    "option", "textbox", "combobox", "slider", "spinbutton",
  ]);

  const SKIP_LINK_PATTERN =
    /aller\s+au|passer\s+au|passer\s+la|acc[ée]der\s+au\s+contenu|skip\s+to|skip\s+navigation|skip\s+link/i;

  function checkNavigation(root) {
    root = root || document;
    const issues = [];

    // 12.8 — tabindex positifs (casse l'ordre naturel de tabulation)
    root.querySelectorAll("[tabindex]").forEach((el) => {
      if (!isVisible(el)) return;
      const value = parseInt(el.getAttribute("tabindex"), 10);
      if (Number.isFinite(value) && value > 0) {
        issues.push({ ruleId: "tabindex-positive", element: el, severity: "avertissement", extra: { tabindex: value } });
      }
    });

    // Éléments avec un rôle/comportement interactif mais non focusables au clavier
    const candidates = new Set();
    root.querySelectorAll("[onclick]").forEach((el) => candidates.add(el));
    root.querySelectorAll("[role]").forEach((el) => {
      const role = el.getAttribute("role").trim().toLowerCase();
      if (INTERACTIVE_ROLES.has(role)) candidates.add(el);
    });

    candidates.forEach((el) => {
      if (!isVisible(el)) return;
      if (isFocusableNatively(el)) return;
      const tabindex = el.getAttribute("tabindex");
      const isFocusableViaTabindex = tabindex !== null && parseInt(tabindex, 10) >= 0;
      if (!isFocusableViaTabindex) {
        issues.push({ ruleId: "interactive-no-keyboard", element: el, severity: "erreur" });
      }
    });

    // 12.7 — lien d'évitement en début de page
    const earlyLinks = Array.from(document.querySelectorAll("a[href]")).slice(0, 15);
    const hasSkipLink = earlyLinks.some((a) => {
      const href = a.getAttribute("href") || "";
      const text = a.textContent || "";
      return href.startsWith("#") && SKIP_LINK_PATTERN.test(text);
    });
    if (!hasSkipLink) {
      issues.push({ ruleId: "skip-link-missing", element: document.body, severity: "avertissement" });
    }

    // 12.8 — indicateur de focus potentiellement supprimé via CSS
    checkFocusOutline(issues, root);

    return issues;
  }

  function checkFocusOutline(issues, root) {
    const seenSelectors = new Set();
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch (e) {
        continue; // feuille cross-origin non lisible
      }
      if (!rules) continue;
      scanRuleList(rules, issues, root, seenSelectors);
    }
  }

  function scanRuleList(rules, issues, root, seenSelectors) {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.MEDIA_RULE && rule.cssRules) {
        scanRuleList(rule.cssRules, issues, root, seenSelectors);
        continue;
      }
      if (rule.type !== CSSRule.STYLE_RULE) continue;
      const selectorText = rule.selectorText || "";
      if (!/:focus/i.test(selectorText)) continue;

      const outline = rule.style.outline || rule.style.outlineStyle || rule.style.outlineWidth;
      const removesOutline =
        (outline && /^(none|0)/i.test(outline.trim())) ||
        (rule.style.outlineStyle && rule.style.outlineStyle.trim() === "none");
      if (!removesOutline) continue;

      const hasAlternative =
        (rule.style.boxShadow && rule.style.boxShadow !== "none") ||
        (rule.style.border && rule.style.border !== "none") ||
        (rule.style.backgroundColor && rule.style.backgroundColor !== "transparent") ||
        (rule.style.textDecoration && rule.style.textDecoration !== "none");
      if (hasAlternative) continue;
      if (seenSelectors.has(selectorText)) continue;
      seenSelectors.add(selectorText);

      let target = document.body;
      try {
        const plain = selectorText.replace(/:focus(-visible|-within)?/gi, "");
        const found = plain.trim() ? root.querySelector(plain) : null;
        if (found) target = found;
      } catch (e) {
        // sélecteur non résolvable tel quel, on retombe sur <body>
      }

      issues.push({
        ruleId: "focus-outline-removed",
        element: target,
        severity: "avertissement",
        extra: { selector: selectorText },
      });
    }
  }

  NS.checkNavigation = checkNavigation;
})();
