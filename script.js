// Tavo Firebase konfigūracija (palik kaip yra)
const firebaseConfig = {
    apiKey: "AIzaSyDSEUQ_J3TUbw0EvxNRm8jW7lE82CpxNb8",
    authDomain: "tasku-130d8.firebaseapp.com",
    databaseURL: "https://tasku-130d8-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tasku-130d8",
    storageBucket: "tasku-130d8.appspot.com",
    messagingSenderId: "861286931659",
    appId: "1:861286931659:web:c899e1fcf782aba4514f4e",
    measurementId: "G-W9XSC0SJVJ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let taskaiRef; 
let viewRef1, viewRef2; // Nuorodos stebėjimui
let istorijaPath;
let manoRolė = ""; // "vyras" arba "moteris" (arba user1/user2)
let pendingRole = null; // Laikinas kintamasis pasirinkimui
let prevUser1Points = null, prevUser2Points = null; // Kintamieji pranešimų sekimui

const PIN_CODES = {
    "user1": "1111", // Kajaus PIN kodas
    "user2": "2222"  // Akvilės PIN kodas
};

window.addEventListener("load", () => {
    // Išvaizdos krovimas (senas kodas)
    // Išvaizdos krovimas ir valdymas
    const savedTexture = localStorage.getItem("pasirinktaTekstura");
    const textureSelect = document.getElementById("Textura");

    if (textureSelect) {
        if (savedTexture) textureSelect.value = savedTexture;
        // Klausome pakeitimų, kad iškart keistųsi spalva
        textureSelect.addEventListener("change", function() {
            taikytiTekstura(this.value);
        });
    }

    if (savedTexture) {
        document.querySelectorAll("button:not(#nustatymaiBtn)").forEach(btn => btn.classList.add(savedTexture));
        if (document.getElementById("textureSelect")) document.getElementById("textureSelect").value = savedTexture;
        taikytiTekstura(savedTexture);
    }

    // Patikriname, ar vartotojas jau pasirinko rolę
    const issaugotaRole = localStorage.getItem("manoRole");
    if (issaugotaRole) {
        pasirinktiVartotoja(issaugotaRole, true);
    } else {
        // Jei nepasirinko, vis tiek rodome taškus (tik žiūrėjimo režimas)
        nustatytiKambari();
    }

    // Atstatome datos skaičiuoklės būseną (perkelta iš apačios)
    const issaugotaData = localStorage.getItem('saugykla_data');
    const issaugotasRezultatas = localStorage.getItem('saugykla_rezultatas');
    const busena = localStorage.getItem('datos_formos_busena');

    if (issaugotaData && issaugotasRezultatas) {
        rodytiRezultaLenteleje(issaugotaData, issaugotasRezultatas);
    }
    if (busena === 'paslepta') {
        const dv = document.getElementById('datosValdykliai');
        const ab = document.getElementById('atstatymoBlokas');
        if (dv) dv.style.display = "none";
        if (ab) ab.style.display = "block";
    }

    // Leidžiame patvirtinti PIN kodą paspaudus ENTER
    const otpInput = document.getElementById("otpInput");
    if (otpInput) {
        otpInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                patvirtintiOTP();
            }
        });
    }
});

function pasirinktiVartotoja(role, isLoad = false) {
    if (isLoad) {
        // Jei kraunama iš atminties (refresh), kodo nereikia
        uzbaigtiPasirinkima(role, true);
        return;
    }
    
    // Atidarome PIN kodo langą
    pendingRole = role;
    const modal = document.getElementById("otpModal");
    const input = document.getElementById("otpInput");
    if (modal && input) {
        modal.style.display = "flex";
        input.value = "";
        input.focus();
    }
}

function uzdarytiOTP() {
    document.getElementById("otpModal").style.display = "none";
    pendingRole = null;
}

function patvirtintiOTP() {
    const input = document.getElementById("otpInput");
    if (PIN_CODES[pendingRole] && input.value === PIN_CODES[pendingRole]) {
        uzbaigtiPasirinkima(pendingRole);
        uzdarytiOTP();
    } else {
        alert("Neteisingas PIN kodas!");
        input.value = "";
    }
}

