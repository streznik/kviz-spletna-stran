// Povezava s Supabase - OPOMBA: URL BREZ /rest/v1/!
const SUPABASE_URL = "https://cclrcudyegousjpllgjx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbHJjdWR5ZWdvdXNqcGxsZ2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDg0NzIsImV4cCI6MjA5OTY4NDQ3Mn0.SuHoj3lf0Sj2l0sDLYHd3A4PCPEGmmkkjxe3W6bAAiA";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("✅ Skript se je naložil!"); // Debug

// Globalne spremenljivke
let izbraneTeme = [];
let steviloVprasanj = 5;
let trenutnaVprasanja = [];
let trenutniIndex = 0;
let odgovori = [];

// Ko uporabnik klikne "Začni kviz"
const startButton = document.getElementById("zacni-kviz");
console.log("🔘 Iskanje gumba:", startButton); // Debug

startButton.addEventListener("click", async () => {
  console.log("👆 Gumb kliknjen!"); // Debug
  
  // Pridobi izbrane teme
  izbraneTeme = Array.from(document.querySelectorAll(".tema:checked"))
    .map(cb => cb.value);

  console.log("📋 Izbrane teme:", izbraneTeme); // Debug

  if (izbraneTeme.length === 0) {
    alert("Izberi vsaj eno temo!");
    return;
  }

  steviloVprasanj = parseInt(document.getElementById("stevilo").value);
  console.log("🔢 Število vprašanj:", steviloVprasanj); // Debug

  // Pridobi vprašanja iz baze
  console.log("🌐 Povezava s Supabase..."); // Debug

  const { data, error } = await supabaseClient
    .from("Vprasanja")  // Ali "vprasanja"? Preveri ime tabele!
    .select("*")
    .in("tema", izbraneTeme);

  console.log("📊 Rezultat baze:", data); // Debug
  console.log("❌ Napaka:", error); // Debug

  if (error) {
    console.error("Napaka pri pridobivanju vprašanj:", error);
    alert("Napaka pri povezavi: " + error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.warn("⚠️ Baza vrnila prazen rezultat!"); // Debug
    alert("V bazi ni vprašanj za izbrane teme.");
    return;
  }

  // Naključno premešaj vprašanja in vzemi željeno število
  const premesana = data.sort(() => Math.random() - 0.5);
  trenutnaVprasanja = premesana.slice(0, steviloVprasanj);

  console.log("✅ Našla sem", trenutnaVprasanja.length, "vprašanj"); // Debug

  // Preklopi na zaslon za kviz
  document.getElementById("pocetni-zaslon").style.display = "none";
  document.getElementById("kviz-zaslon").style.display = "block";

  trenutniIndex = 0;
  odgovori = [];
  prikaziVprasanje();
});
