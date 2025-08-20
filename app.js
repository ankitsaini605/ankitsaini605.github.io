// PWA
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
}

// Theme
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const saved = localStorage.getItem('theme') || 'dark';
if (saved === 'light') root.classList.add('light');
if (themeToggle) {
  themeToggle.textContent = saved === 'light' ? '🌚' : '🌙';
  themeToggle.addEventListener('click', () => {
    root.classList.toggle('light');
    const m = root.classList.contains('light') ? 'light' : 'dark';
    localStorage.setItem('theme', m);
    themeToggle.textContent = m === 'light' ? '🌚' : '🌙';
  });
}

// Mobile nav & mega
const nav = document.querySelector('.nav');
const hamburger = document.getElementById('hamburger');
hamburger?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.mega-parent').forEach(p => {
  const btn = p.querySelector('.mega-toggle');
  const menu = p.querySelector('.mega-menu');
  btn.addEventListener('click', e => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.mega-toggle').forEach(b => b.setAttribute('aria-expanded','false'));
    btn.setAttribute('aria-expanded', String(!open));
    e.stopPropagation();
  });
  document.addEventListener('click', () => btn.setAttribute('aria-expanded','false'));
  menu.addEventListener('click', e => e.stopPropagation());
});

// Back to top
const toTop = document.getElementById('toTop');
addEventListener('scroll', () => {
  if (scrollY > 300) toTop.classList.add('show'); else toTop.classList.remove('show');
});
toTop?.addEventListener('click', () => scrollTo({ top:0, behavior:'smooth' }));

// Year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Router (hash)
const app = document.getElementById('app');
const routes = {
  '/': { file: 'pages/home.html', title: 'Home — EduIgnite', desc: 'World-class data science portfolio and learning hub.' },
  '/projects': { file: 'pages/projects.html', title: 'Projects — EduIgnite', desc: 'Interactive ML, analytics, dashboards, and more.' },
  '/courses': { file: 'pages/courses.html', title: 'Courses — EduIgnite', desc: 'Learn DS/ML with practical, code-first content.' },
  '/tools': { file: 'pages/tools.html', title: 'Tools — EduIgnite', desc: 'Run models and demos right in your browser.' },
  '/research': { file: 'pages/research.html', title: 'Research — EduIgnite', desc: 'Deeper insights and thought leadership.' },
  '/about': { file: 'pages/about.html', title: 'About — EduIgnite', desc: 'Mission, story, and stack behind EduIgnite.' },
  '/contact': { file: 'pages/contact.html', title: 'Contact — EduIgnite', desc: 'Collaborate or say hello.' },
  '/profile': { file: 'pages/profile.html', title: 'Profile — EduIgnite', desc: 'Your learning journey and saved items.' }
};
function parseHash() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  return { path, query };
}
async function loadRoute() {
  const { path } = parseHash();
  const route = routes[path] || routes['/'];
  document.title = route.title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', route.desc);
  try {
    const res = await fetch(route.file, { cache: 'no-store' });
    const html = await res.text();
    app.innerHTML = html;
    app.focus();
    enhance(path);
  } catch (e) {
    app.innerHTML = `<div class="section"><h2>Oops</h2><p class="muted">Try again later.</p></div>`;
  }
}
addEventListener('hashchange', loadRoute);
addEventListener('DOMContentLoaded', () => {
  if (!location.hash) location.hash = '#/';
  loadRoute();
  // Prefetch
  const files = Object.values(routes).map(r => r.file);
  ('requestIdleCallback' in window
    ? requestIdleCallback
    : (fn)=>setTimeout(fn, 1200))(() => files.forEach(f => fetch(f).catch(()=>{})));
});

// Lazy loaders for DS libs
const CDN = {
  chart: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js',
  tf: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.16.0/dist/tf.min.js',
  papaparse: 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
  pyodide: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js'
};
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => resolve(); s.onerror = reject; document.body.appendChild(s);
  });
}

