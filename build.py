#!/usr/bin/env python3
"""Assemble the site from src/ into standalone HTML files.

  python3 build.py

Outputs
  index.html                      the full site (open directly or serve with GitHub Pages)
  prototypes/*.html               earlier art-direction prototypes, wrapped as standalone pages
  site.html                       the same site as a bare fragment, for hosts that add their own
                                  <html>/<head> wrapper (git-ignored)
"""
from pathlib import Path

ROOT = Path(__file__).parent
THREE = (
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n'
    # Order endpoint lives in its own file so it can be changed without rebuilding.
    '<script src="order-config.js"></script>\n'
)

RESET = """<style>
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0}
img{max-width:100%}
[hidden]{display:none!important}
</style>
"""


def wrap(fragment: str) -> str:
    """Turn a fragment (title/meta/link/style first, markup after) into a full HTML document."""
    cut = fragment.index("</style>") + len("</style>")
    head, body = fragment[:cut], fragment[cut:]
    return (
        "<!doctype html>\n<html lang=\"zh-Hant\">\n<head>\n"
        "<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
        + RESET + head.strip() + "\n</head>\n<body>\n" + body.strip() + "\n</body>\n</html>\n"
    )


def main() -> None:
    src = ROOT / "src"
    fragment = (
        (src / "a_page.html").read_text(encoding="utf-8")
        + THREE
        + (src / "b_engine.js").read_text(encoding="utf-8")
        + (src / "c_engine_tail.js").read_text(encoding="utf-8")
        + (src / "d_shop.js").read_text(encoding="utf-8")
    )
    (ROOT / "site.html").write_text(fragment, encoding="utf-8")
    (ROOT / "index.html").write_text(wrap(fragment), encoding="utf-8")

    out = ROOT / "prototypes"
    out.mkdir(exist_ok=True)
    for f in sorted((ROOT / "prototypes" / "src").glob("*.html")):
        (out / f.name).write_text(wrap(f.read_text(encoding="utf-8")), encoding="utf-8")
    print("built index.html, site.html and", len(list((ROOT / "prototypes" / "src").glob("*.html"))), "prototypes")


if __name__ == "__main__":
    main()
