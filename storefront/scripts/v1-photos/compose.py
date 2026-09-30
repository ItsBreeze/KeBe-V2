# KeBe v1 studio stills: the owner's lit cut-outs (the hardware repo's
# Images/, Aug 2024) on a dark ground, with the board's real underglow lifted
# off the original frame's desk. The grey-backdrop shots they replace looked
# washed out on the dark store.
#
#   pip install opencv-python-headless pillow-heif
#   python scripts/v1-photos/compose.py public/products [name ...]
#   python scripts/v1-photos/variants.py public/products
#
# The glow is the desk's colour minus its own room-light tint, kept only close
# to the board; nothing is painted in that the photo did not show.
import sys, os, numpy as np, cv2
from PIL import Image, ImageOps
import pillow_heif
pillow_heif.register_heif_opener()

SRC = os.environ.get("KEBE_IMAGES", r"C:\Users\brise\OneDrive\Documents\Projects\KeBe\Images")
W, H = 2400, 1800

def lin(x): return np.power(np.clip(x, 0, 1), 2.2)
def srgb(x): return np.power(np.clip(x, 0, 1), 1 / 2.2)

def load(name):
    return np.asarray(ImageOps.exif_transpose(Image.open(os.path.join(SRC, name))).convert("RGB"), np.float32) / 255

def clean_alpha(a):
    m = (a > 8).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    big = st[1:, cv2.CC_STAT_AREA].max()
    keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] > big * 0.002
    a = np.where(keep[lab], a, 0).astype(np.uint8)
    a = cv2.erode(a, np.ones((3, 3), np.uint8), iterations=2)
    return cv2.GaussianBlur(a, (0, 0), 1.2).astype(np.float32) / 255

