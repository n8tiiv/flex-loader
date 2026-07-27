// =========================
// Amazon Flex Loader
// app.js (Part 1)
// =========================

// Browser Speech Recognition
const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    alert(
        "Your browser does not support Speech Recognition.\n\nPlease use Edge or Chrome on Android."
    );
}

const recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = "en-US";

// -------------------------

const statusEl = document.getElementById("status");
const currentSectionEl = document.getElementById("currentSection");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const undoBtn = document.getElementById("undoBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");

// -------------------------

const sections = {
    backseat: document.getElementById("backseat"),
    backseatFloor: document.getElementById("backseatFloor"),
    frontSeat: document.getElementById("frontSeat"),
    frontFloor: document.getElementById("frontFloor"),
    trunk: document.getElementById("trunk")
};

let currentSection = null;

let history = [];

let appData = {
    backseat: [],
    backseatFloor: [],
    frontSeat: [],
    frontFloor: [],
    trunk: []
};

// -------------------------
// Load previous session
// -------------------------

loadData();

function loadData() {

    const saved = localStorage.getItem("flexLoader");

    if (!saved) return;

    appData = JSON.parse(saved);

    renderAll();

}

function saveData() {

    localStorage.setItem(
        "flexLoader",
        JSON.stringify(appData)
    );

}

// -------------------------

function renderAll() {

    Object.keys(sections).forEach(key => {

        sections[key].innerHTML = "";

        appData[key].forEach(item => {

            addListItem(key, item);

        });

    });

}

// -------------------------

function addListItem(section, value) {

    const li = document.createElement("li");

    li.textContent = value;

    sections[section].appendChild(li);

}

// -------------------------

function setCurrent(sectionName, displayName) {

    currentSection = sectionName;

    currentSectionEl.textContent = displayName;

    statusEl.textContent =
        "Current Section: " + displayName;

}

// -------------------------

function pushNumber(number) {

    if (!currentSection) {

        statusEl.textContent =
            "Say a location first.";

        return;

    }

    appData[currentSection].push(number);

    history.push({
        section: currentSection,
        value: number
    });

    addListItem(currentSection, number);

    saveData();

}
// =========================
// app.js (Part 2)
// Speech Recognition Logic
// =========================

// ----------
// Helpers
// ----------

function normalize(text) {
    return text
        .toLowerCase()
        .replace(/[.,]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function parseNumber(text) {

    text = text.replace(/[^0-9]/g, "");

    if (text.length === 0)
        return null;

    return text;

}

function processTranscript(raw) {

    const text = normalize(raw);

    // -----------------------
    // Section Commands
    // -----------------------

    if (text.includes("backseat floor")) {
        setCurrent("backseatFloor", "BACKSEAT FLOOR");
        return;
    }

    if (text.includes("front floor")) {
        setCurrent("frontFloor", "FRONT FLOOR");
        return;
    }

    if (text.includes("front seat")) {
        setCurrent("frontSeat", "FRONT SEAT");
        return;
    }

    if (text.includes("backseat")) {
        setCurrent("backseat", "BACKSEAT");
        return;
    }

    if (text.includes("trunk")) {
        setCurrent("trunk", "TRUNK");
        return;
    }

    // -----------------------
    // Undo
    // -----------------------

    if (text.includes("undo")) {

        undoLast();

        return;

    }

    // -----------------------
    // Clear
    // -----------------------

    if (
        text.includes("clear") ||
        text.includes("clear list")
    ) {

        clearEverything();

        return;

    }

    // -----------------------
    // Numbers
    // -----------------------

    const number = parseNumber(text);

    if (number) {

        pushNumber(number);

    }

}

// ------------------------
// Speech Events
// ------------------------

recognition.onstart = () => {

    statusEl.textContent =
        "Listening...";

};

recognition.onend = () => {

    statusEl.textContent =
        "Stopped";

};

recognition.onerror = (e) => {

    statusEl.textContent =
        "Error: " + e.error;

};

recognition.onresult = (event) => {

    let transcript = "";

    for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
    ) {

        if (event.results[i].isFinal) {

            transcript +=
                event.results[i][0].transcript + " ";

        }

    }

    if (transcript.length > 0) {

        console.log(transcript);

        processTranscript(transcript);

    }

};

// -------------------------
// Buttons
// -------------------------

startBtn.addEventListener("click", () => {

    recognition.start();

});

stopBtn.addEventListener("click", () => {

    recognition.stop();

});
// =========================
// app.js (Part 3)
// Buttons, Utilities & PWA
// =========================

// -------------------------
// Undo
// -------------------------

function undoLast() {

    if (history.length === 0) {

        statusEl.textContent = "Nothing to undo.";
        return;

    }

    const last = history.pop();

    appData[last.section].pop();

    saveData();

    renderAll();

    statusEl.textContent =
        "Removed " + last.value;

}

undoBtn.addEventListener("click", undoLast);

// -------------------------
// Clear
// -------------------------

function clearEverything() {

    if (!confirm("Clear all recorded addresses?"))
        return;

    Object.keys(appData).forEach(key => {

        appData[key] = [];

    });

    history = [];

    renderAll();

    saveData();

    currentSection = null;

    currentSectionEl.textContent = "NONE";

    statusEl.textContent =
        "List cleared.";

}

clearBtn.addEventListener("click", clearEverything);

// -------------------------
// Copy
// -------------------------

copyBtn.addEventListener("click", () => {

    let text = "";

    const titles = {
        backseat: "BACKSEAT",
        backseatFloor: "BACKSEAT FLOOR",
        frontSeat: "FRONT SEAT",
        frontFloor: "FRONT FLOOR",
        trunk: "TRUNK"
    };

    Object.keys(appData).forEach(section => {

        if (appData[section].length === 0)
            return;

        text += titles[section] + "\n";

        appData[section].forEach(item => {

            text += item + "\n";

        });

        text += "\n";

    });

    navigator.clipboard.writeText(text)
        .then(() => {

            statusEl.textContent =
                "Copied to clipboard.";

        })
        .catch(() => {

            statusEl.textContent =
                "Unable to copy.";

        });

});

// -------------------------
// Auto Restart Recognition
// -------------------------

let keepListening = false;

startBtn.addEventListener("click", () => {

    keepListening = true;

});

stopBtn.addEventListener("click", () => {

    keepListening = false;

});

recognition.onend = () => {

    if (keepListening) {

        recognition.start();

    } else {

        statusEl.textContent = "Stopped";

    }

};

// -------------------------
// Register Service Worker
// -------------------------

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("service-worker.js")
            .catch(console.error);

    });

}

// -------------------------
// First Load
// -------------------------

renderAll();

statusEl.textContent = "Ready";