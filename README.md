# Auditeur RGAA — extension Chrome

Extension Chrome (Manifest V3) qui audite une page web selon trois axes du
RGAA : **couleurs et contrastes**, **structuration/sémantique** et
**navigation clavier**. Elle affiche les résultats dans un panneau latéral
persistant (façon inspecteur d'accessibilité de Firefox) et repère
visuellement, directement sur la page, les éléments concernés.

## Fonctionnalités

- **Contrastes** (RGAA 3.2/3.3) : calcule le ratio de contraste réel
  texte/fond (formule WCAG) pour chaque bloc de texte visible et signale
  les ratios inférieurs à 4.5:1 (texte normal) ou 3:1 (texte large/gras).
- **Sémantique** (RGAA 1, 8, 9, 11, 12) : images sans alternative,
  hiérarchie des titres incohérente, langue de page absente, titre de
  page manquant, champs de formulaire sans étiquette, liens/boutons sans
  intitulé accessible, rôles ARIA invalides, id dupliqués, absence de zone
  `<main>`.
- **Navigation clavier** (RGAA 7, 12) : `tabindex` positifs, éléments
  interactifs non focusables au clavier, absence de lien d'évitement,
  indicateurs de focus potentiellement supprimés en CSS.
- **Repérage visuel** : chaque anomalie peut être surlignée sur la page
  (cadre rouge = erreur, orange = avertissement), avec un mode « afficher
  tous les repères » pour une vue d'ensemble façon inspecteur
  d'accessibilité.
- **Panneau DevTools** : en plus du panneau latéral, un onglet **RGAA** est
  disponible dans les outils de développement (`F12`), avec un bouton
  **Inspecter** sur chaque anomalie qui sélectionne directement l'élément
  fautif dans l'onglet **Éléments**.
- Diagnostic **heuristique et local** : aucune donnée ne quitte le
  navigateur, aucun serveur distant n'est utilisé.

## Installation (mode développeur)

1. Ouvrez `chrome://extensions` dans Chrome (ou `edge://extensions` dans
   Edge).
2. Activez le **mode développeur** (en haut à droite).
3. Cliquez sur **Charger l'extension non empaquetée**.
4. Sélectionnez le dossier `rgaa-auditor` (celui contenant `manifest.json`).
5. L'icône de l'extension apparaît dans la barre d'outils.

Prérequis : Chrome (ou Edge) version 116 ou supérieure (API
`chrome.sidePanel`).

## Utilisation

### Panneau latéral

1. Ouvrez la page à auditer.
2. Cliquez sur l'icône **Auditeur RGAA** : le panneau latéral s'ouvre.
3. Cliquez sur **Lancer l'audit**.
4. Parcourez la liste des anomalies :
   - survolez ou naviguez au clavier jusqu'à une carte pour surligner
     temporairement l'élément correspondant sur la page ;
   - cliquez sur une carte pour l'épingler, afficher le détail (constat +
     conseil de correction) et centrer la page dessus ;
   - utilisez les cartes **Couleurs / Sémantique / Navigation** et les
     filtres **Erreurs / Avertissements** pour affiner la liste.
5. Activez **Repères sur la page** pour afficher toutes les anomalies en
   une fois sur la page, comme une vue d'ensemble.
6. **Effacer** retire les repères visuels de la page.

Si la page a été rechargée ou a changé d'URL pendant que le panneau était
ouvert, relancez simplement l'audit.

### Panneau DevTools

1. Ouvrez les outils de développement (`F12` ou clic droit → Inspecter).
2. Sélectionnez l'onglet **RGAA** (à côté de Éléments, Console, etc.).
3. Lancez l'audit comme dans le panneau latéral.
4. Sur chaque carte, un bouton **Inspecter** apparaît à côté du sélecteur :
   il bascule automatiquement sur l'onglet **Éléments** avec le nœud fautif
   sélectionné, comme un `inspect()` de la console.

Les deux panneaux partagent la même analyse ; utilisez celui qui convient le
mieux à votre flux de travail.

## Limites

Cet outil réalise un **diagnostic automatisé heuristique**. Beaucoup de
critères RGAA (ordre de tabulation logique, pertinence des alternatives,
structure des tableaux complexes, compatibilité lecteurs d'écran, etc.)
nécessitent une vérification humaine et ne peuvent pas être entièrement
validés par un script. Un résultat « aucune anomalie détectée » ne signifie
donc pas que la page est conforme RGAA — il indique seulement qu'aucun des
contrôles automatisés implémentés n'a rien trouvé à signaler.

## Structure du projet

```
manifest.json
src/
  background/service-worker.js   # ouvre le panneau latéral au clic
  devtools/
    devtools.html / devtools.js  # déclare l'onglet "RGAA" dans les DevTools
  content/
    content-script.js            # écoute les messages du panneau, orchestre l'analyse
    analyzer.js                  # agrège les 3 familles de contrôles, marque les éléments (data-rgaa-id)
    overlay.js                   # surcouche visuelle (Shadow DOM)
    rgaa-rules.js                # métadonnées des règles (code RGAA, titre, correction)
    checks/
      contrast.js
      semantics.js
      navigation.js
    utils/
      color.js                   # calcul de contraste WCAG
      dom.js                     # visibilité, nom accessible, focusabilité
      selector.js                # sélecteur CSS lisible pour un élément
  sidepanel/
    panel.html / panel.css / panel.js   # interface, réutilisée pour le panneau latéral ET le panneau DevTools
icons/
```

Aucune étape de build n'est nécessaire : tous les scripts sont du
JavaScript classique (pas de modules ES, pas de bundler), injectés dans la
page via `chrome.scripting.executeScript` au moment de l'audit.
