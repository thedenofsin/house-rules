// generator.js
// Background/profession generator for thedenofsin/house-rules (GitHub Pages)
// - Rolls d100 on router table -> category
// - Rolls d100 on category table -> profession
// - Disregards disallowed results (Apprentice/Student/Teacher) by rerolling
//   (safety max attempts to avoid infinite loops)

(function () {
  "use strict";

  // Expect tables.js to define window.BG_TABLES = { router: [...], categories: { "Category": [...] } }
  if (!window.BG_TABLES || !window.BG_TABLES.router || !window.BG_TABLES.categories) {
    throw new Error("BG_TABLES not found. Ensure tables.js loads before generator.js and defines window.BG_TABLES.");
  }

  const { router, categories } = window.BG_TABLES;

  function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  function lookupRange(table, roll) {
    const hit = table.find((r) => roll >= r.min && roll <= r.max);
    if (!hit) throw new Error(`No table entry for roll ${roll}. Check table ranges.`);
    return hit.text;
  }

  function isDisallowedProfession(text) {
    // Defensive: if any table still contains these, reroll and ignore.
    // Word boundaries prevent false hits like "Teacher's Pet" etc.
    return /\b(Apprentice|Student|Teacher)\b/i.test(text);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const state = {
    primaryRoll: null,
    category: null,
    secondaryRoll: null,
    profession: null,
  };

  function generatePrimary() {
    const r = rollDie(100);
    const category = lookupRange(router, r);
    if (!categories[category]) {
      throw new Error(`Router roll mapped to '${category}', but categories['${category}'] is missing in tables.js.`);
    }
    state.primaryRoll = r;
    state.category = category;
  }

  function generateSecondary() {
    if (!state.category) generatePrimary();

    const table = categories[state.category];
    if (!Array.isArray(table) || table.length === 0) {
      throw new Error(`Category table '${state.category}' is missing or empty in tables.js.`);
    }

    let r = null;
    let profession = null;

    // Reroll loop for disallowed results (and any future tables you might edit).
    for (let i = 0; i < 100; i++) {
      r = rollDie(100);
      profession = lookupRange(table, r);
      if (!isDisallowedProfession(profession)) break;
    }

    if (profession && isDisallowedProfession(profession)) {
      throw new Error(
        `Exceeded reroll limit trying to avoid disallowed results in '${state.category}'. ` +
          `Either the table is dominated by disallowed entries or ranges are wrong.`
      );
    }

    state.secondaryRoll = r;
    state.profession = profession;
  }

  function render() {
    const out = document.getElementById("output");
    const dbg = document.getElementById("debug");

    if (!out) throw new Error("Missing #output element in generator.html.");
    if (!dbg) throw new Error("Missing #debug element in generator.html.");

    if (!state.category || !state.profession) {
      out.innerHTML = `<p class="muted">Click “Generate Background”.</p>`;
      dbg.textContent = "";
      return;
    }

    out.innerHTML = `
      <h2>Result</h2>
      <div class="kv">
        <div class="k">Primary category (d100)</div>
        <div class="v">${state.primaryRoll} → ${escapeHtml(state.category)}</div>

        <div class="k">Secondary profession (d100)</div>
        <div class="v">${state.secondaryRoll} → ${escapeHtml(state.profession)}</div>
      </div>
    `;

    dbg.textContent = JSON.stringify(
      {
        primaryRoll: state.primaryRoll,
        category: state.category,
        secondaryRoll: state.secondaryRoll,
        profession: state.profession,
      },
      null,
      2
    );

    const btnRerollSecondary = document.getElementById("btnRerollSecondary");
    const btnRerollPrimary = document.getElementById("btnRerollPrimary");

    if (btnRerollSecondary) btnRerollSecondary.disabled = false;
    if (btnRerollPrimary) btnRerollPrimary.disabled = false;
  }

  function wireUI() {
    const btnGenerate = document.getElementById("btnGenerate");
    const btnRerollSecondary = document.getElementById("btnRerollSecondary");
    const btnRerollPrimary = document.getElementById("btnRerollPrimary");

    if (!btnGenerate) throw new Error("Missing #btnGenerate element in generator.html.");

    btnGenerate.addEventListener("click", () => {
      generatePrimary();
      generateSecondary();
      render();
    });

    if (btnRerollSecondary) {
      btnRerollSecondary.addEventListener("click", () => {
        generateSecondary();
        render();
      });
    }

    if (btnRerollPrimary) {
      btnRerollPrimary.addEventListener("click", () => {
        generatePrimary();
        generateSecondary();
        render();
      });
    }
  }

  wireUI();
  render();
})();
