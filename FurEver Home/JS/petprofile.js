// petprofile.js - Updated for Mobile Firebase Structure
// Fixed: Uses petId, matches mobile Firestore structure

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

// ────────────────────────────────────────────────
// Use global firebaseConfig
// ────────────────────────────────────────────────
if (typeof firebaseConfig === 'undefined' || !firebaseConfig?.apiKey) {
  console.error("firebaseConfig is missing or invalid");
  alert("Configuration error – please make sure config.js is loaded correctly.");
}

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

console.log("Firebase initialized (using global config)");

// ────────────────────────────────────────────────
// Global variable to store current pet data
// ────────────────────────────────────────────────
let currentPetData = null;
let currentPetId = null;

// ────────────────────────────────────────────────
// URL parameter handling (UPDATED)
// ────────────────────────────────────────────────

const urlParams = new URLSearchParams(window.location.search);
const petId = urlParams.get('petId'); // Changed from 'pet' to 'petId'

if (!petId) {
  alert("No pet selected.");
  window.location.href = "homepage.html";
}

// ────────────────────────────────────────────────
// Profile Menu & Dropdown Logic
// ────────────────────────────────────────────────

window.showProfileMenu = function(user) {
  const signinBtn = document.getElementById('signinBtn');
  const container = document.getElementById('profileMenuContainer');

  if (signinBtn) signinBtn.classList.add('hidden');
  if (container) container.classList.remove('hidden');

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const firstName = displayName.split(' ')[0];
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (document.getElementById('userName')) document.getElementById('userName').textContent = displayName;
  if (document.getElementById('userEmail')) document.getElementById('userEmail').textContent = user.email;
  if (document.getElementById('profileName')) document.getElementById('profileName').textContent = firstName;
  
  const avatarEl = document.getElementById('profileAvatar');
  if (avatarEl) avatarEl.textContent = initials;
};

function showSignInButton() {
  document.getElementById('signinBtn')?.classList.remove('hidden');
  document.getElementById('profileMenuContainer')?.classList.add('hidden');
}

window.toggleProfileMenu = function(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
    console.log('Dropdown toggled → show:', dropdown.classList.contains('show'));
  } else {
    console.warn('profileDropdown element not found in DOM');
  }
};

document.addEventListener('click', (e) => {
  const container = document.getElementById('profileMenuContainer');
  if (container && !container.contains(e.target)) {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown?.classList.contains('show')) {
      dropdown.classList.remove('show');
      console.log('Dropdown closed (outside click)');
    }
  }
});

// ────────────────────────────────────────────────
// Logout & Modal Functions
// ────────────────────────────────────────────────

async function handleLogout() {
  try {
    await signOut(auth);
    localStorage.clear();
    sessionStorage.clear();
    showSignInButton();
    setTimeout(() => window.location.href = 'register.html', 500);
  } catch (err) {
    console.error("Logout failed:", err);
  }
}

window.showLogoutModal = function () {
  document.getElementById('logoutConfirmModal')?.classList.add('show');
};

window.closeLogoutModal = function () {
  document.getElementById('logoutConfirmModal')?.classList.remove('show');
};

window.confirmLogout = function() {
  closeLogoutModal();
  handleLogout();
};

// ────────────────────────────────────────────────
// Navigation & Adoption Modal
// ────────────────────────────────────────────────

window.goHome = () => location.href = 'homepage.html';

window.startAdoption = () => {
  document.getElementById('adoptionModal')?.classList.add('show');
  document.getElementById('formView').style.display = 'block';
  document.getElementById('successView').style.display = 'none';
  document.getElementById('adoptionForm')?.reset();
};

window.closeModal = () => document.getElementById('adoptionModal')?.classList.remove('show');

window.closeModalAndRedirect = () => {
  closeModal();
  setTimeout(() => location.href = 'homepage.html', 400);
};

// ────────────────────────────────────────────────
// Navigation functions
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
// Load Pet Data (UPDATED FOR MOBILE STRUCTURE)
// ────────────────────────────────────────────────

