// Povezava s Supabase
const SUPABASE_URL = "https://cclrcudyegousjpllgjx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbHJjdWR5ZWdvdXNqcGxsZ2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDg0NzIsImV4cCI6MjA5OTY4NDQ3Mn0.SuHoj3lf0Sj2l0sDLYHd3A4PCPEGmmkkjxe3W6bAAiA";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("✅ Skripta se je naložila!");
console.log("Supabase client:", supabaseClient ? "OK" : "NI OK");

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

  console.log("🌐 Povezava s Supabase...");

  const { data, error } = await supabaseClient
    .from("Vprasanja")
    .select("*")
    .in("tema", izbraneTeme);

  console.log("📊 Rezultat baze:", data);
  console.log("❌ Napaka:", error);

  if (error) {
    console.error("Napaka pri pridobivanju vprašanj:", error);
    alert("Napaka pri povezavi: " + error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.warn("⚠️ Baza vrnila prazen rezultat!");
    alert("V bazi ni vprašanj za izbrane teme.");
    return;
  }

  const premesana = data.sort(() => Math.random() - 0.5);
  trenutnaVprasanja = premesana.slice(0, steviloVprasanj);

  console.log("✅ Našla sem", trenutnaVprasanja.length, "vprašanj");

  document.getElementById("zacetni-zaslon").style.display = "none";
  document.getElementById("kviz-zaslon").style.display = "block";

  trenutniIndex = 0;
  odgovori = [];
  prikaziVprasanje();
});

function prikaziVprasanje() {
  const v = trenutnaVprasanja[trenutniIndex];
  const mozniOdgovori = [
    { crka: "a", tekst: v.odgovor_a },
    { crka: "b", tekst: v.odgovor_b },
    { crka: "c", tekst: v.odgovor_c },
    { crka: "d", tekst: v.odgovor_d }  // ✅ Popravljeno: "d" namesto "č"
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
