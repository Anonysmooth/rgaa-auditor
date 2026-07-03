// Construit une description courte et un sélecteur CSS lisible pour un
// élément, utilisés dans le panneau pour identifier chaque anomalie.

(function () {
  const NS = (window.RGAAAuditor = window.RGAAAuditor || {});

  function shortSelector(el) {
    if (!(el instanceof Element)) return "";
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 4) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += `#${node.id}`;
        parts.unshift(part);
        break;
      }
      const classes = (node.getAttribute("class") || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);
      if (classes.length) part += "." + classes.join(".");
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === node.tagName
        );
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
      depth++;
    }
    return parts.join(" > ");
  }

  function excerpt(el, max = 60) {
    if (!(el instanceof Element)) return "";
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (text.length <= max) return text;
    return text.slice(0, max - 1) + "…";
  }

  NS.selector = { shortSelector, excerpt };
})();
