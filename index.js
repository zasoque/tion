let queryInput;
let resultDiv;

document.addEventListener("DOMContentLoaded", () => {
    queryInput = document.querySelector("#query");
    resultDiv = document.querySelector("#result");

    loadDictionary();

    queryInput.addEventListener("input", (e) => {
        let value = e.target.value;

        if (value.length >= 2) {
            search(value)
        }
    });
});

const KEY = "AIzaSyBSaX_PbqIgynBFq7csvxenj3BXro05xo4";
const SPREADSHEET_ID = "1QSqIbmShJiUiJWNB0x8dQzGbb6W1dqEz_LBlP363e_E";
let header, dictionary;
function loadDictionary() {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/자소크어!A:L?key=${KEY}`)
        .then(response => response.json())
        .then(data => {
            header = data.values.splice(0, 1)[0];
            dictionary = data.values;
        });
}

function search(query) {
    const result = dictionary.filter((row) => row.slice(1, 10).some((value) => value.includes(query)));

    resultDiv.innerHTML = "";
    result.forEach(row => insertRow(row));
}

function insertRow(row) {
    // https://me.shtelo.org/dictform/word.html
    // ?word=asd
    // &pronunciation=asd
    // &etymology=sd
    // &definition=asd%7Casd%7Casd%0D%0Aasd%7Casd%7Casd
    let url = "https://me.shtelo.org/dictform/word.html";
    url += "?word=" + row[1];
    url += "&etymology=" + (row[10] + " " + (row[11] ? row[11] : "")).trim();

    let definition = "";
    let need = false;
    for (let i = 3; i <= 9; i++) {
        if (!row[i]) {
            continue;
        }

        if (need) {
            definition += "%0D%0A";
        }

        const pos = header[i];
        const splitted = row[i].split(/; /);
        for (let j = 0; j < splitted.length; j++) {
            const meaning = splitted[j];
            definition += `${pos}%7C${meaning}`;

            if (j < splitted.length - 1) {
                definition += "%0D%0A";
            }
        }

        need = true;
    }
    url += "&definition=" + definition;

    // DOM
    const div = document.createElement("div");
    div.classList.add("result");

    const titleDiv = document.createElement("div");
    titleDiv.classList.add("title-div");

    const title = document.createElement("a");
    title.classList.add("title");
    title.textContent = row[1];
    title.href = url;
    titleDiv.appendChild(title);

    const id = document.createElement("span");
    id.classList.add("id");
    id.textContent = row[0];
    titleDiv.appendChild(id);

    div.appendChild(titleDiv);

    const etymologyDiv = document.createElement("div");
    etymologyDiv.classList.add("etymology");
    etymologyDiv.textContent = (row[10] + " " + (row[11] ? row[11] : "")).trim();
    div.appendChild(etymologyDiv);

    const meaningDiv = document.createElement("div");

    for (let i = 3; i <= 9; i++) {
        if (!row[i]) {
            continue;
        }

        const posDiv = document.createElement("div");
        posDiv.classList.add("pos");
        posDiv.textContent = header[i];
        meaningDiv.appendChild(posDiv);

        const meaning = document.createElement("ol");
        meaning.classList.add("meaning");
        row[i].split(/; /).forEach((m) => {
            const meaningCellDiv = document.createElement("li");
            meaningCellDiv.classList.add("meaning-cell");
            meaningCellDiv.textContent = m;
            meaning.appendChild(meaningCellDiv);
        });
        meaningDiv.appendChild(meaning);

        div.appendChild(meaningDiv);
    }

    resultDiv.appendChild(div);
}