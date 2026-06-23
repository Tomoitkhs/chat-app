const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.static("public"));

const FILE = "messages.json";

// ===== データ =====
function load() {
  if (!fs.existsSync(FILE)) return [];
  return JSON.parse(fs.readFileSync(FILE));
}
function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

let messages = load();

// ===== API =====

// メッセージ取得
app.get("/messages", (req, res) => {
  res.json(messages.slice(-100));
});

// メッセージ送信
app.post("/send", (req, res) => {
  const { name, text, image } = req.body;

  if (!name) return res.sendStatus(400);

  const msg = { name, text, image };
  messages.push(msg);
  save(messages);

  res.sendStatus(200);
});

// 履歴削除
app.post("/clear", (req, res) => {
  messages = [];
  save(messages);
  res.sendStatus(200);
});

// ===== HTML =====
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Chat</title>
<style>
body { font-family: sans-serif; background:#7ac7ff; }
#messages { padding:10px; }
.bubble { margin:5px; padding:8px; border-radius:10px; }
.me { background:#9effa1; text-align:right; }
.other { background:white; }
</style>
</head>
<body>

<h2>Chat</h2>

<input id="name" placeholder="名前">
<button onclick="setName()">入室</button>

<div id="messages"></div>

<input id="msg" placeholder="メッセージ">
<input type="file" id="img">
<button onclick="send()">送信</button>
<button onclick="clearChat()">削除</button>

<script>
let myName = localStorage.getItem("name");

function setName() {
  myName = document.getElementById("name").value;
  localStorage.setItem("name", myName);
}

// 描画
function draw(list) {
  const box = document.getElementById("messages");
  box.innerHTML = "";

  list.forEach(m => {
    const div = document.createElement("div");
    div.className = "bubble " + (m.name === myName ? "me":"other");
    div.innerHTML = "<b>" + m.name + "</b><br>" + (m.text||"");

    if (m.image) {
      div.innerHTML += "<br><img src='"+m.image+"' width=120>";
    }

    box.appendChild(div);
  });
}

// 取得
async function load() {
  const res = await fetch("/messages");
  const data = await res.json();
  draw(data);
}

// 送信
async function send() {
  const text = document.getElementById("msg").value;
  const file = document.getElementById("img").files[0];

  let image = null;

  if (file) {
    const reader = new FileReader();
    reader.onload = async () => {
      image = reader.result;

      await fetch("/send", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name: myName, text, image })
      });

      document.getElementById("msg").value = "";
      load();
    };
    reader.readAsDataURL(file);
  } else {
    await fetch("/send", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ name: myName, text, image:null })
    });

    document.getElementById("msg").value = "";
    load();
  }
}

// 削除
async function clearChat() {
  await fetch("/clear", { method:"POST" });
  load();
}

// 自動更新（3秒）
setInterval(load, 3000);
load();

</script>

</body>
</html>
`);
});

// ===== 起動 =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("running");
});
``