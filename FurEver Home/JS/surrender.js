// surrender.js - Updated for Mobile Firebase Structure (WITHOUT Cloudinary)
// Pet surrender form with base64 image storage

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp
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
    console.log("Firebase initialized (surrender)");
    return true;
  } catch (err) {
    console.error("Firebase init failed:", err);
    return false;
  }
}

// ────────────────────────────────────────────────
// Profile Menu Functions
// ────────────────────────────────────────────────

function toggleProfileMenu() {
  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

document.addEventListener('click', (e) => {
  const profileContainer = document.getElementById('profileMenuContainer');
  if (profileContainer && !profileContainer.contains(e.target)) {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }
});

window.toggleProfileMenu = toggleProfileMenu;

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
  window.location.href = 'editprofile.html';
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
// Show Profile Menu
// ────────────────────────────────────────────────

async function showProfileMenu(user) {
  const profileName = document.getElementById('profileName');
  const profileAvatar = document.getElementById('profileAvatar');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  
  if (!profileName || !profileAvatar || !userName || !userEmail) {
    console.error('❌ Profile elements not found');
    return;
  }
  
  let fullName = user.displayName || user.email.split('@')[0];
  
  try {
    const profileDoc = await getDoc(doc(db, 'users', user.uid));
    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      if (profileData.fullName) {
        fullName = profileData.fullName;
      }
    }
  } catch (error) {
    console.log('ℹ️ Using auth display name as fallback');
  }
  
  const firstName = fullName.split(' ')[0];
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  
  userName.textContent = fullName;
  userEmail.textContent = user.email;
  profileName.textContent = firstName;
  profileAvatar.textContent = initials || 'U';
}

// ────────────────────────────────────────────────
// DOM elements
// ────────────────────────────────────────────────

const elements = {
  petPhoto: document.getElementById('petPhoto'),
  imagePreview: document.getElementById('imagePreview'),
  uploadPlaceholder: document.getElementById('uploadPlaceholder'),
  removeImage: document.getElementById('removeImage'),
  photoUpload: document.getElementById('photoUpload'),
  form: document.getElementById('surrenderForm'),
  successModal: document.getElementById('successModal'),
  closeSuccessBtn: document.getElementById('closeSuccessBtn')
};

// ────────────────────────────────────────────────
// Photo preview & remove
// ────────────────────────────────────────────────

if (elements.petPhoto) {
  elements.petPhoto.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5 MB)");
      elements.petPhoto.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      elements.imagePreview.src = ev.target.result;
      elements.imagePreview.classList.add('show');
      elements.uploadPlaceholder.style.display = 'none';
      elements.removeImage.classList.add('show');
      elements.photoUpload.classList.add('has-image');
    };
    reader.readAsDataURL(file);
  });
}

if (elements.removeImage) {
  elements.removeImage.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.imagePreview.src = '';
    elements.imagePreview.classList.remove('show');
    elements.uploadPlaceholder.style.display = 'flex';
    elements.removeImage.classList.remove('show');
    elements.photoUpload.classList.remove('has-image');
    elements.petPhoto.value = '';
  });
}

// Auto-set species based on breed keywords
const breedInput = document.getElementById('petBreed');
const speciesSelect = document.getElementById('petSpecies');

if (breedInput && speciesSelect) {
  breedInput.addEventListener('input', (e) => {
    const breed = e.target.value.toLowerCase().trim();
    let detected = '';

    if (/dog|puppy|labrador|golden|husky|german shepherd|rottweiler|poodle|aspin/i.test(breed)) {
      detected = 'Dog';
    } else if (/cat|kitten|persian|siamese|tabby|ragdoll|maine coon|puspin/i.test(breed)) {
      detected = 'Cat';
    }

    if (detected) speciesSelect.value = detected;
  });
}

// ────────────────────────────────────────────────
// Form submission (UPDATED FOR MOBILE - BASE64)
// ────────────────────────────────────────────────

