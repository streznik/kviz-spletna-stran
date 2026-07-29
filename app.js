// ✅ BREZ / na koncu!
const WORKER_URL = "https://orange-cherry-7035.streznik.workers.dev";

console.log("✅ Skript se je naložil!");

let izbraneTeme = [];
let steviloVprasanj = 5;
let trenutnaVprasanja = [];
let trenutniIndex = 0;
let odgovori = [];

const startButton = document.getElementById("zacni-kviz");
console.log("🔘 Iskanje gumba:", startButton);

startButton.addEventListener("click", async () => {
  console.log("👆 Gumb kliknjen!");

  izbraneTeme = Array.from(document.querySelectorAll(".tema:checked")).map(cb => cb.value);
  console.log("📋 Izbrane teme:", izbraneTeme);

  if (izbraneTeme.length === 0) {
    alert("Izberi vsaj eno temo!");
    return;
  }

  steviloVprasanj = parseInt(document.getElementById("stevilo").value);
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
      alert("Napaka pri strežniku: " + response.status);
      return;
    }

    const data = await response.json();
    console.log("📊 Polen odgovor:", data);

    if (!data || data.length === 0) {
      alert("V bazi ni vprašanj za izbrane teme.");
      return;
    }

    trenutnaVprasanja = data;
    console.log("✅ Našel sem", trenutnaVprasanja.length, "vprašanj");

    // Preverimo tip prvega vprašanja (future-proof za druge tipe)
    const prviTip = trenutnaVprasanja[0].tip_vprasanja || 'multiple_choice';
    console.log("🧩 Tip vprašanj:", prviTip);

    document.getElementById("zacetni-zaslon").style.display = "none";
    document.getElementById("kviz-zaslon").style.display = "block";

    trenutniIndex = 0;
    odgovori = [];
    
    // Routing po tipu vprašanja
    prikaziVprasanje(prviTip);
    
  } catch (err) {
    console.error("❌ Caught exception:", err);
    alert("Napaka pri povezavi: " + err.message);
  }
});

function prikaziVprasanje(tip = 'multiple_choice') {
  const v = trenutnaVprasanja[trenutniIndex];
  
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
    case 'matching':
      prikaziMatching(v);
      break;
    default:
      prikaziMultipleChoice(v); // fallback
  }
}

// ✅ TUKAJ JE GLAVNA SPREMEMBA: a, b, c, Č namesto a, b, c, D
function prikaziMultipleChoice(v) {
  // Mape: uporabnik vidi → intern ID (da ne spremenimo Supabase podatkov)
  const mapeCrk = [
    { uporabnik: "a", interni: "a", tekst: v.odgovor_a },
    { uporabnik: "b", interni: "b", tekst: v.odgovor_b },
    { uporabnik: "c", interni: "c", tekst: v.odgovor_c },
    { uporabnik: "č", interni: "d", tekst: v.odgovor_d }  // ← TUKAJ JE KLJUČNA SPREMEMBA
  ];

  document.getElementById("vprasanje-prikaz").innerHTML = `
    <h3>Vprašanje ${trenutniIndex + 1} od ${trenutnaVprasanja.length}</h3>
    <p>${v.vprasanje}</p>
    ${mapeCrk.map(m =>
      `<label><input type="radio" name="odgovor" value="${m.uporabnik}" data-interni="${m.interni}"> ${m.uporabnik}) ${m.tekst}</label>`
    ).join("")}
  `;
}

function prikaziTrueFalse(v) {
  document.getElementById("vprasanje-prikaz").innerHTML = `
    <h3>Vprašanje ${trenutniIndex + 1} od ${trenutnaVprasanja.length}</h3>
    <p>${v.vprasanje}</p>
    <label><input type="radio" name="odgovor" value="drži" data-interni="true"> Drži</label><br>
    <label><input type="radio" name="odgovor" value="ne drži" data-interni="false"> Ne drži</label>
  `;
}

