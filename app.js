// ✅ BREZ / na koncu!
const WORKER_URL = "https://orange-cherry-7035.streznik.workers.dev";

console.log("✅ Skript se je naložil!");

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let izbraneTeme = [];
let steviloVprasanj = 5;
let trenutnaVprasanja = [];
let trenutniIndex = 0;
let odgovori = [];

// ==================== HIERARHIČNA IZBIRA TEM ====================
async function napolniTemeTree() {
  try {
    const response = await fetch(`${WORKER_URL}/themes`);
    const temi = await response.json();
    
    let html = '<h3>Izberi temo:</h3>';
    
    temi
      .filter(t => t.parent_id === null && t.vidna)
      .forEach(glavnaTema => {
      
        html += `
        <div class="tema-group" style="margin:10px 0;">
          <label style="cursor:pointer; font-weight:bold;">
            <input type="checkbox"
                 class="glavna-tema tema"
                 value="${glavnaTema.id}"
                 data-id="${glavnaTema.id}"
                 onchange="toggleSubteme(this)">
            ${glavnaTema.ime} (${glavnaTema.stevilo_vprasanj}) (+)
          </label>
          <div class="subteme-container" style="margin-left:20px; display:none;" data-parent="${glavnaTema.id}">
            ${temi
                .filter(t => t.parent_id === glavnaTema.id && t.vidna)
                .map(sub => `
              <label style="cursor:pointer; display:block; padding:5px 0;">
                <input type="checkbox" class="subtema tema" value="${sub.id}">
                &nbsp;${escapeHtml(sub.ime)} (${sub.stevilo_vprasanj})
              </label>
            `).join('')}
          </div>
        </div>
      `;
    });
    
    document.getElementById('teme-tree').innerHTML = html;
  } catch (err) {
    console.error("Napaka pri nalaganju tem:", err);
    document.getElementById('teme-tree').innerHTML = '<p>Napaka pri nalaganju tem</p>';
  }
}

function toggleSubteme(checkbox) {

  console.log("Klik:", checkbox.checked, checkbox.value);

  const container = document.querySelector(
    `.subteme-container[data-parent="${checkbox.dataset.id}"]`
  );

  container.style.display = checkbox.checked ? 'block' : 'none';

  if (checkbox.checked) {
    container.querySelectorAll('.subtema').forEach(sub => sub.checked = true);
  } else {
    container.querySelectorAll('.subtema').forEach(sub => sub.checked = false);
  }
}

// Naloži teme ob začetku
window.addEventListener('DOMContentLoaded', napolniTemeTree);

// ==================== START BUTTON CLICK HANDLER ====================
const startButton = document.getElementById("zacni-kviz");
console.log("🔘 Iskanje gumba:", startButton);

if (startButton) {
  startButton.addEventListener("click", async () => {
    console.log("👆 Gumb kliknjen!");

        izbraneTeme = Array.from(document.querySelectorAll(".tema:checked"))
      .map(cb => cb.value);

    console.log("📋 Izbrane TEME:", izbraneTeme);

    if (izbraneTeme.length === 0) {
      alert("Izberi vsaj eno temo!");
      return;
    }

    steviloVprasanj = parseInt(document.getElementById("stevilo").value, 10);
    console.log("🔢 Število vprašanj:", steviloVprasanj);

    console.log("🌐 Povezava z API-jem...");
    const temeParam = izbraneTeme.join(",");
    const fullUrl = `${WORKER_URL}?teme=${encodeURIComponent(temeParam)}&stevilo=${steviloVprasanj}`;

    console.log("📤 URL:", fullUrl);

    try {
      const response = await fetch(fullUrl);

      console.log("📥 Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error body:", errorText);
        prikaziNapako("Napaka pri strežniku: " + response.status);
        return;
      }

      const data = await response.json();
      console.log("📊 Polen odgovor:", data);

      if (!data || data.length === 0) {
        console.warn("⚠️ Ni vprašanj!");
        prikaziNapako("V bazi ni vprašanj za izbrane teme.");
        return;
      }

      if (data.error) {
        console.error("❌ Napaka iz API:", data.error);
        prikaziNapako("Napaka: " + data.error);
        return;
      }

      trenutnaVprasanja = data;
      console.log("✅ Našel sem", trenutnaVprasanja.length, "vprašanj");

      document.getElementById("zacetni-zaslon").style.display = "none";
      document.getElementById("kviz-zaslon").style.display = "block";

      trenutniIndex = 0;
      odgovori = [];
      prikaziVprasanje();

    } catch (err) {
      console.error("❌ Caught exception:", err);
      prikaziNapako("Napaka pri povezavi: " + err.message);
    }
  });
}

