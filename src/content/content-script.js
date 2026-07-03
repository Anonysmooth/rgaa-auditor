// Point d'entrée injecté dans la page auditée : écoute les messages envoyés
// par le panneau latéral et fait le lien entre l'analyse et la surcouche
// visuelle.

(function () {
  if (window.__RGAA_READY__) return; // déjà initialisé sur cette page
  window.__RGAA_READY__ = true;

  const NS = window.RGAAAuditor;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message && message.type) {
      case "RGAA_PING": {
        sendResponse({ ok: true });
        return false;
      }
      case "RGAA_RUN_AUDIT": {
        try {
          const results = NS.runAudit();
          sendResponse({ ok: true, results, url: location.href, title: document.title });
        } catch (err) {
          sendResponse({ ok: false, error: String((err && err.message) || err) });
        }
        return false;
      }
      case "RGAA_SHOW_ALL": {
        NS.overlay.showAll(NS.getIssuesForOverlay());
        sendResponse({ ok: true });
        return false;
      }
      case "RGAA_SHOW_ONE": {
        NS.overlay.showOne(message.id, NS.getIssuesForOverlay(), message.label, message.keepOthers);
        sendResponse({ ok: true });
        return false;
      }
      case "RGAA_CLEAR_OVERLAY": {
        NS.overlay.clear();
        sendResponse({ ok: true });
        return false;
      }
      default:
        return false;
    }
  });
})();
