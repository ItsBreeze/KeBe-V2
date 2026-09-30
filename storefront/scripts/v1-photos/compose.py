# Composite the owner's v1 cut-outs (the hardware repo's Images/, Aug 2024)
# onto the store's gallery ground (#1C1A17, bg-kebe-raised) so they sit in
# the dark site. The grey-backdrop phone shots they replace looked washed out.
#
#   python scripts/v1-photos/compose.py public/products
#
# then make the size variants with scripts/v1-photos/variants.py.
import sys, os, numpy as np, cv2
from PIL import Image

SRC = os.environ.get(
    "KEBE_IMAGES", r"C:\Users\brise\OneDrive\Documents\Projects\KeBe\Images"
)
OUT = sys.argv[1]
W, H = 2400, 1800
GROUND = np.array([0x1C, 0x1A, 0x17], np.float32)
LIFT = np.array([0x26, 0x23, 0x1E], np.float32)

SHOTS = {
    "kebe-v1-hero": ("IMG_0275.png", 0.86, 0.80),
    "kebe-v1-angle": ("20240809_181721988_iOS.png", 0.90, 0.80),
    "kebe-v1-rgb": ("20240809_181331502_iOS.png", 0.88, 0.80),
}

def clean_alpha(a):
    # Drop specks left by the cut-out, then pull the edge in a hair so no
    # trace of the old pale backdrop rims the board on a dark ground.
    m = (a > 8).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    big = stats[1:, cv2.CC_STAT_AREA].max()
    keep = np.zeros(n, bool)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] > big * 0.002
    a = np.where(keep[lab], a, 0).astype(np.uint8)
    a = cv2.erode(a, np.ones((3, 3), np.uint8), iterations=2)
    return cv2.GaussianBlur(a, (0, 0), 1.2)

def ground():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((x - W / 2) / (W * 0.55)) ** 2 + ((y - H * 0.48) / (H * 0.55)) ** 2)
    t = np.clip(1 - d, 0, 1) ** 1.6
    return GROUND + (LIFT - GROUND) * t[..., None]

for name, (f, fw, fh) in SHOTS.items():
    im = np.array(Image.open(os.path.join(SRC, f)).convert("RGBA"))
    a = clean_alpha(im[..., 3])
    ys, xs = np.nonzero(a > 8)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgb, a = im[y0:y1, x0:x1, :3].astype(np.float32), a[y0:y1, x0:x1]
    s = min(W * fw / (x1 - x0), H * fh / (y1 - y0))
    w, h = int((x1 - x0) * s), int((y1 - y0) * s)
    rgb = cv2.resize(rgb, (w, h), interpolation=cv2.INTER_AREA)
    a = cv2.resize(a, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    ox, oy = (W - w) // 2, int((H - h) * 0.46)

    bg = ground()
    # A soft contact shadow, a little below the board.
    sh = np.zeros((H, W), np.float32)
    sh[oy:oy + h, ox:ox + w] = a
    sh = np.roll(sh, int(H * 0.018), axis=0)
    sh = cv2.GaussianBlur(sh, (0, 0), H * 0.02) * 0.55
    bg *= (1 - sh)[..., None]

    region = bg[oy:oy + h, ox:ox + w]
    bg[oy:oy + h, ox:ox + w] = region * (1 - a[..., None]) + rgb * a[..., None]
    out = Image.fromarray(np.clip(bg + np.random.normal(0, 0.6, bg.shape), 0, 255).astype(np.uint8))
    out.save(os.path.join(OUT, name + ".jpg"), quality=88, optimize=True, progressive=True)
    print(name, f, os.path.getsize(os.path.join(OUT, name + ".jpg")) // 1024, "KB")
