const test = require('node:test');
const assert = require('node:assert/strict');
const { build, defaults, validate } = require('../card.js');
const fonts = require('../fonts.json');

const destination = 'https://github.com/GWB2025';
const design = { ...defaults, showQr: true, qrUrl: destination };
const cardFor = changes => build({ ...design, ...changes }, fonts);

test('existing designs keep their motif unless QR is enabled', () => {
  assert.equal(validate({}).showQr, false);
  assert.doesNotMatch(cardFor({ showQr: false, qrUrl: '' }).svg, /id="qr-code"/);
  assert.match(cardFor({}).svg, /<g id="qr-code"><path d="M /);
});

test('requires a valid HTTP(S) address only for enabled QR codes', () => {
  for (const qrUrl of ['', 'https://', 'hello', 'javascript:alert(1)', 'https://ex ample.org']) {
    assert.throws(() => cardFor({ qrUrl }), /website address/i);
  }
});

test('the saved URL round-trips and a changed URL changes the pen paths', () => {
  const qrUrl = 'https://example.org/cards?index=2&source=pen#details';
  const saved = JSON.parse(JSON.stringify(validate({ ...design, qrUrl })));
  assert.equal(saved.qrUrl, qrUrl);
  assert.equal(saved.showQr, true);
  assert.notDeepEqual(cardFor({ qrUrl }).qr.paths, cardFor({}).qr.paths);
  assert.deepEqual(build(saved, fonts).qr.paths, cardFor({ qrUrl }).qr.paths);
});

test('reserves four blank modules around the code, including the pen radius', () => {
  for (const stock of [{}, { width: 90, height: 50 }, { width: 54, height: 85, stroke: 0.25 }]) {
    const { qr, paths, design: d } = cardFor(stock);
    const inset = 4 * qr.pitch + d.stroke / 2 - 1e-7;
    const left = qr.left + inset, right = qr.left + qr.side - inset;
    const top = qr.top + inset, bottom = qr.top + qr.side - inset;
    assert.ok(qr.paths.length > 0);
    const ink = new Set(qr.paths);
    for (const path of paths) {
      for (const [x,y] of path) {
        if (ink.has(path)) {
          assert.ok(x >= left && x <= right && y >= top && y <= bottom);
        } else {
          assert.ok(x <= qr.left - d.stroke / 2 || x >= qr.left + qr.side + d.stroke / 2 ||
            y <= qr.top - d.stroke / 2 || y >= qr.top + qr.side + d.stroke / 2);
        }
      }
    }
  }
});

test('the NFC lettering stays on the chip with QR selected', () => {
  const label = svg => svg.match(/<g id="tap-prompt">.*?<\/g>/)[0];
  assert.equal(label(cardFor({}).svg), label(cardFor({ showQr: false }).svg));
  assert.doesNotMatch(cardFor({ showNfc: false }).svg, /id="tap-prompt"/);
});

test('a long URL and thick pen cannot silently produce an unusable code', () => {
  assert.throws(() => cardFor({ qrUrl: 'https://example.org/' + 'a'.repeat(250), stroke: 1.2 }),
    /shorter URL|finer pen/i);
});
