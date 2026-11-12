(function (global) {
  "use strict";

  // Nieuwe tool erbij? Gewoon hier toevoegen — verschijnt dan automatisch in het
  // hamburgermenu op elke pagina.
  const TOOLS = [
    { id: "home", href: "./index.html", label: "Home", icon: "icon-192.png" },
    { id: "bonnetjes", href: "./bonnetjes.html", label: "Bonnetjes", icon: "icon-bonnetjes-192.png" },
    { id: "declaraties", href: "./declaraties.html", label: "Declaraties", icon: "icon-declaraties-192.png" },
    { id: "kilometers", href: "./kilometers.html", label: "Kilometers", icon: "icon-kilometers-192.png" },
    { id: "stortingen", href: "./stortingen.html", label: "Stortingen", icon: "icon-stortingen-192.png" },
    { id: "reglementen", href: "./reglementen.html", label: "Reglementen", icon: "icon-reglementen-192.png" },
  ];

  function buildNav() {
    const overlay = document.createElement("div");
    overlay.className = "nav-overlay";
    overlay.id = "navOverlay";

    const panel = document.createElement("div");
    panel.className = "nav-panel";

    const panelHeader = document.createElement("div");
    panelHeader.className = "nav-panel-header";
    panelHeader.innerHTML = "<span>IB Toolbox</span>";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Sluiten");
    closeBtn.innerHTML = "&times;";
    panelHeader.appendChild(closeBtn);
    panel.appendChild(panelHeader);

    const links = document.createElement("div");
    links.className = "nav-links";
    TOOLS.forEach((tool) => {
      const a = document.createElement("a");
      a.href = tool.href;
      a.className = "nav-link" + (tool.id === global.CURRENT_TOOL ? " active" : "");
      a.innerHTML = '<img class="nav-icon" src="' + tool.icon + '" alt="" />' + tool.label;
      links.appendChild(a);
    });
    panel.appendChild(links);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function openNav() { overlay.classList.add("open"); }
    function closeNav() { overlay.classList.remove("open"); }

    const navBtn = document.getElementById("navBtn");
    if (navBtn) navBtn.addEventListener("click", openNav);
    closeBtn.addEventListener("click", closeNav);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeNav();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildNav);
  } else {
    buildNav();
  }
})(window);
