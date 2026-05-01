// admin.js - Updated for Mobile Firebase Structure - COMPLETE FIXED VERSION
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
  addDoc,
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
        'surrender': 'Surrender Requests',
        'approved': 'Available Pets',
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
// Load ALL dashboard data (FIXED)
// ────────────────────────────────────────────────

async function loadDashboardData() {
  if (!initFirebase()) return;

  try {
    console.log("Loading dashboard data...");

    // Count surrender requests
    const surrenderCount = await getCount('surrenderRequests', where('status', '==', 'pending'));
    
    // Count all pets (no status field in mobile)
    const petsSnapshot = await getDocs(collection(db, 'pets'));
    
    // Get all approved adoptions to filter out adopted pets
    const adoptedQuery = query(
      collection(db, 'adoptionApplications'),
      where('status', '==', 'approved')
    );
    const adoptedSnapshot = await getDocs(adoptedQuery);
    const adoptedPetIds = new Set();
    adoptedSnapshot.forEach(doc => {
      adoptedPetIds.add(doc.data().petId);
    });
    
    // Count only available pets (not adopted)
    let availableCount = 0;
    petsSnapshot.forEach(doc => {
      if (!adoptedPetIds.has(doc.id)) {
        availableCount++;
      }
    });
    
    const adoptedCount = adoptedSnapshot.size;
    const usersCount = await getCount('users');
    // Count from both collections
    const [appCount1, appCount2] = await Promise.all([
      getCount('adoptionApplications'),
      getCount('adoptionRequests')
    ]);
    const applicationsCount = appCount1 + appCount2;

    document.getElementById('surrenderCount').textContent = surrenderCount;
    document.getElementById('approvedCount').textContent = availableCount;
    document.getElementById('adoptedCount').textContent = adoptedCount;
    document.getElementById('userCount').textContent = usersCount;
    document.getElementById('applicationCount').textContent = applicationsCount;

    console.log("Dashboard counts updated:", {
      surrender: surrenderCount,
      available: availableCount,
      adopted: adoptedCount,
      users: usersCount,
      applications: applicationsCount
    });

    await Promise.all([
      loadSurrenderRequests(),
      loadApprovedPets(),
      loadAdoptedPets(),
      loadUsers(),
      loadApplications()
    ]);

  } catch (err) {
    console.error("Dashboard load error:", err);
    showAlertModal('Failed to load dashboard data: ' + err.message, 'Error');
  }
}

// ────────────────────────────────────────────────
// Surrender Requests (FIXED)
// ────────────────────────────────────────────────

