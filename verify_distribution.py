from pathlib import Path
import hashlib
root=Path(__file__).resolve().parent
manifest=root/"PACKAGE_SHA256SUMS.txt"
errors=[]
for line in manifest.read_text("utf-8").splitlines():
    if not line.strip(): continue
    expected,rel=line.split("  ",1); f=root/rel
    if not f.exists(): errors.append("MISSING "+rel); continue
    actual=hashlib.sha256(f.read_bytes()).hexdigest()
    if actual!=expected: errors.append("HASH "+rel)
print("AZIEL DISTRIBUTION VERIFIED" if not errors else chr(10).join(errors))
raise SystemExit(0 if not errors else 1)
