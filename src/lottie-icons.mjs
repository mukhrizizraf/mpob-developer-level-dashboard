// Project-authored Lottie result marks for the verdict card (white strokes on the blend colour).
// B30 = circle + check, B20 = circle + steady "hold" bars, B15 = circle + caution mark.
// Decoration only: no research values are used as keyframes.

const ease = { i: { x: 0.2, y: 1 }, o: { x: 0.4, y: 0 } };
const draw = (from, to) => ({ a: 1, k: [{ t: from, s: [0], e: [100], ...ease }, { t: to, s: [100] }] });
const white = [1, 1, 1, 1];
const stroke = width => ({ ty: 'st', c: { a: 0, k: white }, o: { a: 0, k: 100 }, w: { a: 0, k: width }, lc: 2, lj: 2, ml: 4 });
const trim = (from, to) => ({ ty: 'tm', s: { a: 0, k: 0 }, e: draw(from, to), o: { a: 0, k: 0 }, m: 1 });
const line = points => ({ ty: 'sh', ks: { a: 0, k: { i: points.map(() => [0, 0]), o: points.map(() => [0, 0]), v: points, c: false } } });
const transform = { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [0, 0, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } };

function layer(ind, name, shapes, ks = transform, op = 48) {
  return { ddd: 0, ind, ty: 4, nm: name, sr: 1, ks, shapes, ip: 0, op, st: 0, bm: 0 };
}

function ringLayer() {
  return layer(9, 'Ring', [
    { ty: 'el', p: { a: 0, k: [30, 30] }, s: { a: 0, k: [44, 44] } },
    trim(0, 16),
    stroke(3.2),
  ], {
    ...transform,
    a: { a: 0, k: [30, 30, 0] }, p: { a: 0, k: [30, 30, 0] },
    s: { a: 1, k: [{ t: 0, s: [82, 82, 100], e: [106, 106, 100], ...ease }, { t: 18, s: [106, 106, 100], e: [100, 100, 100], ...ease }, { t: 28, s: [100, 100, 100] }] },
  });
}

function mark(name, marks) {
  return { v: '5.13.0', fr: 60, ip: 0, op: 48, w: 60, h: 60, nm: name, ddd: 0, assets: [], layers: [...marks, ringLayer()] };
}

// Detail-stack toggle (40×40, 30 frames): three layered cards fan out from a tight stack.
// Played forward when a stack opens and in reverse when it closes. CSS recolours the strokes.
const fan = (from, to) => ({ a: 1, k: [{ t: 0, s: from, e: to, i: { x: 0.32, y: 1 }, o: { x: 0.3, y: 0 } }, { t: 30, s: to }] });
const card = (ind, name, p0, p1, s0, s1) => layer(ind, name, [
  { ty: 'rc', d: 1, p: fan(p0, p1), s: fan(s0, s1), r: { a: 0, k: 2.6 } },
  { ty: 'st', c: { a: 0, k: [0.42, 0.42, 0.45, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 2.4 }, lc: 2, lj: 2, ml: 4 },
], transform, 30);
export const lottieStack = {
  v: '5.13.0', fr: 60, ip: 0, op: 30, w: 40, h: 40, nm: 'Detail stack', ddd: 0, assets: [],
  layers: [
    card(1, 'Front', [20, 22.5], [20, 29], [26, 9], [26, 7]),
    card(2, 'Middle', [20, 19], [20, 19.5], [22, 7], [26, 7]),
    card(3, 'Back', [20, 15.5], [20, 10], [18, 6], [26, 7]),
  ],
};

export const lottieIcons = {
  B30: mark('B30 check', [
    layer(1, 'Check', [line([[19.5, 30.5], [26.5, 37.5], [41, 23]]), trim(12, 30), stroke(3.6)]),
  ]),
  B20: mark('B20 hold', [
    layer(1, 'Upper bar', [line([[21, 26], [39, 26]]), trim(12, 26), stroke(3.6)]),
    layer(2, 'Lower bar', [line([[21, 34], [39, 34]]), trim(16, 30), stroke(3.6)]),
  ]),
  B15: mark('B15 caution', [
    layer(1, 'Stem', [line([[30, 19], [30, 33]]), trim(12, 26), stroke(3.6)]),
    layer(2, 'Dot', [line([[30, 40.5], [30, 40.6]]), trim(24, 30), stroke(4.4)]),
  ]),
};