// Page enhancement hooks
async function enhance(path) {
  // Contact form
  const cf = app.querySelector('#contactForm');
  if (cf) {
    cf.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(cf).entries());
      const body = encodeURIComponent(`${data.message}\n\n— ${data.name} (${data.email})`);
      location.href = `mailto:ankitsaini24082002@gmail.com?subject=${encodeURIComponent('Inquiry via EduIgnite')}&body=${body}`;
    });
  }

  // Tools page: RFM, A/B, TF.js, Pyodide
  if (path === '/tools') {
    // CSV → RFM segmentation (JS-only)
    const fileInput = app.querySelector('#rfmCsv');
    const rfmBtn = app.querySelector('#runRfm');
    const rfmOut = app.querySelector('#rfmOut');
    await loadScriptOnce(CDN.papaparse);
    rfmBtn?.addEventListener('click', async () => {
      if (!fileInput.files?.length) { rfmOut.textContent = 'Please select a CSV first.'; return; }
      const file = fileInput.files[0];
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (res) => {
          const rows = res.data.filter(r => r.customer_id && r.order_date && r.revenue);
          if (!rows.length) { rfmOut.textContent = 'CSV missing columns: customer_id, order_date, revenue'; return; }
          // Compute RFM
          const today = new Date();
          const byCust = {};
          rows.forEach(r => {
            const d = new Date(r.order_date);
            const cid = String(r.customer_id);
            if (!byCust[cid]) byCust[cid] = { last: d, freq: 0, mon: 0 };
            byCust[cid].last = byCust[cid].last > d ? byCust[cid].last : d;
            byCust[cid].freq += 1;
            byCust[cid].mon += Number(r.revenue) || 0;
          });
          const recencies = Object.values(byCust).map(v => (today - v.last)/(1000*60*60*24));
          const freqs = Object.values(byCust).map(v => v.freq);
          const mons = Object.values(byCust).map(v => v.mon);
          const q = (arr, p) => {
            const b = [...arr].sort((a,b)=>a-b);
            const idx = Math.floor(p*(b.length-1)); return b[idx];
          };
          const rCuts = [q(recencies, .2), q(recencies, .4), q(recencies, .6), q(recencies, .8)];
          const fCuts = [q(freqs, .2), q(freqs, .4), q(freqs, .6), q(freqs, .8)];
          const mCuts = [q(mons, .2), q(mons, .4), q(mons, .6), q(mons, .8)];
          const score = (v, cuts, invert=false) => {
            let s = 1;
            for (let c of cuts) if (v > c) s++;
            return invert ? 6 - s : s; // recency invert: recent => high score
          };
          const segments = {};
          Object.entries(byCust).forEach(([cid, v]) => {
            const recDays = (today - v.last)/(1000*60*60*24);
            const R = score(recDays, rCuts, true), F = score(v.freq, fCuts), M = score(v.mon, mCuts);
            const code = `${R}${F}${M}`;
            segments[code] = (segments[code]||0)+1;
          });
          const top = Object.entries(segments).sort((a,b)=>b[1]-a[1]).slice(0,8);
          rfmOut.innerHTML = `<strong>Top segments (RFM → count):</strong><br>` + top.map(([k,v])=>`${k} → ${v}`).join('<br>');
        }
      });
    });

    // A/B simulator (z-test + Bayesian beta)
    await loadScriptOnce(CDN.chart);
    const abForm = app.querySelector('#abForm');
    const abChart = app.querySelector('#abChart');
    const ctx = abChart?.getContext('2d');
    let chart;
    abForm?.addEventListener('input', () => runAB());

    function runAB() {
      const nA = +abForm.nA.value || 1000;
      const cA = +abForm.cA.value || 120;
      const nB = +abForm.nB.value || 1000;
      const cB = +abForm.cB.value || 150;
      const pA = cA/nA, pB = cB/nB;
      const lift = ((pB-pA)/pA)*100;
      // z-test
      const pPool = (cA + cB)/(nA + nB);
      const se = Math.sqrt(pPool*(1-pPool)*(1/nA + 1/nB));
      const z = (pB - pA)/se;
      // Bayesian Beta(1+conversions,1+non-conv)
      const aA = 1+cA, bA = 1+(nA-cA);
      const aB = 1+cB, bB = 1+(nB-cB);
      const xs = Array.from({length:200}, (_,i)=> i/199);
      const betaPdf = (x,a,b)=> Math.pow(x, a-1)*Math.pow(1-x, b-1); // unnormalized
      const yA = xs.map(x => betaPdf(x, aA, bA));
      const yB = xs.map(x => betaPdf(x, aB, bB));
      // Render
      if (!chart) {
        chart = new Chart(ctx, {
          type:'line',
          data:{ labels: xs, datasets:[
            { label:'Variant A', data:yA, borderColor:'#7c3aed', tension:.25 },
            { label:'Variant B', data:yB, borderColor:'#22d3ee', tension:.25 }
          ]},
          options:{ plugins:{ legend:{ position:'bottom' } }, scales:{ x:{ title:{ display:true, text:'Conversion rate' } }, y:{ display:false } } }
        });
      } else {
        chart.data.labels = xs; chart.data.datasets[0].data = yA; chart.data.datasets[1].data = yB; chart.update();
      }
      const out = app.querySelector('#abOut');
      out.innerHTML = `<strong>pA:</strong> ${(pA*100).toFixed(2)}% · <strong>pB:</strong> ${(pB*100).toFixed(2)}% · <strong>Lift:</strong> ${lift.toFixed(1)}% · <strong>z:</strong> ${z.toFixed(2)}`;
    }
    runAB();

    // TensorFlow.js mini demo (synthetic regression)
    const tfBtn = app.querySelector('#tfRun');
    const tfOut = app.querySelector('#tfOut');
    tfBtn?.addEventListener('click', async () => {
      tfOut.textContent = 'Loading TensorFlow.js...';
      await loadScriptOnce(CDN.tf);
      // dataset y = 2x + 1 + noise
      const xs = tf.tensor2d(Array.from({length:50}, (_,i)=>[i/10]));
      const noise = tf.randomNormal([50,1], 0, 0.1);
      const ys = xs.mul(2).add(1).add(noise);
      const model = tf.sequential();
      model.add(tf.layers.dense({ units:8, activation:'relu', inputShape:[1] }));
      model.add(tf.layers.dense({ units:1 }));
      model.compile({ optimizer: tf.train.adam(0.05), loss: 'meanAbsoluteError' });
      await model.fit(xs, ys, { epochs: 60, verbose: 0 });
      const pred = model.predict(tf.tensor2d([[5]])).dataSync()[0];
      tfOut.textContent = `Trained small model. Prediction at x=5 ≈ ${pred.toFixed(2)} (true = 11)`;
    });

    // Pyodide demo (optional Python-in-browser EDA)
    const pyBtn = app.querySelector('#pyRun');
    const pyOut = app.querySelector('#pyOut');
    let pyodide;
    pyBtn?.addEventListener('click', async () => {
      pyOut.textContent = 'Loading Python runtime... (~10–15MB)';
      await loadScriptOnce(CDN.pyodide);
      pyodide = pyodide || await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' });
      await pyodide.loadPackage('micropip');
      await pyodide.runPythonAsync(`
import sys, json, math
data = [12, 15, 14, 13, 19, 22, 18, 17, 16, 21]
mean = sum(data)/len(data)
var = sum((x-mean)**2 for x in data)/len(data)
out = {"mean": mean, "std": math.sqrt(var), "n": len(data)}
json.dumps(out)
      `).then(res => pyOut.textContent = "Python stats: " + res);
    });
  }
}

