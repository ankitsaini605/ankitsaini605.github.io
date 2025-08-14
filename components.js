// components.js — shared helpers + Firebase Auth glue

// --- Config: replace with your Firebase project keys ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID"
};

// --- Bootstrap ---
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => r.querySelectorAll(s);

const App = {
  auth: null,
  init() {
    // Year
    const y = $("#year");
    if (y) y.textContent = new Date().getFullYear();

    // Toast container
    if (!$("#toasts")) {
      const t = document.createElement("div");
      t.id = "toasts"; t.className = "toasts"; t.setAttribute("aria-live","polite");
      document.body.appendChild(t);
    }

    // Firebase
    if (typeof firebase !== "undefined") {
      firebase.initializeApp(firebaseConfig);
      this.auth = firebase.auth();
      this.bindAuthUI();
    } else {
      console.warn("Firebase SDK not found. Load it before components.js");
    }

    // Auth modal triggers
    const open = $("#open-auth"), close = $("#close-auth"), modal = $("#auth-modal");
    if (open && modal) open.addEventListener("click", ()=> modal.style.display="flex");
    if (close && modal) close.addEventListener("click", ()=> modal.style.display="none");
    if (modal) modal.addEventListener("click", e=>{ if(e.target===modal) modal.style.display="none"; });

    // Global logout
    const logoutBtn = $("#logout");
    if (logoutBtn) logoutBtn.addEventListener("click", ()=> this.auth?.signOut().then(()=> this.toast("Logged out")));
  },

  toast(msg, type="success") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<div>🔔</div><div>${msg}</div>`;
    $("#toasts").appendChild(el);
    setTimeout(()=> el.remove(), 4000);
  },

  setLoading(btn, state) {
    if (!btn) return;
    const spinner = btn.querySelector(".spinner");
    const text = btn.querySelector(".btn-text");
    if(state){ btn.classList.add("loading"); if(spinner) spinner.style.display="inline-block"; if(text) text.style.display="none"; }
    else { btn.classList.remove("loading"); if(spinner) spinner.style.display="none"; if(text) text.style.display="inline"; }
  },

  bindAuthUI() {
    const a = this.auth;
    if (!a) return;

    // Buttons and inputs (optional)
    const googleBtn = $("#google-btn");
    const emailSignIn = $("#email-signin");
    const emailSignUp = $("#email-signup");
    const resetPass = $("#reset-pass");
    const emailInput = $("#auth-email");
    const passInput = $("#auth-pass");
    const modal = $("#auth-modal");

    if (googleBtn) googleBtn.addEventListener("click", async ()=>{
      try { await a.signInWithPopup(new firebase.auth.GoogleAuthProvider()); this.toast("Signed in with Google"); if(modal) modal.style.display="none"; }
      catch(e){ this.toast(e.message, "error"); }
    });

    if (emailSignIn) emailSignIn.addEventListener("click", async ()=>{
      const email = emailInput?.value.trim(), pass = passInput?.value;
      if(!email || !pass) return this.toast("Email and password required", "warn");
      try{ await a.signInWithEmailAndPassword(email, pass); this.toast("Welcome back"); if(modal) modal.style.display="none"; }
      catch(e){ this.toast(e.message, "error"); }
    });

    if (emailSignUp) emailSignUp.addEventListener("click", async ()=>{
      const email = emailInput?.value.trim(), pass = passInput?.value || "";
      if(!email || pass.length<6) return this.toast("Use a valid email and 6+ char password", "warn");
      try{ await a.createUserWithEmailAndPassword(email, pass); this.toast("Account created"); if(modal) modal.style.display="none"; }
      catch(e){ this.toast(e.message, "error"); }
    });

    if (resetPass) resetPass.addEventListener("click", async ()=>{
      const email = emailInput?.value.trim();
      if(!email) return this.toast("Enter email to reset password", "warn");
      try{ await a.sendPasswordResetEmail(email); this.toast("Password reset link sent"); }
      catch(e){ this.toast(e.message, "error"); }
    });

    // Auth state -> Nav + optional form autofill
    const userChip = $("#user-chip"), chipEmail = $("#chip-email"), avatar = $("#avatar"), openAuthBtn = $("#open-auth");
    a.onAuthStateChanged(user=>{
      if(user){
        if (openAuthBtn) openAuthBtn.style.display="none";
        if (userChip) userChip.style.display="flex";
        if (chipEmail) chipEmail.textContent = user.email || "Account";
        const name = user.displayName || (user.email ? user.email.split("@")[0] : "U");
        if (avatar) avatar.textContent = (name||"U").slice(0,1).toUpperCase();

        // Autofill common form fields if present
        const nameField = $("#name"), emailField = $("#email");
        if (nameField && !nameField.value) nameField.value = user.displayName || "";
        if (emailField && !emailField.value) emailField.value = user.email || "";
      } else {
        if (userChip) userChip.style.display="none";
        if (openAuthBtn) openAuthBtn.style.display="inline-flex";
      }
    });
  }
};

// Auto-init after DOM ready
document.addEventListener("DOMContentLoaded", ()=> App.init());

// Optional global export
window.App = App;
