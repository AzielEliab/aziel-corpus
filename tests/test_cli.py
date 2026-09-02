from aziel_corpus import __version__
from aziel_corpus.cli import main


def test_cli_version(capsys) -> None:
    assert main(["version"]) == 0
    assert capsys.readouterr().out.strip() == f"aziel-corpus {__version__}"
    assert __version__ == "0.1.0"


def test_help_lists_commands(capsys) -> None:
    try:
        main(["--help"])
    except SystemExit as exc:
        assert exc.code == 0
    out = capsys.readouterr().out
    for word in ("ui", "doctor", "search", "works", "export", "version"):
        assert word in out


def test_cli_search(capsys) -> None:
    assert main(["search", "godlock"]) == 0
    import json

    payload = json.loads(capsys.readouterr().out)
    assert payload["ok"] is True
    assert payload["count"] >= 1
    assert "Aziel Eliab" in payload["limitation"]
