// register.js - Firebase v10 modular
// Creates user → saves to Firestore → sends verification email → auto switches to sign-in

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

// ────────────────────────────────────────────────
// Globals
// ────────────────────────────────────────────────

let auth = null;
let db   = null;

// ────────────────────────────────────────────────
// Initialize Firebase
// ────────────────────────────────────────────────

function initFirebase() {
  if (auth && db) return true;

  try {
    const app = initializeApp(firebaseConfig); // ← make sure firebaseConfig is defined in config.js
    auth = getAuth(app);
    db   = getFirestore(app);
    console.log("Firebase initialized");
    return true;
  } catch (err) {
    console.error("Firebase init failed:", err);
    return false;
  }
}

// ────────────────────────────────────────────────
// UI Helpers
// ────────────────────────────────────────────────

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function showErrorBanner(type, message) {
  const banner = document.getElementById(`${type}ErrorBanner`);
  if (banner) {
    banner.querySelector('.error-banner-text').textContent = message;
    banner.style.display = 'flex';
  }
}

function closeErrorBanner(type) {
  const banner = document.getElementById(`${type}ErrorBanner`);
  if (banner) banner.style.display = 'none';
}

function showSuccessBanner(type, message) {
  const banner = document.getElementById(`${type}SuccessBanner`) ||
                 document.getElementById(`${type}ErrorBanner`);
  if (banner) {
    const text = banner.querySelector('.success-banner-text') ||
                 banner.querySelector('.error-banner-text');
    if (text) text.textContent = message;
    banner.style.display = 'flex';
    // Auto-hide after 5 seconds
    setTimeout(() => banner.style.display = 'none', 5000);
  }
}

// ────────────────────────────────────────────────
// Form visibility helpers
// ────────────────────────────────────────────────

function showSignIn() {
  document.getElementById('signupForm')?.classList.add('hidden');
  document.getElementById('forgotPasswordForm')?.classList.add('hidden');
  document.getElementById('signinForm')?.classList.remove('hidden');
}

function showSignUp() {
  document.getElementById('signinForm')?.classList.add('hidden');
  document.getElementById('forgotPasswordForm')?.classList.add('hidden');
  document.getElementById('signupForm')?.classList.remove('hidden');
}

function showForgot() {
  document.getElementById('signinForm')?.classList.add('hidden');
  document.getElementById('signupForm')?.classList.add('hidden');
  document.getElementById('forgotPasswordForm')?.classList.remove('hidden');
}

// ────────────────────────────────────────────────
// Sign Up Handler
// ────────────────────────────────────────────────