// ==================== SAFE JSON PARSE HELPER ====================
function safeParseJson(value, defaultValue) {
  if (value === null || value === undefined) return defaultValue;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error("Napaka pri parseanju JSON:", e);
      return defaultValue;
    }
  }
  return defaultValue;
}

// ==================== GLAVNA FUNKCIJA ZA PRIKAZ VPRAŠANJA ====================
function prikaziVprasanje() {
  const v = trenutnaVprasanja[trenutniIndex];
  const tip = v.tip_vprasanja || 'multiple_choice';

  switch(tip) {
    case 'multiple_choice':
      prikaziMultipleChoice(v);
      break;
    case 'true_false':
      prikaziTrueFalse(v);
      break;
    case 'ordering':
      prikaziOrdering(v);
      break;
    case 'fill_text':
      prikaziFillText(v);
      break;
    case 'matching':
      prikaziMatching(v);
      break;
    case 'dropdown':
      prikaziDropdown(v);
      break;
    default:
      prikaziMultipleChoice(v);
  }
}

// ==================== MULTIPLE CHOICE ====================
function prikaziMultipleChoice(v) {
  const temaBar = `
<div style="background:#e8f4fd; border-left:4px solid #6d4aff; padding:10px 15px; margin-bottom:15px; border-radius:4px; font-size:0.9em;">
  📌 <strong>Tema:</strong> ${escapeHtml(v.tema || 'Neznano')}
</div>
`;
  const mapeCrk = [
    { uporabnik: "a", interni: "a", tekst: v.odgovor_a },
    { uporabnik: "b", interni: "b", tekst: v.odgovor_b },
    { uporabnik: "c", interni: "c", tekst: v.odgovor_c },
    { uporabnik: "č", interni: "d", tekst: v.odgovor_d }
  ];

  document.getElementById("vprasanje-prikaz").innerHTML = `
    <h3>Vprašanje ${trenutniIndex + 1} od ${trenutnaVprasanja.length}</h3>
    ${temaBar}
    <p>${escapeHtml(v.vprasanje)}</p>
    ${mapeCrk.map(m =>
      `<label><input type="radio" name="odgovor" value="${m.uporabnik}" data-interni="${m.interni}"> ${m.uporabnik}) ${escapeHtml(m.tekst)}</label>`
    ).join("")}
  `;
}

// ==================== TRUE/FALSE ====================
function prikaziTrueFalse(v) {
  const temaBar = `
<div style="background:#e8f4fd; border-left:4px solid #6d4aff; padding:10px 15px; margin-bottom:15px; border-radius:4px; font-size:0.9em;">
  📌 <strong>Tema:</strong> ${escapeHtml(v.tema || 'Neznano')}
</div>
`;
  document.getElementById("vprasanje-prikaz").innerHTML = `
    <h3>Vprašanje ${trenutniIndex + 1} od ${trenutnaVprasanja.length}</h3>
    ${temaBar}
    <p>${escapeHtml(v.vprasanje)}</p>
    <label><input type="radio" name="odgovor" value="drži" data-interni="true"> ✅ Drži</label><br>
    <label><input type="radio" name="odgovor" value="ne drži" data-interni="false"> ❌ Ne drži</label>
  `;
}

