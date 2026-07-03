// Table de métadonnées pour chaque règle contrôlée par l'auditeur.
//
// Les codes RGAA cités sont des points de repère (RGAA 4.1) pour orienter la
// correction : cet outil est une aide au diagnostic heuristique, pas un outil
// de certification officielle. Une vérification manuelle reste nécessaire
// pour statuer sur la conformité réelle d'un critère RGAA.

(function () {
const THEMES = {
  couleurs: "Couleurs et contrastes",
  semantique: "Structuration et sémantique",
  navigation: "Navigation et clavier",
};

const RULES = {
  "contrast-text": {
    theme: "couleurs",
    code: "3.2 / 3.3",
    title: "Contraste texte / fond insuffisant",
    description:
      "Le contraste entre la couleur du texte et celle de son arrière-plan est inférieur au seuil minimal (4.5:1 pour un texte normal, 3:1 pour un texte large ou en gras ≥ 18.66px).",
    fix: "Augmentez l'écart de luminosité entre le texte et le fond (couleur de texte plus foncée ou fond plus clair, ou l'inverse) jusqu'à atteindre le ratio minimal.",
  },
  "img-alt-missing": {
    theme: "semantique",
    code: "1.1",
    title: "Image sans alternative textuelle",
    description:
      "Cette image porteuse d'information n'a pas d'attribut alt, ou celui-ci est manquant alors que l'image n'est pas déclarée décorative.",
    fix: "Ajoutez un attribut alt décrivant l'information transmise par l'image, ou alt=\"\" avec role=\"presentation\" si elle est purement décorative.",
  },
  "img-alt-suspect": {
    theme: "semantique",
    code: "1.1 / 1.2",
    title: "Alternative textuelle probablement non pertinente",
    description:
      "Le texte alternatif reprend le nom du fichier ou une formule générique (\"image\", \"photo\", \"picture\"...), ce qui n'apporte pas d'information utile.",
    fix: "Rédigez une alternative qui décrit la fonction ou le contenu réel de l'image dans son contexte.",
  },
  "heading-skip": {
    theme: "semantique",
    code: "9.1",
    title: "Rupture dans la hiérarchie des titres",
    description:
      "Le niveau de ce titre saute un ou plusieurs niveaux par rapport au titre précédent (ex. un h2 suivi directement d'un h4), ce qui casse la structure du document.",
    fix: "Respectez une hiérarchie de titres continue (h1 puis h2 puis h3, etc.) sans sauter de niveau.",
  },
  "heading-empty": {
    theme: "semantique",
    code: "9.1",
    title: "Titre vide",
    description:
      "Cet élément de titre (h1-h6) ne contient aucun texte perceptible par un lecteur d'écran.",
    fix: "Ajoutez un intitulé pertinent ou supprimez la balise de titre si elle n'a pas lieu d'être.",
  },
  "multiple-h1": {
    theme: "semantique",
    code: "9.1",
    title: "Plusieurs titres de niveau 1 sur la page",
    description:
      "La page contient plusieurs balises <h1>. En général une page ne devrait avoir qu'un seul titre principal.",
    fix: "Conservez un seul <h1> représentant le sujet principal de la page et utilisez des niveaux inférieurs pour le reste.",
  },
  "html-lang-missing": {
    theme: "semantique",
    code: "8.3",
    title: "Langue de la page non déclarée",
    description:
      "L'élément <html> n'a pas d'attribut lang valide, ce qui empêche les lecteurs d'écran de choisir la bonne synthèse vocale.",
    fix: 'Ajoutez un attribut lang sur la balise <html>, par exemple lang="fr".',
  },
  "page-title-missing": {
    theme: "semantique",
    code: "8.5",
    title: "Titre de page absent ou vide",
    description:
      "L'élément <title> du document est manquant ou vide. Il permet pourtant d'identifier la page, notamment en navigation par onglets ou lecteur d'écran.",
    fix: "Renseignez un <title> unique et explicite décrivant le contenu de la page.",
  },
  "form-label-missing": {
    theme: "semantique",
    code: "11.1 / 11.2",
    title: "Champ de formulaire sans étiquette",
    description:
      "Ce champ de saisie n'est associé à aucun <label>, ni à un aria-label ou aria-labelledby, il ne peut donc pas être identifié par un lecteur d'écran.",
    fix: "Associez un <label for=\"...\"> pointant vers l'id du champ, ou utilisez aria-label / aria-labelledby.",
  },
  "link-name-missing": {
    theme: "semantique",
    code: "6.1",
    title: "Lien sans intitulé accessible",
    description:
      "Ce lien ne contient ni texte, ni attribut aria-label / aria-labelledby, ni image avec alternative : son objectif est donc indéterminable au clavier ou au lecteur d'écran.",
    fix: "Ajoutez un intitulé de lien explicite (texte visible ou aria-label) décrivant sa destination ou son action.",
  },
  "button-name-missing": {
    theme: "semantique",
    code: "11.9 / 11.10 / 7.3",
    title: "Bouton sans intitulé accessible",
    description:
      "Ce bouton (ou élément avec role=\"button\") n'a ni texte, ni aria-label, ni aria-labelledby.",
    fix: "Ajoutez un texte visible ou un aria-label décrivant l'action déclenchée par le bouton.",
  },
  "landmark-main-missing": {
    theme: "semantique",
    code: "12.6",
    title: "Zone de contenu principal absente",
    description:
      "La page ne définit pas de région principale identifiable (<main> ou role=\"main\"), ce qui complique la navigation rapide par zones.",
    fix: "Englobez le contenu principal de la page dans une balise <main> (ou role=\"main\").",
  },
  "aria-invalid-role": {
    theme: "semantique",
    code: "7.1",
    title: "Rôle ARIA invalide ou inconnu",
    description:
      "La valeur de l'attribut role sur cet élément ne correspond à aucun rôle ARIA reconnu.",
    fix: "Corrigez la valeur de l'attribut role en utilisant un rôle ARIA valide, ou retirez-le s'il n'est pas nécessaire.",
  },
  "tabindex-positive": {
    theme: "navigation",
    code: "12.8",
    title: "Ordre de tabulation forcé (tabindex positif)",
    description:
      "Un tabindex strictement positif modifie l'ordre naturel de tabulation et crée souvent un parcours clavier incohérent.",
    fix: "Utilisez tabindex=\"0\" (ou retirez l'attribut) et organisez l'ordre de tabulation via l'ordre du DOM.",
  },
  "interactive-no-keyboard": {
    theme: "navigation",
    code: "7.1 / 7.3",
    title: "Élément interactif inaccessible au clavier",
    description:
      "Cet élément possède un gestionnaire de clic (ou un rôle interactif comme button/link) mais n'est pas focusable au clavier (pas de tabindex, pas d'élément natif focusable).",
    fix: "Utilisez un élément natif focusable (<button>, <a href>) ou ajoutez tabindex=\"0\" ainsi que la gestion des touches Entrée/Espace.",
  },
  "skip-link-missing": {
    theme: "navigation",
    code: "12.7",
    title: "Lien d'évitement absent",
    description:
      "Aucun lien permettant d'accéder directement au contenu principal (ou d'éviter les blocs répétitifs) n'a été détecté en tout début de page.",
    fix: 'Ajoutez en tout début de page un lien du type <a href="#contenu">Aller au contenu</a> visible au focus clavier.',
  },
  "focus-outline-removed": {
    theme: "navigation",
    code: "12.8",
    title: "Indicateur de focus potentiellement supprimé",
    description:
      "Une règle CSS supprime le contour de focus (outline: none/0) sur cet élément sans qu'un style de remplacement visible n'ait été détecté.",
    fix: "Conservez ou remplacez le contour par un style de focus clairement visible (contour, fond, soulignement épais...) respectant un contraste suffisant.",
  },
  "duplicate-id": {
    theme: "semantique",
    code: "8.2",
    title: "Identifiant dupliqué",
    description:
      "Plusieurs éléments de la page partagent le même attribut id, ce qui peut casser les associations ARIA (aria-labelledby, for, etc.).",
    fix: "Assurez-vous que chaque valeur d'id est unique dans la page.",
  },
};

  const NS = (window.RGAAAuditor = window.RGAAAuditor || {});
  NS.RULES = RULES;
  NS.THEMES = THEMES;
})();
