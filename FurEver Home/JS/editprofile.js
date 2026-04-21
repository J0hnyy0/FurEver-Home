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

document.addEventListener('DOMContentLoaded', () => {
  if (!initFirebase()) {
    showErrorBanner('Failed to initialize. Please refresh the page.');
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
      currentUser = user;
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