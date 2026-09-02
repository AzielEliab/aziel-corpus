from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = (ROOT / "SKILL.md").read_text(encoding="utf-8")


def test_skill_frontmatter_and_urls() -> None:
    assert SKILL.startswith("---\n")
    assert "name: Aziel Corpus Library" in SKILL
    assert "Mozilla/5.0" in SKILL
    assert "https://www.azielcorpuslibrary.net/openapi.json" in SKILL
    assert "https://aziel-runtime.vibelock.workers.dev/openapi.json" in SKILL
    assert "https://aziel-runtime.vibelock.workers.dev/mcp" in SKILL
    assert "not zenodo" in SKILL.lower() or "Not Zenodo" in SKILL
    assert "Aziel Eliab" in SKILL
    assert "GodLock.AZ" not in SKILL
    assert "Collin Horton" not in SKILL
    assert "Jack Altman" not in SKILL


def test_doctor_still_present() -> None:
    cli = (ROOT / "aziel_corpus" / "cli.py").read_text(encoding="utf-8")
    assert 'sub.add_parser("doctor"' in cli or 'p_doc = sub.add_parser("doctor"' in cli
    assert (ROOT / "aziel_corpus" / "doctor.py").is_file()