function uzbaigtiPasirinkima(role, isLoad = false) {
    manoRolė = role;
    localStorage.setItem("manoRole", role);
    
    const statusas = document.getElementById("kambarioStatusas");
    statusas.textContent = "Jūs esate: " + (role === "user1" ? "Kajus" : "Akvilė");
    document.getElementById("kambarioStatusas").style.color = "green";

    // Atnaujiname nustatymus, kad veiktų mygtukai
    nustatytiKambari();

    if (!isLoad) {
        rodytZinute("Pasirinkta: " + (role === "user1" ? "Kajus" : "Akvilė"), "green");
        rodytiArbaPasleptiNustatymus(); // Uždaro nustatymų langą po sėkmingo prisijungimo

        // Paprašome leidimo rodyti pranešimus (notifications)
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }
}

function nustatytiKambari() {
    const kodas = "pagrindinis"; // Fiksuotas kelias visiems

    // Svarbu: atjungiame seną klausytoją, jei keičiamas kambarys
    if (viewRef1) viewRef1.off();
    if (viewRef2) viewRef2.off();
    
    // Nunuliname buvusias reikšmes, kad perkrovus puslapį nemestų pranešimo iškart
    prevUser1Points = null;
    prevUser2Points = null;

    // 1. Stebime User 1 taškus
    viewRef1 = db.ref(`kambariai/${kodas}/taskai_user1`);
    viewRef1.on("value", (snapshot) => {
        const value = snapshot.val();
        const el = document.getElementById("taskai_user1");
        
        // Tikriname ar pasikeitė nuo paskutinio karto (ir tai ne pirmas užkrovimas)
        if (prevUser1Points !== null && prevUser1Points !== value) {
            siustiPranesima("Kajaus taškai pasikeitė!", `Naujas kiekis: ${value}`);
        }
        prevUser1Points = value;
        
        if (el) el.textContent = value !== null ? value : 0;
    });

    // 2. Stebime User 2 taškus
    viewRef2 = db.ref(`kambariai/${kodas}/taskai_user2`);
    viewRef2.on("value", (snapshot) => {
        const value = snapshot.val();
        const el = document.getElementById("taskai_user2");
        
        if (prevUser2Points !== null && prevUser2Points !== value) {
            siustiPranesima("Akvilės taškai pasikeitė!", `Naujas kiekis: ${value}`);
        }
        prevUser2Points = value;
        
        if (el) el.textContent = value !== null ? value : 0;
    });

    // 3. Nustatome veiksmų taikinį: user1 valdo user2 taškus, user2 valdo user1
    if (manoRolė) {
        const targetUser = (manoRolė === "user1") ? "user2" : "user1";
        taskaiRef = db.ref(`kambariai/${kodas}/taskai_${targetUser}`);
        istorijaPath = `kambariai/${kodas}/istorija_${targetUser}`;
    } else {
        taskaiRef = null; // Jei rolė nepasirinkta, negalima keisti taškų
    }
}



