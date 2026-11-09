/* Every pose is evaluated by the original Swift HomePoodleMotion policy at 24 fps.
   SVG layers follow HomeDogIllustration's transforms and nine-frame eye export.
   Only the gallery's repeated presentation differs from the app's random idle scheduling. */
(() => {
  const gallery = document.querySelector('.mg-poodle-gallery');
  if (!gallery) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = gallery.querySelector('.mg-motion-toggle');
  const cards = [...gallery.querySelectorAll('[data-motion]')];
  const ns = 'http://www.w3.org/2000/svg';
  const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  let paused = reduced.matches, frame = 0, last = 0, motionData;
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
    const rig = {svg, card, resting, kind: card.dataset.motion, head: byId('head-motion'), tail: byId('tail'), nose: byId('nose'), mouth: byId('mouth'), eyes: byId('eyes'), paths: [], elapsed:0, visible:false};
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
    rig.eyeData = [...rig.eyes.children].map(e => {
      const eye = {element:e,x:+e.getAttribute('cx'),y:+e.getAttribute('cy'),rx:+e.getAttribute('rx'),ry:+e.getAttribute('ry')};
      eye.closed = document.createElementNS(ns, 'path');
      eye.closed.setAttribute('d',`M${eye.x-eye.rx} ${eye.y}H${eye.x+eye.rx}`);
      eye.closed.setAttribute('stroke-width','1.4'); eye.closed.setAttribute('opacity','0');
      rig.eyes.append(eye.closed); return eye;
    });
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
    const stage = card.querySelector('.mg-poodle-stage');
    stage.replaceChildren(svg);
    rig.breath = document.createElementNS(ns, 'g');
    for (const child of [...svg.children]) if (child.tagName !== 'defs') rig.breath.append(child);
    svg.append(rig.breath);
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
  function draw(rig, seconds) {
    const track = motionData.tracks[rig.kind];
    const index = Math.min(track.length-1, Math.floor((seconds % motionData.duration) * motionData.fps));
    if (index === rig.lastFrame) return;
    rig.lastFrame = index;
    const [breath,blink,head,dx,dy,nose,mouth,tail,ear,paw] = track[index];
    const tx = rig.resting ? 61+60*.82 : 60, ty = rig.resting ? 18+68*.82 : 68;
    const motion = `translate(${dx} ${dy}) rotate(${head} ${tx} ${ty})`;
    rig.head.setAttribute('transform',motion+' '+rig.baseHead);
    rig.clipMotion.setAttribute('transform',motion);
    const baseline = rig.resting ? 90 : 138;
    rig.breath.setAttribute('transform',`translate(0 ${baseline}) scale(1 ${breath}) translate(0 ${-baseline})`);
    rig.nose.setAttribute('transform',`translate(65 52.2) scale(${nose}) translate(-65 -52.2)`);
    rig.tail.setAttribute('transform',`rotate(${tail} ${rig.resting ? '27 62' : '19 116'})`);
    rig.mouth.setAttribute('opacity',1-mouth); rig.open.setAttribute('opacity',mouth);
    rig.open.setAttribute('cy',55.2+(1.8+7*mouth)/2);rig.open.setAttribute('ry',(1.8+7*mouth)/2);
    const blinkFrame = Math.round(Math.max(0,Math.min(1,blink))*8)/8;
    for (const eye of rig.eyeData) {
      // Same outline thickness and nine eye shapes as the vector PDF export.
      const ry = Math.max(0,((2*eye.ry+1.4)*(1-blinkFrame)-1.4)/2);
      eye.element.setAttribute('ry',Math.max(.001,ry));
      eye.element.setAttribute('opacity',ry>0 ? 1 : 0);
      eye.closed.setAttribute('opacity',ry>0 ? 0 : 1);
    }
    const earIndex = Math.abs(ear)<.2 ? 2 : ear<-.75 ? 0 : ear<0 ? 1 : ear<.75 ? 3 : 4;
    const pawIndex = paw<.16 ? 0 : Math.max(1,Math.min(3,Math.round(paw*3)));
    if (rig.kind==='ears') for (const [e,d] of rig.earFrames[earIndex]) e.setAttribute('d',d);
    if (rig.kind==='paw') for (const [e,d] of rig.pawFrames[pawIndex]) e.setAttribute('d',d);
  }
  function allowed() { return !paused && !document.hidden && rigs.some(rig => rig.visible); }
  function tick(now) {
    frame = 0;
    if (!allowed()) { last = 0; return; }
    // Use wall-clock time on any display refresh rate; draw only new 24fps source frames.
    const delta = last ? (now-last)/1000 : 0;
    last = now;
    for (const rig of rigs) if (rig.visible) { rig.elapsed = (rig.elapsed + delta) % motionData.duration; draw(rig,rig.elapsed); }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (!allowed()) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    else if (!frame) frame = requestAnimationFrame(tick);
  }
  toggle.addEventListener('click',() => { paused = !paused; updateLabel(); sync(); });
  reduced.addEventListener('change',() => { if (reduced.matches) paused = true; updateLabel(); sync(); });
  document.addEventListener('visibilitychange',sync);
  new MutationObserver(updateLabel).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const rig = rigs.find(rig => rig.card === entry.target);
      if (!rig) continue;
      if (entry.isIntersecting && !rig.visible) { rig.elapsed = 0; draw(rig,0); }
      rig.visible = entry.isIntersecting;
    }
    sync();
  },{threshold:.15});
  Promise.all([
    ...['seated','resting'].map(async pose => {
      const response = await fetch(`assets/mongram/poodle/${pose}.svg`);
      if (!response.ok) throw new Error('Could not load poodle source');
      const document = new DOMParser().parseFromString(await response.text(),'image/svg+xml');
      if (document.querySelector('parsererror')) throw new Error('Invalid poodle source');
      return document.documentElement;
    }),
    fetch('assets/mongram/poodle/app-motion.json').then(response => {
      if (!response.ok) throw new Error('Could not load original motion');
      return response.json();
    })
  ]).then(([seated,resting,data]) => {
    motionData=data;
    cards.forEach((card,index) => rigs.push(prepare((card.dataset.motion==='resting'?resting:seated).cloneNode(true),card,index)));
    rigs.forEach(rig => { draw(rig,0); observer.observe(rig.card); });
    gallery.dataset.motionState='ready';
    toggle.hidden=false; updateLabel(); sync();
  }).catch(() => {
    gallery.dataset.motionState='error';
    const note=gallery.querySelector('.mg-poodle-note');
    note.setAttribute('role','status');
    note.textContent=({ja:'動きを読み込めませんでした。ページを再読み込みしてください。',en:'Motion could not load. Please refresh the page.',ko:'움직임을 불러오지 못했어요. 페이지를 새로고침해 주세요.'})[document.documentElement.lang] || 'Motion could not load. Please refresh the page.';
  });
})();
