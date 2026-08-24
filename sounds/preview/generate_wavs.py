#!/usr/bin/env python3
"""生成玉音效试听 WAV + MP3"""
import math
import random
import struct
import subprocess
import wave
from pathlib import Path

SR = 44100
DUR = 0.35
N = int(SR * DUR)
RNG = random.Random(42)
OUT = Path(__file__).resolve().parent


def mix(*bufs):
    out = [0.0] * N
    for b in bufs:
        for i, v in enumerate(b):
            if i < N:
                out[i] += v
    return out


def impulse(ms, curve=3.5, peak=1.0):
    ln = max(1, int(ms * SR))
    buf = [0.0] * N
    for i in range(ln):
        buf[i] = (RNG.random() * 2 - 1) * (1 - i / ln) ** curve * peak
    return buf


def biquad_bandpass(x, freq, q):
    w0 = 2 * math.pi * freq / SR
    alpha = math.sin(w0) / (2 * q)
    c = math.cos(w0)
    b0, b1, b2 = alpha, 0.0, -alpha
    a0 = 1 + alpha
    a1, a2 = -2 * c, 1 - alpha
    b0, b1, b2 = b0 / a0, b1 / a0, b2 / a0
    a1, a2 = a1 / a0, a2 / a0
    y = [0.0] * len(x)
    x1 = x2 = y1 = y2 = 0.0
    for i, s in enumerate(x):
        y0 = b0 * s + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y1, y2 = x1, s, y1, y0
        y[i] = y0
    return y


def biquad_highpass(x, freq, q=0.707):
    w0 = 2 * math.pi * freq / SR
    alpha = math.sin(w0) / (2 * q)
    c = math.cos(w0)
    b0 = (1 + c) / 2
    b1, b2 = -(1 + c), b0
    a0 = 1 + alpha
    a1, a2 = -2 * c, 1 - alpha
    b0, b1, b2 = b0 / a0, b1 / a0, b2 / a0
    a1, a2 = a1 / a0, a2 / a0
    y = [0.0] * len(x)
    x1 = x2 = y1 = y2 = 0.0
    for i, s in enumerate(x):
        y0 = b0 * s + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y1, y2 = x1, s, y1, y0
        y[i] = y0
    return y


def env_at(i, attack, decay, peak):
    t = i / SR
    if t < attack:
        return peak * (t / attack if attack else 1)
    return peak * math.exp(-(t - attack) / decay)


def sine_tone(freq0, freq1, dur, peak, start=0):
    buf = [0.0] * N
    samples = int(dur * SR)
    i0 = int(start * SR)
    for i in range(samples):
        idx = i0 + i
        if idx >= N:
            break
        t = i / SR
        f = freq0 * ((freq1 / freq0) ** (t / dur)) if dur else freq0
        buf[idx] = math.sin(2 * math.pi * f * t) * env_at(i, 0.002, dur * 0.35, peak)
    return buf


def noise_hit(ms, filt, freq, q, peak, decay, start=0, hp=False):
    raw = impulse(ms, 4 if not hp else 4.2, 1.0)
    if hp:
        raw = biquad_highpass(raw, freq, q)
    else:
        raw = biquad_bandpass(raw, freq, q)
    buf = [0.0] * N
    i0 = int(start * SR)
    for i in range(N - i0):
        buf[i0 + i] = raw[i] * env_at(i, 0.0004, decay, peak)
    return buf


def modal(f, q, pk, d, start=0):
    return noise_hit(0.004, 'bp', f, q, pk, d, start)


def norm(samples):
    peak = max(abs(v) for v in samples) or 1.0
    return [max(-1.0, min(1.0, v / peak * 0.98)) for v in samples]


def synth_A1():
    return norm(sine_tone(2840, 2100, 0.055, 0.12))


def synth_A2():
    return norm(mix(sine_tone(3200, 3200, 0.035, 0.1), sine_tone(4800, 4800, 0.035, 0.06)))


def synth_A3():
    return norm(noise_hit(0.003, 'bp', 4200, 18, 0.2, 0.025))


def synth_A4():
    buf = [0.0] * N
    samples = int(0.075 * SR)
    for i in range(samples):
        t = i / SR
        f = 1680 * ((1240 / 1680) ** (t / 0.05))
        phase = 2 * math.pi * f * t
        tri = 2 / math.pi * math.asin(math.sin(phase))
        buf[i] = tri * env_at(i, 0.003, 0.07, 0.09)
    return norm(buf)


def synth_B1():
    return norm(noise_hit(0.018, 'hp', 2400, 0.8, 0.25, 0.045, hp=True))


def synth_B2():
    parts = [noise_hit(0.008, 'bp', 3800 + i * 900, 6, 0.14 - i * 0.02, 0.012, start=off)
             for i, off in enumerate([0, 0.008, 0.018, 0.03])]
    return norm(mix(*parts))


def synth_B3():
    return norm(mix(modal(2400, 12, 0.16, 0.035), modal(3600, 14, 0.12, 0.028), modal(5200, 16, 0.08, 0.02)))


def synth_B4():
    return norm(noise_hit(0.012, 'bp', 6200, 3, 0.18, 0.08))


def synth_C1():
    return norm(mix(synth_A3(), synth_B3()))


def synth_C2():
    crack = noise_hit(0.004, 'hp', 2200, 0.9, 0.3, 0.014, hp=True)
    modes = mix(modal(2680, 15, 0.15, 0.028), modal(3920, 17, 0.1, 0.022), modal(5480, 19, 0.07, 0.016))
    return norm(mix(crack, modes))


def synth_C3():
    parts = [synth_A2()]
    for i, off in enumerate([0.006, 0.014, 0.024]):
        parts.append(noise_hit(0.006, 'bp', 5000 + i * 800, 8, 0.1, 0.01, start=off))
    return norm(mix(*parts))


def synth_C4():
    main = noise_hit(0.005, 'bp', 3400, 22, 0.28, 0.032)
    tail = mix(sine_tone(4200, 3000, 0.018, 0.06, 0.012), sine_tone(5600, 3000, 0.018, 0.06, 0.022))
    return norm(mix(main, tail))


def synth_C5():
    return norm(mix(synth_B2(), sine_tone(3100, 2400, 0.03, 0.08)))


PRESETS = {
    'A1': synth_A1, 'A2': synth_A2, 'A3': synth_A3, 'A4': synth_A4,
    'B1': synth_B1, 'B2': synth_B2, 'B3': synth_B3, 'B4': synth_B4,
    'C1': synth_C1, 'C2': synth_C2, 'C3': synth_C3, 'C4': synth_C4, 'C5': synth_C5,
}


def write_wav(path, samples):
    pcm = b''.join(struct.pack('<h', int(s * 32767)) for s in samples)
    with wave.open(str(path), 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in PRESETS.items():
        wav_path = OUT / f'{name}.wav'
        mp3_path = OUT / f'{name}.mp3'
        write_wav(wav_path, fn())
        subprocess.run(
            [
                'ffmpeg', '-y', '-i', str(wav_path),
                '-af', 'volume=5.0,highpass=f=60',
                '-codec:a', 'libmp3lame', '-b:a', '192k',
                str(mp3_path),
            ],
            capture_output=True,
            check=True,
        )
        print(mp3_path)
