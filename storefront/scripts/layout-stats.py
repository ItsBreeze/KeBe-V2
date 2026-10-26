"""The figures behind Dvorak's rules on the homepage (src/lib/util/kebe-copy.ts,
DVORAK), for KeBe's letters and for QWERTY's.

    pip install wordfreq
    python scripts/layout-stats.py

Single letters (hand shares, rows) use Lewand's English letter frequencies, the
table behind the home-row figure and the reel's. Letter pairs use wordfreq's
100,000 most common English words, weighted by how often each is used, and
count only pairs inside a word: the space between words is a thumb on KeBe.
A pair of one letter twice (the ll in all) is left out of the same-finger count.

KeBe's letters sit where Dvorak put them, and each column keeps the finger a
Dvorak typist uses (src/lib/train/layout.ts), so the KeBe figures are Dvorak's.
"""
from collections import Counter
from wordfreq import top_n_list, word_frequency

LEWAND = dict(zip('abcdefghijklmnopqrstuvwxyz', [
    8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153,
    0.772, 4.025, 2.406, 6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056,
    2.758, 0.978, 2.360, 0.150, 1.974, 0.074]))

# Distance from the thumb: a pair rolls inward when it moves to a lower one.
RANK = {'pinky': 4, 'ring': 3, 'middle': 2, 'pointer': 1}
FINGERS = [('L', 'pinky'), ('L', 'ring'), ('L', 'middle'), ('L', 'pointer'),
           ('L', 'pointer'), ('R', 'pointer'), ('R', 'pointer'),
           ('R', 'middle'), ('R', 'ring'), ('R', 'pinky')]


def board(top, home, bottom):
    """Each letter's (hand, finger, row): rows 0 top, 1 home, 2 bottom."""
    return {ch: (*FINGERS[col], row)
            for row, keys in enumerate((top, home, bottom))
            for col, ch in enumerate(keys) if ch.isalpha()}


BOARDS = {
    'KeBe (Dvorak)': board("',.pyfgcrl", 'aoeuidhtns', ';qjkxbmwvz'),
    'QWERTY': board('qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'),
}

pairs = Counter()
for word in top_n_list('en', 100000):
    if word.isascii() and word.isalpha():
        f = word_frequency(word, 'en')
        for a, b in zip(word, word[1:]):
            pairs[a + b] += f
total = sum(pairs.values())
print('Most common pairs:', ' '.join(p.upper() for p, _ in pairs.most_common(10)))

for name, keys in BOARDS.items():
    share = lambda test: sum(v for c, v in LEWAND.items() if test(keys[c]))
    print(f'\n{name}, letters (Lewand):')
    print(f'  left hand {share(lambda k: k[0] == "L"):.1f}%, '
          f'right hand {share(lambda k: k[0] == "R"):.1f}%')
    print(f'  top row {share(lambda k: k[2] == 0):.1f}%, '
          f'home row {share(lambda k: k[2] == 1):.1f}%, '
          f'bottom row {share(lambda k: k[2] == 2):.1f}%')

    switch = inward = outward = same = hurdle = 0
    rolls_in = Counter()
    for p, v in pairs.items():
        (h1, f1, r1), (h2, f2, r2) = keys[p[0]], keys[p[1]]
        if h1 != h2:
            switch += v
        elif f1 == f2:
            if p[0] != p[1]:
                same += v
                hurdle += v if abs(r1 - r2) == 2 else 0
        elif RANK[f2] < RANK[f1]:
            inward += v
            rolls_in[p] += v
        else:
            outward += v
    pc = lambda v: f'{100 * v / total:.1f}%'
    print('Letter pairs inside words (wordfreq):')
    print(f'  switch hands {pc(switch)}')
    print(f'  one hand, two fingers: {100 * inward / (inward + outward):.0f}% '
          f'roll inward (most used: '
          f'{" ".join(p.upper() for p, _ in rolls_in.most_common(5))})')
    print(f'  one finger, two keys {pc(same)} (about 1 in '
          f'{total / same:.0f}), over the home row {pc(hurdle)}')
