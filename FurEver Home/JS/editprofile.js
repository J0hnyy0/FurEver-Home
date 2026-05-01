// editprofile.js - Updated for Mobile Firebase Structure
// Handle profile updates and password changes

import {
  getAuth,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

// ────────────────────────────────────────────────
// Globals
// ────────────────────────────────────────────────

let auth = null;
let db = null;
let currentUser = null;

// ────────────────────────────────────────────────
// Initialize Firebase
// ────────────────────────────────────────────────

function initFirebase() {
  if (auth && db) return true;

  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized");
    return true;
  } catch (err) {
    console.error("Firebase init failed:", err);
    return false;
  }
}

// ────────────────────────────────────────────────
// Profile Menu Functions
// ────────────────────────────────────────────────

function updateProfileMenu(user) {
  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const firstName = displayName.split(' ')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const nameEl = document.getElementById('userName');
  const emailEl = document.getElementById('userEmail');
  const profName = document.getElementById('profileName');
  const avatarEl = document.getElementById('profileAvatar');

  if (nameEl) nameEl.textContent = displayName;
  if (emailEl) emailEl.textContent = user.email || '';
  if (profName) profName.textContent = firstName;
  if (avatarEl) avatarEl.textContent = initials;
}

window.toggleProfileMenu = function(e) {
  e?.stopPropagation();
  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
};

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const container = document.getElementById('profileMenuContainer');
  const dropdown = document.getElementById('profileDropdown');
  
  if (container && !container.contains(e.target)) {
    dropdown?.classList.remove('show');
  }
});

// ────────────────────────────────────────────────
// Navigation Functions
// ────────────────────────────────────────────────

window.goToAdoptedPets = function() {
  window.location.href = 'adoptedpets.html';
};

window.goToAdoptionRequests = function() {
  window.location.href = 'adoptionrequests.html';
};

window.goToEditProfile = function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.goToSurrenderPet = function() {
  window.location.href = 'surrender.html';
};

// ────────────────────────────────────────────────
// Logout Functions
// ────────────────────────────────────────────────

async function handleLogout() {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
    window.location.replace('register.html');
  } catch (err) {
    console.error("Logout failed:", err);
    alert("Failed to logout. Please try again.");
  }
}

window.showLogoutModal = function() {
  const modal = document.getElementById('logoutConfirmModal');
  if (modal) {
    modal.classList.add('show');
  }
};

window.closeLogoutModal = function() {
  const modal = document.getElementById('logoutConfirmModal');
  if (modal) {
    modal.classList.remove('show');
  }
};

window.confirmLogout = async function() {
  window.closeLogoutModal();
  await handleLogout();
};

// ────────────────────────────────────────────────
// UI Helpers
// ────────────────────────────────────────────────

function showSuccessBanner(message) {
  const banner = document.getElementById('successBanner');
  const text = document.getElementById('successText');
  if (banner && text) {
    text.textContent = message;
    banner.style.display = 'flex';
    setTimeout(() => {
      banner.style.display = 'none';
    }, 5000);
  }
}

function showErrorBanner(message) {
  const banner = document.getElementById('errorBanner');
  const text = document.getElementById('errorText');
  if (banner && text) {
    text.textContent = message;
    banner.style.display = 'flex';
  }
}

function closeErrorBanner() {
  const banner = document.getElementById('errorBanner');
  if (banner) banner.style.display = 'none';
}

function setInputError(inputId, show = true) {
  const input = document.getElementById(inputId);
  if (input) {
    const group = input.closest('.input-group');
    if (group) {
      if (show) {
        group.classList.add('error');
      } else {
        group.classList.remove('error');
      }
    }
  }
}

function clearAllErrors() {
  document.querySelectorAll('.input-group.error').forEach(group => {
    group.classList.remove('error');
  });
  closeErrorBanner();
}

// ────────────────────────────────────────────────
// Password Visibility Toggle
// ────────────────────────────────────────────────

window.togglePasswordVisibility = function(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const wrapper = input.closest('.password-input-wrapper');
  const btn = wrapper?.querySelector('.toggle-password-btn');
  const eyeIcon = btn?.querySelector('.eye-icon');
  const eyeOffIcon = btn?.querySelector('.eye-off-icon');

  if (input.type === 'password') {
    input.type = 'text';
    eyeIcon?.classList.add('hidden');
    eyeOffIcon?.classList.remove('hidden');
  } else {
    input.type = 'password';
    eyeIcon?.classList.remove('hidden');
    eyeOffIcon?.classList.add('hidden');
  }
};

