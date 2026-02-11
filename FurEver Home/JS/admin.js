// admin.js - Firebase v10 modular version
// Admin dashboard - FULLY FUNCTIONAL with pet & application & user management

import {
  getAuth,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  addDoc
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
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db   = getFirestore(app);
    console.log("Admin Firebase initialized");
    return true;
  } catch (err) {
    console.error("Admin Firebase init failed:", err);
    return false;
  }
}

// ────────────────────────────────────────────────
// Modal helpers
// ────────────────────────────────────────────────

let pendingConfirmation = null;
let pendingRefresh = null;

function showConfirmationModal(message, onConfirm) {
  pendingConfirmation = onConfirm;
  document.getElementById('confirmationMessage').textContent = message;
  document.getElementById('confirmationModal').classList.add('show');
}

window.closeConfirmationModal = function() {
  pendingConfirmation = null;
  document.getElementById('confirmationModal').classList.remove('show');
};

window.executeConfirmation = function() {
  if (pendingConfirmation) pendingConfirmation();
  window.closeConfirmationModal();
};

function showAlertModal(message, title = 'Success') {
  document.getElementById('alertTitle').textContent = title;
  document.getElementById('alertMessage').textContent = message;
  document.getElementById('alertModal').classList.add('show');
}

window.closeAlertModal = function() {
  document.getElementById('alertModal').classList.remove('show');
  if (typeof pendingRefresh === 'function') {
    setTimeout(pendingRefresh, 300);
    pendingRefresh = null;
  }
};

// ────────────────────────────────────────────────
// Admin login (simple localStorage-based)
// ────────────────────────────────────────────────

function checkAdminAuth() {
  const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
  if (isLoggedIn) {
    showDashboard();
    loadDashboardData();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboardScreen').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'flex';

  window.history.replaceState(null, null, window.location.href);
  window.addEventListener('popstate', () => {
    window.history.replaceState(null, null, window.location.href);
  });
}

function handleAdminLogin(e) {
  e.preventDefault();

  const username = document.getElementById('username')?.value.trim();
  const password = document.getElementById('password')?.value;
  const errorDiv = document.getElementById('errorMessage');

  // CHANGE THESE CREDENTIALS FOR PRODUCTION
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "admin123";

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    localStorage.setItem('adminLoggedIn', 'true');
    errorDiv?.classList.remove('show');
    showDashboard();
    loadDashboardData();
  } else {
    errorDiv.textContent = "Invalid username or password";
    errorDiv?.classList.add('show');
  }
}

window.logout = function() {
  localStorage.removeItem('adminLoggedIn');
  showLogin();
  document.getElementById('adminLoginForm')?.reset();
};

// ────────────────────────────────────────────────
// Navigation
// ────────────────────────────────────────────────

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const section = item.dataset.section;

      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      document.querySelectorAll('.content-section').forEach(s => {
        s.classList.toggle('active', s.id === `${section}-section`);
      });

      const titleMap = {
        'pending': 'Pending Pets',
        'approved': 'Approved Pets',
        'adopted': 'Adopted Pet History',
        'users': 'Registered Users',
        'applications': 'Adoption Applications',
        'addpet': 'Add New Pet'
      };
      document.getElementById('sectionTitle').textContent = titleMap[section] || 'Dashboard';
    });
  });
}

// ────────────────────────────────────────────────
// Count documents
// ────────────────────────────────────────────────

async function getCount(coll, ...qArgs) {
  try {
    const q = query(collection(db, coll), ...qArgs);
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.error(`Count failed for ${coll}:`, err);
    return 0;
  }
}

// ────────────────────────────────────────────────
// Load ALL dashboard data
// ────────────────────────────────────────────────

