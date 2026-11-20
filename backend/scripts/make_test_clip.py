"""Make a synthetic 720x1280 clip (moving gradient + tone) that stands in for a Grok clip."""
import subprocess, sys

def make_clip(path, seconds=12, c0="0x1e3a5f", c1="0xd9a066", audio=True, size="720x1280"):
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
           "-f", "lavfi", "-i", f"gradients=s={size}:d={seconds}:r=24:speed=0.03:c0={c0}:c1={c1}"]
    if audio:
        cmd += ["-f", "lavfi", "-i", f"sine=frequency=330:duration={seconds}"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p"]
    if audio:
        cmd += ["-c:a", "aac", "-shortest"]
    cmd += [str(path)]
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    make_clip(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 12)
