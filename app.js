// 1) Add this route to the routes object (near others)
'/project-sales': { file: 'pages/project-sales.html', title: 'Sales Insights — EduIgnite', desc: 'Cohorts, RFM, KPIs, and forecasts from transactional data.' },

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



