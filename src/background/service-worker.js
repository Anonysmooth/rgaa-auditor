// Ouvre le panneau latéral quand on clique sur l'icône de l'extension.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Autorise le panneau latéral à s'ouvrir dès qu'on clique sur l'action,
// même si l'utilisateur clique avant que le panneau ne soit prêt.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});
