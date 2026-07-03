// Orchestre les différents contrôles et prépare des résultats sérialisables
// (les éléments DOM ne peuvent pas être envoyés au panneau latéral : on leur
// attribue un identifiant et on les garde en mémoire côté page).

(function () {
  const NS = (window.RGAAAuditor = window.RGAAAuditor || {});
  const { shortSelector, excerpt } = NS.selector;
  const { RULES, THEMES } = NS;

  // id -> élément DOM réel, conservé pour les surbrillances ultérieures.
  const elementsById = new Map();

  function runAudit() {
    elementsById.clear();

    const rawIssues = [
      ...NS.checkContrast(document.body),
      ...NS.checkSemantics(document),
      ...NS.checkNavigation(document),
    ];

    const results = rawIssues.map((issue, index) => {
      const id = `issue-${index}`;
      if (issue.element) elementsById.set(id, issue.element);
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
