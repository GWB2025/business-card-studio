const test = require('node:test');
const assert = require('node:assert/strict');
const { build, defaults, validate, restoreDraft, tapPrompt } = require('../card.js');
const fonts = require('../fonts.json');

const sticker = { ...defaults, showTagOutline: true };
const group = (svg, id) => svg.match(new RegExp('<g id="' + id + '">(.*?)</g>'))?.[1];
function points(markup) {
  return Array.from(markup.matchAll(/([\d.-]+),([\d.-]+)/g), m => [Number(m[1]), Number(m[2])]);
}

test('exports one closed 23 mm tag outline between the raised tap prompt and signal', () => {
  const plain = build(defaults, fonts);
  const card = build(sticker, fonts);
  const ring = group(card.svg, 'tag-outline');
  assert.ok(ring);
  assert.equal(group(card.previewSvg, 'tag-outline'), ring);
  assert.equal(ring.match(/<path /g).length, 1);
  const pen = points(ring);
  const xs = pen.map(p => p[0]), ys = pen.map(p => p[1]);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  assert.equal(right - left, 23);
  assert.equal(bottom - top, 23);
  assert.deepEqual(pen[0], pen.at(-1));
  assert.ok(pen.every(([x,y]) => Math.abs(Math.hypot(x-cx,y-cy) - 11.5) < 0.001));
  const label = points(group(card.svg,'tap-prompt')), signal = points(group(card.svg,'tap-signal'));
  assert.ok(label.every(([x]) => x < left - 1));
  assert.ok(signal.every(([x]) => x > right + 1 && x < 85 * 0.56));
  for (const shape of [label, signal]) {
    const heights = shape.map(p => p[1]);
    assert.ok(Math.abs((Math.max(...heights) + Math.min(...heights)) / 2 - cy) < 0.001);
  }
  assert.ok(cy < 35);
  assert.equal(card.chip, null);
  assert.ok(top > sticker.margin && bottom < sticker.height - sticker.margin);
  assert.doesNotMatch(plain.svg, /id="tag-outline"/);
});

test('the sticker fits with contact details, motifs and QR codes across the standard stock sizes', () => {
  for (const [width,height] of [[85,55], [85,54], [90,50], [54,85]]) {
    for (const showQr of [false,true]) {
      const d = { ...sticker, width,height,showQr,qrUrl:'https://github.com/GWB2025',contact:'github.com/GWB2025' };
      const card = build(d,fonts);
      const ring = points(group(card.svg,'tag-outline'));
      const cx = (Math.max(...ring.map(p=>p[0])) + Math.min(...ring.map(p=>p[0]))) / 2;
      const cy = (Math.max(...ring.map(p=>p[1])) + Math.min(...ring.map(p=>p[1]))) / 2;
      const ink = card.svg.replace('<g id="tag-outline">'+group(card.svg,'tag-outline')+'</g>', '');
      for(const path of ink.matchAll(/<path d="([^"]+)"/g)) {
        const line = points(path[1]);
        for (let i=1; i<line.length; i++) {
          const [x,y] = line[i-1], dx=line[i][0]-x, dy=line[i][1]-y;
          const t=Math.max(0,Math.min(1,((cx-x)*dx+(cy-y)*dy)/(dx*dx+dy*dy || 1)));
          assert.ok(Math.hypot(x+t*dx-cx,y+t*dy-cy) >= 11.5+d.stroke, 'unrelated ink crosses the sticker');
        }
      }
      assert.ok(points(card.svg).every(([x,y])=>x>=d.margin-.001 && x<=width-d.margin+.001 && y>=d.margin-.001 && y<=height-d.margin+.001));
      if (showQr) assert.ok(cx+11.5+d.stroke < card.qr.left || cy-11.5-d.stroke > card.qr.top+card.qr.side);
      if (width === 85 && height === 55) assert.deepEqual(card.warnings, []);
    }
  }
});

test('retains custom prompts and sticker preferences when reopening or changing stock', () => {
  assert.equal(tapPrompt(sticker), 'TAP HERE');
  assert.equal(tapPrompt({...sticker,prompt:'TAP FOR ART'}), 'TAP FOR ART');
  const edited = {...sticker,tagPrompt:'MY TAG',prompt:'EMBEDDED'};
  assert.equal(tapPrompt(restoreDraft(JSON.parse(JSON.stringify(edited)))), 'MY TAG');
  assert.equal(tapPrompt({...edited,showTagOutline:false}), 'EMBEDDED');
  assert.equal(validate({}).showTagOutline, false);
  assert.throws(()=>validate({showTagOutline:'yes'}));
  assert.doesNotMatch(build({...sticker,showNfc:false},fonts).svg,/id="tag-outline"/);
  assert.throws(()=>build({...sticker,width:45,height:35,margin:9}, fonts), /23 mm/);
});
