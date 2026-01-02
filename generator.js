// generator.js
(function () {
  const { router, categories } = window.BG_TABLES;

  function rollDie(sides) {
    // uniform int in [1, sides]
    return Math.floor(Math.random() * sides) + 1;
  }

  function lookupRange(table, roll) {
    const hit = table.find(r => roll >= r.min && roll <= r.max);
    if (!hit) {
      throw new Error(`No table entry for roll ${roll}.`);
    }
    return hit.text;
  }

  function isApprentice(text) {
    return /Apprentice\b/i.test(text) && /Pick a profession/i.test(text);
  }

  function escapeHtml(s) {
    return s
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
    apprenticeExtra: null // { categoryRoll, categoryName, professionText }
  };

  function generatePrimary() {
    const r = rollDie(100);
    const category = lookupRange(router, r);
    state.primaryRoll = r;
    state.category = category;
    state.apprenticeExtra = null;
  }

  function generateSecondary() {
    if (!state.category) generatePrimary();

    const table = categories[state.category];
    if (!table) throw new Error(`Missing category table: ${state.category}`);

    const r = rollDie(100);
    const profession = lookupRange(table, r);

    state.secondaryRoll = r;
    state.profession = profession;
    state.apprenticeExtra = null;

    // Branch rule: Apprentice → pick another profession (from router + subtable).
    if (isApprentice(profession)) {
      const r2a = rollDie(100);
      const cat2 = lookupRange(router, r2a);
      const table2 = categories[cat2];
      if (!table2) throw new Error(`Missing category table: ${cat2}`);
      const r2b = rollDie(100);
      const prof2 = lookupRange(table2, r2b);

      state.apprenticeExtra = {
        routerRoll: r2a,
        categoryName: cat2,
        categoryRoll: r2b,
        professionText: prof2
      };
    }
  }

  function render() {
    const out = document.getElementById("output");
    const dbg = document.getElementById("debug");

    if (!state.category || !state.profession) {
      out.innerHTML = `<p class="muted">Click “Generate Background”.</p>`;
      dbg.textContent = "";
      return;
    }

    const apprenticeBlock = state.apprenticeExtra
      ? `
        <div class="hr"></div>
        <h2>Apprenticeship (extra roll)</h2>
        <div class="kv">
          <div class="k">Router roll (d100)</div>
          <div class="v">${state.apprenticeExtra.routerRoll} → ${escapeHtml(state.apprenticeExtra.categoryName)}</div>
          <div class="k">Profession roll (d100)</div>
          <div class="v">${state.apprenticeExtra.categoryRoll} → ${escapeHtml(state.apprenticeExtra.professionText)}</div>
        </div>
      `
      : "";

    out.innerHTML = `
      <h2>Result</h2>
      <div class="kv">
        <div class="k">Primary category (d100)</div>
        <div class="v">${state.primaryRoll} → ${escapeHtml(state.category)}</div>

        <div class="k">Secondary profession (d100)</div>
        <div class="v">${state.secondaryRoll} → ${escapeHtml(state.profession)}</div>
      </div>
      ${apprenticeBlock}
    `;

    const debugObj = {
      primaryRoll: state.primaryRoll,
      category: state.category,
      secondaryRoll: state.secondaryRoll,
      profession: state.profession,
      apprenticeship: state.apprenticeExtra
    };
    dbg.textContent = JSON.stringify(debugObj, null, 2);

    document.getElementById("btnRerollSecondary").disabled = false;
    document.getElementById("btnRerollPrimary").disabled = false;
  }

  document.getElementById("btnGenerate").addEventListener("click", () => {
    generatePrimary();
    generateSecondary();
    render();
  });

  document.getElementById("btnRerollSecondary").addEventListener("click", () => {
    generateSecondary();
    render();
  });

  document.getElementById("btnRerollPrimary").addEventListener("click", () => {
    generatePrimary();
    generateSecondary();
    render();
  });

  render();
})();
