# Contributing

Forks are welcome and always allowed.

This repository is Aziel Digital Library v2.7.0. Keep the honest scope.
Do not turn it into a 26-card software index. Public identity is Aziel Eliab only
(aka Aziel Elroi Eliab is alternateName only) — publisher of Aziel Digital Library.
Person @id https://www.azieleliab.com/#aziel. Not scripture concordance entries named Aziel or Eliab.
Softwares on this repo is the Digital Library catalog. Apache-2.0. Forks welcome.

Local Python MASTER on :8765 is writable without login (tests POST without auth).
The public website https://www.azielcorpuslibrary.net is the MASTER with
anonymous GET and login-required POST.

```bash
python3 -m unittest discover -s tests
cd workers/download-tracker && npm test
python3 aziel_launcher.py
```