if (elements.form) {
  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset previous error states
    document.querySelectorAll('.form-group').forEach(el => el.classList.remove('error'));

    let valid = true;

    // Basic required field validation
    ['petName','petSpecies','petAge','petBreed','petSize',
     'reason','ownerName','ownerEmail','ownerPhone','ownerAddress']
      .forEach(id => {
        const field = document.getElementById(id);
        if (!field?.value?.trim()) {
          field.closest('.form-group')?.classList.add('error');
          valid = false;
        }
      });

    // Email format
    const emailField = document.getElementById('ownerEmail');
    if (emailField && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim())) {
      emailField.closest('.form-group')?.classList.add('error');
      valid = false;
    }

    // Gender selected
    if (!document.querySelector('input[name="gender"]:checked')) {
      document.querySelector('[name="gender"]')?.closest('.form-group')?.classList.add('error');
      valid = false;
    }

    // Photo required
    if (!elements.petPhoto?.files?.length) {
      elements.photoUpload?.closest('.form-group')?.classList.add('error');
      valid = false;
    }

    if (!valid) {
      // Scroll to first error field so user sees the red highlights
      document.querySelector('.form-group.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!initFirebase()) {
      alert("Service unavailable. Please refresh.");
      return;
    }

    if (!currentUser) {
      alert("Please sign in to continue.");
      window.location.href = "register.html";
      return;
    }

    const file = elements.petPhoto.files[0];
    if (!file) return;

    // Show loading state
    const submitBtn = elements.form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    // Convert image to base64
    const reader = new FileReader();
    
    reader.onload = async function(ev) {
      const base64Image = ev.target.result; // data:image/...;base64,...

      try {
        // UPDATED: Match mobile surrenderRequests structure
        const surrenderData = {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          petName: document.getElementById('petName').value.trim(),
          species: document.getElementById('petSpecies').value,
          breed: document.getElementById('petBreed').value.trim(),
          age: document.getElementById('petAge').value.trim(),
          gender: document.querySelector('input[name="gender"]:checked')?.value,
          imageUrl: base64Image,  // Base64 image
          reason: document.getElementById('reason').value.trim(),
          contactPhone: document.getElementById('ownerPhone').value.trim(),
          status: 'pending',
          createdAt: serverTimestamp()
        };

        console.log('📝 Submitting surrender request...');

        // Save to surrenderRequests collection
        await addDoc(collection(db, "surrenderRequests"), surrenderData);

        console.log('✅ Surrender request submitted successfully');

        // Show success modal
        elements.successModal?.classList.add('show');
        resetForm();

      } catch (err) {
        console.error('❌ Error:', err);
        alert("Failed to submit surrender request. Please try again.");
      } finally {
        // Reset button state
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    };

    reader.readAsDataURL(file);
  });
}

// ────────────────────────────────────────────────
// Reset form helper
// ────────────────────────────────────────────────

function resetForm() {
  if (elements.form) elements.form.reset();
  if (elements.imagePreview) {
    elements.imagePreview.src = '';
    elements.imagePreview.classList.remove('show');
  }
  if (elements.uploadPlaceholder) elements.uploadPlaceholder.style.display = 'flex';
  if (elements.removeImage) elements.removeImage.classList.remove('show');
  if (elements.photoUpload) elements.photoUpload.classList.remove('has-image');
}

// ────────────────────────────────────────────────
// Close success modal
// ────────────────────────────────────────────────

function closeSuccessModal() {
  if (elements.successModal) {
    elements.successModal.classList.remove('show');
    resetForm();
    setTimeout(() => {
      window.location.href = 'homepage.html';
    }, 400);
  }
}

// ────────────────────────────────────────────────
// Initialize
// ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();

  onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
      currentUser = user;
      console.log(`Logged in: ${user.email}`);
      await showProfileMenu(user);
    } else {
      console.log("Not logged in or email not verified");
      currentUser = null;
    }
  });

  // Attach close button listener
  if (elements.closeSuccessBtn) {
    elements.closeSuccessBtn.addEventListener('click', closeSuccessModal);
  } else {
    console.warn("Close button (#closeSuccessBtn) not found in HTML");
  }
});