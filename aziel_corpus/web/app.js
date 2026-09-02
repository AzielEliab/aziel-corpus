(function () {
  "use strict";
  var q = document.getElementById("q");
  var cards = document.getElementById("cards");
  var cTotal = document.getElementById("c-total");
  var cShown = document.getElementById("c-shown");
  var doctorOut = document.getElementById("doctor-out");

  function render(payload) {
    var works = payload.works || [];
    cTotal.textContent = String(payload.total != null ? payload.total : works.length);
    cShown.textContent = String(payload.count != null ? payload.count : works.length);
    cards.innerHTML = "";
    works.forEach(function (w) {
      var art = document.createElement("article");
      art.className = "work";
      art.innerHTML =
        "<h3>" + esc(w.name || w.slug || "work") +
        ' <span class="slug">' + esc(w.slug || "") + "</span></h3>" +
        '<p class="oneline">' + esc(w.one_line || "") + "</p>" +
        '<p class="kind">' + esc(w.kind || "work") + (w.pages ? " · " + w.pages + " pages" : "") + "</p>";
      cards.appendChild(art);
    });
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function load(query) {
    var url = "/api/works" + (query ? "?q=" + encodeURIComponent(query) : "");
    fetch(url).then(function (r) { return r.json(); }).then(render);
  }

  q.addEventListener("input", function () { load(q.value); });
  load("");

  document.getElementById("btn-export").addEventListener("click", function () {
    fetch("/api/export").then(function (r) { return r.json(); }).then(function (data) {
      var blob = new Blob([JSON.stringify(data.document, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = data.filename || "aziel-corpus-works.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  });

  document.getElementById("btn-import").addEventListener("click", function () {
    document.getElementById("open-json").click();
  });
  document.getElementById("open-json").addEventListener("change", function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try { parsed = JSON.parse(String(reader.result || "{}")); }
      catch (err) { alert("That file is not JSON."); return; }
      fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      }).then(function (r) { return r.json(); }).then(function (data) {
        q.value = "";
        render({ works: data.works, count: data.count, total: data.count });
      });
    };
    reader.readAsText(file);
  });

  document.getElementById("btn-reset").addEventListener("click", function () {
    fetch("/api/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        q.value = "";
        render({ works: data.works, count: data.count, total: data.count });
      });
  });

  document.getElementById("btn-doctor").addEventListener("click", function () {
    fetch("/api/doctor", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        doctorOut.hidden = false;
        doctorOut.textContent = JSON.stringify(data, null, 2);
      });
  });
})();
