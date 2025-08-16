// ========= PWA basics =========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

// ========= Theme =========
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') root.classList.add('light');
themeToggle.textContent = savedTheme === 'light' ? '🌚' : '🌙';
themeToggle.addEventListener('click', () => {
  root.classList.toggle('light');
  const mode = root.classList.contains('light') ? 'light' : 'dark';
  localStorage.setItem('theme', mode);
  themeToggle.textContent = mode === 'light' ? '🌚' : '🌙';
});

// ========= Mobile nav & mega menu =========
const nav = document.querySelector('.nav');
const hamburger = document.getElementById('hamburger');
hamburger?.addEventListener('click', () => {
  const expanded = nav.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
});

document.querySelectorAll('.mega-parent').forEach(parent => {
  const btn = parent.querySelector('.mega-toggle');
  const menu = parent.querySelector('.mega-menu');
  btn.addEventListener('click', (e) => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    // close all
    document.querySelectorAll('.mega-toggle').forEach(b => b.setAttribute('aria-expanded', 'false'));
    // toggle this
    btn.setAttribute('aria-expanded', String(!open));
    e.stopPropagation();
  });
  // click outside to close
  document.addEventListener('click', () => {
    btn.setAttribute('aria-expanded', 'false');
  });
  // prevent close when clicking inside
  menu.addEventListener('click', (e) => e.stopPropagation());
});

// ========= Back to top =========
const toTop = document.getElementById('toTop');
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) toTop.classList.add('show'); else toTop.classList.remove('show');
});
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ========= Year =========
document.getElementById('year').textContent = new Date().getFullYear();

// ========= Router (hash-based) =========
const app = document.getElementById('app');

const routes = {
  '/': { file: 'pages/home.html', title: 'Home — EduIgnite', desc: 'World-class data science portfolio and learning hub.' },
  '/projects': { file: 'pages/projects.html', title: 'Projects — EduIgnite', desc: 'Interactive ML, analytics, dashboards, and more.' },
  '/courses': { file: 'pages/courses.html', title: 'Courses — EduIgnite', desc: 'Learn DS/ML with practical, code-first content.' },
  '/tools': { file: 'pages/tools.html', title: 'Tools — EduIgnite', desc: 'Run models and demos right in your browser.' },
  '/research': { file: 'pages/research.html', title: 'Research — EduIgnite', desc: 'Deep insights, whitepapers, and case studies.' },
  '/about': { file: 'pages/about.html', title: 'About — EduIgnite', desc: 'Mission, story, and tech stack behind EduIgnite.' },
  '/contact': { file: 'pages/contact.html', title: 'Contact — EduIgnite', desc: 'Collaborate or say hello.' },
  '/profile': { file: 'pages/profile.html', title: 'Profile — EduIgnite', desc: 'Your learning journey and saved items.' },
};

function parseHash() {
  // e.g., #/projects?cat=ml
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  return { path, query };
}

async function loadRoute() {
  const { path } = parseHash();
  const route = routes[path] || routes['/'];
  document.title = route.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', route.desc);

  try {
    const res = await fetch(route.file, { cache: 'no-store' });
    const html = await res.text();
    app.innerHTML = html;
    app.focus();

    // run page-level enhancements
    enhancePage(path);
  } catch {
    app.innerHTML = `<div class="section"><h2>Something went wrong</h2><p class="muted">Please try again.</p></div>`;
  }
}

function enhancePage(path) {
  // contact form handler
  const contactForm = app.querySelector('#contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(contactForm).entries());
      // For now, just open default mail client
      const body = encodeURIComponent(`${data.message}\n\n— ${data.name} (${data.email})`);
      window.location.href = `mailto:hello@eduignite.dev?subject=${encodeURIComponent('Inquiry from EduIgnite')}&body=${body}`;
    });
  }

  // fake auth toggle
  const signBtn = app.querySelector('#signToggle');
  if (signBtn) {
    signBtn.addEventListener('click', () => {
      const isIn = localStorage.getItem('signedIn') === 'true';
      localStorage.setItem('signedIn', String(!isIn));
      loadRoute(); // refresh profile view
    });
  }

  // tools: simple demo interactions
  const rfmBtn = app.querySelector('#rfmDemo');
  rfmBtn?.addEventListener('click', () => {
    alert('RFM segmentation demo: Coming alive with CSV upload in the next pass.');
  });
}

window.addEventListener('hashchange', loadRoute);
window.addEventListener('DOMContentLoaded', () => {
  if (!location.hash) location.hash = '#/';
  loadRoute();

  // prefetch pages quietly
  const files = Object.values(routes).map(r => r.file);
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => files.forEach(f => fetch(f).catch(() => {})));
  } else {
    setTimeout(() => files.forEach(f => fetch(f).catch(() => {})), 1200);
  }
});

// Support "data-link" clicks (not strictly needed with #, but kept)
document.body.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a) return;
  if (a.getAttribute('href')?.startsWith('#/')) {
    // default behavior is fine for hash links
  }
});
