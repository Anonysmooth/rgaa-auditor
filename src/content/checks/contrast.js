// Contrôle du contraste texte/fond (RGAA 3.2 / 3.3, formule WCAG).

(function () {
  const NS = (window.RGAAAuditor = window.RGAAAuditor || {});
  const { parseColor, contrastRatio, getEffectiveBackgroundColor, isLargeText } =
    NS.color;
  const { isVisible } = NS.dom;

  /** Un élément "porte" du texte direct s'il a un noeud texte non vide en enfant direct. */
  function hasDirectText(el) {
    for (const child of el.childNodes) {
      if (child.nodeType === 3 && child.textContent.trim().length > 0) {
        return true;
      }
    }
    return false;
  }

  function checkContrast(root) {
    root = root || document.body;
    const issues = [];
    if (!root) return issues;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        const tag = node.tagName;
        if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG"].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const elements = [];
    if (root.nodeType === 1) elements.push(root);
    let node;
    while ((node = walker.nextNode())) elements.push(node);

    for (const el of elements) {
      if (!hasDirectText(el)) continue;
      if (!isVisible(el)) continue;

      const style = getComputedStyle(el);
      const fg = parseColor(style.color);
      if (!fg || fg.a === 0) continue;

      const bg = getEffectiveBackgroundColor(el);
      const ratio = contrastRatio(fg, bg);
      const large = isLargeText(style);
      const required = large ? 3 : 4.5;

      if (ratio < required) {
        issues.push({
          ruleId: "contrast-text",
          element: el,
          severity: "erreur",
          extra: {
            ratio: Math.round(ratio * 100) / 100,
            required,
            large,
            fg: `rgb(${Math.round(fg.r)}, ${Math.round(fg.g)}, ${Math.round(fg.b)})`,
            bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
          },
        });
      }
    }

    return issues;
  }

  NS.checkContrast = checkContrast;
})();