function keistiTaskus(kiekis) {
    if (!taskaiRef) {
        alert("Pirmiausia pasirinkite kas esate nustatymuose!");
        return;
    }
    taskaiRef.transaction((dabartiniai) => {
        const nauji = (dabartiniai || 0) + kiekis;
        if (nauji < -10) return; // Nutraukiame transakciją, jei per mažai taškų
        return nauji;
    }, (error, committed, snapshot) => {
        if (error) {
            console.error("Klaida keičiant taškus:", error);
            rodytZinute("Klaida: " + (error.code || error.message), "red");
        } else if (!committed) {
            rodytZinute("Negalima mažiau nei –10!", "orange");
        } else {
            const nauji = snapshot.val();
            const istorijaRef = db.ref(istorijaPath);
            istorijaRef.push({
                pokytis: kiekis,
                naujaReiksme: nauji,
                laikas: new Date().toLocaleString(),
                vartotojas: manoRolė || "Nežinomas"
            });
            rodytZinute((kiekis > 0 ? "+" : "") + kiekis + " taškai", kiekis > 0 ? "green" : "red");
        }
    });
}
console.log(manoRolė);
// ... palik likusias funkcijas (rodytiIstorija, rodytZinute ir t.t.) kaip savo originale

  // Rodo istoriją
  function rodytiIstorija() {
    // Apsauga, jei rolė nepasirinkta
    if (!istorijaPath) {
        document.getElementById("istorija").textContent = "Pasirinkite rolę, kad matytumėte istoriją.";
        return;
    }
    const istorijaRef = db.ref(istorijaPath);
    // Gauname paskutinius 5 įrašus
    istorijaRef.limitToLast(5).once("value", (snapshot) => {
      const data = snapshot.val();
      const istorijaDiv = document.getElementById("istorija");
      istorijaDiv.innerHTML = "";
      if (data) {
        const vardai = { "user1": "Kajus", "user2": "Akvilė" };
        // Apverčiame, kad naujausi įrašai būtų viršuje
        Object.values(data).reverse().forEach(entry => {
          const p = document.createElement("p");
          const vardas = vardai[entry.vartotojas] || entry.vartotojas; // Naudojame vardą vietoj rolės
          const kas = vardas ? ` [${vardas}]` : "";
          p.textContent = `${entry.laikas}${kas}: ${entry.pokytis > 0 ? "+" : ""}${entry.pokytis} (viso: ${entry.naujaReiksme})`;
          istorijaDiv.appendChild(p);
        });
      } else {
        istorijaDiv.textContent = "Istorija tuščia.";
      }
    });
  }



  // Žinutės rodymas
  function rodytZinute(text, color) {
    const zinute = document.getElementById("zinute");
    zinute.textContent = text;
    zinute.style.color = color;
    zinute.style.opacity = 1;
    setTimeout(() => { zinute.style.opacity = 0; }, 1500);
  }

  // Sekcijų perjungimai
  function uzdarytiKitasSekcijas(isskyrusId) {
    const sekcijos = ["istorijaSekcija", "parduotuveSekcija", "kainorastis", "atimti"];
    sekcijos.forEach(id => {
      if (id !== isskyrusId) {
        document.getElementById(id).classList.remove("aktyvus");
      }
    });
  }

  function rodytiArbaPasleptiIstorija() {
    uzdarytiKitasSekcijas("istorijaSekcija");
    const sekcija = document.getElementById("istorijaSekcija");
    sekcija.classList.toggle("aktyvus");
    if (sekcija.classList.contains("aktyvus")) {
      rodytiIstorija();
    }
  }

  function rodytiArbaPasleptiNustatymus() {
    const sekcija = document.getElementById("nustatymaiSekcija");
    sekcija.classList.toggle("aktyvus");
  }

  function rodytiArbaPasleptiParduotuve() {
    uzdarytiKitasSekcijas("parduotuveSekcija");
    const sekcija = document.getElementById("parduotuveSekcija");
    sekcija.classList.toggle("aktyvus");
  }

  function rodytiArbaPasleptiKainorasti() {
    uzdarytiKitasSekcijas("kainorastis");
    const sekcija = document.getElementById("kainorastis");
    sekcija.classList.toggle("aktyvus");
  }

  function rodytiArbaPasleptiminusus() {
    uzdarytiKitasSekcijas("atimti");
    const sekcija = document.getElementById("atimti");
    sekcija.classList.toggle("aktyvus");
  }

  // Pirkimo funkcija
  function pirkti(kaina) {
    if (!manoRolė) {
        alert("Pirmiausia pasirinkite kas esate nustatymuose!");
        return;
    }
    
    const kodas = "pagrindinis";
    const myPointsRef = db.ref(`kambariai/${kodas}/taskai_${manoRolė}`);
    const myHistoryPath = `kambariai/${kodas}/istorija_${manoRolė}`;

    myPointsRef.transaction((dabartiniai) => {
      const turimi = dabartiniai || 0;
      if (turimi >= kaina) {
        return turimi - kaina;
      }
      return; // Atšaukiame, jei nepakanka
    }, (error, committed, snapshot) => {
      if (error) {
        console.error("Klaida perkant:", error);
        rodytZinute("Klaida tikrinant taškus!", "red");
      } else if (!committed) {
        rodytZinute("Nepakanka taškų!", "orange");
      } else {
        const nauji = snapshot.val();
        db.ref(myHistoryPath).push({
            pokytis: -kaina,
            naujaReiksme: nauji,
            laikas: new Date().toLocaleString(),
            vartotojas: manoRolė
        });
        rodytZinute(`Nupirkta (-${kaina})`, "green");
      }
    });
  }

  
// 1. UŽPILDU KONTROLES (Metus ir Dienas)
const metuSelect = document.getElementById('metai');
const dienosSelect = document.getElementById('diena');
const dabartiniaiMetai = new Date().getFullYear();

for (let i = dabartiniaiMetai; i >= 1980; i--) {
    let opt = document.createElement('option');
    opt.value = i;
    opt.innerHTML = i;
    metuSelect.appendChild(opt);
}

