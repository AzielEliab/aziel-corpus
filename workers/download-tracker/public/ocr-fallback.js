'use strict';
(function(){
function selectedLenses(root) {
  var boxes = (root || document).querySelectorAll('input[name="lens"]:checked');
  var out = [];
  for (var i = 0; i < boxes.length; i++) out.push(boxes[i].value);
  return out;
}
function fileToImage(file) {
  return new Promise(function(resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('Could not read that picture.')); };
    img.src = url;
  });
}
function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function luma(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function hueDist(h, t) { var d = Math.abs(h - t); return Math.min(d, 360 - d); }
function rgbToHsv(r, g, b) {
  var max = Math.max(r, g, b), min = Math.min(r, g, b), v = max, d = max - min, s = max > 1e-6 ? d / max : 0, h = 0;
  if (d > 1e-6) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, s, v];
}
function hsvToRgb(h, s, v) {
  var c = v * s, hp = (h % 360) / 60, x = c * (1 - Math.abs((hp % 2) - 1)), m = v - c;
  var rp = 0, gp = 0, bp = 0;
  if (hp < 1) { rp = c; gp = x; }
  else if (hp < 2) { rp = x; gp = c; }
  else if (hp < 3) { gp = c; bp = x; }
  else if (hp < 4) { gp = x; bp = c; }
  else if (hp < 5) { rp = x; bp = c; }
  else { rp = c; bp = x; }
  return [rp + m, gp + m, bp + m];
}
function imageDataToBuf(data) {
  var buf = new Float32Array((data.data.length / 4) * 3);
  for (var i = 0, p = 0; i < data.data.length; i += 4, p += 3) {
    buf[p] = data.data[i] / 255; buf[p + 1] = data.data[i + 1] / 255; buf[p + 2] = data.data[i + 2] / 255;
  }
  return buf;
}
function bufToImageData(buf, w, h) {
  var out = new ImageData(w, h);
  for (var i = 0, p = 0, q = 0; i < w * h; i++, p += 3, q += 4) {
    out.data[q] = Math.round(clamp01(buf[p]) * 255);
    out.data[q + 1] = Math.round(clamp01(buf[p + 1]) * 255);
    out.data[q + 2] = Math.round(clamp01(buf[p + 2]) * 255);
    out.data[q + 3] = 255;
  }
  return out;
}
function modeZero(buf) {
  var n = buf.length / 3, g = new Float32Array(n), lo = 1, hi = 0;
  for (var i = 0, p = 0; i < n; i++, p += 3) { g[i] = luma(buf[p], buf[p + 1], buf[p + 2]); if (g[i] < lo) lo = g[i]; if (g[i] > hi) hi = g[i]; }
  var span = hi - lo || 1, out = new Float32Array(buf.length);
  for (i = 0, p = 0; i < n; i++, p += 3) { var v = (g[i] - lo) / span; out[p] = out[p + 1] = out[p + 2] = v; }
  return out;
}
function modeTazel(buf) {
  var out = new Float32Array(buf.length);
  for (var p = 0; p < buf.length; p += 3) {
    var hsv = rgbToHsv(buf[p], buf[p + 1], buf[p + 2]);
    var w = Math.exp(-0.5 * Math.pow(hueDist(hsv[0], 170) / 24, 2));
    var s2 = clamp01(hsv[1] * (1 + 0.65 * w) + 0.1 * w);
    var mid = 4 * hsv[2] * (1 - hsv[2]);
    var v2 = clamp01(hsv[2] * (1 + 0.28 * w) + 0.06 * w + 0.12 * mid);
    var rgb = hsvToRgb(hsv[0], s2, v2);
    out[p] = clamp01(rgb[0] * (1 - 0.18 * w) + (0x1e / 255) * v2 * 0.18 * w);
    out[p + 1] = clamp01(rgb[1] * (1 - 0.18 * w) + (0xc9 / 255) * v2 * 0.18 * w);
    out[p + 2] = clamp01(rgb[2] * (1 - 0.18 * w) + (0xa5 / 255) * v2 * 0.18 * w);
  }
  return out;
}
function modeVyrn(buf) {
  var out = new Float32Array(buf.length);
  for (var p = 0; p < buf.length; p += 3) {
    var hsv = rgbToHsv(buf[p], buf[p + 1], buf[p + 2]);
    var w = Math.exp(-0.5 * Math.pow(hueDist(hsv[0], 350) / 28, 2));
    var cyan = Math.exp(-0.5 * Math.pow(hueDist(hsv[0], 160) / 32, 2));
    var s2 = clamp01(hsv[1] * (1 + 0.7 * w) * (1 - 0.55 * cyan) + 0.08 * w);
    var v2 = clamp01(hsv[2] * (1 + 0.22 * w) * (1 - 0.18 * cyan));
    var rgb = hsvToRgb(hsv[0], s2, v2);
    out[p] = clamp01(rgb[0] * (1 - 0.22 * w) + (0xc0 / 255) * v2 * 0.22 * w);
    out[p + 1] = clamp01(rgb[1] * (1 - 0.22 * w) * (1 - 0.25 * cyan));
    out[p + 2] = clamp01(rgb[2] * (1 - 0.22 * w) + (0x66 / 255) * v2 * 0.22 * w);
  }
  return out;
}
function modeUv(buf) {
  var n = buf.length / 3, L = new Float32Array(n), lo = 1, hi = 0;
  for (var i = 0, p = 0; i < n; i++, p += 3) { L[i] = luma(buf[p], buf[p + 1], buf[p + 2]); if (L[i] < lo) lo = L[i]; if (L[i] > hi) hi = L[i]; }
  var span = hi - lo || 1, out = new Float32Array(buf.length);
  for (i = 0; i < n; i++) {
    var t = (L[i] - lo) / span, glow = clamp01(Math.pow(t, 0.72) * 1.18) * (1 - 0.42 * (1 - t)), ink = t < 0.42 ? 0.35 : 0;
    p = i * 3;
    out[p] = clamp01((glow * 0.7 + 0.04) * (1 - ink));
    out[p + 1] = clamp01((glow * 0.62 + 0.03) * (1 - ink));
    out[p + 2] = clamp01((glow * 1.18) * (1 - ink));
  }
  return out;
}
function toLuma(buf) {
  var n = buf.length / 3, out = new Float32Array(n);
  for (var i = 0, p = 0; i < n; i++, p += 3) out[i] = luma(buf[p], buf[p + 1], buf[p + 2]);
  return out;
}
function norm01(arr) {
  var lo = Infinity, hi = -Infinity, i, out = new Float32Array(arr.length);
  for (i = 0; i < arr.length; i++) { if (arr[i] < lo) lo = arr[i]; if (arr[i] > hi) hi = arr[i]; }
  var span = hi - lo;
  if (span < 1e-6) return out;
  for (i = 0; i < arr.length; i++) out[i] = (arr[i] - lo) / span;
  return out;
}
function gray(arr) {
  var out = new Float32Array(arr.length * 3);
  for (var i = 0; i < arr.length; i++) { var v = clamp01(arr[i]), p = i * 3; out[p] = out[p + 1] = out[p + 2] = v; }
  return out;
}
function mix(ch, w) {
  var n = ch.zero.length, out = new Float32Array(n), name;
  for (name in w) {
    if (!Object.prototype.hasOwnProperty.call(w, name) || !ch[name]) continue;
    for (var i = 0; i < n; i++) out[i] += w[name] * ch[name][i];
  }
  return out;
}
function channels(buf) {
  return { zero: norm01(toLuma(modeZero(buf))), tazel: norm01(toLuma(modeTazel(buf))), vyrn: norm01(toLuma(modeVyrn(buf))), uv: norm01(toLuma(modeUv(buf))) };
}
function named(buf, mode) {
  if (mode === 'zero') return modeZero(buf);
  if (mode === 'tazel') return modeTazel(buf);
  if (mode === 'vyrn') return modeVyrn(buf);
  if (mode === 'uv') return modeUv(buf);
  var ch = channels(buf);
  if (mode === 'rosetta') return gray(mix(ch, { zero: 0.4, tazel: 0.35, vyrn: 0.25 }));
  if (mode === 'zen') return gray(mix(ch, { zero: 0.25, tazel: 0.25, uv: 0.25, vyrn: 0.25 }));
  if (mode === 'chaos') return gray(mix(ch, { uv: 0.4, vyrn: 0.35, tazel: 0.2, zero: 0.05 }));
  if (mode === 'balance') {
    var zen = gray(mix(ch, { zero: 0.25, tazel: 0.25, uv: 0.25, vyrn: 0.25 }));
    var chaos = gray(mix(ch, { uv: 0.4, vyrn: 0.35, tazel: 0.2, zero: 0.05 }));
    var zn = norm01(toLuma(zen)), cn = norm01(toLuma(chaos)), out = new Float32Array(buf.length);
    for (var i = 0, p = 0; i < zn.length; i++, p += 3) {
      var a = (1 + (zn[i] - cn[i]) / (zn[i] + cn[i] + 1e-6)) / 2;
      out[p] = a * zen[p] + (1 - a) * chaos[p];
      out[p + 1] = a * zen[p + 1] + (1 - a) * chaos[p + 1];
      out[p + 2] = a * zen[p + 2] + (1 - a) * chaos[p + 2];
    }
    return out;
  }
  return buf;
}
function applyLenses(buf, lenses) {
  if (!lenses.length) return buf;
  if (lenses.length === 1) return named(buf, lenses[0]);
  var PURE = { zero: 1, tazel: 1, vyrn: 1, uv: 1 };
  var COMP = { rosetta: 1, zen: 1, chaos: 1, balance: 1 };
  var pures = lenses.filter(function(id) { return PURE[id]; });
  var comps = lenses.filter(function(id) { return COMP[id]; });
  if (comps.length) {
    var parts = comps.map(function(id) { return named(buf, id); });
    var out = new Float32Array(buf.length);
    for (var i = 0; i < parts.length; i++) for (var j = 0; j < out.length; j++) out[j] += parts[i][j];
    for (j = 0; j < out.length; j++) out[j] /= parts.length;
    return out;
  }
  var rosetta = { zero: 0.4, tazel: 0.35, vyrn: 0.25 }, weights = {}, sum = 0, ok = true, k;
  for (i = 0; i < pures.length; i++) {
    if (!rosetta[pures[i]]) { ok = false; break; }
    weights[pures[i]] = rosetta[pures[i]]; sum += rosetta[pures[i]];
  }
  if (!ok || !sum) {
    weights = {};
    for (i = 0; i < pures.length; i++) weights[pures[i]] = 1 / pures.length;
  } else {
    for (k in weights) weights[k] /= sum;
  }
  return gray(mix(channels(buf), weights));
}
function enhanceToCanvas(img, lenses) {
  var max = 1280, scale = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  var w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  var h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  var canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  if (lenses.length) {
    var data = ctx.getImageData(0, 0, w, h);
    var out = applyLenses(imageDataToBuf(data), lenses);
    ctx.putImageData(bufToImageData(out, w, h), 0, 0);
  }
  return canvas;
}
function canvasToPngFile(canvas, name) {
  return new Promise(function(resolve) {
    canvas.toBlob(function(blob) {
      resolve(new File([blob], (name || 'scan').replace(/\.[^.]+$/, '') + '-spectral.png', { type: 'image/png' }));
    }, 'image/png');
  });
}

