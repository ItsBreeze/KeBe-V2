"""Puts the exact CAD keyboard into an AI-generated product photo.

Image models reproduce the scene (desk, light, shadows) convincingly but not
68 small legends: every AI candidate invented some ("enle" for calc, a second
M). So the scene is theirs and the keyboard is ours:

  1. match the AI image to the CAD render it was made from (SIFT + RANSAC
     homography; the models keep the reference framing, so this is ~0.97
     scale and a few pixels of shift). A dark night scene has too little
     texture for SIFT, so it falls back to ECC from the plain size ratio,
  2. warp shoot.mjs's transparent render (index.html?alpha=1) onto it,
  3. inpaint a thin ring round the keyboard so no edge of the AI's own
     keyboard shows,
  4. carry the photo's broad light over (luminance ratio and a/b shift,
     blurred far past legend size, so sun streaks and warmth transfer and
     the legends stay the CAD's) -- except for a lit layer, whose light is
     its own LEDs,
  5. alpha-composite, and for a lit layer add the bloom the transparent
     render could not carry.

  python3 composite.py <ai.png> <reference.jpg> <layer-rgba.png> <out.jpg> [lit]

Needs opencv-python-headless and numpy.
"""

import sys

import cv2
import numpy as np

RING = 10  # px: how far past the CAD silhouette the AI keyboard is erased
SHADE_SIGMA = 22  # px: coarser than a legend, finer than a sun streak


def homography(ref, img):
    a = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY)
    b = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    sift = cv2.SIFT_create(8000)
    k1, d1 = sift.detectAndCompute(a, None)
    k2, d2 = sift.detectAndCompute(b, None)
    pairs = cv2.BFMatcher().knnMatch(d1, d2, k=2)
    good = [m for m, n in pairs if m.distance < 0.75 * n.distance]
    if len(good) >= 60:
        p1 = np.float32([k1[m.queryIdx].pt for m in good])
        p2 = np.float32([k2[m.trainIdx].pt for m in good])
        H, inliers = cv2.findHomography(p1, p2, cv2.RANSAC, 4.0)
        if H is not None and inliers.sum() >= 40:
            return H
    return ecc(a, b)


def ecc(a, b):
    """Affine ECC on softened luminance, starting from the size ratio."""
    h, w = b.shape
    prep = lambda x: cv2.GaussianBlur(np.sqrt(x.astype(np.float32) / 255.0), (0, 0), 3)
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        cc, warp = cv2.findTransformECC(
            cv2.resize(prep(a), (w, h)), prep(b), warp, cv2.MOTION_AFFINE,
            (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), None, 9)
    except cv2.error as e:
        raise SystemExit(f"no alignment: SIFT found too few matches and ECC failed ({e})")
    if cc < 0.3 or not (0.8 < warp[0, 0] < 1.25 and 0.8 < warp[1, 1] < 1.25):
        raise SystemExit(f"no trustworthy alignment (ECC {cc:.2f}, scale {warp[0, 0]:.2f}/{warp[1, 1]:.2f})")
    size = np.diag([w / a.shape[1], h / a.shape[0], 1.0])
    return np.vstack([warp, [0, 0, 1]]).astype(np.float64) @ size


def smooth(values, weight):
    """Gaussian blur of values over the weighted region only."""
    num = cv2.GaussianBlur(values * weight, (0, 0), SHADE_SIGMA)
    den = cv2.GaussianBlur(weight, (0, 0), SHADE_SIGMA)
    return num / np.maximum(den, 1e-4)


def main(ai_path, ref_path, layer_path, out_path, mode=""):
    lit = mode == "lit"
    ai = cv2.imread(ai_path, cv2.IMREAD_COLOR)
    ref = cv2.imread(ref_path, cv2.IMREAD_COLOR)
    layer = cv2.imread(layer_path, cv2.IMREAD_UNCHANGED)
    if layer is None or layer.shape[2] != 4:
        raise SystemExit("the layer must be an RGBA render (index.html?alpha=1)")

    H = homography(ref, ai)
    h, w = ai.shape[:2]
    warped = cv2.warpPerspective(layer, H, (w, h), flags=cv2.INTER_LANCZOS4)
    cad = warped[:, :, :3].astype(np.float32)
    alpha = warped[:, :, 3].astype(np.float32) / 255.0
    solid = (alpha > 0.5).astype(np.uint8)

    # 3. erase a ring round the silhouette, filled from the desk around it
    ring = cv2.dilate(solid, np.ones((2 * RING + 1, 2 * RING + 1), np.uint8)) - cv2.erode(solid, np.ones((3, 3), np.uint8))
    small = cv2.resize(ai, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    small_ring = cv2.resize(ring, (w // 2, h // 2), interpolation=cv2.INTER_NEAREST)
    filled = cv2.resize(cv2.inpaint(small, small_ring, 6, cv2.INPAINT_TELEA), (w, h), interpolation=cv2.INTER_CUBIC)
    base = np.where(ring[:, :, None] > 0, filled, ai).astype(np.float32)

    # 4. the photo's light on the CAD keyboard, in Lab (not for a lit layer)
    if lit:
        # The case and caps take the photo's darkness; the legends keep theirs.
        lum_ai = cv2.cvtColor(ai, cv2.COLOR_BGR2GRAY).astype(np.float32)
        lum_cad = cv2.cvtColor(np.clip(cad, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
        body = (cv2.erode(solid, np.ones((7, 7), np.uint8)) > 0) & (lum_cad < 70)
        if body.sum() > 1000:
            k = np.clip(np.median(lum_ai[body]) / max(np.median(lum_cad[body]), 1.0), 0.3, 1.5)
            dim = np.clip((110.0 - lum_cad) / 60.0, 0, 1)[:, :, None]  # 1 on the body, 0 on the legends
            cad = cad * (1 - dim) + cad * k * dim
        a = alpha[:, :, None]
        out = cad * a + base * (1 - a)
        # bloom: the bright legends and underglow, blurred at two radii, screened on
        glow = np.clip(cad * a - 90.0, 0, None) * (255.0 / 165.0)
        bloom = 0.55 * cv2.GaussianBlur(glow, (0, 0), 6) + 0.45 * cv2.GaussianBlur(glow, (0, 0), 22)
        out = 255.0 - (255.0 - out) * (255.0 - np.clip(bloom, 0, 255)) / 255.0
        cv2.imwrite(out_path, np.clip(out, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 88])
        print(f"wrote {out_path}")
        return

    lab_ai = cv2.cvtColor(ai, cv2.COLOR_BGR2LAB).astype(np.float32)
    lab_cad = cv2.cvtColor(np.clip(cad, 0, 255).astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
    inside = cv2.erode(solid, np.ones((7, 7), np.uint8)).astype(np.float32)
    ratio = np.clip((smooth(lab_ai[:, :, 0], inside) + 4) / (smooth(lab_cad[:, :, 0], inside) + 4), 0.45, 2.4)
    lab_cad[:, :, 0] = np.clip(lab_cad[:, :, 0] * ratio, 0, 255)
    for c in (1, 2):
        lab_cad[:, :, c] += smooth(lab_ai[:, :, c], inside) - smooth(lab_cad[:, :, c], inside)
    relit = cv2.cvtColor(np.clip(lab_cad, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)

    # 5. composite
    a = alpha[:, :, None]
    out = relit * a + base * (1 - a)
    cv2.imwrite(out_path, np.clip(out, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(f"wrote {out_path}")


if __name__ == "__main__":
    if len(sys.argv) not in (5, 6):
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
