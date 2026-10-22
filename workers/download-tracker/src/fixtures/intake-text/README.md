# intake-text fixtures (CORPUS-INTAKE-SAFETY-1.0 c)

- `python-docx-default.docx` — a document saved by python-docx from its stock default
  template (MIT-licensed template; Word's `docProps/app.xml` carries
  `<Template>Normal.dotm</Template>` and the package is full of schema URLs). The body is
  benign filler ("Field notes", a plain paragraph, a 2x2 table). The template's
  `docProps/thumbnail.jpeg` was removed (with its rel and content type) so the media floor,
  which refuses every image, does not refuse it first. Used as a must-pass control for the
  text checks. Author: Aziel Eliab.