async function loadPetData() {
  try {
    console.log('Loading pet with ID:', petId);

    // Get pet directly by ID instead of querying by name
    const petDocRef = doc(db, "pets", petId);
    const petDoc = await getDoc(petDocRef);

    if (!petDoc.exists()) {
      alert("Pet not found or no longer available.");
      location.href = "homepage.html";
      return;
    }

    // Check if pet is already adopted
    const adoptedQuery = query(
      collection(db, "adoptionApplications"),
      where("petId", "==", petId),
      where("status", "==", "approved")
    );
    const adoptedSnapshot = await getDocs(adoptedQuery);

    if (!adoptedSnapshot.empty) {
      alert("This pet has already been adopted!");
      location.href = "homepage.html";
      return;
    }

    // Store the pet data globally
    currentPetData = petDoc.data();
    currentPetId = petDoc.id;

    console.log('✅ Pet data loaded:', currentPetData);
    console.log('✅ Pet ID:', currentPetId);

    // Update UI with mobile field names (imageUrl, not image_url)
    document.getElementById('petImage').src = currentPetData.imageUrl || 'https://via.placeholder.com/600x500?text=No+Image';
    document.getElementById('petName').textContent = currentPetData.name || 'Unnamed';
    document.getElementById('petAge').textContent = currentPetData.age ? `${currentPetData.age}` : '?';
    document.getElementById('petBreed').textContent = currentPetData.breed || 'Unknown';
    document.getElementById('petGender').textContent = currentPetData.gender ? currentPetData.gender.charAt(0).toUpperCase() + currentPetData.gender.slice(1) : 'Unknown';
    document.getElementById('petSize').textContent = currentPetData.size || 'Medium';

    document.getElementById('modalPetName').textContent = currentPetData.name;
    document.getElementById('successPetName').textContent = currentPetData.name;
    document.getElementById('petNameAbout').textContent = currentPetData.name;

    document.getElementById('petTagline').textContent =
      `A loving ${currentPetData.age || '?'} old ${currentPetData.breed || 'pet'} looking for a forever home!`;

    document.getElementById('aboutText').textContent =
      currentPetData.description ||
      `${currentPetData.name} is a wonderful companion ready to bring joy to a new family.`;

    document.getElementById('traitsGrid').innerHTML = `
      <div class="trait-card"><h4>Playful</h4><p>Loves toys & games</p></div>
      <div class="trait-card"><h4>Friendly</h4><p>Good with people & pets</p></div>
      <div class="trait-card"><h4>Gentle</h4><p>Calm & affectionate</p></div>
      <div class="trait-card"><h4>Curious</h4><p>Explores everything!</p></div>
    `;

    document.getElementById('healthItems').innerHTML = `
      <div class="health-item">Vaccinated</div>
      <div class="health-item">Dewormed</div>
      <div class="health-item">Health checked</div>
      <div class="health-item">Microchipped</div>
    `;

  } catch (err) {
    console.error("Error loading pet:", err);
    alert("Failed to load pet information. Please try again later.");
  }
}

// ────────────────────────────────────────────────
// Adoption Form (UPDATED FOR MOBILE STRUCTURE)
// ────────────────────────────────────────────────

function validateForm() {
  let isValid = true;
  const requiredFields = ['fullName', 'email', 'phone', 'address', 'reason'];

  requiredFields.forEach(id => {
    const field = document.getElementById(id);
    const group = field?.closest('.form-group');
    const value = field?.value?.trim();

    if (!value || (id === 'reason' && value.length < 20)) {
      // Remove then re-add error to re-trigger shake animation
      group?.classList.remove('error');
      void group?.offsetWidth; // force reflow
      group?.classList.add('error');
      isValid = false;
    } else {
      group?.classList.remove('error');
    }

    // Clear error state when user starts typing
    if (!field._listenerAdded) {
      field.addEventListener('input', () => {
        const v = field.value.trim();
        if (v && !(id === 'reason' && v.length < 20)) {
          group?.classList.remove('error');
        }
      });
      field._listenerAdded = true;
    }
  });

  return isValid;
}

window.submitAdoption = async function(e) {
  e.preventDefault();
  if (!validateForm()) return;

  if (!currentPetData || !currentPetId) {
    console.error('❌ Pet data not loaded');
    alert("Error: Pet information not loaded. Please refresh the page and try again.");
    return;
  }

  try {
    console.log('📝 Submitting adoption application...');
    
    // Create application matching MOBILE structure
    const applicationData = {
      // Pet information
      petId: currentPetId,
      petName: currentPetData.name,
      
      // Applicant information (matching mobile field names)
      applicantUserId: auth.currentUser?.uid || null,
      fullName: document.getElementById('fullName')?.value.trim(),
      email: document.getElementById('email')?.value.trim(),
      phoneNumber: document.getElementById('phone')?.value.trim(),
      address: document.getElementById('address')?.value.trim(),
      reason: document.getElementById('reason')?.value.trim(),
      
      // Application metadata
      status: 'pending',
      createdAt: serverTimestamp()
    };

    console.log('📤 Application data:', applicationData);

    await addDoc(collection(db, "adoptionApplications"), applicationData);

    console.log('✅ Application submitted successfully!');

    document.getElementById('formView').style.display = 'none';
    document.getElementById('successView').style.display = 'block';

  } catch (err) {
    console.error("❌ Application failed:", err);
    alert("Sorry — could not submit application. Please try again later.");
  }
};

// ────────────────────────────────────────────────
// Event Listeners & Initialization
// ────────────────────────────────────────────────

onAuthStateChanged(auth, user => {
  if (user) {
    showProfileMenu(user);
  } else {
    showSignInButton();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', e => {
    const logoutModal = document.getElementById('logoutConfirmModal');
    if (logoutModal?.classList.contains('show') &&
        !logoutModal.querySelector('.modal-content')?.contains(e.target)) {
      closeLogoutModal();
    }
  });

  loadPetData();
});