function prikaziOrdering(v) {
  const elementi = JSON.parse(v.ordering_elements || '[]');
  let html = `
    <h3>Vprašanje ${trenutniIndex + 1} od ${trenutnaVprasanja.length}</h3>
    <p>${v.vprasanje}</p>
    <p style="font-size:0.9em; color:#666;">Pritisni na elemente, da jih preurediš:</p>
    <div id="ordering-list" style="margin:15px 0;">
      ${elementi.map((el, idx) => 
        `<div class="ordering-item" draggable="true" data-index="${idx}" style="padding:10px; margin:5px 0; background:#fff; border-radius:5px; cursor:move; border:1px solid #ddd;">${el}</div>`
      ).join("")}
    </div>
    <small>Premakni elemente v želen vrstni red.</small>
  `;
  document.getElementById("vprasanje-prikaz").innerHTML = html;
  initOrdering();
}

function prikaziMatching(v) {
  const parovi = JSON.parse(v.matching_pairs || '[]');
  let html = `
    <h3>Vprašanje ${trenutniIndex + 1} od ${trenutnaVprasanja.length}</h3>
    <p>${v.vprasanje}</p>
    <div style="display:flex; justify-content:space-between; margin:15px 0;">
      <div id="matching-left" style="flex:1;"></div>
      <div id="matching-right" style="flex:1;"></div>
    </div>
  `;
  document.getElementById("vprasanje-prikaz").innerHTML = html;
  initMatching(parovi);
}

document.getElementById("naslednje-vprasanje").addEventListener("click", () => {
  // Preveri tip trenutnega vprašanja
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
      izbranOdgovor = izbranMC.getAttribute("data-interni"); // ← Uporabimo interni ID
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
      izbranOdgovor = Array.from(orderingList).map(el => el.getAttribute("data-original-index")).join(',');
      break;
      
    case 'matching':
      const matches = document.querySelectorAll('.matching-match[data-matched="true"]');
      izbranOdgovor = Array.from(matches).map(m => `${m.dataset.left}:${m.dataset.right}`).join(';');
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
    prikaziVprasanje(tip);
  }
});

function prikaziRezultate() {
  document.getElementById("kviz-zaslon").style.display = "none";
  document.getElementById("rezultat-zaslon").style.display = "block";

  // Podpora za več tipov vprašanj
  const napake = [];
  let pravilni = 0;

  odgovori.forEach(o => {
    const tip = o.vprasanje.tip_vprasanja || 'multiple_choice';
    let jePravilno = false;

    switch(tip) {
      case 'multiple_choice':
        jePravilno = o.izbranOdgovor === o.pravilenOdgovor;
        if (jePravilno) pravilni++;
        else napake.push(o);
        break;
        
      case 'true_false':
        jePravilno = o.izbranOdgovor === o.pravilenOdgovor.toString();
        if (jePravilno) pravilni++;
        else napake.push(o);
        break;
        
      case 'ordering':
        // Primerjava zaporedij
        const mojRed = o.izbranOdgovor.split(',');
        const pravilenRed = o.pravilenOdgovor.split(',');
        jePravilno = JSON.stringify(mojRed) === JSON.stringify(pravilenRed);
        if (jePravilno) pravilni++;
        else napake.push(o);
        break;
        
      case 'matching':
        const mojeParje = o.izbranOdgovor ? o.izbranOdgovor.split(';').sort() : [];
        const pravilnoParje = o.pravilenOdgovor ? o.pravilenOdgovor.split(';').sort() : [];
        jePravilno = JSON.stringify(mojeParje) === JSON.stringify(pravilnoParje);
        if (jePravilno) pravilni++;
        else napake.push(o);
        break;
    }
  });

  document.getElementById("koncni-rezultat").textContent =
    `Pravilno si odgovoril/a na ${pravilni} od ${odgovori.length} vprašanj.`;

  const crke_za_prikaz = { a: "odgovor_a", b: "odgovor_b", c: "odgovor_c", d: "odgovor_d" };
  const chrk_za_prikaz = { a: "a", b: "b", c: "c", d: "č" };

  document.getElementById("napake-prikaz").innerHTML = napake.map(o => `
    <div style="border:1px solid red; padding:10px; margin:10px 0;">
      <strong>${o.vprasanje.vprasanje}</strong><br>
      ${oblikujNapako(o)}
    </div>
  `).join("") || "<p>Vsi odgovori so bili pravilni! 🎉</p>";
}

