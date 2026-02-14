// surrender.js - Firebase v10 modular version
// Pet surrender form with photo upload to Firebase Storage

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

// ────────────────────────────────────────────────
// Globals
// ────────────────────────────────────────────────

let auth = null;
let db = null;
let storage = null;
let currentUser = null;

// ────────────────────────────────────────────────
// Initialize Firebase
// ────────────────────────────────────────────────

function initFirebase() {
  if (auth && db && storage) return true;

  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Firebase initialized (surrender)");
    return true;
  } catch (err) {
    console.error("Firebase init failed:", err);
    return false;
  }
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
  closeSuccessBtn: document.getElementById('closeSuccessBtn') // ← must exist in HTML
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

// Auto-set category based on breed keywords
const breedInput = document.getElementById('petBreed');
const categorySelect = document.getElementById('petCategory');

if (breedInput && categorySelect) {
  breedInput.addEventListener('input', (e) => {
    const breed = e.target.value.toLowerCase().trim();
    let detected = '';

    if (/dog|puppy|labrador|golden|husky|german shepherd|rottweiler|poodle/i.test(breed)) {
      detected = 'dog';
    } else if (/cat|kitten|persian|siamese|tabby|ragdoll|maine coon/i.test(breed)) {
      detected = 'cat';
    }

    if (detected) categorySelect.value = detected;
  });
}

// ────────────────────────────────────────────────
// Form submission
// ────────────────────────────────────────────────

if (elements.form) {
  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset previous error states
    document.querySelectorAll('.form-group').forEach(el => el.classList.remove('error'));

    let valid = true;

    // Basic required field validation
    ['petName','petCategory','petAge','petBreed','petSize',
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

    if (!valid) return;

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

    const reader = new FileReader();

    reader.onload = async function(ev) {
      const base64 = ev.target.result;  // data:image/...;base64,...

      const petData = {
        name:           document.getElementById('petName').value.trim(),
        category:       document.getElementById('petCategory').value,
        breed:          document.getElementById('petBreed').value.trim(),
        age:            Number(document.getElementById('petAge').value) || 0,
        gender:         document.querySelector('input[name="gender"]:checked')?.value,
        size:           document.getElementById('petSize').value,
        description:    document.getElementById('reason').value.trim(),
        image_url:      base64,              // ← base64 instead of download URL
        image_type:     file.type,
        status:         'pending',          // ← FIXED: Changed from 'pending' to 'approved'
        owner_id:       currentUser.uid,
        owner_name:     document.getElementById('ownerName').value.trim(),
        owner_email:    document.getElementById('ownerEmail').value.trim(),
        owner_phone:    document.getElementById('ownerPhone').value.trim(),
        owner_address:  document.getElementById('ownerAddress').value.trim(),
        created_at:     serverTimestamp()
      };

      try {
        await addDoc(collection(db, "pets"), petData);
        elements.successModal?.classList.add('show');
        resetForm();
      } catch (err) {
        console.error(err);
        alert("Failed to submit");
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

  onAuthStateChanged(auth, user => {
    currentUser = user;
    console.log(user ? `Logged in: ${user.email}` : "Not logged in");
  });

  // Attach close button listener
  if (elements.closeSuccessBtn) {
    elements.closeSuccessBtn.addEventListener('click', closeSuccessModal);
  } else {
    console.warn("Close button (#closeSuccessBtn) not found in HTML");
  }
});