async function loadSurrenderRequests() {
  const grid = document.getElementById('surrenderRequestsGrid');
  grid.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  try {
    console.log("Loading surrender requests...");
    
    const q = query(
      collection(db, 'surrenderRequests'),
      where('status', '==', 'pending')
    );

    const snap = await getDocs(q);
    console.log("Surrender requests loaded:", snap.size);
    
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
          <p>No pending surrender requests</p>
        </div>
      `;
      return;
    }

    snap.forEach(doc => {
      const request = { id: doc.id, ...doc.data() };
      console.log("Surrender request:", request);
      grid.appendChild(createSurrenderCard(request));
    });
  } catch (err) {
    console.error("Surrender requests error:", err);
    grid.innerHTML = '<div class="empty-state"><p style="color: #dc2626;">Error loading surrender requests: ' + err.message + '</p></div>';
  }
}

function createSurrenderCard(request) {
  const card = document.createElement('div');
  card.className = 'pet-card-admin';
  
  card.innerHTML = `
    <img src="${request.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}" 
         alt="${request.petName || 'Unnamed'}"
         onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
    <div class="pet-card-info">
      <h3>${request.petName || 'Unnamed'}</h3>
      <p><strong>Species:</strong> ${request.species || 'N/A'}</p>
      <p><strong>Breed:</strong> ${request.breed || 'N/A'}</p>
      <p><strong>Age:</strong> ${request.age || 'N/A'}</p>
      <p><strong>Owner:</strong> ${request.userEmail || 'N/A'}</p>
    </div>
    <div class="pet-card-actions">
      <button class="btn-view" onclick="viewSurrenderDetails('${request.id}')">View Details</button>
      <button class="btn-approve" onclick="approveSurrender('${request.id}', '${(request.petName || 'this pet').replace(/'/g, "\\'")}')">Approve</button>
      <button class="btn-reject" onclick="rejectSurrender('${request.id}', '${(request.petName || 'this pet').replace(/'/g, "\\'")}')">Reject</button>
    </div>
  `;
  
  return card;
}

// ────────────────────────────────────────────────
// Available Pets (FIXED)
// ────────────────────────────────────────────────

async function loadApprovedPets() {
  const grid = document.getElementById('approvedPetsGrid');
  grid.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  try {
    console.log("Loading available pets...");
    
    // Get all pets from pets collection
    const petsSnapshot = await getDocs(collection(db, 'pets'));
    
    // Get all approved adoptions to filter out adopted pets
    const adoptedQuery = query(
      collection(db, 'adoptionApplications'),
      where('status', '==', 'approved')
    );
    const adoptedSnapshot = await getDocs(adoptedQuery);
    
    // Create set of adopted pet IDs
    const adoptedPetIds = new Set();
    adoptedSnapshot.forEach(doc => {
      adoptedPetIds.add(doc.data().petId);
    });
    
    console.log("Total pets:", petsSnapshot.size);
    console.log("Adopted pet IDs:", Array.from(adoptedPetIds));
    
    grid.innerHTML = '';

    // Filter out adopted pets
    const availablePets = [];
    petsSnapshot.forEach(doc => {
      if (!adoptedPetIds.has(doc.id)) {
        availablePets.push({ id: doc.id, ...doc.data() });
      }
    });

    console.log("Available pets:", availablePets.length);

    if (availablePets.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <p>No available pets</p>
        </div>
      `;
      return;
    }

    availablePets.forEach(pet => {
      grid.appendChild(createPetCard(pet));
    });
  } catch (err) {
    console.error("Approved pets error:", err);
    grid.innerHTML = '<div class="empty-state"><p style="color: #dc2626;">Error loading pets: ' + err.message + '</p></div>';
  }
}

function createPetCard(pet) {
  const card = document.createElement('div');
  card.className = 'pet-card-admin';

  card.innerHTML = `
    <img src="${pet.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}" 
         alt="${pet.name || 'Unnamed'}"
         onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
    <div class="pet-card-info">
      <h3>${pet.name || 'Unnamed'}</h3>
      <p><strong>Species:</strong> ${pet.species || 'N/A'}</p>
      <p><strong>Breed:</strong> ${pet.breed || 'N/A'}</p>
      <p><strong>Age:</strong> ${pet.age || 'N/A'}</p>
      <p><strong>Gender:</strong> ${pet.gender || 'N/A'}</p>
    </div>
    <div class="pet-card-actions">
      <button class="btn-view" onclick="viewPetDetails('${pet.id}')">View Details</button>
      <button class="btn-delete" onclick="removePet('${pet.id}', '${(pet.name || 'this pet').replace(/'/g, "\\'")}')">Remove</button>
    </div>
  `;
  
  return card;
}

// ────────────────────────────────────────────────
// Adopted Pets (FIXED)
// ────────────────────────────────────────────────

