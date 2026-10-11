// ==========================================================================
// FindARescue.ie — Directory logic (index.html)
// Depends on globals from resources.js and translations.js, which must be
// loaded BEFORE this file as plain synchronous <script> tags.
// ==========================================================================

// ==========================================================================
// Configuration and State
// ==========================================================================
// Animal categories, in display order. To add one:
//   1. add a row here (value must match the "category" field in resources.js),
//   2. add its label key to BOTH "en" and "ga" in translations.js,
//   3. add its icon as <symbol id="i-NAME"> in icons.svg.
const CATEGORY_CONFIG = [
  { value: "All",           key: "catAll",          icon: "all" },
  { value: "Dogs",          key: "catDogs",         icon: "dog" },
  { value: "Cats",          key: "catCats",         icon: "cat" },
  { value: "Birds",         key: "catBirds",        icon: "bird" },
  { value: "Small Animals", key: "catSmallAnimals", icon: "rabbit" },
  { value: "Equines",       key: "catEquines",      icon: "horse" },
  { value: "Wildlife",      key: "catWildlife",     icon: "wildlife" }
];
const CATEGORIES = Object.fromEntries(CATEGORY_CONFIG.map(c => [c.value, c]));

// Maps each county/province value (used in resources.js tags and the URL)
// to its translation key — underlying values stay English so they keep
// matching the "tags" field in resources.js; only the displayed label changes.
const countyKeys = {
  Connacht: "locConnacht", Leinster: "locLeinster", Munster: "locMunster", Ulster: "locUlster",
  Antrim: "locAntrim", Armagh: "locArmagh", Carlow: "locCarlow", Cavan: "locCavan",
  Clare: "locClare", Cork: "locCork", Derry: "locDerry", Donegal: "locDonegal",
  Down: "locDown", Dublin: "locDublin", Fermanagh: "locFermanagh", Galway: "locGalway",
  Kerry: "locKerry", Kildare: "locKildare", Kilkenny: "locKilkenny", Laois: "locLaois",
  Leitrim: "locLeitrim", Limerick: "locLimerick", Longford: "locLongford", Louth: "locLouth",
  Mayo: "locMayo", Meath: "locMeath", Monaghan: "locMonaghan", Offaly: "locOffaly",
  Roscommon: "locRoscommon", Sligo: "locSligo", Tipperary: "locTipperary", Tyrone: "locTyrone",
  Waterford: "locWaterford", Westmeath: "locWestmeath", Wexford: "locWexford", Wicklow: "locWicklow"
};

// Groups the 32 counties under their province, used to build the location
// filter panel and to power the province "select all" checkboxes.
const PROVINCE_COUNTIES = {
  Leinster: ["Carlow", "Dublin", "Kildare", "Kilkenny", "Laois", "Longford", "Louth", "Meath", "Offaly", "Westmeath", "Wexford", "Wicklow"],
  Munster: ["Clare", "Cork", "Kerry", "Limerick", "Tipperary", "Waterford"],
  Connacht: ["Galway", "Leitrim", "Mayo", "Roscommon", "Sligo"],
  Ulster: ["Antrim", "Armagh", "Cavan", "Derry", "Donegal", "Down", "Fermanagh", "Monaghan", "Tyrone"]
};
const PROVINCES = Object.keys(PROVINCE_COUNTIES);

let selectedCategory = "All";
let selectedTags = []; // location filter — array of county/province values, empty = no location filter

// Sort resources alphabetically by title
const sortedResources = [...resources].sort((a, b) => {
  const titleA = a.title.toLowerCase();
  const titleB = b.title.toLowerCase();
  return titleA.localeCompare(titleB);
});

// ==========================================================================
// Small helpers
// ==========================================================================
function getCategories(resource) {
  if (Array.isArray(resource.category)) return resource.category;
  if (typeof resource.category === "string") return [resource.category];
  return [];
}

// Returns the Irish description if one has been manually added to this
// resource (a "description_ga" field in resources.js) and Irish is
// selected; otherwise falls back to the English description.
function getLocalizedDescription(resource) {
  if (getLang() === "ga" && resource.description_ga) return resource.description_ga;
  return resource.description;
}

