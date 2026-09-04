'use strict';
(function () {
  function show(el, data) {
    if (!el) return;
    if (!data) {
      el.textContent = 'No response.';
      return;
    }
    var lines = [];
    if (data.error) lines.push('Error: ' + data.error);
    if (data.message) lines.push(data.message);
    if (data.run_id) lines.push('Receipt id: ' + data.run_id);
    if (data.kind) lines.push('Kind: ' + data.kind);
    if (data.receipt_url) lines.push('Ledger: ' + data.receipt_url + (data.ledger_url && data.ledger_url !== data.receipt_url ? '  (also ' + data.ledger_url + ')' : ''));
    if (data.record_id) lines.push('Library record: /record/' + data.record_id + (data.library ? ' (' + data.library + ')' : ''));
    if (data.ingest_error) lines.push('Library upload: ' + data.ingest_error);
    var text = data.transcript || data.text || '';
    if (text) {
      lines.push('');
      lines.push('Transcript');
      lines.push(text);
    }
    if (data.vibe) {
      lines.push('');
      lines.push('VibeLock advisory (not courtroom proof)');
      if (data.vibe_limitation) lines.push(data.vibe_limitation);
      if (data.vibe.score != null) lines.push('Score: ' + data.vibe.score);
      if (data.vibe.band) lines.push('Band: ' + data.vibe.band);
      if (data.vibe.error) lines.push('VibeLock: ' + data.vibe.error);
      lines.push(JSON.stringify(data.vibe.result || data.vibe, null, 2));
      if (data.vibelock_catalog) lines.push('Local engine: ' + data.vibelock_catalog);
    }
    el.classList.remove('muted');
    el.textContent = lines.join('\n');
  }

  function bind(formId, outId) {
    var form = document.getElementById(formId);
    var out = document.getElementById(outId);
    if (!form) return;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (out) out.textContent = 'Working on this Worker…';
      var fd = new FormData(form);
      fetch(form.getAttribute('action') || form.action, {
        method: 'POST',
        body: fd,
        headers: { Accept: 'application/json' },
      }).then(function (res) {
        return res.json().then(function (data) {
          data = data || {};
          if (!res.ok && !data.error) data.error = 'HTTP ' + res.status;
          show(out, data);
        });
      }).catch(function (err) {
        if (out) out.textContent = 'Request failed: ' + err;
      });
    });
  }

  bind('transcribeForm', 'transcribeOut');
  bind('ocrForm', 'ocrHostedOut');
})();
