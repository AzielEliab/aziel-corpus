"""Aziel Corpus Library: public library index of Aziel Eliab software.

THIS IS: a public library index of Aziel Eliab software plus a counted
download of the printed 468-page corpus PDF and the library package.

THIS IS NOT: a search engine of private files; Zenodo; a new Lock engine.
GodLock is a product name in the corpus. Author Aziel Eliab only.

Author: Aziel Eliab, 2026. Apache-2.0.
Forks are welcome and always allowed.
"""

from __future__ import annotations

from aziel_corpus.catalog import (
    ENGINE_VERSION,
    LIMITATION,
    SPEC_STRING,
    export_works,
    import_works,
    load_works,
    search_works,
)

__version__ = "0.1.0"
__author__ = "Aziel Eliab"
__all__ = [
    "ENGINE_VERSION",
    "LIMITATION",
    "SPEC_STRING",
    "__version__",
    "export_works",
    "import_works",
    "load_works",
    "search_works",
]