var form = document.getElementById('ocrForm');
if (form) {
  form.addEventListener('submit', function(ev) {
    var fileInput = form.querySelector('input[name="file"]');
    var file = fileInput && fileInput.files && fileInput.files[0];
    var lenses = selectedLenses(form);
    if (!file || !lenses.length) return;
    if (file.type === 'image/png' || /\.png$/i.test(file.name || '')) return;
    if (!/^image\//i.test(file.type || '')) return;
    ev.preventDefault();
    fileToImage(file).then(function(img) {
      var canvas = enhanceToCanvas(img, []);
      return canvasToPngFile(canvas, file.name);
    }).then(function(png) {
      if (window.DataTransfer) {
        var dt = new DataTransfer();
        dt.items.add(png);
        fileInput.files = dt.files;
        form.submit();
      } else {
        var fd = new FormData(form);
        fd.set('file', png, png.name);
        return fetch('/ocr', { method: 'POST', body: fd, credentials: 'same-origin' }).then(function(r) {
          if (r.redirected) { location.href = r.url; return; }
          return r.text().then(function(html) { document.open(); document.write(html); document.close(); });
        });
      }
    }).catch(function(err) { form.submit(); void err; });
  });
}

var input = document.getElementById('ocrFile');
var out = document.getElementById('ocrOut');
var preview = document.getElementById('ocrPreview');
if (!input) return;
input.addEventListener('change', async function(e){
  var f = e.target.files && e.target.files[0]; if (!f) return;
  if (out) out.textContent = 'Reading in this browser…';
  try {
    var lenses = selectedLenses(document.getElementById('ocrForm') || document);
    var img = await fileToImage(f);
    var canvas = enhanceToCanvas(img, lenses);
    if (preview) { preview.src = canvas.toDataURL('image/png'); preview.hidden = false; }
    if (!window.Tesseract) { if (out) out.textContent = 'Tesseract.js CDN did not load.'; return; }
    var r = await window.Tesseract.recognize(canvas, 'eng');
    if (out) out.textContent = (r && r.data && r.data.text) || '(no text)';
  } catch (err) { if (out) out.textContent = 'Fallback OCR failed: ' + err; }
});
})();
