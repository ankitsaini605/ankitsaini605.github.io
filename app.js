// 1) Add this route to the routes object (near others)
'/project-sales': { file: 'pages/project-sales.html', title: 'Sales Insights — EduIgnite', desc: 'Cohorts, RFM, KPIs, and forecasts from transactional data.' },
// In routes object:
'/project-churn': { file: 'pages/project-churn.html', title: 'Churn Prediction — EduIgnite', desc: 'Predict churn, explain drivers, and simulate retention levers.' },


// 2) Inside enhance(path), add this block:
if (path === '/project-sales') {
  const CDN = { chart: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js' };
  const loadScriptOnce = (src) => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = res; s.onerror = rej; document.body.appendChild(s);
  });

  const kpiEl = app.querySelector('#kpis');
  const tsCanvas = app.querySelector('#tsChart');
  const rfmCanvas = app.querySelector('#rfmChart');
  const cohortTable = app.querySelector('#cohortTable');

  // Load data
  async function loadJSON(p){ const r = await fetch(p, {cache:'no-store'}); return r.json(); }
  const [kpis, ts, rfm, cohorts] = await Promise.all([
    loadJSON('data/sales/kpis.json'),
    loadJSON('data/sales/timeseries.json'),
    loadJSON('data/sales/rfm.json'),
    loadJSON('data/sales/cohorts.json')
  ]);

  // Render KPIs
  kpiEl.innerHTML = `
    <div class="kpi"><strong>${kpis.total_revenue.toLocaleString('en-IN', {maximumFractionDigits:0})}</strong><span>Total revenue</span></div>
    <div class="kpi"><strong>${kpis.orders.toLocaleString('en-IN')}</strong><span>Orders</span></div>
    <div class="kpi"><strong>${kpis.customers.toLocaleString('en-IN')}</strong><span>Customers</span></div>
    <div class="kpi"><strong>${kpis.avg_order_value.toFixed(2)}</strong><span>Avg order value</span></div>
    <div class="kpi"><strong>${(kpis.repeat_rate*100).toFixed(1)}%</strong><span>Repeat purchase rate</span></div>
    <div class="kpi"><strong>${(kpis.yoy_growth*100).toFixed(1)}%</strong><span>YoY revenue growth</span></div>
  `;

  // Charts
  await loadScriptOnce(CDN.chart);

  // Time series revenue
  const tsCtx = tsCanvas.getContext('2d');
  new Chart(tsCtx, {
    type: 'line',
    data: {
      labels: ts.map(r => r.month),
      datasets: [{
        label: 'Revenue',
        data: ts.map(r => r.revenue),
        borderColor: '#7c3aed',
        tension: .25
      }]
    },
    options: { plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:false } } }
  });

  // RFM bar chart
  const rfmCtx = rfmCanvas.getContext('2d');
  new Chart(rfmCtx, {
    type: 'bar',
    data: {
      labels: rfm.map(s => s.segment),
      datasets: [{
        label: 'Customers',
        data: rfm.map(s => s.count),
        backgroundColor: '#22d3ee'
      }]
    },
    options: { plugins:{ legend:{ display:false } }, scales:{ x:{ ticks:{ color:'#9ca3af' } }, y:{ beginAtZero:true } } }
  });

  // Cohort table (retention)
  const months = cohorts.header; // ["Cohort","M1","M2",...]
  const rows = cohorts.rows;     // [{cohort:"2024-01", values:[100,62,48,...]}, ...]
  const head = `<thead><tr>${months.map(m=>`<th>${m}</th>`).join('')}</tr></thead>`;
  const body = rows.map(r => {
    const cells = [r.cohort].concat(r.values.map(v => v===null ? '' : (v+'%')));
    return `<tr>${cells.map((c,i) => {
      if (i===0) return `<th>${c}</th>`;
      const val = parseFloat(c) || 0;
      const color = `hsl(${120*val/100},70%,${40 + (30*val/100)}%)`;
      return `<td style="background:${color}; color:#051014;">${c}</td>`;
    }).join('')}</tr>`;
  }).join('');
  cohortTable.innerHTML = `<div class="table-wrap"><table class="table">${head}<tbody>${body}</tbody></table></div>`;
}
if (path === '/project-churn') {
  const churn = {
    metrics: 'data/churn/metrics.json',
    importances: 'data/churn/importance.json',
    dist: 'data/churn/distribution.json',
    whatif: 'data/churn/whatif.json'
  };
  const load = (p) => fetch(p, {cache:'no-store'}).then(r=>r.json());
  // Ensure Chart.js present
  const chartCdn = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js';
  const loadScriptOnce = (src) => new Promise((res,rej)=>{ if(document.querySelector(`script[src="${src}"]`)) return res(); const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.body.appendChild(s); });

  const kpisEl = app.querySelector('#churn-kpis');
  const distCanvas = app.querySelector('#churnDist');
  const impCanvas = app.querySelector('#churnImportances');
  const ctrlEl = app.querySelector('#whatIfCtrls');
  const probEl = app.querySelector('#whatIfProb');

  const [metrics, importances, dist, whatif] = await Promise.all([
    load(churn.metrics), load(churn.importances), load(churn.dist), load(churn.whatif)
  ]);

  // KPIs
  kpisEl.innerHTML = `
    <div class="kpi"><strong>${metrics.rows.toLocaleString('en-IN')}</strong><span>Customers</span></div>
    <div class="kpi"><strong>${metrics.positive_rate.toFixed(2)}%</strong><span>Churn rate</span></div>
    <div class="kpi"><strong>${metrics.auc_gb.toFixed(3)}</strong><span>AUC (GB)</span></div>
    <div class="kpi"><strong>${metrics.auc_lr.toFixed(3)}</strong><span>AUC (LR)</span></div>
    <div class="kpi"><strong>${metrics.n_features}</strong><span>Features used</span></div>
    <div class="kpi"><strong>${metrics.updated_at}</strong><span>Last updated</span></div>
  `;

  // Charts
  await loadScriptOnce(chartCdn);

  // Distribution (two hist lines)
  const dctx = distCanvas.getContext('2d');
  new Chart(dctx, {
    type:'line',
    data:{
      labels: dist.bins,
      datasets:[
        {label:'Active', data:dist.active, borderColor:'#22d3ee', tension:.25},
        {label:'Churned', data:dist.churned, borderColor:'#ef4444', tension:.25}
      ]
    },
    options:{ plugins:{ legend:{ position:'bottom' } }, scales:{ x:{ title:{display:true,text:'Churn probability'} }, y:{ beginAtZero:true } } }
  });

  // Importances
  const ictx = impCanvas.getContext('2d');
  new Chart(ictx, {
    type:'bar',
    data:{ labels: importances.map(d=>d.feature), datasets:[{ label:'Importance', data:importances.map(d=>d.importance), backgroundColor:'#7c3aed' }] },
    options:{ indexAxis:'y', plugins:{ legend:{ display:false } } }
  });

  // What-if UI
  const feats = whatif.features; // [{name,min,max,mean,std,coef}]
  feats.forEach(f=>{
    const id = `wf_${f.name}`;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <label for="${id}"><strong>${f.name}</strong> <span class="muted">(min: ${f.min}, max: ${f.max}, current: <span id="${id}_val">${Math.round(f.mean)})</span></span></label>
      <input type="range" id="${id}" min="${f.min}" max="${f.max}" value="${f.mean}" step="${Math.max(1, Math.round((f.max-f.min)/100))}">
    `;
    ctrlEl.appendChild(wrap);
    const range = wrap.querySelector(`#${id}`);
    const valSpan = wrap.querySelector(`#${id}_val`);
    range.addEventListener('input', ()=>{ valSpan.textContent = range.value; updateProb(); });
  });

  function sigmoid(z){ return 1/(1+Math.exp(-z)); }
  function updateProb(){
    let z = whatif.intercept;
    feats.forEach(f=>{
      const x = +document.getElementById(`wf_${f.name}`).value;
      const zscore = f.std ? (x - f.mean)/f.std : 0;
      z += f.coef * zscore;
    });
    const p = sigmoid(z);
    probEl.textContent = (p*100).toFixed(1)+'%';
  }
  updateProb();
}