// ==================== ORDERING ====================
function prikaziOrdering(v) {
  const temaBar = `
<div style="background:#e8f4fd; border-left:4px solid #6d4aff; padding:10px 15px; margin-bottom:15px; border-radius:4px; font-size:0.9em;">
  📌 <strong>Tema:</strong> ${escapeHtml(v.tema || 'Neznano')}
</div>
`;
  let elementi = safeParseJson(v.json_data?.elements, []);
  
  if (elementi.length === 0) {
    console.warn("Ordering vprašanje brez elementov!", v);
    elementi = ["Napaka: Ni elementov"];
  }

  const navodilo = "⚠️ <strong>Opozorilo:</strong> 1 = najstarejši dogodek, 4 = najmlajši dogodek.<br>Povleci elemente v pravilen kronološki vrstni red.";

  let html = `
    <h3>Vprašanje ${trenutniIndex + 1} od ${trenutnaVprasanja.length}</h3>
    ${temaBar}
    <p>${escapeHtml(v.vprasanje)}</p>
    <div style="background:#fff3cd; border:1px solid #ffc107; padding:10px; margin:10px 0; border-radius:5px; font-size:0.9em;">${navodilo}</div>
    <div id="ordering-list" style="margin:15px 0;">
      ${elementi.map((el, idx) => 
        `<div class="ordering-item" draggable="true" data-original-index="${idx}" style="padding:12px; margin:8px 0; background:#fff; border-radius:6px; cursor:move; border:2px solid #ddd; font-weight:500;">
          <span style="color:#666; margin-right:10px;">${idx + 1}.</span> ${escapeHtml(el)}
        </div>`
      ).join("")}
    </div>
    <small style="color:#666;">💡 Klikni in povleci elemente, da jih preurediš.</small>
  `;
  document.getElementById("vprasanje-prikaz").innerHTML = html;
  initOrdering();
}

// ==================== FILL TEXT ====================
function prikaziFillText(v) {
  const temaBar = `
<div style="background:#e8f4fd; border-left:4px solid #6d4aff; padding:10px 15px; margin-bottom:15px; border-radius:4px; font-size:0.9em;">
  📌 <strong>Tema:</strong> ${escapeHtml(v.tema || 'Neznano')}
</div>
`;
  const warning = "⚠️ <strong>Pozor:</strong> Pazite na velike in male začetnice ter ne uporabljajte ločil (vejic, pik itd.).";

  document.getElementById("vprasanje-prikaz").innerHTML = `
    <h3>Vprašanje ${trenutniIndex + 1} od ${trenutnaVprasanja.length}</h3>
    ${temaBar}
    <p>${escapeHtml(v.vprasanje)}</p>
    <div style="background:#fff3cd; border:1px solid #ffc107; padding:10px; margin:10px 0; border-radius:5px; font-size:0.9em;">${warning}</div>
    <input type="text" id="fill-input" placeholder="Vpiši odgovor..." style="width:100%; padding:12px; font-size:16px; border:2px solid #6d4aff; border-radius:8px; margin-top:10px;"/>
  `;
}

// ==================== MATCHING ====================
function prikaziMatching(v) {
  const temaBar = `
<div style="background:#e8f4fd; border-left:4px solid #6d4aff; padding:10px 15px; margin-bottom:15px; border-radius:4px; font-size:0.9em;">
  📌 <strong>Tema:</strong> ${escapeHtml(v.tema || 'Neznano')}
</div>
`;
  let parovi = safeParseJson(v.json_data?.pairs, []);
  
  if (parovi.length === 0) {
    console.warn("Matching vprašanje brez parov!", v);
    parovi = [{left: "Napaka", right: "Ni parov"}];
  }
  
  const leftItems = parovi.map((p, i) => ({ text: p.left, id: i })).sort(() => Math.random() - 0.5);
  const rightItems = parovi.map((p, i) => ({ text: p.right, pairId: i })).sort(() => Math.random() - 0.5);

  let html = `
    <h3>Vprašanje ${trenutniIndex + 1} od ${trenutnaVprasanja.length}</h3>
    ${temaBar}
    <p>${escapeHtml(v.vprasanje)}</p>
    <div style="background:#fff3cd; border:1px solid #ffc107; padding:10px; margin:10px 0; border-radius:5px; font-size:0.9em;">⚠️ <strong>Opozorilo:</strong> Element na levi povežite s pripadajočim elementom na desni.</div>
    <div style="display:flex; justify-content:space-between; margin:20px 0; gap:20px;">
      <div id="matching-left" style="flex:1; padding:10px; background:#f9f9f9; border-radius:8px;"></div>
      <div id="matching-right" style="flex:1; padding:10px; background:#f9f9f9; border-radius:8px;"></div>
    </div>
  `;
  document.getElementById("vprasanje-prikaz").innerHTML = html;
  
  initMatching(leftItems, rightItems, parovi);
}

