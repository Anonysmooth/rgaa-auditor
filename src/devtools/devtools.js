// Déclare un panneau "RGAA" dans les outils de développement Chrome,
// réutilisant l'interface du panneau latéral (src/sidepanel/panel.html).
// Depuis ce contexte, chrome.devtools.inspectedWindow devient disponible,
// ce qui permet notamment de sélectionner un élément dans l'onglet Éléments.

chrome.devtools.panels.create(
  "RGAA",
  "icons/icon32.png",
  "src/sidepanel/panel.html",
  () => {}
);
