let queryInput;
let resultDiv;
let popupDiv;
let popupResultDiv;

document.addEventListener("DOMContentLoaded", () => {
  queryInput = document.querySelector("#query");
  resultDiv = document.querySelector("#result");
  popupDiv = document.querySelector("#word-popup");
  popupResultDiv = document.querySelector("#word-popup--result");

  loadDictionary();

  queryInput.addEventListener("input", (e) => {
    let value = e.target.value;

    if (value.length === 0) {
      resultDiv.innerHTML = "";
    }

    search(value);
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
      search(queryInput.value);
    });
}

function levenshteinDistance(s, t) {
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const arr = [];
  for (let i = 0; i <= t.length; i++) {
    arr[i] = [i];
    for (let j = 1; j <= s.length; j++) {
      arr[i][j] =
        i === 0
        ? j
        : Math.min(
          arr[i - 1][j] + 1,
          arr[i][j - 1] + 1,
          arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
        );
    }
  }
  return arr[t.length][s.length];
}

function calculateKey(query, row) {
  let tokens = [];
  for (let i = 0; i < 10; i++) {
    const cell = row[i].replace(/[\(\[].+[\)\]]/, "").trim();
    tokens = [...tokens, ...cell.split(/;|,/).map(t => t.trim())];
  }

  let closest = Infinity;
  tokens.forEach(token => {
    closest = Math.min(closest, levenshteinDistance(token, query));
  });

  return closest;
}

function normalise(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function search(query) {
  if (query.length < 2 && !('가' <= query[0] && query[0] <= '힣')) {
    return;
  }

  const normalisedQuery = normalise(query);

  const result = dictionary.filter(
    (row) =>
    !row[1].startsWith("(") &&
    row.slice(0, 10).some((value) => normalise(value).includes(normalisedQuery))
  );

  resultDiv.innerHTML = "";
  result.sort((a, b) => {
    const aKey = calculateKey(query, a);
    const bKey = calculateKey(query, b);

    return aKey - bKey;
  });
  result.slice(0, 20).forEach(row => insertRow(row));
}

function labelify(element) {
  const content = element.textContent;

  const numbers = content.match(/\d+/g);

  if (numbers === null) {
    return element;
  }

  const positions = [0];
  numbers.forEach(number => {
    positions.push(content.indexOf(number));
    positions.push(content.indexOf(number) + number.length);
  })
  positions.push(content.length);

  const result = element.cloneNode();
  result.innerHTML = "";

  for (let i = 0; i < positions.length-1; i++) {
    const isNumber = i % 2 === 0;
    const startPos = positions[i];
    const endPos = positions[i+1];
    const string = content.substring(startPos, endPos);

    if (isNumber) {
      const span = document.createElement("span");
      span.innerText = string;
      result.appendChild(span);
      continue;
    }

    const span = document.createElement("span");
    span.innerText = string;
    span.classList.add("word-popup--number");
    result.appendChild(span);

    const row = dictionary.filter(r => r[0] === string)[0];
    const div = createDiv(row);
    div.classList.remove("result");

    span.addEventListener("mouseover", (e) => {
      popupDiv.innerHTML = "";
      popupDiv.appendChild(div);
      popupDiv.style.display = "block";
    });

    span.addEventListener("mouseleave", (e) => {
      popupDiv.style.display = "none";
    });
  }

  return result;
}

document.addEventListener("mousemove", (e) => {
  popupDiv.style.top = `${e.clientY + 10}px`;
  popupDiv.style.left = `${e.clientX - 4}px`;
})

function createDiv(row) {
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
  div.appendChild(labelify(etymologyDiv));

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

  return div;
}

function insertRow(row) {
  resultDiv.appendChild(createDiv(row));
}