// ==================== DROPDOWN ====================
function prikaziDropdown(v) {
  const temaBar = `
<div style="background:#e8f4fd; border-left:4px solid #6d4aff; padding:10px 15px; margin-bottom:15px; border-radius:4px; font-size:0.9em;">
  📌 <strong>Tema:</strong> ${escapeHtml(v.tema || 'Neznano')}
</div>
`;
  let options = safeParseJson(v.json_data?.options, []);
  
  if (options.length === 0) {
    console.warn("Dropdown vprašanje brez opcij!", v);
    options = ["Napaka: Ni opcij"];
  }

  const placeholder = v.json_data?.placeholder_text || '';

  document.getElementById("vprasanje-prikaz").innerHTML = `
    <h3>Vprašanje ${trenutniIndex + 1} od ${trenutnaVprasanja.length}</h3>
    ${temaBar}
    <p>${escapeHtml(v.vprasanje)}</p>
    <select id="dropdown-select" style="width:100%; padding:12px; font-size:16px; border:2px solid #6d4aff; border-radius:8px; margin-top:10px;">
      <option value="">${escapeHtml(placeholder || 'Izberi odgovor...')}</option>
      ${options.map(opt => `<option value="${opt}">${escapeHtml(opt)}</option>`).join("")}
    </select>
  `;
}

// ==================== NAVIGACIJA MED VPRAŠANJI ====================
document.getElementById("naslednje-vprasanje").addEventListener("click", () => {
  const tip = trenutnaVprasanja[trenutniIndex].tip_vprasanja || 'multiple_choice';
  const pravilen = trenutnaVprasanja[trenutniIndex].pravilen_odgovor;
  let izbranOdgovor = null;

  switch(tip) {
    case 'multiple_choice':
      const izbranMC = document.querySelector('input[name="odgovor"]:checked');
      if (!izbranMC) {
        alert("Izberi odgovor!");
        return;
      }
      izbranOdgovor = izbranMC.getAttribute("data-interni");
      break;

    case 'true_false':
      const izbranTF = document.querySelector('input[name="odgovor"]:checked');
      if (!izbranTF) {
        alert("Izberi odgovor!");
        return;
      }
      izbranOdgovor = izbranTF.getAttribute("data-interni");
      break;

    case 'ordering':
      const orderingList = document.querySelectorAll('#ordering-list .ordering-item');

      if (orderingList.length === 0) {
        alert("Ni elementov za urejanje!");
        return;
      }

      izbranOdgovor = Array.from(orderingList)
        .map(el => el.getAttribute("data-original-index"))
        .join(',');

      break;

    case 'fill_text':
      const fillInput = document.getElementById('fill-input');
      if (!fillInput || !fillInput.value.trim()) {
        alert("Vpiši odgovor!");
        return;
      }
      izbranOdgovor = fillInput.value.trim();
      break;

    case 'matching':
      const matches = window.matchingAnswers || [];
      if (matches.length === 0) {
        alert("Povežite vse elemente!");
        return;
      }
      izbranOdgovor = matches.map(m => `${m.left}:${m.right}`).join(';');
      break;

    case 'dropdown':
      const dropdown = document.getElementById('dropdown-select');
      if (!dropdown || !dropdown.value) {
        alert("Izberi odgovor!");
        return;
      }
      izbranOdgovor = dropdown.value;
      break;
  }

  odgovori.push({
    vprasanje: trenutnaVprasanja[trenutniIndex],
    izbranOdgovor: izbranOdgovor,
    pravilenOdgovor: pravilen
  });

  trenutniIndex++;

  if (trenutniIndex >= trenutnaVprasanja.length) {
    prikaziRezultate();
  } else {
    prikaziVprasanje();
  }
});