function oblikujNapako(o) {
  const tip = o.vprasanje.tip_vprasanja || 'multiple_choice';
  
  if (tip === 'multiple_choice') {
    const crke_za_prikaz = { a: "a", b: "b", c: "c", d: "č" };
    return `
      Tvoj odgovor: ${chrk_za_prikaz[o.izbranOdgovor]} — ${o.vprasanje[crk_za_prikaz[o.izbranOdgovor]]}<br>
      Pravilen odgovor: ${chrk_za_prikaz[o.pravilenOdgovor]} — ${o.vprasanje[crk_za_prikaz[o.pravilenOdgovor]]}
    `;
  } else if (tip === 'true_false') {
    return `
      Tvoj odgovor: ${o.izbranOdgovor === 'true' ? 'Drži' : 'Ne drží'}<br>
      Pravilen odgovor: ${o.pravilenOdgovor === 'true' ? 'Drži' : 'Ne drží'}
    `;
  }
  return `Tvoj odgovor: ${o.izbranOdgovor}<br>Pravilen odgovor: ${o.pravilenOdgovor}`;
}

// Ordering helper (drag & drop)
function initOrdering() {
  const items = document.querySelectorAll('#ordering-list .ordering-item');
  let draggedItem = null;

  items.forEach(item => {
    item.setAttribute('data-original-index', Array.from(items).indexOf(item));
    
    item.addEventListener('dragstart', () => {
      draggedItem = item;
      setTimeout(() => item.style.opacity = '0.5', 0);
    });
    
    item.addEventListener('dragend', () => {
      setTimeout(() => {
        item.style.opacity = '1';
        draggedItem = null;
        updateOrderingIndices();
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

function updateOrderingIndices() {
  const items = document.querySelectorAll('#ordering-list .ordering-item');
  items.forEach((item, idx) => {
    item.setAttribute('data-new-index', idx);
  });
}

// Matching helper
function initMatching(parovi) {
  const leftItems = parovi.map((p, i) => ({ text: p.left, id: i })).sort(() => Math.random() - 0.5);
  const rightItems = parovi.map((p, i) => ({ text: p.right, pairId: i })).sort(() => Math.random() - 0.5);

  document.getElementById('matching-left').innerHTML = leftItems.map(i => 
    `<div class="matching-item" data-id="${i.id}" style="padding:10px; margin:5px 0; background:#f0f0f0; border-radius:5px;">${i.text}</div>`
  ).join("");
  
  document.getElementById('matching-right').innerHTML = rightItems.map(i => 
    `<div class="matching-item" data-pair-id="${i.pairId}" style="padding:10px; margin:5px 0; background:#f0f0f0; border-radius:5px;">${i.text}</div>`
  ).join("");
  
  setupMatchingEvents();
}

function setupMatchingEvents() {
  let selectedLeft = null;
  const matches = {};

  document.querySelectorAll('.matching-item[data-id]').forEach(item => {
    item.addEventListener('click', () => {
      if (selectedLeft) {
        selectedLeft.style.backgroundColor = '#f0f0f0';
      }
      selectedLeft = item;
      item.style.backgroundColor = '#6d4aff';
    });
  });

  document.querySelectorAll('.matching-item[data-pair-id]').forEach(rightItem => {
    rightItem.addEventListener('click', () => {
      if (selectedLeft && rightItem.dataset.pairId === selectedLeft.dataset.id) {
        selectedLeft.style.backgroundColor = '#4caf50';
        rightItem.style.backgroundColor = '#4caf50';
        rightItem.setAttribute('data-matched', 'true');
        rightItem.classList.add('matched');
        selectedLeft = null;
      } else {
        selectedLeft.style.backgroundColor = '#f0f0f0';
        selectedLeft = null;
      }
    });
  });
}