async function loadDashboardData() {
  if (!initFirebase()) return;

  try {
    // Count pets by status
    const [pending, approved, users] = await Promise.all([
      getCount('pets', where('status', '==', 'pending')),
      getCount('pets', where('status', '==', 'approved')),
      getCount('profiles')
    ]);

    // Count adopted pets - these are pets with status 'adopted'
    const adoptedCount = await getCount('pets', where('status', '==', 'adopted'));
    
    // Count all adoption applications (regardless of status)
    const applicationsCount = await getCount('adoption_applications');

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('adoptedCount').textContent = adoptedCount;
    document.getElementById('userCount').textContent = users;
    document.getElementById('applicationCount').textContent = applicationsCount;

    await Promise.all([
      loadPendingPets(),
      loadApprovedPets(),
      loadAdoptedPets(),
      loadUsers(),
      loadApplications()
    ]);

  } catch (err) {
    console.error("Dashboard load error:", err);
    showAlertModal('Failed to load dashboard data', 'Error');
  }
}

// ────────────────────────────────────────────────
// Pending Pets
// ────────────────────────────────────────────────

async function loadPendingPets() {
  const grid = document.getElementById('pendingPetsGrid');
  grid.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  try {
    const q = query(
      collection(db, 'pets'),
      where('status', '==', 'pending'),
      orderBy('created_at', 'desc')
    );

    const snap = await getDocs(q);
    grid.innerHTML = '';

    if (snap.empty) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <p>No pending pets to review</p>
        </div>
      `;
      return;
    }

    snap.forEach(doc => {
      const pet = { id: doc.id, ...doc.data() };
      grid.appendChild(createPetCard(pet, 'pending'));
    });
  } catch (err) {
    console.error("Pending pets error:", err);
    grid.innerHTML = '<div class="empty-state"><p style="color: #dc2626;">Error loading pending pets</p></div>';
  }
}

// ────────────────────────────────────────────────
// Approved Pets
// ────────────────────────────────────────────────

async function loadApprovedPets() {
  const grid = document.getElementById('approvedPetsGrid');
  grid.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  try {
    const q = query(
      collection(db, 'pets'),
      where('status', '==', 'approved'),
      orderBy('created_at', 'desc')
    );

    const snap = await getDocs(q);
    grid.innerHTML = '';

    if (snap.empty) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <p>No approved pets available</p>
        </div>
      `;
      return;
    }

    snap.forEach(doc => {
      const pet = { id: doc.id, ...doc.data() };
      grid.appendChild(createPetCard(pet, 'approved'));
    });
  } catch (err) {
    console.error("Approved pets error:", err);
    grid.innerHTML = '<div class="empty-state"><p style="color: #dc2626;">Error loading approved pets</p></div>';
  }
}

// ────────────────────────────────────────────────
// Adopted Pets (Shows pets that have been adopted)
// ────────────────────────────────────────────────

