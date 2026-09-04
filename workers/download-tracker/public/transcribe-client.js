'use strict';
(function () {
  function show(el, data, res) {
    if (!el) return;
    if (!data) {
      el.textContent = 'No response.';
      return;
    }
    var player = document.getElementById('transcribePlayer');
    if (player) player.innerHTML = '';
    var blocked = !!(data.blocked || (res && res.status === 451));
    var lines = [];
    if (blocked) {
      lines.push('BLOCKED (HTTP 451)');
      lines.push(data.message || 'Porn, nudity, and child-sexual content are not stored and are not playable.');
      if (data.reasons && data.reasons.length) lines.push('Reasons: ' + data.reasons.join(', '));
      if (data.run_id) lines.push('Receipt id: ' + data.run_id);
      if (data.receipt_url) lines.push('Ledger: ' + data.receipt_url);
      el.classList.remove('muted');
      el.textContent = lines.join('\n');
      return;
    }
    if (data.error) lines.push('Error: ' + data.error);
    if (data.message) lines.push(data.message);
    if (data.run_id) lines.push('Receipt id: ' + data.run_id);
    if (data.kind) lines.push('Kind: ' + data.kind);
    if (data.ledger_action) lines.push('Ledger action: ' + data.ledger_action);
    if (data.receipt_url) lines.push('Ledger: ' + data.receipt_url);
    if (data.record_id) lines.push('Library record: /record/' + data.record_id + (data.library ? ' (' + data.library + ')' : ''));
    if (data.ingest_error) lines.push('Library upload: ' + data.ingest_error);
    if (data.media_url && player) {
      var tag = data.player === 'video' ? 'video' : 'audio';
      player.innerHTML = '<' + tag + ' class="av-player" controls src="' + String(data.media_url).replace(/"/g, '') + '"></' + tag + '>';
    }
    var text = data.transcript || data.text || '';
    if (text) {
      lines.push('');
      lines.push('Transcript');
      lines.push(text);
    }
    lines.push('');
    lines.push('VibeLock determination (mandatory; not courtroom proof)');
    if (data.vibe_limitation) lines.push(data.vibe_limitation);
    if (data.vibe) lines.push(JSON.stringify(data.vibe, null, 2));
    else lines.push(JSON.stringify(data, null, 2));
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
      var player = document.getElementById('transcribePlayer');
      if (player && formId === 'transcribeForm') player.innerHTML = '';
      var fd = new FormData(form);
      fetch(form.getAttribute('action') || form.action, {
        method: 'POST',
        body: fd,
        headers: { Accept: 'application/json' },
      }).then(function (res) {
        return res.json().then(function (data) {
          data = data || {};
          if (!res.ok && !data.error && !data.blocked) data.error = 'HTTP ' + res.status;
          show(out, data, res);
        });
      }).catch(function (err) {
        if (out) out.textContent = 'Request failed: ' + err;
      });
    });
  }

  bind('transcribeForm', 'transcribeOut');
  bind('ocrForm', 'ocrHostedOut');
})();