// ==================== PRIKAZ REZULTATOV ====================
function prikaziRezultate() {
  document.getElementById("kviz-zaslon").style.display = "none";
  document.getElementById("rezultat-zaslon").style.display = "block";

  const napake = [];
  let pravilni = 0;

  odgovori.forEach(o => {
    const tip = o.vprasanje.tip_vprasanja || 'multiple_choice';
    let jePravilno = false;

    if (tip === 'multiple_choice') {
      jePravilno = o.izbranOdgovor === o.pravilenOdgovor;
    } else if (tip === 'true_false') {
      jePravilno = o.izbranOdgovor === o.pravilenOdgovor.toString();
    } else if (tip === 'ordering') {
      const mojRed = o.izbranOdgovor.split(',');
      const pravilenRed = o.pravilenOdgovor.split(',');
      jePravilno = JSON.stringify(mojRed) === JSON.stringify(pravilenRed);
    } else if (tip === 'fill_text') {
      jePravilno = o.izbranOdgovor.toLowerCase() === o.pravilenOdgovor.toLowerCase();
    } else if (tip === 'matching') {
      const mojeParje = o.izbranOdgovor ? o.izbranOdgovor.split(';').sort() : [];
      const pravilnoParje = o.pravilenOdgovor ? o.pravilenOdgovor.split(';').sort() : [];
      jePravilno = JSON.stringify(mojeParje) === JSON.stringify(pravilnoParje);
    } else if (tip === 'dropdown') {
      jePravilno = o.izbranOdgovor === o.pravilenOdgovor;
    }

    if (jePravilno) pravilni++;
    else napake.push(o);
  });

  document.getElementById("koncni-rezultat").textContent =
    `Pravilno si odgovoril/-a na ${pravilni} od ${odgovori.length} vprašanj.`;

  let html = "";

  if (napake.length > 0) {
    html += '<div class="napake-container">';
    html += napake.map(o => `
      <div style="border:1px solid red; padding:10px; margin:10px 0; background:#fff3f3;">
        <strong>${escapeHtml(o.vprasanje.vprasanje)}</strong>
        ${oblikujNapako(o)}
      </div>
    `).join("");
    html += '</div>';

    html += `
      <div style="background:#f0f8ff; border:2px dashed #6d4aff; padding:15px; margin:20px 0; text-align:center; border-radius:8px;">
        <p style="color:#666; margin:0;">
          📩 <strong>Ste našli napako v kvizu?</strong><br>
          Pišite nam na: <a href="mailto:thaw-pretzel-take@duck.com" style="color:#6d4aff; font-weight:bold;">thaw-pretzel-take@duck.com</a>
        </p>
      </div>
    `;
  } else {
    html += '<div style="background:#f0fff0; border:2px solid #4caf50; padding:15px; margin:20px 0; text-align:center; border-radius:8px;"><p>Vsi odgovori so bili pravilni! 🎉</p></div>';
  }

  html += `
    <div style="text-align:center; margin-top:25px;">
      <button onclick="location.reload()" style="background:#6d4aff; color:white; border:none; padding:12px 30px; font-size:16px; border-radius:8px; cursor:pointer;">
        🔄 Ponovi kviz
      </button>
    </div>
  `;

  document.getElementById("napake-prikaz").innerHTML = html;
}

