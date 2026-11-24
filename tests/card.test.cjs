const assert = require('node:assert/strict');
const test = require('node:test');
const { build, defaults, restoreDraft } = require('../card.js');
const fonts = require('../fonts.json');

test('exports the default NFC card as millimetre-sized pen paths', () => {
  const card = build(defaults, fonts);
  assert.match(card.svg, /width="85mm" height="55mm" viewBox="0 0 85 55"/);
  assert.match(card.svg, /<path d="M /);
  assert.doesNotMatch(card.svg, /<(text|image|rect)\b/);
  assert.ok(card.length > 0);
});

test('each motif and font fits inside the safe margin on a portrait card', () => {
  for (const motif of ['vortex', 'waves', 'orbit']) {
    for (const font of fonts) {
      const design = { ...defaults, width: 54, height: 85, font: font.id, motif };
      const card = build(design, fonts);
      assert.ok(card.paths.length > 0);
      for (const path of card.paths) {
        for (const [x, y] of path) {
          const tolerance = 1e-8;
          assert.ok(x >= design.margin - tolerance && x <= design.width - design.margin + tolerance);
          assert.ok(y >= design.margin - tolerance && y <= design.height - design.margin + tolerance);
        }
      }
    }
  }
});

function inkBounds(svgFragment) {
  const points = [...svgFragment.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)];
  assert.ok(points.length > 0, 'expected plotted points');
  const xs = points.map(point => Number(point[1]));
  const ys = points.map(point => Number(point[2]));
  return { left: Math.min(...xs), right: Math.max(...xs),
    top: Math.min(...ys), bottom: Math.max(...ys) };
}

function labelBounds(card) {
  const label = card.svg.match(/<g id="tap-prompt">([\s\S]*?)<\/g>/);
  assert.ok(label, 'expected the exported tap lettering');
  return inkBounds(label[1]);
}

test('centres the exported lettering, independently of the icon, on the chip', () => {
  for (const font of fonts) {
    for (const prompt of ['TAP TO CONNECT', 'tap gyp', 'TAP']) {
      const card = build({ ...defaults, font: font.id, prompt }, fonts);
      const b = labelBounds(card);
      assert.ok(Math.abs((b.left + b.right) / 2 - 20) < 0.001);
      assert.ok(Math.abs((b.top + b.bottom) / 2 - 35) < 0.001);
      if (prompt === defaults.prompt) {
        assert.ok(b.left < 16.25 && b.right > 23.75);
        assert.ok(b.top > 32.5 && b.bottom < 37.5);
      }
    }
  }
});

test('places contact details clear of the default NFC chip', () => {
  const withoutContact = build(defaults, fonts);
  const withContact = build({ ...defaults, contact: 'example.com' }, fonts);
  const pathTags = svg => [...svg.matchAll(/<path d="[^"]+"\/>/g)].map(m => m[0]);
  const original = new Set(pathTags(withoutContact.svg));
  const added = pathTags(withContact.svg).filter(path => !original.has(path));
  assert.ok(inkBounds(added.join('')).top > 37.5);
});

test('other card stock can keep the lower-left prompt and the prompt can be hidden', () => {
  for (const settings of [{ centreOnChip: false }, { height: 54 }, { width: 90, height: 50 }]) {
    const card = build({ ...defaults, ...settings }, fonts);
    assert.equal(card.chip, null);
    assert.ok(labelBounds(card).top > 38);
  }
  const noPrompt = build({ ...defaults, showNfc: false }, fonts);
  assert.equal(noPrompt.chip, null);
  assert.doesNotMatch(noPrompt.svg, /id="tap-prompt"/);
});

test('updates an untouched old browser draft but preserves edited drafts and saved files', () => {
  const legacy = { ...defaults, height: 54 };
  delete legacy.centreOnChip;
  assert.equal(restoreDraft(legacy).height, 55);
  assert.equal(restoreDraft({ ...legacy, name: 'ALAN' }).height, 54);
  assert.equal(restoreDraft({ ...legacy, centreOnChip: true }).height, 54);
  assert.equal(build(legacy, fonts).design.height, 54);
});
