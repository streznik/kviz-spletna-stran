// ✅ Nova povezava — kličemo Worker, ne Supabase!
const WORKER_URL = "https://orange-cherry-7035.streznik.workers.dev";

console.log("✅ Skript se je naložil!");

// Globalne spremenljivke
let izbraneTeme = [];
let steviloVprasanj = 5;
let trenutnaVprasanja = [];
let trenutniIndex = 0;
let odgovori = [];

// Ko uporabnik klikne "Začni kviz"
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

  // Kliči Worker (ne Supabase!)
  const temeParam = izbraneTeme.join(",");
  const response = await fetch(
    `${WORKER_URL}?teme=${encodeURIComponent(temeParam)}&stevilo=${steviloVprasanj}`
  );

  if (!response.ok) {
    console.error("❌ Napaka:", response.status);
    alert("Napaka pri povezavi s strežnikom.");
    return;
  }

  const data = await response.json();

  console.log("📊 Rezultat:", data);

  if (!data || data.length === 0) {
    alert("V bazi ni vprašanj za izbrane teme.");
    return;
  }

  // Worker je že premešal in omejil število
  trenutnaVprasanja = data;

  console.log("✅ Našel sem", trenutnaVprasanja.length, "vprašanj");

  // Preklopi na zaslon za kviz
  document.getElementById("zacetni-zaslon").style.display = "none";
  document.getElementById("kviz-zaslon").style.display = "block";

  trenutniIndex = 0;
  odgovori = [];
  prikaziVprasanje();
});
