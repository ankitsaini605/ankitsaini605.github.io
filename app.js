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
  const files = Object.values(routes).map(r => r.file);
  ('requestIdleCallback' in window ? requestIdleCallback : (fn)=>setTimeout(fn,1200))(
    () => files.forEach(f => fetch(f).catch(()=>{}))
  );
});

// Lazy loaders for DS libs
const CDN = {
  chart: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js',
  tf: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.16.0/dist/tf.min.js',
  papaparse: 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
  sqljs: 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js',
  pyodide: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js'
};
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => resolve(); s.onerror = reject; document.body.appendChild(s);
  });
}

// Math helpers
const mean = arr => arr.reduce((a,b)=>a+b,0)/arr.length || 0;
const std = arr => Math.sqrt(mean(arr.map(x => (x-mean(arr))**2)));
function corr(x, y){
  const mx = mean(x), my = mean(y);
  const num = x.reduce((s,xi,i)=> s + (xi-mx)*(y[i]-my), 0);
  const den = Math.sqrt(x.reduce((s,xi)=> s + (xi-mx)**2,0) * y.reduce((s,yi)=> s + (yi-my)**2,0));
  return den ? num/den : 0;
}
const unique = arr => Array.from(new Set(arr));

// Page enhancement hooks
async function enhance(path) {
  // Contact form mailto
  const cf = app.querySelector('#contactForm');
  if (cf) {
    cf.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(cf).entries());
      const body = encodeURIComponent(`${data.message}\n\n— ${data.name} (${data.email})`);
      location.href = `mailto:ankitsaini24082002@gmail.com?subject=${encodeURIComponent('Inquiry via EduIgnite')}&body=${body}`;
    });
  }

  // Tools page: CSV EDA, A/B, TF.js, Pyodide, SQL.js
  if (path === '/tools') {
    // Load libs
    await Promise.all([loadScriptOnce(CDN.papaparse), loadScriptOnce(CDN.chart)]);

    // ----- CSV EDA -----
    const edaFile = app.querySelector('#edaCsv');
    const edaBtn = app.querySelector('#runEda');
    const edaSummary = app.querySelector('#edaSummary');
    const edaCols = app.querySelector('#edaColSelect');
    const histCanvas = app.querySelector('#histChart');
    const corrTable = app.querySelector('#corrTable');
    let histChart;

    function renderTable(el, rows) {
      if (!rows?.length) { el.innerHTML = '<p class="muted">No data.</p>'; return; }
      const cols = Object.keys(rows[0]);
      const head = `<thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>`;
      const body = `<tbody>${rows.slice(0,10).map(r=>`<tr>${cols.map(c=>`<td>${r[c]}</td>`).join('')}</tr>`).join('')}</tbody>`;
      el.innerHTML = `<table class="table">${head}${body}</table>`;
    }

    edaBtn?.addEventListener('click', () => {
      if (!edaFile.files?.length) { edaSummary.innerHTML = '<p class="muted">Please select a CSV.</p>'; return; }
      Papa.parse(edaFile.files[0], {
        header: true, dynamicTyping: true, skipEmptyLines: true,
        complete: (res) => {
          const rows = res.data;
          if (!rows.length) { edaSummary.innerHTML = '<p class="muted">No rows found.</p>'; return; }
          const cols = Object.keys(rows[0] || {});
          const n = rows.length;
          const missing = {};
          cols.forEach(c => missing[c] = rows.filter(r => r[c]===null || r[c]===undefined || r[c]==='').length);
          const numericCols = cols.filter(c => rows.every(r => typeof r[c] === 'number' || r[c] === null || r[c] === undefined || r[c] === ''));
          const summary = [
            { Metric: 'Rows', Value: n },
            { Metric: 'Columns', Value: cols.length },
            { Metric: 'Numeric columns', Value: numericCols.length },
            { Metric: 'Missing cells', Value: cols.reduce((s,c)=> s+missing[c], 0) }
          ];
          renderTable(edaSummary, summary);

          // Populate column selector for histogram
          edaCols.innerHTML = numericCols.map(c => `<option value="${c}">${c}</option>`).join('');
          if (numericCols.length) drawHistogram(rows, numericCols[0]);

          // Correlation matrix
          renderCorrelation(rows, numericCols);
          // Head preview
          const headPreview = app.querySelector('#edaHead');
          renderTable(headPreview, rows.slice(0,5));
        }
      });
    });

    function drawHistogram(rows, col) {
      const vals = rows.map(r => r[col]).filter(v => typeof v === 'number' && !Number.isNaN(v));
      if (!vals.length) return;
      const bins = 12;
      const min = Math.min(...vals), max = Math.max(...vals);
      const width = (max - min) || 1;
      const counts = new Array(bins).fill(0);
      vals.forEach(v => {
        const idx = Math.min(bins-1, Math.floor((v - min)/width*bins));
        counts[idx]++;
      });
      const labels = counts.map((_,i)=> (min + i*width/bins).toFixed(1));
      if (!histChart) {
        histChart = new Chart(histCanvas, {
          type:'bar',
          data:{ labels, datasets:[{ label:`Distribution of ${col}`, data:counts, backgroundColor:'#7c3aed' }] },
          options:{ plugins:{ legend:{ display:false } }, scales:{ x:{ ticks:{ color:'#9ca3af' } }, y:{ beginAtZero:true } } }
        });
      } else {
        histChart.data.labels = labels;
        histChart.data.datasets[0].label = `Distribution of ${col}`;
        histChart.data.datasets[0].data = counts;
        histChart.update();
      }
    }
    edaCols?.addEventListener('change', (e)=> {
      const file = edaFile.files?.[0]; if (!file) return;
      Papa.parse(file, { header:true, dynamicTyping:true, complete: (res)=> drawHistogram(res.data, e.target.value) });
    });

    function renderCorrelation(rows, numericCols){
      if (!numericCols.length) { corrTable.innerHTML = '<p class="muted">No numeric columns for correlation.</p>'; return; }
      const cols = numericCols;
      const matrix = cols.map(c1 => cols.map(c2 => {
        const x = rows.map(r => r[c1]).filter(v => typeof v==='number' && !Number.isNaN(v));
        const y = rows.map(r => r[c2]).filter(v => typeof v==='number' && !Number.isNaN(v));
        const len = Math.min(x.length, y.length);
        if (!len) return 0;
        const xx = x.slice(0,len), yy = y.slice(0,len);
        return corr(xx, yy);
      }));
      const head = `<thead><tr><th></th>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>`;
      const body = `<tbody>${matrix.map((row,i)=>
        `<tr><th>${cols[i]}</th>` + row.map(v => {
          const val = Math.round(v*100)/100;
          const color = `hsl(${(val+1)*60}, 70%, 40%)`;
          return `<td style="color:#fff; background:${color}">${val}</td>`;
        }).join('') + `</tr>`
      ).join('')}</tbody>`;
      corrTable.innerHTML = `<div class="table-wrap"><table class="table corr">${head}${body}</table></div>`;
    }

    // ----- A/B simulator (z-test + Bayesian beta) -----
    const abForm = app.querySelector('#abForm');
    const abChart = app.querySelector('#abChart');
    const ctx = abChart?.getContext('2d');
    let abLine;
    function runAB() {
      const nA = +abForm.nA.value || 1000;
      const cA = +abForm.cA.value || 120;
      const nB = +abForm.nB.value || 1000;
      const cB = +abForm.cB.value || 150;
      const pA = cA/nA, pB = cB/nB;
      const lift = ((pB-pA)/Math.max(pA,1e-9))*100;
      const pPool = (cA + cB)/(nA + nB);
      const se = Math.sqrt(Math.max(1e-12, pPool*(1-pPool)*(1/nA + 1/nB)));
      const z = (pB - pA)/se;
      const xs = Array.from({length:200}, (_,i)=> i/199);
      const betaPdf = (x,a,b)=> Math.pow(x, a-1)*Math.pow(1-x, b-1);
      const yA = xs.map(x => betaPdf(x, 1+cA, 1+nA-cA));
      const yB = xs.map(x => betaPdf(x, 1+cB, 1+nB-cB));
      if (!abLine) {
        abLine = new Chart(ctx, {
          type:'line',
          data:{ labels: xs, datasets:[
            { label:'Variant A', data:yA, borderColor:'#7c3aed', tension:.25 },
            { label:'Variant B', data:yB, borderColor:'#22d3ee', tension:.25 }
          ]},
          options:{ plugins:{ legend:{ position:'bottom' } }, scales:{ x:{ title:{ display:true, text:'Conversion rate' } }, y:{ display:false } } }
        });
      } else {
        abLine.data.labels = xs; abLine.data.datasets[0].data = yA; abLine.data.datasets[1].data = yB; abLine.update();
      }
      app.querySelector('#abOut').innerHTML =
        `<strong>pA:</strong> ${(pA*100).toFixed(2)}% · <strong>pB:</strong> ${(pB*100).toFixed(2)}% · <strong>Lift:</strong> ${lift.toFixed(1)}% · <strong>z:</strong> ${z.toFixed(2)}`;
    }
    abForm?.addEventListener('input', runAB);
    runAB();

    // ----- TensorFlow.js mini regression -----
    const tfBtn = app.querySelector('#tfRun');
    const tfOut = app.querySelector('#tfOut');
    tfBtn?.addEventListener('click', async () => {
      tfOut.textContent = 'Loading TensorFlow.js...';
      await loadScriptOnce(CDN.tf);
      const xs = tf.tensor2d(Array.from({length:50}, (_,i)=>[i/10]));
      const noise = tf.randomNormal([50,1], 0, 0.1);
      const ys = xs.mul(2).add(1).add(noise);
      const model = tf.sequential();
      model.add(tf.layers.dense({ units:8, activation:'relu', inputShape:[1] }));
      model.add(tf.layers.dense({ units:1 }));
      model.compile({ optimizer: tf.train.adam(0.05), loss: 'meanAbsoluteError' });
      await model.fit(xs, ys, { epochs: 60, verbose: 0 });
      const pred = model.predict(tf.tensor2d([[5]])).dataSync()[0];
      tfOut.textContent = `Trained mini-model. Prediction at x=5 ≈ ${pred.toFixed(2)} (true ≈ 11)`;
      tf.dispose([xs, noise, ys, model]);
    });

    // ----- Pyodide: Python-in-browser quick stats -----
    const pyBtn = app.querySelector('#pyRun');
    const pyOut = app.querySelector('#pyOut');
    let pyodide;
    pyBtn?.addEventListener('click', async () => {
      pyOut.textContent = 'Loading Python runtime (~10–15MB)...';
      await loadScriptOnce(CDN.pyodide);
      pyodide = pyodide || await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' });
      const code = `
import json, math
data = [12, 15, 14, 13, 19, 22, 18, 17, 16, 21]
mean = sum(data)/len(data)
var = sum((x-mean)**2 for x in data)/len(data)
out = {"n": len(data), "mean": round(mean,2), "std": round(math.sqrt(var),2)}
json.dumps(out)
      `;
      const res = await pyodide.runPythonAsync(code);
      pyOut.textContent = "Python stats → " + res;
    });

    // ----- SQL Lab with sql.js -----
    const sqlArea = app.querySelector('#sqlQuery');
    const sqlBtn = app.querySelector('#sqlRun');
    const sqlOut = app.querySelector('#sqlOut');
    const sqlInfo = app.querySelector('#sqlInfo');

    async function initSQL() {
      await loadScriptOnce(CDN.sqljs);
      const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}` });
      const db = new SQL.Database();
      // Sample table
      db.run(`CREATE TABLE sales (id INTEGER, dt TEXT, category TEXT, revenue REAL);
              INSERT INTO sales VALUES
              (1,'2025-01-01','Electronics',1200.50),
              (2,'2025-01-02','Fashion',340.00),
              (3,'2025-01-03','Grocery',89.90),
              (4,'2025-01-03','Electronics',560.00),
              (5,'2025-01-04','Grocery',120.40),
              (6,'2025-01-05','Fashion',220.10),
              (7,'2025-01-05','Electronics',980.00);
      `);
      sqlInfo.textContent = 'Loaded SQLite (in-memory). Try: SELECT category, SUM(revenue) AS rev FROM sales GROUP BY category ORDER BY rev DESC;';
      sqlBtn?.addEventListener('click', () => {
        try{
          const query = sqlArea.value.trim() || 'SELECT * FROM sales LIMIT 10;';
          const res = db.exec(query);
          if (!res.length) { sqlOut.innerHTML = '<p class="muted">Query OK. No result set.</p>'; return; }
          const { columns, values } = res[0];
          const head = `<thead><tr>${columns.map(c=>`<th>${c}</th>`).join('')}</tr></thead>`;
          const body = `<tbody>${values.map(row=>`<tr>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>`;
          sqlOut.innerHTML = `<div class="table-wrap"><table class="table">${head}${body}</table></div>`;
        }catch(err){
          sqlOut.innerHTML = `<p class="muted">Error: ${err.message}</p>`;
        }
      });
    }
    initSQL().catch(()=> sqlInfo.textContent = 'Could not load SQL engine. Check your connection.');
  }

  // Profile demo sign-in toggle
  const signBtn = app.querySelector('#signToggle');
  const status = app.querySelector('#authStatus');
  if (signBtn && status) {
    const isIn = localStorage.getItem('signedIn') === 'true';
    status.textContent = isIn ? 'Signed in' : 'Guest';
    signBtn.textContent = isIn ? 'Sign out' : 'Sign in';
    signBtn.addEventListener('click', ()=>{
      const cur = localStorage.getItem('signedIn') === 'true';
      localStorage.setItem('signedIn', String(!cur));
      status.textContent = !cur ? 'Signed in' : 'Guest';
      signBtn.textContent = !cur ? 'Sign out' : 'Sign in';
    });
  }
}