async function loadAdoptedPets() {
  const grid = document.getElementById('adoptedPetsGrid');
  grid.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  try {
    // Query pets collection where status is 'adopted'
    const q = query(
      collection(db, 'pets'),
      where('status', '==', 'adopted'),
      orderBy('adopted_at', 'desc')  // Sort by adoption date, newest first
    );

    const snap = await getDocs(q);
    grid.innerHTML = '';

    if (snap.empty) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </div>
          <p>No adopted pets yet</p>
        </div>
      `;
      return;
    }

    snap.forEach(doc => {
      const pet = { id: doc.id, ...doc.data() };
      grid.appendChild(createAdoptedPetCard(pet));
    });
  } catch (err) {
    console.error("Adopted pets error:", err);
    grid.innerHTML = '<div class="empty-state"><p style="color: #dc2626;">Error loading adopted pets</p></div>';
  }
}

function createAdoptedPetCard(pet) {
  const card = document.createElement('div');
  card.className = 'pet-card-admin';
  
  const adoptedDate = pet.adopted_at?.toDate?.()?.toLocaleDateString() || 'N/A';
  
  card.innerHTML = `
    <img src="${pet.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}" 
         alt="${pet.name || 'Unnamed'}"
         onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
    <div class="pet-card-info">
      <h3>${pet.name || 'Unnamed'}</h3>
      <p><strong>Breed:</strong> ${pet.breed || 'N/A'}</p>
      <p><strong>Age:</strong> ${pet.age || 'N/A'} years</p>
      <p><strong>Adopted by:</strong> ${pet.adopted_by || 'N/A'}</p>
      <p><strong>Adopted on:</strong> ${adoptedDate}</p>
    </div>
    <div class="pet-card-actions">
      <button class="btn-view" onclick="viewPetDetails('${pet.id}')">View Details</button>
    </div>
  `;
  
  return card;
}

function createPetCard(pet, type) {
  const card = document.createElement('div');
  card.className = 'pet-card-admin';
  
  const actions = type === 'pending' 
    ? `
      <button class="btn-approve" onclick="approvePet('${pet.id}', '${pet.name || 'this pet'}')">Approve</button>
      <button class="btn-reject" onclick="rejectPet('${pet.id}', '${pet.name || 'this pet'}')">Reject</button>
    `
    : `
      <button class="btn-delete" onclick="removePet('${pet.id}', '${pet.name || 'this pet'}')">Remove</button>
    `;

  card.innerHTML = `
    <img src="${pet.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}" 
         alt="${pet.name || 'Unnamed'}"
         onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
    <div class="pet-card-info">
      <h3>${pet.name || 'Unnamed'}</h3>
      <p><strong>Breed:</strong> ${pet.breed || 'N/A'}</p>
      <p><strong>Age:</strong> ${pet.age || 'N/A'} years</p>
      <p><strong>Gender:</strong> ${pet.gender || 'N/A'}</p>
    </div>
    <div class="pet-card-actions">
      <button class="btn-view" onclick="viewPetDetails('${pet.id}')">View Details</button>
      ${actions}
    </div>
  `;
  
  return card;
}

// ────────────────────────────────────────────────
// Registered Users
// ────────────────────────────────────────────────

async function loadUsers() {
  const container = document.getElementById('usersTable');
  container.innerHTML = '<div class="table-loading"><p>Loading users...</p></div>';

  try {
    const q = query(collection(db, 'profiles'), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);

    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="usersTableBody"></tbody>
        </table>
      </div>
    `;

    const tbody = document.getElementById('usersTableBody');

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No registered users yet</td></tr>';
      return;
    }

    snap.forEach(docSnap => {
      const user = { id: docSnap.id, ...docSnap.data() };
      const date = user.created_at?.toDate?.()?.toLocaleDateString() || 'N/A';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.full_name || 'N/A'}</td>
        <td>${user.email || 'N/A'}</td>
        <td>${user.phone_number || 'N/A'}</td>
        <td>${user.address || 'N/A'}</td>
        <td>${date}</td>
        <td>
          <button class="btn-view" onclick="viewUserDetails('${user.id}')">View</button>
        </td>
      `;
      tbody.appendChild(row);
    });

  } catch (err) {
    console.error("Users load error:", err);
    container.innerHTML = '<div class="empty-state"><p style="color: #dc2626;">Error loading users</p></div>';
  }
}

window.viewUserDetails = async function(userId) {
  try {
    const ref = doc(db, 'profiles', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("User not found");

    const user = snap.data();
    const content = document.getElementById('userDetailContent');

    const registered = user.created_at?.toDate?.()?.toLocaleString() || 'N/A';

    content.innerHTML = `
      <div class="detail-section">
        <h2>${user.full_name || 'Unnamed User'}</h2>
        <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${user.phone_number || 'N/A'}</p>
        <p><strong>Address:</strong> ${user.address || 'Not provided'}</p>
        <p><strong>Registered:</strong> ${registered}</p>
      </div>
    `;
    
    document.getElementById('userDetailModal').classList.add('show');
  } catch (err) {
    console.error("View user error:", err);
    showAlertModal("Could not load user details", "Error");
  }
};

window.closeUserDetailModal = function() {
  document.getElementById('userDetailModal')?.classList.remove('show');
};

// ────────────────────────────────────────────────
// Adoption Applications (Shows ALL applications)
// ────────────────────────────────────────────────

async function loadApplications() {
  const container = document.getElementById('applicationsTable');
  container.innerHTML = '<div class="table-loading"><p>Loading applications...</p></div>';

  try {
    // Query ALL adoption applications (no status filter)
    const q = query(
      collection(db, 'adoption_applications'),
      orderBy('created_at', 'desc')  // Sort by submission date, newest first
    );

    const snap = await getDocs(q);

    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Pet</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="applicationsTableBody"></tbody>
        </table>
      </div>
    `;

    const tbody = document.getElementById('applicationsTableBody');

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">No adoption applications yet</td></tr>';
      return;
    }

    snap.forEach(docSnap => {
      const app = { id: docSnap.id, ...docSnap.data() };
      const date = app.created_at?.toDate?.()?.toLocaleDateString() || 'N/A';
      const status = app.status || 'pending';

      const statusStyle = status === 'approved' ? 'background:#dcfce7;color:#166534' :
                         status === 'rejected'  ? 'background:#fee2e2;color:#991b1b' :
                                                  'background:#fef3c7;color:#854d0e';

      const actions = status === 'pending' 
        ? `
          <button class="btn-approve" onclick="approveApplication('${app.id}', '${app.applicant_name || 'this user'}')">Approve</button>
          <button class="btn-reject" onclick="rejectApplication('${app.id}', '${app.applicant_name || 'this user'}')">Reject</button>
        ` : '';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${app.applicant_name || 'N/A'}</td>
        <td>${app.pet_name || 'N/A'}</td>
        <td>${app.applicant_email || 'N/A'}</td>
        <td>${app.applicant_phone || 'N/A'}</td>
        <td><span style="text-transform: capitalize; padding: 4px 8px; border-radius: 4px; ${statusStyle}">${status}</span></td>
        <td>${date}</td>
        <td>
          <button class="btn-view" onclick="viewApplicationDetails('${app.id}')">View</button>
          ${actions}
          <button class="btn-delete" onclick="deleteApplication('${app.id}', '${app.applicant_name || 'this user'}')">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

  } catch (err) {
    console.error("Applications error:", err);
    container.innerHTML = '<div class="empty-state"><p style="color: #dc2626;">Error loading applications</p></div>';
  }
}

// ────────────────────────────────────────────────
// View Pet Details
// ────────────────────────────────────────────────

window.viewPetDetails = async function(petId) {
  try {
    const ref = doc(db, 'pets', petId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Pet not found");

    const pet = snap.data();
    const content = document.getElementById('petDetailContent');
    
    content.innerHTML = `
      <div class="pet-detail-header">
        <img class="pet-detail-image" 
             src="${pet.image_url || 'https://via.placeholder.com/200?text=No+Image'}" 
             alt="${pet.name}"
             onerror="this.src='https://via.placeholder.com/200?text=No+Image'">
        <div class="pet-detail-info">
          <h2>${pet.name || 'Unnamed'}</h2>
          <p><strong>Breed:</strong> ${pet.breed || 'N/A'}</p>
          <p><strong>Age:</strong> ${pet.age || 'N/A'} years</p>
          <p><strong>Gender:</strong> ${pet.gender || 'N/A'}</p>
          <p><strong>Size:</strong> ${pet.size || 'N/A'}</p>
          <p><strong>Status:</strong> <span style="text-transform: capitalize">${pet.status || 'N/A'}</span></p>
        </div>
      </div>
      <div class="detail-section">
        <h3>Description</h3>
        <p>${pet.description || 'No description provided'}</p>
      </div>
      <div class="detail-section">
        <h3>Owner Information</h3>
        <p><strong>Name:</strong> ${pet.owner_name || 'N/A'}</p>
        <p><strong>Email:</strong> ${pet.owner_email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${pet.owner_phone || 'N/A'}</p>
        <p><strong>Address:</strong> ${pet.owner_address || 'N/A'}</p>
      </div>
    `;
    
    document.getElementById('petDetailModal').classList.add('show');
  } catch (err) {
    console.error(err);
    showAlertModal("Error loading pet details", "Error");
  }
};

window.closeDetailModal = function() {
  document.getElementById('petDetailModal')?.classList.remove('show');
};

// ────────────────────────────────────────────────
// View Application Details
// ────────────────────────────────────────────────

window.viewApplicationDetails = async function(appId) {
  try {
    const ref = doc(db, 'adoption_applications', appId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Application not found");

    const app = snap.data();
    const date = app.created_at?.toDate?.()?.toLocaleDateString() || 'N/A';
    
    document.getElementById('applicationDetailContent').innerHTML = `
      <h2>Adoption Application Details</h2>
      <div class="detail-section">
        <h3>Applicant Information</h3>
        <p><strong>Name:</strong> ${app.applicant_name || 'N/A'}</p>
        <p><strong>Email:</strong> ${app.applicant_email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${app.applicant_phone || 'N/A'}</p>
        <p><strong>Address:</strong> ${app.applicant_address || 'N/A'}</p>
      </div>
      <div class="detail-section">
        <h3>Pet Information</h3>
        <p><strong>Pet Name:</strong> ${app.pet_name || 'N/A'}</p>
        ${app.pet_id ? `<p><strong>Pet ID:</strong> ${app.pet_id}</p>` : ''}
      </div>
      <div class="detail-section">
        <h3>Application Details</h3>
        <p><strong>Status:</strong> <span style="text-transform: capitalize">${app.status || 'pending'}</span></p>
        <p><strong>Submitted:</strong> ${date}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap; background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 10px;">${app.message || 'No message provided'}</p>
      </div>
      ${app.status === 'pending' ? `
        <div class="modal-footer" style="margin-top: 20px;">
          <button class="btn-approve" onclick="approveApplication('${appId}', '${app.applicant_name}'); closeApplicationDetailModal();">Approve</button>
          <button class="btn-reject" onclick="rejectApplication('${appId}', '${app.applicant_name}'); closeApplicationDetailModal();">Reject</button>
        </div>
      ` : ''}
    `;
    
    document.getElementById('applicationDetailModal').classList.add('show');
  } catch (err) {
    console.error(err);
    showAlertModal("Error loading application", "Error");
  }
};

window.closeApplicationDetailModal = function() {
  document.getElementById('applicationDetailModal')?.classList.remove('show');
};

// ────────────────────────────────────────────────
// Pet Actions
// ────────────────────────────────────────────────

window.approvePet = function(id, name) {
  showConfirmationModal(`Approve "${name}" for adoption?`, async () => {
    try {
      await updateDoc(doc(db, 'pets', id), { status: 'approved' });
      showAlertModal(`"${name}" has been approved and is now available for adoption!`);
      pendingRefresh = loadDashboardData;
    } catch (err) {
      console.error(err);
      showAlertModal("Failed to approve pet", "Error");
    }
  });
};

window.rejectPet = function(id, name) {
  showConfirmationModal(`Reject "${name}"? This pet will not be available for adoption.`, async () => {
    try {
      await updateDoc(doc(db, 'pets', id), { status: 'rejected' });
      showAlertModal(`"${name}" has been rejected`);
      pendingRefresh = loadDashboardData;
    } catch (err) {
      console.error(err);
      showAlertModal("Failed to reject pet", "Error");
    }
  });
};

window.removePet = function(id, name) {
  showConfirmationModal(`Delete "${name}" permanently? This action cannot be undone.`, async () => {
    try {
      await deleteDoc(doc(db, 'pets', id));
      showAlertModal(`"${name}" has been removed from the system`);
      pendingRefresh = loadDashboardData;
    } catch (err) {
      console.error(err);
      showAlertModal("Failed to remove pet", "Error");
    }
  });
};

// ────────────────────────────────────────────────
// Application Actions
// ────────────────────────────────────────────────

window.approveApplication = async function(id, applicantName) {
  showConfirmationModal(`Approve adoption application from ${applicantName}?`, async () => {
    try {
      const appRef = doc(db, 'adoption_applications', id);
      const appSnap = await getDoc(appRef);
      
      if (!appSnap.exists()) throw new Error("Application not found");
      
      const appData = appSnap.data();
      let petData = null;

      // Try to get full pet details
      if (appData.pet_id) {
        const petRef = doc(db, 'pets', appData.pet_id);
        const petSnap = await getDoc(petRef);
        
        if (petSnap.exists()) {
          petData = petSnap.data();
          
          // Update pet status to adopted
          await updateDoc(petRef, { 
            status: 'adopted',
            adopted_at: new Date(),
            adopted_by: applicantName
          });
        }
      } else if (appData.pet_name) {
        const petsQ = query(
          collection(db, 'pets'),
          where('name', '==', appData.pet_name),
          where('status', '==', 'approved')
        );
        const petsSnap = await getDocs(petsQ);
        
        if (!petsSnap.empty) {
          const petDoc = petsSnap.docs[0];
          petData = petDoc.data();
          
          // Update pet status to adopted
          await updateDoc(petDoc.ref, { 
            status: 'adopted',
            adopted_at: new Date(),
            adopted_by: applicantName
          });
        }
      }

      // Update application with approval and pet details
      const updateData = { 
        status: 'approved',
        reviewed_at: new Date()
      };

      // Add pet details to the application for easy access later
      if (petData) {
        updateData.pet_name = petData.name || appData.pet_name;
        updateData.pet_image_url = petData.image_url;
        updateData.pet_breed = petData.breed;
        updateData.pet_age = petData.age;
        updateData.pet_gender = petData.gender;
        updateData.pet_description = petData.description;
      }

      await updateDoc(appRef, updateData);

      if (petData) {
        showAlertModal(`Application approved! Pet "${petData.name}" marked as adopted by ${applicantName}.`);
      } else {
        showAlertModal(`Application approved, but pet details not found.`, 'Warning');
      }

      pendingRefresh = loadDashboardData;
    } catch (err) {
      console.error("Approve application error:", err);
      showAlertModal("Failed to approve application: " + err.message, "Error");
    }
  });
};

window.rejectApplication = function(id, applicantName) {
  showConfirmationModal(`Reject application from ${applicantName}?`, async () => {
    try {
      await updateDoc(doc(db, 'adoption_applications', id), { 
        status: 'rejected',
        reviewed_at: new Date()
      });
      showAlertModal(`Application from ${applicantName} has been rejected`);
      pendingRefresh = loadDashboardData;
    } catch (err) {
      console.error(err);
      showAlertModal("Failed to reject application", "Error");
    }
  });
};

window.deleteApplication = function(id, applicantName) {
  showConfirmationModal(`Delete application from ${applicantName} permanently?`, async () => {
    try {
      await deleteDoc(doc(db, 'adoption_applications', id));
      showAlertModal(`Application from ${applicantName} has been permanently deleted`);
      pendingRefresh = loadDashboardData;
    } catch (err) {
      console.error(err);
      showAlertModal("Failed to delete application", "Error");
    }
  });
};

// ────────────────────────────────────────────────
// Add Pet Form - Photo Preview & Remove
// ────────────────────────────────────────────────

const adminPhotoElements = {
  petPhoto: document.getElementById('adminPetPhoto'),
  imagePreview: document.getElementById('adminImagePreview'),
  uploadPlaceholder: document.getElementById('adminUploadPlaceholder'),
  removeImage: document.getElementById('adminRemoveImage'),
  photoUpload: document.getElementById('adminPhotoUpload')
};

// Photo preview handler
if (adminPhotoElements.petPhoto) {
  adminPhotoElements.petPhoto.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showAlertModal("Image too large (max 5 MB)", "Error");
      adminPhotoElements.petPhoto.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      adminPhotoElements.imagePreview.src = ev.target.result;
      adminPhotoElements.imagePreview.classList.add('show');
      adminPhotoElements.uploadPlaceholder.style.display = 'none';
      adminPhotoElements.removeImage.classList.add('show');
      adminPhotoElements.photoUpload.classList.add('has-image');
    };
    reader.readAsDataURL(file);
  });
}

