// Petits utilitaires DOM partagés entre les différents contrôles.

(function () {
  const NS = (window.RGAAAuditor = window.RGAAAuditor || {});

  function isVisible(el) {
    if (!(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    if (parseFloat(style.opacity) === 0) return false;
    if (el.hasAttribute("hidden")) return false;
    const rects = el.getClientRects();
    return rects.length > 0;
  }

  /**
   * Nom accessible simplifié : texte visible, aria-label, aria-labelledby,
   * ou alt d'une image contenue. Suffisant pour détecter une absence totale
   * de nom accessible (pas une implémentation complète de l'algorithme
   * Accessible Name and Description Computation).
   */
  function accessibleNameLength(el) {
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim().length;

    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      const text = labelledby
        .split(/\s+/)
        .map((id) => {
          const ref = document.getElementById(id);
          return ref ? ref.textContent.trim() : "";
        })
        .join(" ")
        .trim();
      if (text) return text.length;
    }

    const text = (el.textContent || "").trim();
    if (text) return text.length;

    const img = el.querySelector && el.querySelector("img[alt]");
    if (img) {
      const alt = img.getAttribute("alt").trim();
      if (alt) return alt.length;
    }

    if (el.tagName === "INPUT") {
      const value = el.getAttribute("value");
      if ((el.type === "submit" || el.type === "button") && value && value.trim()) {
        return value.trim().length;
      }
    }

    return 0;
  }

  function isFocusableNatively(el) {
    const tag = el.tagName;
    if (el.hasAttribute("disabled")) return false;
    if (tag === "A" || tag === "AREA") return el.hasAttribute("href");
    if (["BUTTON", "SELECT", "TEXTAREA"].includes(tag)) return true;
    if (tag === "INPUT") return el.type !== "hidden";
    if (tag === "IFRAME" || tag === "AUDIO" || tag === "VIDEO") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  NS.dom = { isVisible, accessibleNameLength, isFocusableNatively };
})();
