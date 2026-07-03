// Orchestre les différents contrôles et prépare des résultats sérialisables
// (les éléments DOM ne peuvent pas être envoyés au panneau latéral : on leur
// attribue un identifiant et on les garde en mémoire côté page).

(function () {
  const NS = (window.RGAAAuditor = window.RGAAAuditor || {});
  const { shortSelector, excerpt } = NS.selector;
  const { RULES, THEMES } = NS;

  // id -> élément DOM réel, conservé pour les surbrillances ultérieures.
  const elementsById = new Map();

  const MARKER_ATTR = "data-rgaa-id";

  function runAudit() {
    // Retire les marqueurs posés par un audit précédent avant d'en reposer de nouveaux.
    for (const el of elementsById.values()) {
      if (el.removeAttribute) el.removeAttribute(MARKER_ATTR);
    }
    elementsById.clear();

    const rawIssues = [
      ...NS.checkContrast(document.body),
      ...NS.checkSemantics(document),
      ...NS.checkNavigation(document),
    ];

    const results = rawIssues.map((issue, index) => {
      const id = `issue-${index}`;
      if (issue.element) {
        elementsById.set(id, issue.element);
        // Marqueur stable permettant de retrouver précisément l'élément
        // depuis le panneau DevTools (chrome.devtools.inspectedWindow.eval),
        // qui n'a pas accès direct aux références DOM du panneau latéral.
        // Un même élément pouvant porter plusieurs anomalies (ex. <html> à la
        // fois sans lang et sans titre associé), les identifiants s'accumulent
        // séparés par un espace ; on les retrouve individuellement côté panel
        // avec le sélecteur CSS ~= (correspondance par mot).
        if (issue.element.setAttribute) {
          const existing = issue.element.getAttribute(MARKER_ATTR);
          issue.element.setAttribute(MARKER_ATTR, existing ? `${existing} ${id}` : id);
        }
      }
      const rule = RULES[issue.ruleId] || {};
      return {
        id,
        ruleId: issue.ruleId,
        severity: issue.severity || "avertissement",
        theme: rule.theme,
        themeLabel: THEMES[rule.theme] || rule.theme,
        code: rule.code,
        title: rule.title || issue.ruleId,
        description: rule.description || "",
        fix: rule.fix || "",
        tag: issue.element ? issue.element.tagName.toLowerCase() : "",
        selector: issue.element ? shortSelector(issue.element) : "",
        excerpt: issue.element ? excerpt(issue.element) : "",
        extra: issue.extra || null,
      };
    });

    NS.state = { elementsById, results };
    return results;
  }

  function getIssuesForOverlay() {
    const results = (NS.state && NS.state.results) || [];
    return results
      .filter((r) => elementsById.has(r.id))
      .map((r) => ({ id: r.id, element: elementsById.get(r.id), severity: r.severity }));
  }

  NS.runAudit = runAudit;
  NS.getIssuesForOverlay = getIssuesForOverlay;
  NS.elementsById = elementsById;
})();
