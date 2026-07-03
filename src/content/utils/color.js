// Utilitaires couleur / contraste (formule WCAG 2.x, reprise par le RGAA
// pour les critères 3.2 et 3.3).
//
// Script classique (pas de module ES) : injecté tel quel par
// chrome.scripting.executeScript, il expose ses fonctions sur l'espace de
// noms partagé window.RGAAAuditor.

(function () {
  const NS = (window.RGAAAuditor = window.RGAAAuditor || {});

  function parseColor(cssColor) {
    if (!cssColor) return null;
    const match = cssColor.match(
      /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/i
    );
    if (!match) return null;
    return {
      r: parseFloat(match[1]),
      g: parseFloat(match[2]),
      b: parseFloat(match[3]),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1,
    };
  }

  function channelToLinear(c) {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance({ r, g, b }) {
    const rl = channelToLinear(r);
    const gl = channelToLinear(g);
    const bl = channelToLinear(b);
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
  }

  function contrastRatio(fg, bg) {
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function flattenOnBackground(color, background) {
    if (color.a >= 1) return color;
    const a = color.a;
    return {
      r: color.r * a + background.r * (1 - a),
      g: color.g * a + background.g * (1 - a),
      b: color.b * a + background.b * (1 - a),
      a: 1,
    };
  }

  function getEffectiveBackgroundColor(el) {
    let node = el;
    const stack = [];
    while (node && node.nodeType === 1) {
      const style = getComputedStyle(node);
      const bg = parseColor(style.backgroundColor);
      if (bg && bg.a > 0) {
        stack.push(bg);
        if (bg.a >= 1) break;
      }
      node = node.parentElement;
    }
    if (stack.length === 0) return { r: 255, g: 255, b: 255, a: 1 };
    let composed = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) {
      composed = flattenOnBackground(stack[i], composed);
    }
    return composed;
  }

  function isLargeText(style) {
    const sizePx = parseFloat(style.fontSize);
    const weight = style.fontWeight;
    const bold = weight === "bold" || parseInt(weight, 10) >= 700;
    // Seuils RGAA/WCAG : 18.66px (14pt) en gras, 24px (18pt) sinon.
    return bold ? sizePx >= 18.66 : sizePx >= 24;
  }

  NS.color = {
    parseColor,
    relativeLuminance,
    contrastRatio,
    getEffectiveBackgroundColor,
    isLargeText,
  };
})();