async function handleSignUp(e) {
  e.preventDefault();

  const name            = document.getElementById('signup-name')?.value.trim();
  const email           = document.getElementById('signup-email')?.value.trim();
  const phone           = document.getElementById('signup-phone')?.value.trim();
  const address         = document.getElementById('signup-address')?.value.trim();
  const password        = document.getElementById('signup-password')?.value;
  const confirmPassword = document.getElementById('signup-confirm-password')?.value;

  const btn = e.target.querySelector('.submit-btn');
  const originalText = btn.textContent;

  closeErrorBanner('signup');

  if (!name)                return showErrorBanner('signup', 'Please enter your full name.');
  if (!isValidEmail(email)) return showErrorBanner('signup', 'Please enter a valid email.');
  if (!phone)               return showErrorBanner('signup', 'Please enter phone number.');
  if (!address)             return showErrorBanner('signup', 'Please enter your address.');
  if (password.length < 6)  return showErrorBanner('signup', 'Password must be at least 6 characters.');
  if (password !== confirmPassword) return showErrorBanner('signup', 'Passwords do not match.');

  if (!initFirebase()) return showErrorBanner('signup', 'Service not ready. Try refreshing.');

  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    // 1. Create user in Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Update display name first (for better email templates)
    await updateProfile(user, { displayName: name });

    // 3. Send verification email IMMEDIATELY (before Firestore save)
    await sendEmailVerification(user, {
      url: window.location.origin + "/register.html"
    });
    console.log(`✓ Verification email sent to: ${email}`);

    // 4. Save user profile to Firestore → this is what shows in admin "Registered Users"
    await setDoc(doc(db, "profiles", user.uid), {
      full_name:     name,
      email:         email,
      phone_number:  phone,
      address:       address,
      created_at:    serverTimestamp(),
      email_verified: false // Track verification status
    });

    // 5. Sign out the user immediately so they MUST verify before accessing
    await signOut(auth);

    // ──────────────── Success - Quick transition ────────────────
    e.target.reset();
    closeErrorBanner('signup');

    // Pre-fill email in sign-in form
    const signinEmail = document.getElementById('signin-email');
    if (signinEmail) signinEmail.value = email;

    // Switch to sign-in immediately (no delay needed)
    showSignIn();

    // Show clear success message
    showSuccessBanner('signin',
      `✓ Account created! Verification email sent to ${email}\n` +
      `Please check your inbox/spam and click the link to verify.\n` +
      `Then you can sign in below.`
    );

  } catch (err) {
    let msg = 'Sign up failed. ';
    
    // Special handling for email verification errors
    if (err.code === 'auth/invalid-email' || err.code === 'auth/missing-email') {
      msg += 'Invalid email address.';
    } else if (err.code === 'auth/email-already-in-use') {
      msg += 'This email is already registered.';
    } else if (err.code === 'auth/weak-password') {
      msg += 'Password is too weak.';
    } else if (err.message && err.message.includes('verification')) {
      msg = 'Account created but verification email failed to send. Please contact support.';
    } else {
      msg += err.message || 'Please try again.';
    }
    
    showErrorBanner('signup', msg);
    console.error("Signup error:", err);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ────────────────────────────────────────────────
// Sign In Handler
// ────────────────────────────────────────────────

async function handleSignIn(e) {
  e.preventDefault();

  const email    = document.getElementById('signin-email')?.value.trim();
  const password = document.getElementById('signin-password')?.value;

  const btn = e.target.querySelector('.submit-btn');
  const originalText = btn.textContent;

  closeErrorBanner('signin');

  if (!isValidEmail(email)) return showErrorBanner('signin', 'Valid email required.');
  if (!password)            return showErrorBanner('signin', 'Password required.');

  if (!initFirebase()) return;

  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await user.reload();

    if (!user.emailVerified) {
      try {
        await sendEmailVerification(user, {
          url: window.location.origin + "/register.html"
        });
        showErrorBanner('signin',
          'Email not verified yet.\nWe just re-sent the verification link.\nCheck inbox/spam.'
        );
      } catch (resendErr) {
        showErrorBanner('signin', 'Could not re-send verification email.');
      }
      await signOut(auth);
      return;
    }

    // Verified user → redirect happens in onAuthStateChanged
  } catch (err) {
    let msg = 'Sign in failed. ';
    switch (err.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password': msg += 'Incorrect email or password.'; break;
      default:                    msg += err.message;
    }
    showErrorBanner('signin', msg);
    console.error("Sign-in error:", err);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ────────────────────────────────────────────────
// Forgot Password
// ────────────────────────────────────────────────

async function handleForgot(e) {
  e.preventDefault();

  const email = document.getElementById('forgot-email')?.value.trim();

  const btn = e.target.querySelector('.submit-btn');
  const originalText = btn.textContent;

  closeErrorBanner('forgotPassword');

  if (!isValidEmail(email)) return showErrorBanner('forgotPassword', 'Valid email required.');

  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin + "/register.html"
    });
    showSuccessBanner('forgotPassword', 'Password reset link sent – check your inbox/spam.');
    e.target.reset();
  } catch (err) {
    showErrorBanner('forgotPassword', err.message || 'Could not send reset email.');
    console.error("Password reset error:", err);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ────────────────────────────────────────────────
// Auth state listener + page init
// ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      user.reload().then(() => {
        if (user.emailVerified) {
          console.log('Verified user signed in → redirecting');
          if (window.location.pathname.includes('register.html')) {
            window.location.replace('homepage.html'); // ← change to your actual home page
          }
        } else {
          console.log('Unverified user – signing out');
          signOut(auth);
        }
      }).catch(err => console.error("User reload failed:", err));
    }
  });

  // Attach form listeners
  document.getElementById('signup-form')?.addEventListener('submit', handleSignUp);
  document.getElementById('signin-form')?.addEventListener('submit', handleSignIn);
  document.getElementById('forgot-form')?.addEventListener('submit', handleForgot);

  // Navigation between forms
  document.querySelectorAll('[data-action]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const action = link.dataset.action;
      if (action === 'show-signup')  showSignUp();
      if (action === 'show-signin')  showSignIn();
      if (action === 'show-forgot')  showForgot();
    });
  });
});