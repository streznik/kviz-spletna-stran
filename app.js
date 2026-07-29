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

    document.getElementById("zacetni-zaslon").style.display = "none";
    document.getElementById("kviz-zaslon").style.display = "block";

    trenutniIndex = 0;
    odgovori = [];
    prikaziVprasanje();

  } catch (err) {
    console.error("❌ Caught exception:", err);
    alert("Napaka pri povezavi: " + err.message);
  }
});

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
    default:
      prikaziMultipleChoice(v);
  }
}

function prikaziMultipleChoice(v) {
  const mapeCrk = [
    { uporabnik: "a", interni: "a", tekst: v.odgovor_a },
    { uporabnik: "b", interni: "b", tekst: v.odgovor_b },
    { uporabnik: "c", interni: "c", tekst: v.odgovor_c },
    { uporabnik: "č", interni: "d", tekst: v.odgovor_d }
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
      izbranOdgovor = Array.from(orderingList).map(el => el.getAttribute("data-original-index")).join(',');
      break;

    case 'matching':
      const matches = document.querySelectorAll('.matching-item[data-matched="true"]');
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
    prikaziVprasanje();
  }
});

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
      if (jePravilno) pravilni++;
      else napake.push(o);
    } else if (tip === 'true_false') {
      jePravilno = o.izbranOdgovor === o.pravilenOdgovor.toString();
      if (jePravilno) pravilni++;
      else napake.push(o);
    }
  });

  document.getElementById("koncni-rezultat").textContent =
    `Pravilno si odgovoril/a na ${pravilni} od ${odgovori.length} vprašanj.`;

  // Zgradimo vsebino za napake-prikaz
  let html = "";

  if (napake.length > 0) {
    html += '<div class="napake-container">';
    html += napake.map(o => `
      <div style="border:1px solid red; padding:10px; margin:10px 0; background:#fff3f3;">
        <strong>${o.vprasanje.vprasanje}</strong><br>
        ${oblikujNapako(o)}
      </div>
    `).join("");
    html += '</div>';

    // Email sporočilo za prijavo napak
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

  // ← Gumb za ponovitev VEDNO (ne glede na to, ali so bile napake)
  html += `
    <div style="text-align:center; margin-top:25px;">
      <button onclick="location.reload()" style="background:#6d4aff; color:white; border:none; padding:12px 30px; font-size:16px; border-radius:8px; cursor:pointer;">
        🔄 Ponovi kviz
      </button>
    </div>
  `;

  document.getElementById("napake-prikaz").innerHTML = html;
}

function oblikujNapako(o) {
  // MAPA: uporabniška vrednost → ime polja v bazi
  const crke_do_polja = {
    a: "odgovor_a",
    b: "odgovor_b",
    c: "odgovor_c",
    č: "odgovor_d"  // ← KLJUČNO: "č" maps to "odgovor_d"!
  };

  // MAPA: polje v bazi → uporabniški prikaz
  const polje_do_prikaza = {
    "odgovor_a": "a",
    "odgovor_b": "b",
    "odgovor_c": "c",
    "odgovor_d": "č"  // ← "č" namesto "d"
  };

  const uporabniscePolje = crke_do_polja[o.izbranOdgovor];
  const pravilnoPolje = crke_do_polja[o.pravilenOdgovor];

  // Preveri če sta polja definirana
  if (!uporabniscePolje || !pravilnoPolje) {
    console.error("Napaka pri mapingu:", { izbran: o.izbranOdgovor, pravilen: o.pravilenOdgovor });
    return `Tvoj odgovor: ${o.izbranOdgovor}<br>Pravilen odgovor: ${o.pravilenOdgovor}`;
  }

  const tvojTekst = o.vprasanje[uporabniscePolje] || "ni definiran";
  const pravilenTekst = o.vprasanje[pravilnoPolje] || "ni definiran";

  const tvojPrikaz = polje_do_prikaza[uporabniscePolje];
  const pravilenPrikaz = polje_do_prikaza[pravilnoPolje];

  return `
    Tvoj odgovor: ${tvojPrikaz} — ${tvojTekst}<br>
    Pravilen odgovor: ${pravilenPrikaz} — ${pravilenTekst}
  `;
}
