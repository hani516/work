/* Geometry and cosmetic motion mirror Mongram's HomeDogIllustration/HomePoodleMotion.
   This gallery isolates the real actions into a repeatable study, not the app's random idle schedule. */
(() => {
  const gallery = document.querySelector('.mg-poodle-gallery');
  if (!gallery) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = gallery.querySelector('.mg-motion-toggle');
  const cards = [...gallery.querySelectorAll('[data-motion]')];
  const ns = 'http://www.w3.org/2000/svg';
  const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const windowAt = (t, duration, rise = .65, fall = .85) => smooth(t / rise) * smooth((duration - t) / fall);
  let paused = false, visible = false, frame = 0, last = 0, elapsed = 0;
  const rigs = [];
  const labels = {
    ja: ['動きを止める', '動きを再生'],
    en: ['Pause motion', 'Play motion'],
    ko: ['움직임 멈추기', '움직임 재생']
  };
  function updateLabel() {
    toggle.textContent = (labels[document.documentElement.lang] || labels.ja)[paused ? 1 : 0];
    toggle.setAttribute('aria-pressed', String(paused));
  }
  // The exported app assets use absolute M/L/C/H/V paths only.
  function warpPath(d, warp) {
    const tokens = d.match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
    let i = 0, command, x = 0, y = 0;
    const result = [];
    while (i < tokens.length) {
      if (/^[A-Za-z]$/.test(tokens[i])) command = tokens[i++];
      if (command === 'Z') { result.push('Z'); command = null; continue; }
      const count = {M: 2, L: 2, C: 6, H: 1, V: 1}[command];
      if (!count) throw new Error('Unsupported vector command');
      let values = tokens.slice(i, i + count).map(Number); i += count;
      const actual = command === 'H' || command === 'V' ? 'L' : command;
      if (command === 'H') values = [values[0], y];
      if (command === 'V') values = [x, values[0]];
      [x, y] = values.slice(-2);
      const points = [];
      for (let j = 0; j < values.length; j += 2) points.push(...warp(values[j], values[j + 1]));
      result.push(actual + points.map(n => +n.toFixed(5)).join(' '));
      if (command === 'M') command = 'L';
    }
    return result.join(' ');
  }
  function prepare(svg, card, index) {
    const byId = id => svg.querySelector(`[id="${id}"]`);
    const resting = card.dataset.motion === 'resting';
    const rig = {svg, card, resting, kind: card.dataset.motion, head: byId('head-motion'), tail: byId('tail'), mouth: byId('mouth'), eyes: byId('eyes'), paths: []};
    rig.clip = svg.querySelector('clipPath');
    // clipPath accepts direct geometry; flatten the source resting transform.
    for (const group of [...rig.clip.querySelectorAll('g')]) {
      for (const child of [...group.children]) {
        child.setAttribute('transform',group.getAttribute('transform') || '');
        rig.clip.append(child);
      }
      group.remove();
    }
    rig.clipMotion = rig.clip;
    rig.baseHead = rig.head.getAttribute('transform') || '';
    const mouthOpen = document.createElementNS(ns, 'ellipse');
    Object.entries({cx: 65, cy: 56.1, rx: 3.6, ry: .9, 'stroke-width': 1.4, opacity: 0}).forEach(([k,v]) => mouthOpen.setAttribute(k,v));
    rig.mouth.after(mouthOpen); rig.open = mouthOpen;
    rig.eyeData = [...rig.eyes.children].map(e => ({element:e,x:+e.getAttribute('cx'),y:+e.getAttribute('cy'),rx:+e.getAttribute('rx'),ry:+e.getAttribute('ry')}));
    for (const part of ['body','legs','head','ears','faceDetails']) {
      for (const p of byId(part).querySelectorAll('path')) rig.paths.push({element:p,d:p.getAttribute('d'),part});
    }
    for (const p of rig.clip.querySelectorAll('path')) rig.paths.push({element:p,d:p.getAttribute('d'),part:'mask'});
    svg.querySelector('style')?.remove();
    svg.querySelector('title')?.remove();
    svg.setAttribute('aria-hidden','true'); svg.setAttribute('focusable','false');
    // All instances need separate clip IDs, including when several are visible together.
    for (const e of svg.querySelectorAll('[id]')) e.id = `poodle-${index}-${e.id}`;
    for (const e of svg.querySelectorAll('[clip-path]')) e.setAttribute('clip-path', `url(#poodle-${index}-outside-head)`);
    card.querySelector('.mg-poodle-stage').replaceChildren(svg);
    rig.earFrames = [-1,-.5,0,.5,1].map(amount => rig.paths.filter(p => ['head','ears','faceDetails','mask'].includes(p.part)).map(p => [p.element, warpPath(p.d,(x,y) => {
      const side = x < 56 ? -1 : 1;
      const weight = smooth(x < 56 ? (34-x)/12 : (x-78)/12) * smooth((74-y)/22);
      return [x+side*2.2*amount*weight,y-1.4*amount*weight];
    })]));
    rig.pawFrames = [0,1/3,2/3,1].map(amount => rig.paths.filter(p => ['body','legs'].includes(p.part)).map(p => [p.element, warpPath(p.d,(x,y) => {
      const weight = Math.exp(-(((x-64)/12)**4)) * smooth((y-105)/25);
      return [x-8*amount*weight,y-10*amount*weight];
    })]));
    return rig;
  }
  function draw(rig, t, still = false) {
    let head = 0, dy = 0, blink = 0, mouth = 0, tail = 0, ear = 0, paw = 0;
    const local = (t + rigs.indexOf(rig) * .37) % 7.5;
    const a = windowAt(local,2.2,.3,.4);
    if (rig.kind === 'head') head = still ? 6 : local < .22 ? 6*smooth(local/.22) : local < .65 ? 6 : local < 1.05 ? 6*(1-smooth((local-.65)/.4)) : 0;
    if (rig.kind === 'tail') tail = still ? 8 : 8*a*Math.sin(local*Math.PI*4);
    if (rig.kind === 'ears') ear = still ? 1 : a*Math.sin(local*Math.PI*3);
    if (rig.kind === 'paw') paw = still ? 1 : a;
    if (rig.kind === 'blink') blink = still ? 1 : windowAt(local-.6,.26,.1,.12);
    if (rig.kind === 'yawn') { mouth = still ? 1 : windowAt(local,3.4); blink = .95*mouth; head = -2*mouth; dy = -.6*mouth; }
    if (rig.kind === 'resting') blink = still ? 0 : windowAt(local,5,.3,.4);
    const tx = rig.resting ? 61+60*.82 : 60, ty = rig.resting ? 18+68*.82 : 68;
    const motion = `translate(0 ${dy}) rotate(${head} ${tx} ${ty})`;
    rig.head.setAttribute('transform',motion+' '+rig.baseHead);
    rig.clipMotion.setAttribute('transform',motion);
    rig.tail.setAttribute('transform',`rotate(${tail} ${rig.resting ? '27 62' : '19 116'})`);
    rig.mouth.setAttribute('opacity',1-mouth); rig.open.setAttribute('opacity',mouth);
    rig.open.setAttribute('cy',55.2+(1.8+7*mouth)/2);rig.open.setAttribute('ry',(1.8+7*mouth)/2);
    const blinkFrame = Math.round(Math.max(0,Math.min(1,blink))*8)/8;
    for (const eye of rig.eyeData) {
      // Same outline thickness and nine eye shapes as the vector PDF export.
      const ry = Math.max(0,((2*eye.ry+1.4)*(1-blinkFrame)-1.4)/2);
      eye.element.setAttribute('ry',Math.max(.001,ry));
    }
    const earIndex = Math.abs(ear)<.2 ? 2 : ear<-.75 ? 0 : ear<0 ? 1 : ear<.75 ? 3 : 4;
    const pawIndex = paw<.16 ? 0 : Math.max(1,Math.min(3,Math.round(paw*3)));
    if (rig.kind==='ears') for (const [e,d] of rig.earFrames[earIndex]) e.setAttribute('d',d);
    if (rig.kind==='paw') for (const [e,d] of rig.pawFrames[pawIndex]) e.setAttribute('d',d);
  }
  function allowed() { return visible && !paused && !reduced.matches && !document.hidden && rigs.length > 0; }
  function tick(now) {
    frame = 0;
    if (!allowed()) { last = 0; return; }
    if (!last || now-last >= 1000/24) {
      if (last) elapsed += Math.min((now-last)/1000,.1);
      last = now; for (const rig of rigs) draw(rig,elapsed);
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (!allowed()) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    else if (!frame) frame = requestAnimationFrame(tick);
    if (reduced.matches) for (const rig of rigs) draw(rig,0,true);
  }
  toggle.addEventListener('click',() => { paused = !paused; updateLabel(); sync(); });
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  new MutationObserver(updateLabel).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  new IntersectionObserver(entries => {visible=entries[0].isIntersecting;sync();},{threshold:.05}).observe(gallery);
  Promise.all(['seated','resting'].map(async pose => {
    const response = await fetch(`assets/mongram/poodle/${pose}.svg`);
    if (!response.ok) throw new Error('Could not load poodle source');
    const document = new DOMParser().parseFromString(await response.text(),'image/svg+xml');
    if (document.querySelector('parsererror')) throw new Error('Invalid poodle source');
    return document.documentElement;
  })).then(sources => {
    cards.forEach((card,index) => rigs.push(prepare(sources[card.dataset.motion==='resting'?1:0].cloneNode(true),card,index)));
    rigs.forEach(rig=>draw(rig,0,true));
    toggle.hidden=false;updateLabel();sync();
  }).catch(() => { /* The source-derived static SVG images remain a complete fallback. */ });
})();