for (let i = 1; i <= 31; i++) {
    let opt = document.createElement('option');
    opt.value = i;
    opt.innerHTML = i;
    dienosSelect.appendChild(opt);
}

// 2. FUNKCIJA REZULTATUI Į LENTELĘ ĮRAŠYTI
function rodytiRezultaLenteleje(dataText, dienuTekstas) {
    const lentele = document.getElementById('rezultatuLentele').getElementsByTagName('tbody')[0];
    lentele.innerHTML = ""; // Išvalome seną, kad liktų tik vienas įrašas
    
    const naujaEilute = lentele.insertRow(0);
    const celeData = naujaEilute.insertCell(0);
    const celeDienos = naujaEilute.insertCell(1);

    celeData.innerHTML = dataText;
    celeDienos.innerHTML = dienuTekstas;
}

// 3. PAGRINDINĖ SKAIČIAVIMO FUNKCIJA
function skaiciuotiSkirtuma() {
    const y = parseInt(document.getElementById('metai').value);
    const m = parseInt(document.getElementById('menuo').value);
    const d = parseInt(document.getElementById('diena').value);

    const pasirinktaData = new Date(y, m, d);
    const siandien = new Date();
    siandien.setHours(0, 0, 0, 0); // Sulyginame laiką tiksliam dienų skaičiavimui

    const skirtumasMilisekundemis = siandien - pasirinktaData;
    const dienos = Math.floor(skirtumasMilisekundemis / (1000 * 60 * 60 * 24));

    // Suformuojame tekstą
    const datosTekstas = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    let dienuStatusas = "";

    if (dienos >= 0) {
        dienuStatusas = `<span style="color: green; font-weight: bold;">Praėjo ${dienos} d.</span>`;
    } else {
        dienuStatusas = `<span style="color: orange; font-weight: bold;">Liko ${Math.abs(dienos)} d.</span>`;
    }

    // Parodome ekrane
    rodytiRezultaLenteleje(datosTekstas, dienuStatusas);
    document.getElementById('datosValdykliai').style.display = "none";
    document.getElementById('atstatymoBlokas').style.display = "block";

    // IŠSAUGOME: kad perkrovus nedingtų
    localStorage.setItem('saugykla_data', datosTekstas);
    localStorage.setItem('saugykla_rezultatas', dienuStatusas);
    localStorage.setItem('datos_formos_busena', 'paslepta');
}
  // Nauja funkcija, skirta vėl rodyti pasirinkimą
function rodytiPasirinkimaIsNaujo() {
    document.getElementById('datosValdykliai').style.display = "block";
    document.getElementById('atstatymoBlokas').style.display = "none";
    localStorage.removeItem('datos_formos_busena'); // Ištriname būseną, kad perkrovus vėl matytųsi forma
    localStorage.removeItem('saugykla_data');
    localStorage.removeItem('saugykla_rezultatas');
}
window.addEventListener ('load', () =>{
    const d = new Date();
    const sieandienosdata = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    const issaugotaData = localStorage.getItem('saugykla_data');
    const rezultatas = localStorage.getItem('saugykla_rezultatas');

    if (issaugotaData === sieandienosdata && busena === 'paslepta') {
        rodytiRezultaLenteleje(issaugotaData, rezultatas);
        document.getElementById('datosValdykliai'). style.display = "none";
        document.getElementById('atstatymoBlokas'). style.display = "block";
    }
    else{
        rodytiPasirinkimaIsNaujo();
    }
})

// Pagalbine funkcija

// Funkcija išvaizdos keitimui
function taikytiTekstura(texture) {
    localStorage.setItem("pasirinktaTekstura", texture);
    const buttons = document.querySelectorAll("button");
    // Klasės, kurias reikia nuimti prieš dedant naują
    const classesToRemove = ["texture1", "texture2", "texture3", "mygtukas1", "mygtukas2", "mygtukas3"];
    
    buttons.forEach(btn => {
        // Nekeičiame nustatymų mygtuko stiliaus (pagal ID arba klasę)
        if (btn.classList.contains("nustatymai-btn") || btn.id === "nustatymai-btn") return;
        
        classesToRemove.forEach(cls => btn.classList.remove(cls));
        if (texture && texture !== "default") {
            btn.classList.add(texture);
        }
    });
}

// Funkcija pranešimų siuntimui
function siustiPranesima(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: body });
    }
}