// ────────────────────────────────────────────────
// Load User Profile (UPDATED FOR MOBILE)
// ────────────────────────────────────────────────

async function loadUserProfile(user) {
  try {
    // UPDATED: Changed from 'profiles' to 'users' collection
    const profileRef = doc(db, "users", user.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const data = profileSnap.data();
      
      // UPDATED: Changed field names to match mobile
      document.getElementById('fullName').value = data.fullName || '';
      document.getElementById('email').value = data.email || user.email || '';
      document.getElementById('phoneNumber').value = data.phoneNumber || '';
      document.getElementById('address').value = data.address || '';

      // Update page avatar
      const firstLetter = (data.fullName || 'U').charAt(0).toUpperCase();
      document.getElementById('profileAvatarLarge').textContent = firstLetter;
      
      // Update header profile menu
      updateProfileMenu(user);
    } else {
      // Fallback to auth data
      document.getElementById('fullName').value = user.displayName || '';
      document.getElementById('email').value = user.email || '';
      updateProfileMenu(user);
    }
  } catch (err) {
    console.error("Error loading profile:", err);
    showErrorBanner("Could not load profile data. Please refresh the page.");
  }
}

// ────────────────────────────────────────────────
// Handle Profile Update (UPDATED FOR MOBILE)
// ────────────────────────────────────────────────

