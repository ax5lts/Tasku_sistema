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
let istorijaPath;
let manoRolė = ""; // "vyras" arba "moteris" (arba user1/user2)

window.addEventListener("load", () => {
    // Išvaizdos krovimas (tavo senas kodas)
    const savedTexture = localStorage.getItem("pasirinktaTekstura");
    if (savedTexture) {
        document.querySelectorAll("button:not(#nustatymaiBtn)").forEach(btn => btn.classList.add(savedTexture));
        if (document.getElementById("textureSelect")) document.getElementById("textureSelect").value = savedTexture;
    }

    // Automatinis prisijungimas, jei kodas jau buvo įvestas anksčiau
    const issaugotasKodas = localStorage.getItem("kambarioKodas");
    if (issaugotasKodas) {
        document.getElementById("otpKodas").value = issaugotasKodas;
        prijungtiKoda(true); 
    }
});

function prijungtiKoda(isLoad = false) {
    const kodas = document.getElementById("otpKodas").value;
    if (kodas.length !== 6) {
        if(!isLoad) alert("Įveskite 6 skaičių kodą!");
        return;
    }

    // Išsaugome kodą naršyklėje
    localStorage.setItem("kambarioKodas", kodas);
    
    // ČIA LOGIKA: 
    // Kadangi tai porų programėlė, galime naudoti paprastą būdą:
    // Pirmas prisijungęs prie kodo mato antro taškus, antras – pirmo.
    // Kad būtų paprasčiau, galime leisti vartotojui pasirinkti, kas jis yra, 
    // ARBA tiesiog naudoti įrenginio ID. Šiuo atveju naudosime tavo idėją:
    // "Matau kito taškus".
    
    // Kiekvienam kambariui išsaugome rolę atskirai
    const rolesRaktas = `manoRole_${kodas}`;
    if (!localStorage.getItem(rolesRaktas)) {
        let pasirinkimas = confirm("Ar tu esi tas, kuris RINKA taškus? (Spausk OK - Taip, Cancel - Ne, aš stebiu kito taškus)");
        manoRolė = pasirinkimas ? "user1" : "user2";
        localStorage.setItem(rolesRaktas, manoRolė);
    } else {
        manoRolė = localStorage.getItem(rolesRaktas);
    }

    nustatytiKambari(kodas);
    document.getElementById("kambarioStatusas").textContent = "Prisijungta prie: " + kodas;
    document.getElementById("kambarioStatusas").style.color = "green";
}

function nustatytiKambari(kodas) {
    // Svarbu: atjungiame seną klausytoją, jei keičiamas kambarys
    if (taskaiRef) {
        taskaiRef.off();
    }

    // Supaprastinta logika: visada veiksmai atliekami su "user1" taškais kambaryje.
    // "user1" yra tas, kuris renka taškus. "user2" yra tas, kuris juos duoda/prižiūri.
    // Abu vartotojai mato ir keičia tą patį taškų skaičių.
    taskaiRef = db.ref(`kambariai/${kodas}/taskai_user1`);
    istorijaPath = `kambariai/${kodas}/istorija_user1`;

    taskaiRef.on("value", (snapshot) => {
        const value = snapshot.val();
        document.getElementById("taskai").textContent = value !== null ? value : 0;
    });
}



function keistiTaskus(kiekis) {
    if (!taskaiRef) {
        alert("Pirmiausia prisijunkite su kodu nustatymuose!");
        return;
    }
    taskaiRef.get().then((snapshot) => {
        let dabartiniai = snapshot.val() || 0;
        let nauji = dabartiniai + kiekis;
        if (nauji < -10) {
            rodytZinute("Negalima mažiau nei –10!", "orange");
            return;
        }
        taskaiRef.set(nauji);
        const istorijaRef = db.ref(istorijaPath);
        istorijaRef.push({
            pokytis: kiekis,
            naujaReiksme: nauji,
            laikas: new Date().toLocaleString()
        });
        rodytZinute((kiekis > 0 ? "+" : "") + kiekis + " taškai", kiekis > 0 ? "green" : "red");
    });
}

// ... palik likusias funkcijas (rodytiIstorija, rodytZinute ir t.t.) kaip savo originale

  // Rodo istoriją
  function rodytiIstorija() {
    const istorijaRef = db.ref(istorijaPath);
    istorijaRef.once("value", (snapshot) => {
      const data = snapshot.val();
      const istorijaDiv = document.getElementById("istorija");
      istorijaDiv.innerHTML = "";
      if (data) {
        Object.values(data).reverse().forEach(entry => {
          const p = document.createElement("p");
          p.textContent = `${entry.laikas}: ${entry.pokytis > 0 ? "+" : ""}${entry.pokytis} (viso: ${entry.naujaReiksme})`;
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
    if (!taskaiRef) {
        alert("Pirmiausia prisijunkite su kodu nustatymuose!");
        return;
    }
    taskaiRef.get().then((snapshot) => {
      const dabartiniai = snapshot.val() || 0;
      if (dabartiniai >= kaina) {
        // Panaudojame `keistiTaskus`, kad išlaikytume vieningą logiką 
        // (istorijos įrašas, taškų limito patikra).
        keistiTaskus(-kaina);
      } else {
        rodytZinute("Nepakanka taškų!", "orange");
      }
    });
  }