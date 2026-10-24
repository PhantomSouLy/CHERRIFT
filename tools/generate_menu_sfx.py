#!/usr/bin/env python3
"""Original CHERRIFT crystal UI cues. Standard library only; 48 kHz stereo PCM16.
Run from the repository: python tools/generate_menu_sfx.py
No samples, external recordings or runtime synthesis dependencies.
"""
from pathlib import Path
import argparse
import array
import json
import math
import random
import wave

RATE = 48000
TAU = math.tau

def bell(buffer, onset, frequency, gain, decay):
    start = round(onset * RATE)
    for partial, weight, damping in [(1, 1, 1), (2.756, .19, .52), (4.12, .045, .32)]:
        end = min(len(buffer), start + round(decay * 8 * RATE))
        for i in range(start, end):
            t = (i - start) / RATE
            envelope = (1 - math.exp(-t / .0025)) * math.exp(-t / (decay * damping))
            buffer[i] += gain * weight * envelope * math.sin(TAU * frequency * partial * t)

def air(buffer, onset, duration, gain, seed):
    rng = random.Random(seed)
    low = slow = 0
    start = round(onset * RATE)
    count = min(len(buffer) - start, round(duration * RATE))
    for j in range(count):
        # A soft band of noise, not a sharp broadband hiss.
        low += .12 * (rng.uniform(-1, 1) - low)
        slow += .015 * (low - slow)
        envelope = math.sin(math.pi * j / count) ** 2
        buffer[start + j] += (low - slow) * gain * envelope

def sweep(buffer, onset, duration, start_frequency, end_frequency, gain):
    start = round(onset * RATE)
    for j in range(min(len(buffer) - start, round(duration * RATE))):
        t = j / RATE
        phase = TAU * (start_frequency * t + .5 * (end_frequency - start_frequency) * t * t / duration)
        envelope = math.sin(math.pi * t / duration) ** 2
        buffer[start + j] += gain * envelope * math.sin(phase)

def click_core(buffer):
    bell(buffer, 0, 1046.5, .24, .037)
    bell(buffer, .012, 1318.51, .055, .035)
    bell(buffer, 0, 523.25, .055, .018)

def cue(kind):
    duration = {'click': .22, 'play': .55, 'hover': .12, 'back': .32, 'page': .29}[kind]
    buffer = [0.] * round(duration * RATE)
    if kind in ('click', 'play'):
        click_core(buffer)
    if kind == 'play':
        bell(buffer, .048, 1318.51, .11, .068)
        bell(buffer, .096, 1567.98, .085, .082)
        bell(buffer, .145, 2093.0, .045, .072)
        bell(buffer, .025, 523.25, .035, .09)
        air(buffer, .008, .16, .09, 1)
    elif kind == 'hover':
        bell(buffer, 0, 1318.51, .055, .021)
        bell(buffer, .009, 1760.0, .009, .018)
    elif kind == 'back':
        air(buffer, 0, .18, .2, 2)
        sweep(buffer, .008, .12, 1150, 680, .025)
        bell(buffer, .025, 783.99, .09, .044)
        bell(buffer, .074, 523.25, .045, .052)
    elif kind == 'page':
        air(buffer, 0, .11, .24, 3)
        bell(buffer, .017, 1567.98, .075, .035)
        bell(buffer, .056, 1174.66, .08, .039)
        sweep(buffer, 0, .065, 840, 1400, .013)
    # Short, sparse stereo reflections; no long ringing on repeated input.
    channels = [[0.] * len(buffer) for _ in range(2)]
    for channel in range(2):
        for i, value in enumerate(buffer):
            channels[channel][i] += value
        for delay, gain in [(0.022 + channel * .004, .12), (.051 - channel * .003, .055)]:
            offset = round(delay * RATE)
            for i in range(offset, len(buffer)):
                channels[channel][i] += buffer[i - offset] * gain
    peak = max(abs(value) for channel in channels for value in channel) or 1
    target = {'click': .46, 'play': .68, 'hover': .19, 'back': .37, 'page': .40}[kind]
    for channel in channels:
        mean = sum(channel) / len(channel)
        for i, value in enumerate(channel):
            fade = min(1, i / (RATE * .001), (len(channel) - 1 - i) / (RATE * .018))
            channel[i] = (value - mean) * target / peak * max(0, fade)
    return channels

def write_wav(path, channels):
    samples = array.array('h')
    for left, right in zip(*channels):
        samples.extend((round(max(-1, min(1, left)) * 32767), round(max(-1, min(1, right)) * 32767)))
    import sys
    if sys.byteorder != 'little':
        samples.byteswap()
    with wave.open(str(path), 'wb') as output:
        output.setparams((2, 2, RATE, len(channels[0]), 'NONE', 'not compressed'))
        output.writeframes(samples.tobytes())

def build(root, preview=None):
    destination = root / 'assets/audio/menu'
    destination.mkdir(parents=True, exist_ok=True)
    records = []
    cues = {}
    for kind in ['play', 'click', 'hover', 'back', 'page']:
        channels = cue(kind)
        cues[kind] = channels
        path = destination / f'crystal-{kind}.wav'
        write_wav(path, channels)
        records.append(dict(kind=kind, file=path.name, seconds=round(len(channels[0])/RATE, 3), bytes=path.stat().st_size))
    (destination / 'manifest.json').write_text(json.dumps(dict(sampleRate=RATE, channels=2, bits=16, assets=records), indent=2)+'\n', encoding='utf-8')
    if preview:
        # Same relative mix as the game, with space between each cue.
        sequence = [[], []]
        gains = dict(play=.65, click=.55, hover=.30, back=.50, page=.50)
        for kind, channels in cues.items():
            for channel in range(2):
                sequence[channel].extend(value * gains[kind] * 1.5 for value in channels[channel])
                sequence[channel].extend([0.] * round(.65 * RATE))
        write_wav(preview, sequence)
    print(json.dumps(records, indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--preview', type=Path)
    args = parser.parse_args()
    build(args.root, args.preview)