async function loadAdoptedPets() {
  const grid = document.getElementById('adoptedPetsGrid');
  grid.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  try {
    console.log("Loading adopted pets...");
    
    // Get approved adoption applications
    const q = query(
      collection(db, 'adoptionApplications'),
      where('status', '==', 'approved')
    );

    const snap = await getDocs(q);
    console.log("Approved adoptions loaded:", snap.size);
    
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

    for (const docSnap of snap.docs) {
      const adoption = { id: docSnap.id, ...docSnap.data() };
      console.log("Processing adoption:", adoption);
      
      // Get pet details
      let petData = { 
        name: adoption.petName || 'Unknown', 
        breed: 'N/A', 
        age: 'N/A', 
        imageUrl: '' 
      };
      
      if (adoption.petId) {
        try {
          const petDoc = await getDoc(doc(db, 'pets', adoption.petId));
          if (petDoc.exists()) {
            const pet = petDoc.data();
            petData = {
              name: pet.name || adoption.petName,
              breed: pet.breed || 'N/A',
              age: pet.age || 'N/A',
              imageUrl: pet.imageUrl || ''
            };
          }
        } catch (err) {
          console.warn('Could not fetch pet details:', err);
        }
      }
      
      grid.appendChild(createAdoptedPetCard(adoption, petData));
    }
  } catch (err) {
    console.error("Adopted pets error:", err);
    grid.innerHTML = '<div class="empty-state"><p style="color: #dc2626;">Error loading adopted pets: ' + err.message + '</p></div>';
  }
}

function createAdoptedPetCard(adoption, petData) {
  const card = document.createElement('div');
  card.className = 'pet-card-admin';
  
  const adoptedDate = adoption.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A';
  
  card.innerHTML = `
    <img src="${petData.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}" 
         alt="${petData.name}"
         onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
    <div class="pet-card-info">
      <h3>${petData.name}</h3>
      <p><strong>Breed:</strong> ${petData.breed}</p>
      <p><strong>Age:</strong> ${petData.age}</p>
      <p><strong>Adopted by:</strong> ${adoption.fullName || 'N/A'}</p>
      <p><strong>Adopted on:</strong> ${adoptedDate}</p>
    </div>
    <div class="pet-card-actions">
      <button class="btn-view" onclick="viewAdoptionDetails('${adoption.id}')">View Details</button>
    </div>
  `;
  
  return card;
}

// ────────────────────────────────────────────────
// Registered Users (FIXED)
// ────────────────────────────────────────────────

async function loadUsers() {
  const container = document.getElementById('usersTable');
  container.innerHTML = '<div class="table-loading"><p>Loading users...</p></div>';

  try {
    console.log("Loading users...");
    
    const snap = await getDocs(collection(db, 'users'));
    console.log("Users loaded:", snap.size);

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
      const date = user.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.fullName || 'N/A'}</td>
        <td>${user.email || 'N/A'}</td>
        <td>${user.phoneNumber || 'N/A'}</td>
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
    container.innerHTML = '<div class="empty-state"><p style="color: #dc2626;">Error loading users: ' + err.message + '</p></div>';
  }
}

