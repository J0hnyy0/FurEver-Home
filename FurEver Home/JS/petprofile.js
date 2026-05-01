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
    showNotifBell(true);
    loadBadgeCount();
  } else {
    showSignInButton();
    showNotifBell(false);
  }
});


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
  document.addEventListener('click', e => {
    const logoutModal = document.getElementById('logoutConfirmModal');
    if (logoutModal?.classList.contains('show') &&
        !logoutModal.querySelector('.modal-content')?.contains(e.target)) {
      closeLogoutModal();
    }
  });

  loadPetData();
});