// Remove photo handler
if (adminPhotoElements.removeImage) {
  adminPhotoElements.removeImage.addEventListener('click', (e) => {
    e.stopPropagation();
    adminPhotoElements.imagePreview.src = '';
    adminPhotoElements.imagePreview.classList.remove('show');
    adminPhotoElements.uploadPlaceholder.style.display = 'flex';
    adminPhotoElements.removeImage.classList.remove('show');
    adminPhotoElements.photoUpload.classList.remove('has-image');
    adminPhotoElements.petPhoto.value = '';
  });
}

// Auto-detect category based on breed
const breedInput = document.getElementById('petBreed');
const categorySelect = document.getElementById('petCategory');

if (breedInput && categorySelect) {
  breedInput.addEventListener('input', (e) => {
    const breed = e.target.value.toLowerCase().trim();
    let detected = '';

    if (/dog|puppy|labrador|golden|husky|german shepherd|rottweiler|poodle|retriever|bulldog|beagle|terrier|shepherd/i.test(breed)) {
      detected = 'dog';
    } else if (/cat|kitten|persian|siamese|tabby|ragdoll|maine coon|bengal|sphynx/i.test(breed)) {
      detected = 'cat';
    }

    if (detected) categorySelect.value = detected;
  });
}

// ────────────────────────────────────────────────
// Add Pet Form Handler
// ────────────────────────────────────────────────