window.viewUserDetails = async function(userId) {
  try {
    const ref = doc(db, 'users', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("User not found");

    const user = snap.data();
    const content = document.getElementById('userDetailContent');

    const registered = user.createdAt?.toDate?.()?.toLocaleString() || 'N/A';

    content.innerHTML = `
      <div class="detail-section">
        <h2>${user.fullName || 'Unnamed User'}</h2>
        <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
        <p><strong>Username:</strong> ${user.username || 'N/A'}</p>
        <p><strong>Phone:</strong> ${user.phoneNumber || 'N/A'}</p>
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
// Adoption Applications (FIXED)
// ────────────────────────────────────────────────

async function loadApplications() {
  const container = document.getElementById('applicationsTable');
  container.innerHTML = '<div class="table-loading"><p>Loading applications...</p></div>';

  try {
    console.log("Loading applications...");
    
    // Load from BOTH collections: adoptionApplications AND adoptionRequests (from homepage)
    const [snap1, snap2] = await Promise.all([
      getDocs(collection(db, 'adoptionApplications')),
      getDocs(collection(db, 'adoptionRequests'))
    ]);
    
    // Merge both, tagging source collection
    const allDocs = [
      ...snap1.docs.map(d => ({ _col: 'adoptionApplications', id: d.id, ...d.data() })),
      ...snap2.docs.map(d => ({ _col: 'adoptionRequests',     id: d.id, ...d.data() }))
    ];
    
    // Deduplicate by id just in case
    const seen = new Set();
    const merged = allDocs.filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });
    
    const snap = { docs: merged, empty: merged.length === 0, size: merged.length };
    console.log("Applications loaded:", snap.size);

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

    if (snap.empty || snap.docs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">No adoption applications yet</td></tr>';
      return;
    }

    snap.docs.forEach(app => {
      const date = app.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A';
      const status = app.status || 'pending';

      const statusStyle = status === 'approved' ? 'background:#dcfce7;color:#166534' :
                         status === 'rejected'  ? 'background:#fee2e2;color:#991b1b' :
                                                  'background:#fef3c7;color:#854d0e';

      const col = app._col || 'adoptionApplications';
      const actions = status === 'pending' 
        ? `
          <button class="btn-approve" onclick="approveApplication('${app.id}', '${(app.fullName || 'this user').replace(/'/g, "\'")}', '${col}')">Approve</button>
          <button class="btn-reject" onclick="rejectApplication('${app.id}', '${(app.fullName || 'this user').replace(/'/g, "\'")}', '${col}')">Reject</button>
        ` : '';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${app.fullName || 'N/A'}</td>
        <td>${app.petName || 'N/A'}</td>
        <td>${app.email || 'N/A'}</td>
        <td>${app.phoneNumber || 'N/A'}</td>
        <td><span style="text-transform: capitalize; padding: 4px 8px; border-radius: 4px; ${statusStyle}">${status}</span></td>
        <td>${date}</td>
        <td>
          <button class="btn-view" onclick="viewApplicationDetails('${app.id}')">View</button>
          ${actions}
          <button class="btn-delete" onclick="deleteApplication('${app.id}', '${(app.fullName || 'this user').replace(/'/g, "\\'")}')">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

  } catch (err) {
    console.error("Applications error:", err);
    container.innerHTML = '<div class="empty-state"><p style="color: #dc2626;">Error loading applications: ' + err.message + '</p></div>';
  }
}

// ────────────────────────────────────────────────
// View Details Functions
// ────────────────────────────────────────────────

window.viewSurrenderDetails = async function(requestId) {
  try {
    const ref = doc(db, 'surrenderRequests', requestId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Request not found");

    const request = snap.data();
    const content = document.getElementById('petDetailContent');
    
    content.innerHTML = `
      <div class="pet-detail-header">
        <img class="pet-detail-image" 
             src="${request.imageUrl || 'https://via.placeholder.com/200?text=No+Image'}" 
             alt="${request.petName}"
             onerror="this.src='https://via.placeholder.com/200?text=No+Image'">
        <div class="pet-detail-info">
          <h2>${request.petName || 'Unnamed'}</h2>
          <p><strong>Species:</strong> ${request.species || 'N/A'}</p>
          <p><strong>Breed:</strong> ${request.breed || 'N/A'}</p>
          <p><strong>Age:</strong> ${request.age || 'N/A'}</p>
          <p><strong>Gender:</strong> ${request.gender || 'N/A'}</p>
        </div>
      </div>
      <div class="detail-section">
        <h3>Reason for Surrender</h3>
        <p>${request.reason || 'No reason provided'}</p>
      </div>
      <div class="detail-section">
        <h3>Owner Information</h3>
        <p><strong>Email:</strong> ${request.userEmail || 'N/A'}</p>
        <p><strong>Phone:</strong> ${request.contactPhone || 'N/A'}</p>
      </div>
    `;
    
    document.getElementById('petDetailModal').classList.add('show');
  } catch (err) {
    console.error(err);
    showAlertModal("Error loading surrender details", "Error");
  }
};

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
             src="${pet.imageUrl || 'https://via.placeholder.com/200?text=No+Image'}" 
             alt="${pet.name}"
             onerror="this.src='https://via.placeholder.com/200?text=No+Image'">
        <div class="pet-detail-info">
          <h2>${pet.name || 'Unnamed'}</h2>
          <p><strong>Species:</strong> ${pet.species || 'N/A'}</p>
          <p><strong>Breed:</strong> ${pet.breed || 'N/A'}</p>
          <p><strong>Age:</strong> ${pet.age || 'N/A'}</p>
          <p><strong>Gender:</strong> ${pet.gender || 'N/A'}</p>
        </div>
      </div>
      <div class="detail-section">
        <h3>Description</h3>
        <p>${pet.description || 'No description provided'}</p>
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

window.viewApplicationDetails = async function(appId) {
  try {
    // Try adoptionApplications first, then adoptionRequests
    let snap = await getDoc(doc(db, 'adoptionApplications', appId));
    let collectionUsed = 'adoptionApplications';
    if (!snap.exists()) {
      snap = await getDoc(doc(db, 'adoptionRequests', appId));
      collectionUsed = 'adoptionRequests';
    }
    if (!snap.exists()) throw new Error("Application not found");

    const app = snap.data();
    const date = app.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A';
    
    document.getElementById('applicationDetailContent').innerHTML = `
      <h2>Adoption Application Details</h2>
      <div class="detail-section">
        <h3>Applicant Information</h3>
        <p><strong>Name:</strong> ${app.fullName || 'N/A'}</p>
        <p><strong>Email:</strong> ${app.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${app.phoneNumber || 'N/A'}</p>
        <p><strong>Address:</strong> ${app.address || 'N/A'}</p>
      </div>
      <div class="detail-section">
        <h3>Pet Information</h3>
        <p><strong>Pet Name:</strong> ${app.petName || 'N/A'}</p>
        ${app.petId ? `<p><strong>Pet ID:</strong> ${app.petId}</p>` : ''}
      </div>
      <div class="detail-section">
        <h3>Application Details</h3>
        <p><strong>Status:</strong> <span style="text-transform: capitalize">${app.status || 'pending'}</span></p>
        <p><strong>Submitted:</strong> ${date}</p>
        <p><strong>Reason:</strong></p>
        <p style="white-space: pre-wrap; background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 10px;">${app.reason || 'No reason provided'}</p>
      </div>
      ${app.status === 'pending' ? `
        <div class="modal-footer" style="margin-top: 20px;">
          <button class="btn-approve" onclick="approveApplication('${appId}', '${(app.fullName || 'this user').replace(/'/g, "\\'")}', '${collectionUsed}'); closeApplicationDetailModal();">Approve</button>
          <button class="btn-reject" onclick="rejectApplication('${appId}', '${(app.fullName || 'this user').replace(/'/g, "\\'")}', '${collectionUsed}'); closeApplicationDetailModal();">Reject</button>
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

window.viewAdoptionDetails = window.viewApplicationDetails;

// ────────────────────────────────────────────────
// Surrender Actions
// ────────────────────────────────────────────────

window.approveSurrender = function(id, name) {
  showConfirmationModal(`Approve surrender request for "${name}"? This will add the pet to available pets.`, async () => {
    try {
      const requestRef = doc(db, 'surrenderRequests', id);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) throw new Error("Request not found");
      
      const requestData = requestSnap.data();
      
      // Create pet in pets collection
      await addDoc(collection(db, 'pets'), {
        name: requestData.petName,
        species: requestData.species,
        breed: requestData.breed,
        age: requestData.age,
        gender: requestData.gender,
        imageUrl: requestData.imageUrl,
        description: requestData.reason,
        createdAt: serverTimestamp()
      });
      
      // Update surrender request status
      await updateDoc(requestRef, { status: 'approved' });
      
      showAlertModal(`"${name}" has been approved and added to available pets!`);
      pendingRefresh = loadDashboardData;
    } catch (err) {
      console.error(err);
      showAlertModal("Failed to approve surrender request", "Error");
    }
  });
};

window.rejectSurrender = function(id, name) {
  showConfirmationModal(`Reject surrender request for "${name}"?`, async () => {
    try {
      await updateDoc(doc(db, 'surrenderRequests', id), { status: 'rejected' });
      showAlertModal(`Surrender request for "${name}" has been rejected`);
      pendingRefresh = loadDashboardData;
    } catch (err) {
      console.error(err);
      showAlertModal("Failed to reject surrender request", "Error");
    }
  });
};

// ────────────────────────────────────────────────
// Pet Actions
// ────────────────────────────────────────────────

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

window.approveApplication = async function(id, applicantName, colName) {
  const collection_name = colName || 'adoptionApplications';
  showConfirmationModal(`Approve adoption application from ${applicantName}?`, async () => {
    try {
      await updateDoc(doc(db, collection_name, id), { status: 'approved' });
      // Also try to update the other collection if it exists there
      try {
        const otherCol = collection_name === 'adoptionApplications' ? 'adoptionRequests' : 'adoptionApplications';
        await updateDoc(doc(db, otherCol, id), { status: 'approved' });
      } catch(_) {}
      showAlertModal(`Application approved for ${applicantName}!`);
      pendingRefresh = loadDashboardData;
    } catch (err) {
      console.error("Approve application error:", err);
      showAlertModal("Failed to approve application: " + err.message, "Error");
    }
  });
};

window.rejectApplication = function(id, applicantName, colName) {
  const collection_name = colName || 'adoptionApplications';
  showConfirmationModal(`Reject application from ${applicantName}?`, async () => {
    try {
      await updateDoc(doc(db, collection_name, id), { status: 'rejected' });
      // Also try to update the other collection
      try {
        const otherCol = collection_name === 'adoptionApplications' ? 'adoptionRequests' : 'adoptionApplications';
        await updateDoc(doc(db, otherCol, id), { status: 'rejected' });
      } catch(_) {}
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
      await deleteDoc(doc(db, 'adoptionApplications', id));
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

// Auto-detect species based on breed
const breedInput = document.getElementById('petBreed');
const speciesSelect = document.getElementById('petSpecies');

if (breedInput && speciesSelect) {
  breedInput.addEventListener('input', (e) => {
    const breed = e.target.value.toLowerCase().trim();
    let detected = '';

    if (/dog|puppy|labrador|golden|husky|german shepherd|rottweiler|poodle|retriever|bulldog|beagle|terrier|shepherd/i.test(breed)) {
      detected = 'Dog';
    } else if (/cat|kitten|persian|siamese|tabby|ragdoll|maine coon|bengal|sphynx/i.test(breed)) {
      detected = 'Cat';
    }

    if (detected) speciesSelect.value = detected;
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
    const photoInput = document.getElementById('adminPetPhoto');
    if (!photoInput?.files?.length) {
      showAlertModal("Please upload a pet photo", "Error");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    const gender = document.querySelector('input[name="gender"]:checked');
    if (!gender) {
      showAlertModal("Please select a gender", "Error");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    const file = photoInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(ev) {
      const base64 = ev.target.result;

      const formData = {
        name: document.getElementById('petName').value.trim(),
        species: document.getElementById('petSpecies').value,
        breed: document.getElementById('petBreed').value.trim(),
        age: document.getElementById('petAge').value.trim(),
        gender: gender.value,
        description: document.getElementById('petDescription').value.trim(),
        imageUrl: base64,
        createdAt: serverTimestamp()
      };

      try {
        await addDoc(collection(db, 'pets'), formData);
        
        showAlertModal(`"${formData.name}" has been successfully added!`);
        window.resetAddPetForm();
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
  console.log("Initializing admin panel...");
  
  initFirebase();

  document.getElementById('adminLoginForm')?.addEventListener('submit', handleAdminLogin);
  document.getElementById('addPetForm')?.addEventListener('submit', handleAddPetForm);

  checkAdminAuth();
  setupNavigation();
  
  console.log("Admin panel initialized");
});