// Entries marked as possibly inactive in resources.js use a trailing " *"
// on the title and a leading "**...**" sentence in the description.
// This splits those markers out so they can be shown as a proper badge
// instead of raw asterisks. The data itself is untouched.
function parseStatus(resource) {
  const inactive = /\*\s*$/.test(resource.title);
  const title = resource.title.replace(/\s*\*+\s*$/, "");
  let description = getLocalizedDescription(resource) || "";
  let note = "";
  const m = description.match(/^\s*\*\*(.+?)\*\*\s*/);
  if (m) {
    note = m[1].trim();
    description = description.slice(m[0].length);
  }
  return { inactive: inactive || !!note, title, description, note };
}

// Returns the tag colour class for a given tag value. Shared between the
// resource card tags and the location filter chips so colours stay in sync.
function tagColorClass(tag) {
  if (tag === "National") return "tag-teal";
  if (tag === "Leinster") return "tag-yellow";
  if (tag === "Connacht") return "tag-purple";
  if (tag === "Ulster") return "tag-orange";
  if (tag === "Munster") return "tag-coral";
  return "tag-blue";
}

function isLocationTag(tag) {
  return tag === "National" || Object.prototype.hasOwnProperty.call(countyKeys, tag);
}

// Lower-case and strip accents so "corcaigh" matches "Corcaigh" and
// "baile atha" matches "Baile Átha Cliath".
function normalise(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function icon(name, extraClass) {
  return `<svg class="icon${extraClass ? " " + extraClass : ""}" aria-hidden="true"><use href="icons.svg#i-${name}"/></svg>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function initials(title) {
  const words = title.replace(/[^A-Za-z\u00C0-\u017F\s]/g, " ").split(/\s+/).filter(w => w && !/^(the|of|and|for|a)$/i.test(w));
  return (words.slice(0, 2).map(w => w[0]).join("") || "?").toUpperCase();
}

// ==========================================================================
// Category filter (pill buttons)
// translations.js calls renderCategoryFilter(), renderLocationFilter() and
// renderResources() after a language change — keep those names in sync.
// ==========================================================================
function renderCategoryFilter() {
  const group = document.getElementById("categoryFilter");
  if (!group) return;
  group.innerHTML = "";

  CATEGORY_CONFIG.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-pill";
    btn.dataset.category = cat.value;
    btn.setAttribute("aria-pressed", cat.value === selectedCategory ? "true" : "false");
    btn.innerHTML = `${icon(cat.icon)}<span class="pill-label">${escapeHtml(t(cat.key))}</span>`;
    group.appendChild(btn);
  });
}

function onCategoryClick(e) {
  const btn = e.target.closest(".category-pill");
  if (!btn) return;
  selectedCategory = btn.dataset.category;
  document.querySelectorAll(".category-pill").forEach(b => {
    b.setAttribute("aria-pressed", b.dataset.category === selectedCategory ? "true" : "false");
  });
  updateUrl();
  renderResources();
}

// ==========================================================================
// Location filter (multi-select panel)
// ==========================================================================
function buildLocationPanel() {
  const panelList = document.getElementById("locationPanelList");
  panelList.innerHTML = "";

  Object.entries(PROVINCE_COUNTIES).forEach(([province, counties]) => {
    const group = document.createElement("fieldset");
    group.className = "province-group";

    const provinceRow = document.createElement("label");
    provinceRow.className = "province-row";
    provinceRow.innerHTML = `
      <input type="checkbox" data-province="${province}">
      <span>${escapeHtml(t(countyKeys[province]))}</span>
    `;
    group.appendChild(provinceRow);

    const grid = document.createElement("div");
    grid.className = "county-grid";
    counties.forEach(county => {
      const row = document.createElement("label");
      row.className = "county-row";
      const checked = selectedTags.includes(county) ? "checked" : "";
      row.innerHTML = `
        <input type="checkbox" data-county="${county}" data-province="${province}" ${checked}>
        <span>${escapeHtml(t(countyKeys[county] || county))}</span>
      `;
      grid.appendChild(row);
    });
    group.appendChild(grid);
    panelList.appendChild(group);
  });

  PROVINCES.forEach(syncProvinceCheckboxState);
}

// Keeps a province's own checkbox in sync with its counties: checked when
// all are selected, indeterminate when some are, unchecked when none are.
function syncProvinceCheckboxState(province) {
  const panelList = document.getElementById("locationPanelList");
  const boxes = [...panelList.querySelectorAll(`input[data-county][data-province="${province}"]`)];
  const checkedCount = boxes.filter(b => b.checked).length;
  const provinceBox = panelList.querySelector(`input[data-province="${province}"]:not([data-county])`);
  if (!provinceBox) return;
  provinceBox.checked = boxes.length > 0 && checkedCount === boxes.length;
  provinceBox.indeterminate = checkedCount > 0 && checkedCount < boxes.length;
}

function updateLocationTriggerUI() {
  const badge = document.getElementById("locationCount");
  const trigger = document.getElementById("locationTrigger");
  if (selectedTags.length > 0) {
    badge.textContent = selectedTags.length;
    badge.style.display = "inline-flex";
    trigger.classList.add("has-value");
  } else {
    badge.style.display = "none";
    trigger.classList.remove("has-value");
  }
}

// Rebuilds the removable chip row showing the currently selected locations.
function renderLocationChips() {
  const chipRow = document.getElementById("locationChips");
  chipRow.innerHTML = "";

  [...selectedTags]
    .sort((a, b) => t(countyKeys[a] || a).localeCompare(t(countyKeys[b] || b)))
    .forEach(tag => {
      const label = t(countyKeys[tag] || tag);
      const chip = document.createElement("span");
      chip.className = `tag location-chip ${tagColorClass(tag)}`;
      chip.innerHTML = `${escapeHtml(label)} <button type="button" class="tag-remove" data-remove="${tag}" aria-label="${escapeHtml(t("locationRemove") + " " + label)}">${icon("x")}</button>`;
      chipRow.appendChild(chip);
    });
}

// Full rebuild of the location panel + trigger + chips from current state.
// Called on initial load and whenever the language changes.
function renderLocationFilter() {
  if (!document.getElementById("locationPanelList")) return;
  buildLocationPanel();
  updateLocationTriggerUI();
  renderLocationChips();
}

function isMobilePanel() {
  return window.matchMedia("(max-width: 640px)").matches;
}

function openLocationPanel() {
  document.getElementById("locationPanel").classList.add("open");
  document.getElementById("locationTrigger").setAttribute("aria-expanded", "true");
  if (isMobilePanel()) document.body.classList.add("sheet-open");
}
function closeLocationPanel() {
  const panel = document.getElementById("locationPanel");
  if (!panel) return;
  const wasOpen = panel.classList.contains("open");
  panel.classList.remove("open");
  document.getElementById("locationTrigger").setAttribute("aria-expanded", "false");
  document.body.classList.remove("sheet-open");
  return wasOpen;
}
function toggleLocationPanel() {
  const isOpen = document.getElementById("locationPanel").classList.contains("open");
  isOpen ? closeLocationPanel() : openLocationPanel();
}

// Delegated change handler for every checkbox in the location panel —
// handles both individual county boxes and province "select all" boxes.
function setCountySelected(county, selected) {
  const isSelected = selectedTags.includes(county);
  if (selected && !isSelected) selectedTags.push(county);
  else if (!selected && isSelected) selectedTags = selectedTags.filter(tag => tag !== county);
}

function onLocationPanelChange(e) {
  const box = e.target;
  if (box.matches("input[data-county]")) {
    setCountySelected(box.dataset.county, box.checked);
    syncProvinceCheckboxState(box.dataset.province);
  } else if (box.matches("input[data-province]")) {
    const province = box.dataset.province;
    const panelList = document.getElementById("locationPanelList");
    panelList.querySelectorAll(`input[data-county][data-province="${province}"]`).forEach(countyBox => {
      countyBox.checked = box.checked;
      setCountySelected(countyBox.dataset.county, box.checked);
    });
    syncProvinceCheckboxState(province);
  } else {
    return;
  }

  onLocationsChanged();
}

// Everything that must refresh after the selected locations change.
function onLocationsChanged() {
  updateLocationTriggerUI();
  renderLocationChips();
  updateUrl();
  renderResources();
}

function removeLocationTag(county) {
  setCountySelected(county, false);
  const box = document.querySelector(`#locationPanelList input[data-county="${county}"]`);
  if (box) {
    box.checked = false;
    syncProvinceCheckboxState(box.dataset.province);
  }
  onLocationsChanged();
}

// Clears the location filter only (category and search are untouched).
function clearSelectedLocations() {
  selectedTags = [];
  document.querySelectorAll("#locationPanelList input[type=checkbox]").forEach(box => {
    box.checked = false;
    box.indeterminate = false;
  });
  onLocationsChanged();
}

function resetFilters() {
  selectedCategory = "All";
  selectedTags = [];
  document.getElementById("search").value = "";
  closeLocationPanel();
  renderCategoryFilter();
  renderLocationFilter();
  updateUrl();
  renderResources();
}

// ==========================================================================
// Filtering
// ==========================================================================
function matchesSearch(resource, term) {
  if (!term) return true;
  const tags = resource.tags || [];
  const haystack = [
    resource.title,
    resource.description,
    resource.description_ga,
    ...tags,
    ...tags.map(tag => countyKeys[tag] ? t(countyKeys[tag]) : "")
  ].map(normalise).join(" \u0000 ");
  return haystack.includes(term);
}

function matchesLocation(resource) {
  return selectedTags.length === 0 || (resource.tags || []).some(tag => selectedTags.includes(tag));
}

function matchesCategory(resource, cat) {
  return cat === "All" || getCategories(resource).includes(cat);
}

// ==========================================================================
// Card rendering
// ==========================================================================
function buildCard(resource) {
  const status = parseStatus(resource);
  const tags = resource.tags || [];
  const locTags = tags.filter(isLocationTag);
  // Counties first, then provinces / National — reads more naturally.
  locTags.sort((a, b) => (PROVINCES.includes(a) || a === "National") - (PROVINCES.includes(b) || b === "National"));

  const card = document.createElement("article");
  card.className = "card" + (status.inactive ? " is-inactive" : "");

  // --- Header: logo (or initials fallback), title, category icons
  const head = document.createElement("div");
  head.className = "card-head";

  const logo = document.createElement("div");
  logo.className = "card-logo";
  logo.dataset.initials = initials(status.title);
  if (resource.image) {
    const img = document.createElement("img");
    img.src = resource.image;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 64;
    img.height = 64;
    img.addEventListener("error", () => { img.remove(); logo.classList.add("is-fallback"); });
    logo.appendChild(img);
  } else {
    logo.classList.add("is-fallback");
  }
  head.appendChild(logo);

  const heading = document.createElement("div");
  heading.className = "card-heading";
  const title = document.createElement("h2");
  title.className = "card-title";
  const mainLink = document.createElement("a");
  mainLink.className = "card-main-link";
  mainLink.href = resource.url;
  mainLink.target = "_blank";
  mainLink.rel = "noopener noreferrer";
  mainLink.textContent = status.title;
  title.appendChild(mainLink);
  heading.appendChild(title);
  head.appendChild(heading);

  const cats = getCategories(resource);
  if (cats.length) {
    const catRow = document.createElement("div");
    catRow.className = "card-cats";
    // Up to two icons; with three or more, show one icon plus a "+N" chip
    // so long category lists never squeeze the title.
    const known = cats.filter(cat => CATEGORIES[cat]);
    const shown = known.length > 2 ? known.slice(0, 1) : known;
    shown.forEach(cat => {
      const label = t(CATEGORIES[cat].key);
      const span = document.createElement("span");
      span.className = "card-cat";
      span.title = label;
      span.innerHTML = `${icon(CATEGORIES[cat].icon)}<span class="visually-hidden">${escapeHtml(label)}</span>`;
      catRow.appendChild(span);
    });
    if (known.length > shown.length) {
      const rest = known.slice(shown.length).map(cat => t(CATEGORIES[cat].key));
      const more = document.createElement("span");
      more.className = "card-cat card-cat-more";
      more.title = rest.join(", ");
      more.textContent = "+" + rest.length;
      more.setAttribute("aria-label", rest.join(", "));
      catRow.appendChild(more);
    }
    head.appendChild(catRow);
  }
  card.appendChild(head);

  // --- Status badges
  if (resource.rcn || status.inactive) {
    const badges = document.createElement("div");
    badges.className = "card-badges";
    if (resource.rcn) {
      const charityBadge = document.createElement("span");
      charityBadge.className = "badge badge-charity charity-badge";
      charityBadge.title = t("charityBadgeTooltip") + resource.rcn;
      charityBadge.innerHTML = `${icon("badge")}<span>${escapeHtml(t("charityBadgeLabel"))}</span>`;
      badges.appendChild(charityBadge);
    }
    if (status.inactive) {
      const warn = document.createElement("span");
      warn.className = "badge badge-warn";
      if (status.note) warn.title = status.note;
      warn.innerHTML = `${icon("alert")}<span>${escapeHtml(t("inactiveLabel"))}</span>`;
      badges.appendChild(warn);
    }
    card.appendChild(badges);
  }

  // --- Description
  const description = document.createElement("p");
  description.className = "card-desc";
  description.textContent = status.description;
  card.appendChild(description);

  // --- Location tags
  if (locTags.length) {
    const places = document.createElement("div");
    places.className = "tags-container";
    places.innerHTML = icon("pin", "tags-icon");
    locTags.forEach(tag => {
      const tagElement = document.createElement("span");
      tagElement.className = `tag ${tagColorClass(tag)}`;
      if (selectedTags.includes(tag)) tagElement.classList.add("selected");
      tagElement.textContent = t(countyKeys[tag] || tag);
      places.appendChild(tagElement);
    });
    card.appendChild(places);
  }

  // --- Actions. These are siblings of mainLink, NOT nested inside it —
  // nested <a> tags are invalid HTML and unreliable on mobile.
  const linkRow = document.createElement("div");
  linkRow.className = "card-links";

  // Every card shows the same three links in the same order so the layout
  // is predictable. Missing URLs render as greyed-out, non-interactive
  // placeholders (a <span>, not a link) so they can't be hovered or clicked.
  const cardLinks = [
    { field: "website",   key: "websiteLink",   iconName: "globe", className: "website-link",   showText: true },
    { field: "facebook",  key: "facebookLink",  iconName: "fb",    className: "facebook-link" },
    { field: "instagram", key: "instagramLink", iconName: "ig",    className: "instagram-link" }
  ];

  cardLinks.forEach(({ field, key, iconName, className, showText }) => {
    const label = t(key);
    const href = resource[field];
    const el = document.createElement(href ? "a" : "span");
    el.className = `card-action ${className}${showText ? "" : " is-icon"}${href ? "" : " is-unavailable"}`;
    if (href) {
      el.href = href;
      el.target = "_blank";
      el.rel = "noopener noreferrer";
      el.title = label;
      el.setAttribute("aria-label", `${label} — ${status.title}`);
    } else {
      const unavailable = `${label} — ${t("linkUnavailable")}`;
      el.title = unavailable;
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", unavailable);
    }
    el.innerHTML = icon(iconName) + (showText ? `<span>${escapeHtml(label)}</span>` : "");
    linkRow.appendChild(el);
  });

  card.appendChild(linkRow);
  return card;
}

// ==========================================================================
// Main render
// ==========================================================================
function renderResources() {
  const searchInput = document.getElementById("search");
  const container = document.getElementById("results");
  if (!searchInput || !container) return;

  const searchTerm = normalise(searchInput.value.trim());

  const filteredResources = sortedResources.filter(r =>
    matchesSearch(r, searchTerm) && matchesLocation(r) && matchesCategory(r, selectedCategory));

  // Result count + reset visibility
  const count = filteredResources.length;
  const countEl = document.getElementById("resultsCount");
  if (countEl) {
    countEl.textContent = (count === 1 ? t("resultsCountOne") : t("resultsCount")).replace("{n}", count);
  }
  const filtersActive = selectedCategory !== "All" || selectedTags.length > 0 || searchTerm !== "";
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.hidden = !filtersActive;
  const clearBtn = document.getElementById("searchClear");
  if (clearBtn) clearBtn.hidden = searchInput.value === "";

  container.innerHTML = "";

  if (count === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <span class="empty-icon">${icon("paw")}</span>
      <h2>${escapeHtml(t("noResultsTitle"))}</h2>
      <p>${escapeHtml(t("noResultsHint"))}</p>
      <button type="button" class="btn btn-primary" onclick="resetFilters()">${icon("reset")}<span>${escapeHtml(t("clearFilters"))}</span></button>
    `;
    container.appendChild(empty);
    return;
  }

  const frag = document.createDocumentFragment();
  filteredResources.forEach(resource => frag.appendChild(buildCard(resource)));
  container.appendChild(frag);
}

// ==========================================================================
// URL Management
// ==========================================================================
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const tagParam = params.get("tag") || "";
  const tags = tagParam
    ? tagParam.split(",").filter(value => Object.prototype.hasOwnProperty.call(countyKeys, value))
    : [];
  return {
    category: params.get("category") || "All",
    tags,
    search: params.get("search") || ""
  };
}

function updateUrl() {
  const search = document.getElementById("search").value;
  const params = new URLSearchParams(window.location.search);
  ["category", "tag", "search"].forEach(k => params.delete(k));

  if (selectedCategory !== "All") params.set("category", selectedCategory);
  if (selectedTags.length > 0) params.set("tag", selectedTags.join(","));
  if (search) params.set("search", search);

  const qs = params.toString();
  history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : "") + window.location.hash);
}

// ==========================================================================
// Safety dialog
// ==========================================================================
function openSafety() {
  const dlg = document.getElementById("safetyModal");
  if (!dlg) return;
  if (typeof dlg.showModal === "function") dlg.showModal();
  else dlg.setAttribute("open", "");
}
function closeSafety() {
  const dlg = document.getElementById("safetyModal");
  if (!dlg) return;
  if (typeof dlg.close === "function") dlg.close();
  else dlg.removeAttribute("open");
}

// ==========================================================================
// Initialization
// ==========================================================================
const { category, tags, search } = getUrlParams();
selectedCategory = CATEGORIES[category] ? category : "All";
selectedTags = tags;

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search");
  searchInput.value = search;
  renderCategoryFilter();
  renderLocationFilter();
  renderResources();

  document.getElementById("categoryFilter").addEventListener("click", onCategoryClick);

  // Location filter panel — wired up once; buildLocationPanel() only
  // replaces the checkboxes inside #locationPanelList, so this delegated
  // listener keeps working after every rebuild.
  document.getElementById("locationPanelList").addEventListener("change", onLocationPanelChange);
  document.getElementById("locationChips").addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) removeLocationTag(removeBtn.dataset.remove);
  });
  document.getElementById("locationTrigger").addEventListener("click", toggleLocationPanel);
  document.getElementById("locationDoneBtn").addEventListener("click", closeLocationPanel);
  document.getElementById("locationCloseBtn").addEventListener("click", closeLocationPanel);
  document.getElementById("locationClearAllBtn").addEventListener("click", clearSelectedLocations);

  document.addEventListener("click", (e) => {
    // Any click outside the filter closes it. On mobile this includes the
    // dimmed backdrop behind the bottom sheet (drawn by body.sheet-open::before).
    if (!e.target.closest("#locationFilter")) closeLocationPanel();
  });

  // Search clear button
  document.getElementById("searchClear").addEventListener("click", () => {
    searchInput.value = "";
    renderResources();
    updateUrl();
    searchInput.focus();
  });

  // Escape closes the location panel
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (closeLocationPanel()) document.getElementById("locationTrigger").focus();
    }
  });

  // Safety dialog
  document.querySelectorAll("[data-open-safety]").forEach(btn => btn.addEventListener("click", openSafety));
  document.querySelectorAll("[data-close-safety]").forEach(btn => btn.addEventListener("click", closeSafety));
  const dlg = document.getElementById("safetyModal");
  dlg.addEventListener("click", (e) => { if (e.target === dlg) closeSafety(); });
  if (window.location.hash === "#safety") openSafety();
});