def glow_layer(orig, alpha, cable_lum=0.55, reach=0.045, drop_warm=False):
    """Coloured light on the desk around the board, in linear light."""
    L = lin(orig)
    mn = L.min(axis=2, keepdims=True)
    chroma = L - mn
    board = cv2.dilate((alpha > 0.02).astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
    lum = orig.mean(axis=2)
    bright = lum > cable_lum                       # cable, stray objects
    bright = cv2.dilate(bright.astype(np.uint8), np.ones((31, 31), np.uint8)) > 0
    w = (~board & ~bright).astype(np.float32)
    # The desk's own tint, measured far from the board, is not glow.
    dist = cv2.distanceTransform((~board).astype(np.uint8), cv2.DIST_L2, 5)
    # Room light tints the desk unevenly, so the tint is a slow map measured
    # away from the board (at 1/8 scale), carried in under it by the blur.
    h0, w0 = orig.shape[:2]
    far = ((dist > 0.15 * h0) & (w > 0)).astype(np.float32)
    small = lambda x: cv2.resize(x, (w0 // 8, h0 // 8), interpolation=cv2.INTER_AREA)
    sg = 0.16 * h0 / 8
    fs = small(far)
    tint = cv2.GaussianBlur(small(chroma) * fs[..., None], (0, 0), sg) / np.maximum(
        cv2.GaussianBlur(fs, (0, 0), sg), 1e-3)[..., None]
    tint = cv2.resize(tint, (w0, h0), interpolation=cv2.INTER_LINEAR)
    g = np.clip(chroma - tint * 1.15, 0, None)
    if drop_warm:
        # Orange-yellow here is lamp light off the cable, not the LEDs.
        r, gg, b = g[..., 0], g[..., 1], g[..., 2]
        warm = (r > 1.3 * b) & (gg > 0.35 * r)
        g = g * (~warm)[..., None]
    # Normalised blur: smooth the desk texture, fill under the board.
    s = 0.012 * orig.shape[0]
    num = cv2.GaussianBlur(g * w[..., None], (0, 0), s)
    den = cv2.GaussianBlur(w, (0, 0), s)[..., None]
    g = num / np.maximum(den, 1e-3)
    # Keep only the light pooling at the board: room colour and reflections
    # far off it read as blobs once the desk is gone.
    near = np.exp(-(dist / (reach * orig.shape[0])) ** 2)
    return g * near[..., None]

def ground():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((x - W * 0.5) / (W * 0.62)) ** 2 + ((y - H * 0.50) / (H * 0.62)) ** 2)
    t = np.clip(1 - d, 0, 1) ** 1.8
    edge, pool = np.array([0x0E, 0x0D, 0x0B]) / 255, np.array([0x22, 0x1F, 0x1B]) / 255
    return lin(edge + (pool - edge) * t[..., None])

def grade(rgb, a):
    """Clean the caps' grey-warm cast and give them a little snap."""
    L = lin(rgb)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    caps = (a > 0.9) & (sat < 0.06) & (rgb.mean(axis=2) > 0.45)
    if caps.sum() > 1000:
        cast = L[caps].mean(axis=0)
        L = L * (cast.mean() / cast) ** 0.7
        wp = np.percentile(L[caps].mean(axis=1), 99.3)
        L = L * min(0.92 / wp, 1.35)
    out = srgb(L)
    out = out + 0.10 * (out - 0.5) * (1 - np.abs(out - 0.5) * 2)  # gentle S
    return np.clip(out, 0, 1)

def compose(cut, orig_name, out_path, fit=(0.88, 0.76), vpos=0.44, whole_frame=False, gain=1.4, cable_lum=0.55, reach=0.045, drop_warm=False):
    im = np.asarray(Image.open(os.path.join(SRC, cut)).convert("RGBA"))
    a = clean_alpha(im[..., 3]); rgb = im[..., :3].astype(np.float32) / 255
    glow = glow_layer(load(orig_name), a, cable_lum, reach, drop_warm)
    if whole_frame:
        x0, y0, x1, y1 = 0, 0, im.shape[1], im.shape[0]
    else:
        ys, xs = np.nonzero(a > 0.03)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    s = W / (x1 - x0) if whole_frame else min(W * fit[0] / (x1 - x0), H * fit[1] / (y1 - y0))
    ox = 0 if whole_frame else (W - (x1 - x0) * s) / 2
    oy = 0 if whole_frame else (H - (y1 - y0) * s) * vpos
    M = np.float32([[s, 0, ox - x0 * s], [0, s, oy - y0 * s]])
    warp = lambda img, bv=0: cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_AREA, borderValue=bv)
    A = warp(a); RGB = warp(grade(rgb, a)); G = warp(glow.astype(np.float32))

    bg = ground()
    ao = cv2.GaussianBlur(np.roll(A, int(H * 0.006), 0), (0, 0), H * 0.006)
    soft = cv2.GaussianBlur(np.roll(A, int(H * 0.02), 0), (0, 0), H * 0.03)
    bg *= (1 - 0.75 * ao)[..., None] * (1 - 0.45 * soft)[..., None]
    bg += gain * G
    out = srgb(bg) * (1 - A[..., None]) + RGB * A[..., None]
    out = np.clip(out * 255 + np.random.normal(0, 0.7, out.shape), 0, 255).astype(np.uint8)
    Image.fromarray(out).save(out_path, quality=88, optimize=True, progressive=True)

SHOTS = {
    "kebe-v1-hero":   dict(cut="IMG_0275.png", orig_name="IMG_0275.jpg"),
    "kebe-v1-angle":  dict(cut="20240809_181721988_iOS.png", orig_name="20240809_181721988_iOS.heic", fit=(0.90, 0.80), gain=2.2),
    "kebe-v1-rgb":    dict(cut="20240809_181331502_iOS.png", orig_name="20240809_181331502_iOS.heic", fit=(0.88, 0.70), vpos=0.47, gain=1.0, reach=0.035, drop_warm=True),
    "kebe-v1-port":   dict(cut="20240809_181446940_iOS.png", orig_name="20240809_181446940_iOS.heic", whole_frame=True, cable_lum=0.45),
    "kebe-v1-profile": dict(cut="IMG_0276.png", orig_name="IMG_0276.jpg"),
}

if __name__ == "__main__":
    out = sys.argv[1]
    only = sys.argv[2:] or list(SHOTS)
    for name in only:
        compose(out_path=os.path.join(out, name + ".jpg"), **SHOTS[name])
        print(name)