window.resetAddPetForm = function() {
  document.getElementById('addPetForm')?.reset();
  if (adminPhotoElements.imagePreview) {
    adminPhotoElements.imagePreview.src = '';
    adminPhotoElements.imagePreview.classList.remove('show');
  }
  if (adminPhotoElements.uploadPlaceholder) {
    adminPhotoElements.uploadPlaceholder.style.display = 'flex';
  }
  if (adminPhotoElements.removeImage) {
    adminPhotoElements.removeImage.classList.remove('show');
  }
  if (adminPhotoElements.photoUpload) {
    adminPhotoElements.photoUpload.classList.remove('has-image');
  }
};

async function handleAddPetForm(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding Pet...';

  try {
    // Check if photo is uploaded
    const photoInput = document.getElementById('adminPetPhoto');
    if (!photoInput?.files?.length) {
      showAlertModal("Please upload a pet photo", "Error");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    // Check if gender is selected
    const gender = document.querySelector('input[name="gender"]:checked');
    if (!gender) {
      showAlertModal("Please select a gender", "Error");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    const file = photoInput.files[0];

    // Read the file as base64
    const reader = new FileReader();
    
    reader.onload = async function(ev) {
      const base64 = ev.target.result;  // data:image/...;base64,...

      const formData = {
        name: document.getElementById('petName').value.trim(),
        category: document.getElementById('petCategory').value,
        breed: document.getElementById('petBreed').value.trim(),
        age: Number(document.getElementById('petAge').value) || 0,
        gender: gender.value,
        size: document.getElementById('petSize').value,
        description: document.getElementById('petDescription').value.trim(),
        image_url: base64,              // Store as base64 like surrender form
        image_type: file.type,
        status: 'approved',             // Auto-approve admin-added pets
        created_at: new Date(),
        added_by: 'admin',
        // Owner info (marked as admin)
        owner_name: 'Admin',
        owner_email: 'admin@furever.home',
        owner_phone: 'N/A',
        owner_address: 'N/A'
      };

      try {
        // Add the pet to Firestore
        await addDoc(collection(db, 'pets'), formData);
        
        showAlertModal(`"${formData.name}" has been successfully added to the adoption system!`);
        
        // Reset form
        window.resetAddPetForm();
        
        // Refresh dashboard data
        pendingRefresh = loadDashboardData;
        
      } catch (err) {
        console.error("Error adding pet:", err);
        showAlertModal("Failed to add pet: " + err.message, "Error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    };

    reader.onerror = function() {
      showAlertModal("Failed to read image file", "Error");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    };

    reader.readAsDataURL(file);
    
  } catch (err) {
    console.error("Error in form handler:", err);
    showAlertModal("Failed to add pet: " + err.message, "Error");
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// ────────────────────────────────────────────────
// Initialize
// ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();

  document.getElementById('adminLoginForm')?.addEventListener('submit', handleAdminLogin);
  document.getElementById('addPetForm')?.addEventListener('submit', handleAddPetForm);

  checkAdminAuth();
  setupNavigation();
});