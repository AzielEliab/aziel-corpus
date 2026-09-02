from aziel_corpus.catalog import export_works, import_works, load_works, search_works


def test_load_26_works() -> None:
    doc = load_works()
    assert doc["count"] == 26
    assert len(doc["works"]) == 26
    assert doc["author"] == "Aziel Eliab"
    slugs = {w["slug"] for w in doc["works"]}
    assert "aziel-corpus" in slugs
    assert "aziel-corpus-pdf" in slugs
    assert "vibelock" in slugs


def test_search_vibelock() -> None:
    hits = search_works("vibelock")
    assert hits
    assert any(h["slug"] == "vibelock" for h in hits)
    assert len(search_works("")) == 26
    assert search_works("this-slug-does-not-exist") == []


def test_import_export_roundtrip() -> None:
    original = load_works()
    blob = export_works(original)
    back = import_works(blob)
    assert back["count"] == 26
    demo = import_works([{"slug": "demo", "name": "Demo", "one_line": "format proof"}])
    assert demo["count"] == 1
    assert demo["author"] == "Aziel Eliab"