// ==================== OBLIKUJ NAPAKO ====================
function oblikujNapako(o) {
  const tip = o.vprasanje.tip_vprasanja || 'multiple_choice';

  if (tip === 'multiple_choice') {
    const crke_do_polja = {
      a: "odgovor_a",
      b: "odgovor_b",
      c: "odgovor_c",
      č: "odgovor_d",
      d: "odgovor_d"
    };

    const polje_do_prikaza = {
      "odgovor_a": "a",
      "odgovor_b": "b",
      "odgovor_c": "c",
      "odgovor_d": "č"
    };

    const uporabniscePolje = crke_do_polja[o.izbranOdgovor];
    const pravilnoPolje = crke_do_polja[o.pravilenOdgovor];

    if (!uporabniscePolje || !pravilnoPolje) {
      console.error("Napaka pri mapingu:", { 
        izbran: o.izbranOdgovor, 
        pravilen: o.pravilenOdgovor,
        vprasanje: o.vprasanje 
      });
      return `Tvoj odgovor: ${o.izbranOdgovor}<br>Pravilen odgovor: ${o.pravilenOdgovor}`;
    }

    const tvojTekst = o.vprasanje[uporabniscePolje] || "ni definiran";
    const pravilenTekst = o.vprasanje[pravilnoPolje] || "ni definiran";

    const tvojPrikaz = polje_do_prikaza[uporabniscePolje];
    const pravilenPrikaz = polje_do_prikaza[pravilnoPolje];

    return `
      Tvoj odgovor: ${tvojPrikaz} — ${escapeHtml(tvojTekst)}<br>
      Pravilen odgovor: ${pravilenPrikaz} — ${escapeHtml(pravilenTekst)}
    `;
  } else if (tip === 'true_false') {
    return `
      Tvoj odgovor: ${o.izbranOdgovor === 'true' ? 'Drži ✅' : 'Ne drži ❌'}<br>
      Pravilen odgovor: ${o.pravilenOdgovor === 'true' ? 'Drži ✅' : 'Ne drži ❌'}
    `;
  } else if (tip === 'ordering') {
    const elementi = safeParseJson(o.vprasanje.json_data?.elements, ["?", "?", "?", "?"]);
    const mojRed = o.izbranOdgovor.split(',').map(x => elementi[x] || "?");
    const pravilenRed = o.pravilenOdgovor.split(',').map(x => elementi[x] || "?");
    return `
      Tvoj vrstni red: ${mojRed.map(x => escapeHtml(x)).join(' → ')}<br>
      Pravilen vrstni red: ${pravilenRed.map(x => escapeHtml(x)).join(' → ')}
    `;
  } else if (tip === 'fill_text') {
    return `
      Tvoj odgovor: <strong>${escapeHtml(o.izbranOdgovor)}</strong><br>
      Pravilen odgovor: <strong>${escapeHtml(o.pravilenOdgovor)}</strong>
    `;
  } else if (tip === 'matching') {
    const mojeParje = o.izbranOdgovor ? o.izbranOdgovor.split(';') : [];
    const pravilnoParje = o.pravilenOdgovor ? o.pravilenOdgovor.split(';') : [];
    return `
      Tvoje povezave: ${mojeParje.map(x => escapeHtml(x)).join(', ')}<br>
      Pravilne povezave: ${pravilnoParje.map(x => escapeHtml(x)).join(', ')}
    `;
  } else if (tip === 'dropdown') {
    return `
      Tvoj odgovor: <strong>${escapeHtml(o.izbranOdgovor)}</strong><br>
      Pravilen odgovor: <strong>${escapeHtml(o.pravilenOdgovor)}</strong>
    `;
  }
  return `Tvoj odgovor: ${o.izbranOdgovor}<br>Pravilen odgovor: ${o.pravilenOdgovor}`;
}

// ==================== ORDERING HELPER ====================
function initOrdering() {
  const items = document.querySelectorAll('#ordering-list .ordering-item');
  let draggedItem = null;

  items.forEach(item => {
    item.addEventListener('dragstart', () => {
      draggedItem = item;
      setTimeout(() => item.style.opacity = '0.5', 0);
    });

    item.addEventListener('dragend', () => {
      setTimeout(() => {
        item.style.opacity = '1';
        draggedItem = null;
        // updateOrderingIndices() - IZBRISANO!
      }, 0);
    });

    item.addEventListener('dragover', (e) => e.preventDefault());

    item.addEventListener('drop', () => {
      if (draggedItem !== item) {
        const items = Array.from(document.querySelectorAll('#ordering-list .ordering-item'));
        const draggedIdx = items.indexOf(draggedItem);
        const targetIdx = items.indexOf(item);

        if (draggedIdx < targetIdx) {
          item.parentNode.insertBefore(draggedItem, item.nextSibling);
        } else {
          item.parentNode.insertBefore(draggedItem, item);
        }
      }
    });
  });
}
// DODAJ NA KONCU app.js pred initMatching():

function prikaziNapako(opis) {
  document.getElementById("kviz-zaslon").style.display = "none";
  document.getElementById("rezultat-zaslon").style.display = "block";
  
  document.getElementById("koncni-rezultat").textContent = "Napaka pri nalaganju kviza";
  
  document.getElementById("napake-prikaz").innerHTML = `
    <div style="background:#fff3f3; border:2px solid #ff4444; padding:20px; margin:20px 0; border-radius:8px;">
      <strong>❌ Napaka:</strong> ${escapeHtml(opis)}<br><br>
      <small style="color:#666;">Preveri konzolo (F12) za več informacij.</small>
    </div>
    
    <div style="text-align:center; margin-top:25px;">
      <button onclick="location.reload()" style="background:#6d4aff; color:white; border:none; padding:12px 30px; font-size:16px; border-radius:8px; cursor:pointer;">
        🔄 Poskusi znova
      </button>
    </div>
  `;
}

