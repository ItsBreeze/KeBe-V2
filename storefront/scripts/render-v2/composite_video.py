"""Keeps an AI image-to-video clip's camera move and puts the exact keyboard back.

Video models redraw small legends from the first frame on ("osc" for esc,
keys merging), however still the prompt asks the keyboard to stay. The camera
move and the light are good, so this keeps those and replaces the keyboard:

  1. the clip was generated from one of composite.py's stills, whose keyboard
     is exact; match that still to the clip's first frame (SIFT homography),
  2. follow the camera: for every frame, ECC homography from the first frame,
     measured on the scene only (the keyboard is masked out, since that is the
     part the model is redrawing), each frame starting from the last,
  3. erase a ring round the silhouette in each frame (the model's keyboard
     drifts a little in size, so its edge would show), then warp the still's
     keyboard -- the CAD silhouette, a little dilated so the glow round it
     comes along -- into the frame and blend it in,
  4. encode WebM (VP9) and MP4 (H.264), as shoot.mjs does for the turntable,
     and keep the first frame as <out-stem>.jpg for the poster.

  python3 composite_video.py <clip.mp4> <still.jpg> <backplate.jpg> \\
      <reference.jpg> <layer-rgba.png> <out-stem> [lit]

still is composite.py's output; backplate, reference and layer are the
inputs composite.py made it from (they give the keyboard's silhouette in the
still). Needs opencv-python-headless, numpy and ffmpeg (FFMPEG=<path>).
"""

import os
import subprocess
import sys
import tempfile

import cv2
import numpy as np

from composite import homography

GROW = {"lit": 6, "": 1}  # px: the silhouette's margin -- wide enough for a lit
# keyboard's glow; by day just the anti-aliased edge, since anything wider
# copies the still's static desk over the clip's moving light
RING = 14  # px: past that, the model's own keyboard is erased (it drifts in size)


def main(clip, still_path, plate_path, ref_path, layer_path, out_stem, mode=""):
    grow = GROW["lit" if mode == "lit" else ""]
    still = cv2.imread(still_path, cv2.IMREAD_COLOR)
    plate = cv2.imread(plate_path, cv2.IMREAD_COLOR)
    ref = cv2.imread(ref_path, cv2.IMREAD_COLOR)
    layer = cv2.imread(layer_path, cv2.IMREAD_UNCHANGED)
    if still.shape[:2] != plate.shape[:2]:
        raise SystemExit("the still and its backplate differ in size: pass the pair composite.py used")

    # the keyboard's silhouette in the still
    H_plate = homography(ref, plate)
    sil = cv2.warpPerspective(layer[:, :, 3], H_plate, (still.shape[1], still.shape[0]))

    cap = cv2.VideoCapture(clip)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    frames = []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        frames.append(f)
    if len(frames) < 2:
        raise SystemExit("could not read the clip")
    fh, fw = frames[0].shape[:2]

    # 1. still -> first frame
    H0 = homography(still, frames[0])
    sil0 = cv2.warpPerspective(sil, H0, (fw, fh))
    scene = (cv2.dilate((sil0 > 64).astype(np.uint8), np.ones((31, 31), np.uint8)) == 0).astype(np.uint8)
    prep = lambda f: cv2.GaussianBlur(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0, (0, 0), 1.5)
    t0 = prep(frames[0])

    tmp = tempfile.mkdtemp(prefix="kebe-clip-")
    warp = np.eye(3, dtype=np.float32)
    kernel = np.ones((2 * grow + 1, 2 * grow + 1), np.uint8)
    ring_kernel = np.ones((2 * RING + 1, 2 * RING + 1), np.uint8)
    for i, f in enumerate(frames):
        # 2. first frame -> this frame, on the scene only
        if i:
            try:
                _, warp = cv2.findTransformECC(t0, prep(f), warp, cv2.MOTION_HOMOGRAPHY,
                                               (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), scene, 5)
            except cv2.error:
                pass  # keep the last frame's estimate
        H = warp.astype(np.float64) @ H0
        # 3. the exact keyboard into this frame
        kb = cv2.warpPerspective(still, H, (fw, fh), flags=cv2.INTER_AREA)
        m = cv2.warpPerspective(sil, H, (fw, fh), flags=cv2.INTER_LINEAR)
        solid = (m > 127).astype(np.uint8)
        ring = cv2.dilate(solid, ring_kernel) - cv2.erode(solid, np.ones((3, 3), np.uint8))
        base = np.where(ring[:, :, None] > 0, cv2.inpaint(f, ring, 5, cv2.INPAINT_TELEA), f)
        m = cv2.GaussianBlur(cv2.dilate(m, kernel).astype(np.float32) / 255.0, (0, 0), 1.2)[:, :, None]
        out = kb.astype(np.float32) * m + base.astype(np.float32) * (1 - m)
        frame = np.clip(out, 0, 255).astype(np.uint8)
        cv2.imwrite(os.path.join(tmp, f"f{i:04d}.png"), frame)
        if i == 0:
            cv2.imwrite(f"{out_stem}.jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 84])

    # 4. encode
    ff = os.environ.get("FFMPEG", "ffmpeg")
    src = ["-y", "-loglevel", "error", "-framerate", f"{fps:g}", "-i", os.path.join(tmp, "f%04d.png")]
    subprocess.run([ff, *src, "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", "-an", f"{out_stem}.mp4"], check=True)
    subprocess.run([ff, *src, "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-row-mt", "1",
                    "-pix_fmt", "yuv420p", "-an", f"{out_stem}.webm"], check=True)
    for name in os.listdir(tmp):
        os.remove(os.path.join(tmp, name))
    os.rmdir(tmp)
    print(f"wrote {out_stem}.mp4 and .webm ({len(frames)} frames, {fw}x{fh})")


if __name__ == "__main__":
    if len(sys.argv) not in (7, 8):
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
