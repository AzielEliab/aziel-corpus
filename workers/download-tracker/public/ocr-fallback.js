'use strict';
(function(){
var input = document.getElementById('ocrFile');
var out = document.getElementById('ocrOut');
if (!input) return;
input.addEventListener('change', async function(e){
  var f = e.target.files && e.target.files[0]; if (!f) return;
  if (out) out.textContent = 'Reading in this browser…';
  try {
    if (!window.Tesseract) { if (out) out.textContent = 'Tesseract.js CDN did not load.'; return; }
    var r = await window.Tesseract.recognize(f, 'eng');
    if (out) out.textContent = (r && r.data && r.data.text) || '(no text)';
  } catch (err) { if (out) out.textContent = 'Fallback OCR failed: ' + err; }
});
})();
