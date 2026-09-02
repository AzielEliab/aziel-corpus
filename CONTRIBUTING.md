# Contributing

Forks are welcome and always allowed.

This repository is Aziel Digital Library v2.6.2. Keep the honest scope.
Do not turn it into a 26-card software index. Public identity is Aziel Eliab only.

Local Python MASTER on :8765 is writable without login (tests POST without auth).
The public website https://www.azielcorpuslibrary.net is the MASTER with
anonymous GET and login-required POST.

```bash
python3 -m unittest discover -s tests
python3 aziel_launcher.py
```
