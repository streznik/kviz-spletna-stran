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
  const mozniOdgovori = [
    { crka: "a", tekst: v.odgovor_a },
    { crka: "b", tekst: v.odgovor_b },
    { crka: "c", tekst: v.odgovor_c },
    { crka: "d", tekst: v.odgovor_d }
  ];

  document.getElementById("vprasanje-prikaz").innerHTML = `
    <h3>Vprašanje ${trenutniIndex + 1} od ${trenutnaVprasanja.length}</h3>
    <p>${v.vprasanje}</p>
    ${mozniOdgovori.map(m =>
      `<label><input type="radio" name="odgovor" value="${m.crka}"> ${m.tekst}</label>`
    ).join("")}
  `;
}

document.getElementById("naslednje-vprasanje").addEventListener("click", () => {
  const izbran = document.querySelector('input[name="odgovor"]:checked');
  if (!izbran) {
    alert("Izberi odgovor!");
    return;
  }

  const pravilen = trenutnaVprasanja[trenutniIndex].pravilen_odgovor;
  odgovori.push({
    vprasanje: trenutnaVprasanja[trenutniIndex],
    izbranOdgovor: izbran.value,
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

  const pravilni = odgovori.filter(o => o.izbranOdgovor === o.pravilenOdgovor).length;

  document.getElementById("koncni-rezultat").textContent =
    `Pravilno si odgovoril/a na ${pravilni} od ${odgovori.length} vprašanj.`;

  const napake = odgovori.filter(o => o.izbranOdgovor !== o.pravilenOdgovor);
  const crke = { a: "odgovor_a", b: "odgovor_b", c: "odgovor_c", d: "odgovor_d" };

  document.getElementById("napake-prikaz").innerHTML = napake.map(o => `
    <div style="border:1px solid red; padding:10px; margin:10px 0;">
      <strong>${o.vprasanje.vprasanje}</strong><br>
      Tvoj odgovor: ${o.vprasanje[crke[o.izbranOdgovor]]}<br>
      Pravilen odgovor: ${o.vprasanje[crke[o.pravilenOdgovor]]}
    </div>
  `).join("") || "<p>Vsi odgovori so bili pravilni! 🎉</p>";
}