// ==================== MATCHING HELPER ====================
function initMatching(leftItems, rightItems, parovi) {
  const colors = [
  "#3b82f6", // modra
  "#8b5cf6", // vijolična
  "#10b981", // zelena
  "#f97316", // oranžna
  "#ef4444", // rdeča
  "#06b6d4", // turkizna
  "#eab308", // rumena
];
  window.matchingAnswers = [];

  let selectedLeft = null;
  let pairCounter = 0;
  const matchedLeft = new Set();
  const matchedRight = new Set();

  document.getElementById('matching-left').innerHTML = leftItems.map(i =>
    `<div class="matching-item" data-id="${i.id}" style="padding:12px; margin:5px 0; background:#fff; border-radius:6px; cursor:pointer; border:2px solid #ddd;">${escapeHtml(i.text)}</div>`
  ).join("");

  document.getElementById('matching-right').innerHTML = rightItems.map(i =>
    `<div class="matching-item" data-pair-id="${i.pairId}" style="padding:12px; margin:5px 0; background:#fff; border-radius:6px; cursor:pointer; border:2px solid #ddd;">${escapeHtml(i.text)}</div>`
  ).join("");

  document.querySelectorAll('.matching-item[data-id]').forEach(item => {
    item.addEventListener('click', () => {
      if (matchedLeft.has(item)) {
        razdruziMatch(item, 'left');
        return;
      }

      if (selectedLeft) {
        selectedLeft.style.borderColor = '#ddd';
        selectedLeft.style.backgroundColor = '#fff';
      }

      selectedLeft = item;
      item.style.borderColor = '#6d4aff';
      item.style.backgroundColor = '#f0f0ff';
    });
  });

  document.querySelectorAll('.matching-item[data-pair-id]').forEach(rightItem => {
    rightItem.addEventListener('click', () => {
      if (!selectedLeft) return;

      if (matchedRight.has(rightItem)) {
        rightItem.style.borderColor = '#ff4444';
        setTimeout(() => {
          if (!matchedRight.has(rightItem)) {
            rightItem.style.borderColor = '#ddd';
          } else {
            rightItem.style.borderColor = '#4caf50';
          }
        }, 500);
        return;
      }

      const color = colors[pairCounter % colors.length];

      selectedLeft.style.backgroundColor = color + "22";
      selectedLeft.style.borderColor = color;
      selectedLeft.style.borderWidth = "3px";

      rightItem.style.backgroundColor = color + "22";
      rightItem.style.borderColor = color;
      rightItem.style.borderWidth = "3px";

      pairCounter++;

      window.matchingAnswers.push({
        left: selectedLeft.textContent.trim(),
        right: rightItem.textContent.trim()
      });

      matchedLeft.add(selectedLeft);
      matchedRight.add(rightItem);
      selectedLeft = null;
    });
  });

  function razdruziMatch(item, side) {
    const leftText = item.textContent.trim();
    const matchIndex = window.matchingAnswers.findIndex(m => 
      (side === 'left' && m.left === leftText) ||
      (side === 'right' && m.right === leftText)
    );

    if (matchIndex !== -1) {
      const match = window.matchingAnswers[matchIndex];

      const leftEl = Array.from(document.querySelectorAll('.matching-item[data-id]'))
        .find(el => el.textContent.trim() === match.left);
      const rightEl = Array.from(document.querySelectorAll('.matching-item[data-pair-id]'))
        .find(el => el.textContent.trim() === match.right);

      if (leftEl) {
        leftEl.style.borderColor = '#ddd';
        leftEl.style.backgroundColor = '#fff';
        matchedLeft.delete(leftEl);
      }
      if (rightEl) {
        rightEl.style.borderColor = '#ddd';
        rightEl.style.backgroundColor = '#fff';
        matchedRight.delete(rightEl);
      }

      window.matchingAnswers.splice(matchIndex, 1);
    }
  }
}