async function handleProfileUpdate(e) {
  e.preventDefault();
  clearAllErrors();

  const fullName = document.getElementById('fullName')?.value.trim();
  const phoneNumber = document.getElementById('phoneNumber')?.value.trim();
  const address = document.getElementById('address')?.value.trim();

  const btn = e.target.querySelector('.btn-save');
  const originalText = btn.textContent;

  // Validation
  if (!fullName) {
    setInputError('fullName');
    showErrorBanner('Please enter your full name.');
    return;
  }

  if (!phoneNumber) {
    setInputError('phoneNumber');
    showErrorBanner('Please enter your phone number.');
    return;
  }

  if (!address) {
    setInputError('address');
    showErrorBanner('Please enter your address.');
    return;
  }

  if (!currentUser) {
    showErrorBanner('User not authenticated. Please sign in again.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    // UPDATED: Changed from 'profiles' to 'users' and updated field names
    const profileRef = doc(db, "users", currentUser.uid);
    await updateDoc(profileRef, {
      fullName: fullName,
      phoneNumber: phoneNumber,
      address: address
    });

    showSuccessBanner('✓ Profile updated successfully!');
    
    // Update avatar
    const firstLetter = fullName.charAt(0).toUpperCase();
    document.getElementById('profileAvatarLarge').textContent = firstLetter;

  } catch (err) {
    console.error("Profile update error:", err);
    showErrorBanner('Failed to update profile. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ────────────────────────────────────────────────
// Handle Password Change
// ────────────────────────────────────────────────

async function handlePasswordChange(e) {
  e.preventDefault();
  clearAllErrors();

  const currentPassword = document.getElementById('currentPassword')?.value;
  const newPassword = document.getElementById('newPassword')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;

  const btn = e.target.querySelector('.btn-save');
  const originalText = btn.textContent;

  // Validation
  if (!currentPassword) {
    setInputError('currentPassword');
    showErrorBanner('Please enter your current password.');
    return;
  }

  if (!newPassword) {
    setInputError('newPassword');
    showErrorBanner('Please enter a new password.');
    return;
  }

  if (newPassword.length < 6) {
    setInputError('newPassword');
    showErrorBanner('New password must be at least 6 characters long.');
    return;
  }

  if (newPassword !== confirmPassword) {
    setInputError('confirmPassword');
    showErrorBanner('Passwords do not match.');
    return;
  }

  if (!currentUser || !currentUser.email) {
    showErrorBanner('User not authenticated. Please sign in again.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Updating...';

  try {
    // Re-authenticate user before changing password
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );
    
    await reauthenticateWithCredential(currentUser, credential);
    
    // Update password
    await updatePassword(currentUser, newPassword);
    
    showSuccessBanner('✓ Password updated successfully!');
    
    // Clear password form
    clearPasswordForm();

  } catch (err) {
    console.error("Password update error:", err);
    
    let errorMessage = 'Failed to update password. ';
    
    if (err.code === 'auth/wrong-password') {
      errorMessage = 'Current password is incorrect.';
      setInputError('currentPassword');
    } else if (err.code === 'auth/weak-password') {
      errorMessage = 'New password is too weak.';
      setInputError('newPassword');
    } else if (err.code === 'auth/requires-recent-login') {
      errorMessage = 'Please sign out and sign in again before changing your password.';
    } else {
      errorMessage += err.message || 'Please try again.';
    }
    
    showErrorBanner(errorMessage);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ────────────────────────────────────────────────
// Clear Password Form
// ────────────────────────────────────────────────

window.clearPasswordForm = function() {
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  clearAllErrors();
};

// ────────────────────────────────────────────────
// Auth State Observer & Page Init
// ────────────────────────────────────────────────


// ────────────────────────────────────────────────
// Notification Bell
// ────────────────────────────────────────────────

function showNotifBell(show) {
  const container = document.getElementById('notificationBellContainer');
  if (container) container.style.display = show ? 'flex' : 'none';
}

async function loadBadgeCount() {
  try {
    if (!db || !auth.currentUser) return;
    const badge = document.getElementById('notifBadge');
    const uid   = auth.currentUser.uid;
    const email = auth.currentUser.email;
    const cols   = ['adoptionApplications', 'adoptionRequests'];
    const fields = ['applicantUserId', 'userId', 'uid', 'userUID'];
    let allDocs  = [];

    for (const col of cols) {
      for (const field of fields) {
        try {
          const snap = await getDocs(query(collection(db, col), where(field, '==', uid)));
          snap.docs.forEach(d => { if (!allDocs.find(x => x.id === d.id)) allDocs.push({ id: d.id, ...d.data() }); });
        } catch(_) {}
      }
    }
    if (allDocs.length === 0 && email) {
      for (const col of cols) {
        try {
          const snap = await getDocs(query(collection(db, col), where('email', '==', email)));
          snap.docs.forEach(d => { if (!allDocs.find(x => x.id === d.id)) allDocs.push({ id: d.id, ...d.data() }); });
        } catch(_) {}
      }
    }
    const approved = allDocs.filter(d => (d.status || '').toLowerCase() === 'approved').length;
    const count = allDocs.length > 0 ? (approved || allDocs.length) : 0;
    if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none'; }
  } catch(e) { console.error(e); }
}

window.toggleNotifPanel = function() {
  const modal = document.getElementById('adoptionNotifModal');
  if (!modal) return;
  if (modal.style.display === 'flex') {
    closeAdoptionNotif();
  } else {
    loadAdoptionNotifications();
    modal.style.display = 'flex';
  }
};

window.closeAdoptionNotif = function() {
  const modal = document.getElementById('adoptionNotifModal');
  if (modal) modal.style.display = 'none';
};

window.selectDonationAmount = function(btn) {
  document.querySelectorAll('.donate-amount-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
};

async function loadAdoptionNotifications() {
  const list  = document.getElementById('adoptionNotifList');
  const sub   = document.getElementById('adoptionNotifSub');
  const badge = document.getElementById('notifBadge');
  if (!list) return;

  list.innerHTML = '<p class="adoption-notif-empty">Loading...</p>';

  try {
    if (!db || !auth.currentUser) {
      list.innerHTML = '<p class="adoption-notif-empty">Please sign in to see notifications.</p>';
      return;
    }
    const uid   = auth.currentUser.uid;
    const email = auth.currentUser.email;
    const cols   = ['adoptionApplications', 'adoptionRequests'];
    const fields = ['applicantUserId', 'userId', 'uid', 'userUID'];
    let docs = [];

    for (const col of cols) {
      for (const field of fields) {
        try {
          const q = query(collection(db, col), where(field, '==', uid));
          const snap = await getDocs(q);
          snap.docs.forEach(d => { if (!docs.find(x => x.id === d.id)) docs.push({ id: d.id, _col: col, ...d.data() }); });
        } catch(_) {}
      }
    }
    if (docs.length === 0 && email) {
      for (const col of cols) {
        try {
          const snap = await getDocs(query(collection(db, col), where('email', '==', email)));
          snap.docs.forEach(d => { if (!docs.find(x => x.id === d.id)) docs.push({ id: d.id, _col: col, ...d.data() }); });
        } catch(_) {}
      }
    }

    if (docs.length === 0) {
      if (sub) sub.textContent = 'You have no adoption requests.';
      list.innerHTML = '<p class="adoption-notif-empty">No requests yet. </p>';
      if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }
      return;
    }

    const approvedCount = docs.filter(d => (d.status || '').toLowerCase() === 'approved').length;
    if (sub) sub.textContent = `You have ${docs.length} adoption request${docs.length !== 1 ? 's' : ''}.`;
    const badgeNum = approvedCount || docs.length;
    if (badge) { badge.textContent = badgeNum; badge.style.display = badgeNum > 0 ? 'flex' : 'none'; }

    const svgPaw = `<svg width="22" height="22" viewBox="0 0 48.839 48.839" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M39.041,36.843c2.054,3.234,3.022,4.951,3.022,6.742c0,3.537-2.627,5.252-6.166,5.252c-1.56,0-2.567-0.002-5.112-1.326c0,0-1.649-1.509-5.508-1.354c-3.895-0.154-5.545,1.373-5.545,1.373c-2.545,1.323-3.516,1.309-5.074,1.309c-3.539,0-6.168-1.713-6.168-5.252c0-1.791,0.971-3.506,3.024-6.742c0,0,3.881-6.445,7.244-9.477c2.43-2.188,5.973-2.18,5.973-2.18h1.093v-0.001c0,0,3.698-0.009,5.976,2.181C35.059,30.51,39.041,36.844,39.041,36.843z M16.631,20.878c3.7,0,6.699-4.674,6.699-10.439S20.331,0,16.631,0S9.932,4.674,9.932,10.439S12.931,20.878,16.631,20.878z M10.211,30.988c2.727-1.259,3.349-5.723,1.388-9.971s-5.761-6.672-8.488-5.414s-3.348,5.723-1.388,9.971C3.684,29.822,7.484,32.245,10.211,30.988z M32.206,20.878c3.7,0,6.7-4.674,6.7-10.439S35.906,0,32.206,0s-6.699,4.674-6.699,10.439C25.507,16.204,28.506,20.878,32.206,20.878z M45.727,15.602c-2.728-1.259-6.527,1.165-8.488,5.414s-1.339,8.713,1.389,9.972c2.728,1.258,6.527-1.166,8.488-5.414S48.455,16.861,45.727,15.602z"/></svg>`;
    const svgApproved = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const svgPending  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    const svgRejected = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    list.innerHTML = docs.map(req => {
      const status = (req.status || 'pending').toLowerCase();
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      const statusIcon  = status === 'approved' ? svgApproved : status === 'rejected' ? svgRejected : svgPending;
      const dateStr = req.createdAt?.toDate
        ? req.createdAt.toDate().toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' })
        : (req.submittedAt || req.date || 'Unknown date');
      return `
        <div class="adoption-notif-item">
          <div class="adoption-notif-paw">${svgPaw}</div>
          <div class="adoption-notif-info">
            <div class="adoption-notif-pet">${req.petName || req.name || 'Pet'}</div>
            <div class="adoption-notif-date">Submitted: ${dateStr}</div>
          </div>
          <div class="adoption-notif-status ${status}">${statusIcon} ${statusLabel}</div>
        </div>`;
    }).join('');
  } catch(err) {
    console.error('Notification load error:', err);
    list.innerHTML = '<p class="adoption-notif-empty">Could not load notifications.</p>';
  }
}

document.addEventListener('click', function(e) {
  const modal = document.getElementById('adoptionNotifModal');
  if (modal && e.target === modal) closeAdoptionNotif();
});


// ── GCash Donation Modal ──────────────────────────────────────────────
window.showDonateModal = function() {
  const modal = document.getElementById('donateModal');
  if (modal) {
    modal.style.display = 'flex';
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.remove('show');
  }
};
window.closeDonateModal = function() {
  const modal = document.getElementById('donateModal');
  if (modal) modal.style.display = 'none';
};
window.selectDonationAmount = function(btn) {
  document.querySelectorAll('.donate-amount-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
};
document.addEventListener('click', function(e) {
  const modal = document.getElementById('donateModal');
  if (modal && e.target === modal) closeDonateModal();
});
document.addEventListener('DOMContentLoaded', () => {
  if (!initFirebase()) {
    showErrorBanner('Failed to initialize. Please refresh the page.');
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
      currentUser = user;
      showNotifBell(true);
      loadBadgeCount();
      await loadUserProfile(user);
    } else {
      console.log('User not authenticated - redirecting to sign in');
      window.location.replace('register.html');
    }
  });

  // Attach form event listeners
  document.getElementById('profileForm')?.addEventListener('submit', handleProfileUpdate);
  document.getElementById('passwordForm')?.addEventListener('submit', handlePasswordChange);

  // Clear errors on input
  document.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('input', () => {
      setInputError(input.id, false);
    });
  });
});