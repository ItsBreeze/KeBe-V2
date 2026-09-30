# The -400/-800/-1600/-2400 jpg/webp/avif copies beside each v1 photo, so
# no size variant keeps an old shot under the same name.
import sys, os
from PIL import Image

DIR = sys.argv[1]
for stem in ("kebe-v1-hero", "kebe-v1-angle", "kebe-v1-rgb"):
    src = Image.open(os.path.join(DIR, stem + ".jpg")).convert("RGB")
    for w in (400, 800, 1600, 2400):
        im = src.resize((w, w * 3 // 4), Image.LANCZOS)
        base = os.path.join(DIR, f"{stem}-{w}")
        im.save(base + ".jpg", quality=86, optimize=True, progressive=True)
        im.save(base + ".webp", quality=82, method=6)
        im.save(base + ".avif", quality=60)
    print(stem)
