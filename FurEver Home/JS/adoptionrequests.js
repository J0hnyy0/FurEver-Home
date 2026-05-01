// adoptionrequests.js - Updated for Mobile Firebase Structure
// Displays all adoption requests submitted by the current user

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
  doc,
  getDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

// ────────────────────────────────────────────────
// Globals
// ────────────────────────────────────────────────

let auth = null;
let db   = null;
let currentUser = null;
let allRequests = [];
let currentRequestToCancel = null;

// ────────────────────────────────────────────────
// Initialize Firebase
// ────────────────────────────────────────────────

function initFirebase() {
  if (auth && db) return true;

  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db   = getFirestore(app);
    console.log("✅ Firebase initialized");
    return true;
  } catch (err) {
    console.error("❌ Firebase init failed:", err);
    return false;
  }
}

// ────────────────────────────────────────────────
// Profile menu functions
// ────────────────────────────────────────────────

function toggleProfileMenu() {
  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const profileContainer = document.getElementById('profileMenuContainer');
  if (profileContainer && !profileContainer.contains(e.target)) {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }
});

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

window.toggleProfileMenu = toggleProfileMenu;

// ────────────────────────────────────────────────
// Logout modal functions
// ────────────────────────────────────────────────

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
  
  try {
    if (auth) {
      await signOut(auth);
      console.log('✅ User signed out');
    }
  } catch (error) {
    console.error('❌ Logout error:', error);
  }
  
  localStorage.clear();
  sessionStorage.clear();
  
  window.location.href = 'register.html';
};

// ────────────────────────────────────────────────
// Cancel request modal functions
// ────────────────────────────────────────────────

window.showCancelModal = function(requestId) {
  currentRequestToCancel = requestId;
  const modal = document.getElementById('cancelRequestModal');
  if (modal) {
    modal.classList.add('show');
  }
};

window.closeCancelModal = function() {
  currentRequestToCancel = null;
  const modal = document.getElementById('cancelRequestModal');
  if (modal) {
    modal.classList.remove('show');
  }
};

window.confirmCancelRequest = async function() {
  if (!currentRequestToCancel) {
    console.warn('⚠️ No request to cancel');
    return;
  }
  
  try {
    console.log('🗑️ Canceling request:', currentRequestToCancel);
    
    if (!db) {
      throw new Error('Firestore not initialized');
    }
    
    // Delete the request from Firestore (UPDATED COLLECTION NAME)
    await deleteDoc(doc(db, 'adoptionApplications', currentRequestToCancel));
    
    console.log('✅ Request canceled successfully');
    
    // Close modal
    window.closeCancelModal();
    
    // Reload requests
    if (currentUser) {
      await loadAdoptionRequests(currentUser.uid);
    }
    
  } catch (error) {
    console.error('❌ Error canceling request:', error);
    alert('An error occurred: ' + error.message);
  }
};

// Close modals when clicking outside
document.addEventListener('click', (e) => {
  const logoutModal = document.getElementById('logoutConfirmModal');
  const cancelModal = document.getElementById('cancelRequestModal');
  
  if (logoutModal && logoutModal.classList.contains('show')) {
    const modalContent = logoutModal.querySelector('.modal-content');
    if (modalContent && !modalContent.contains(e.target)) {
      window.closeLogoutModal();
    }
  }
  
  if (cancelModal && cancelModal.classList.contains('show')) {
    const modalContent = cancelModal.querySelector('.modal-content');
    if (modalContent && !modalContent.contains(e.target)) {
      window.closeCancelModal();
    }
  }
});

// ────────────────────────────────────────────────
// Format date for display
// ────────────────────────────────────────────────

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown date';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Date format error:', error);
    return 'Invalid date';
  }
}

// ────────────────────────────────────────────────
// Update status counts
// ────────────────────────────────────────────────

function updateStatusCounts() {
  const counts = {
    all: allRequests.length,
    pending: allRequests.filter(r => r.status === 'pending').length,
    approved: allRequests.filter(r => r.status === 'approved').length,
    rejected: allRequests.filter(r => r.status === 'rejected').length
  };
  
  document.getElementById('countAll').textContent = counts.all;
  document.getElementById('countPending').textContent = counts.pending;
  document.getElementById('countApproved').textContent = counts.approved;
  document.getElementById('countRejected').textContent = counts.rejected;
}

// ────────────────────────────────────────────────
// Filter requests by status
// ────────────────────────────────────────────────

window.filterByStatus = function(status) {
  console.log('🔍 Filtering by status:', status);
  
  // Update active tab
  const tabs = document.querySelectorAll('.status-tab');
  tabs.forEach(tab => {
    if (tab.getAttribute('data-status') === status) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Filter cards
  const cards = document.querySelectorAll('.request-card');
  let visibleCount = 0;
  
  cards.forEach(card => {
    const cardStatus = card.getAttribute('data-status');
    if (status === 'all' || cardStatus === status) {
      card.style.display = 'flex';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });
  
  // Show empty state if no visible cards
  const container = document.getElementById('requestsContainer');
  const existingEmpty = container.querySelector('.filter-empty-state');
  
  if (visibleCount === 0 && cards.length > 0) {
    if (!existingEmpty) {
      const emptyState = document.createElement('div');
      emptyState.className = 'filter-empty-state';
      emptyState.innerHTML = `
        <div class="empty-state-icon">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <h3>No ${status === 'all' ? '' : status.charAt(0).toUpperCase() + status.slice(1)} Requests</h3>
        <p>You don't have any ${status === 'all' ? '' : status} adoption requests.</p>
      `;
      container.appendChild(emptyState);
    }
  } else if (existingEmpty) {
    existingEmpty.remove();
  }
};

// ────────────────────────────────────────────────
// Load adoption requests (UPDATED FOR MOBILE)
// ────────────────────────────────────────────────

async function loadAdoptionRequests(userId) {
  const container = document.getElementById('requestsContainer');
  
  if (!container) {
    console.error('❌ Container element not found');
    return;
  }
  
  try {
    console.log('🔄 Loading adoption requests for user:', userId);
    
    if (!db) {
      throw new Error('Firestore not initialized');
    }
    
    // UPDATED: Query by applicantUserId (mobile field name)
    const q = query(
      collection(db, 'adoptionApplications'),
      where('applicantUserId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    
    console.log('✅ Adoption requests loaded:', snapshot.size);
    
    // Store all requests
    allRequests = [];
    snapshot.forEach(doc => {
      allRequests.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by date in JavaScript (newest first)
    allRequests.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
    
    // Update counts
    updateStatusCounts();
    
    container.innerHTML = '';
    
    if (allRequests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <h3>No Adoption Requests</h3>
          <p>You haven't submitted any adoption requests yet. Browse our available pets and start your adoption journey!</p>
          <a href="homepage.html#pets" class="empty-state-btn">Browse Pets</a>
        </div>
      `;
      return;
    }
    
    // Create request cards
    for (const request of allRequests) {
      // Get pet details from pets collection
      let petData = {
        name: request.petName || 'Unknown Pet',
        breed: 'Unknown breed',
        age: 'Unknown',
        gender: 'Unknown',
        imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2U4ZjRmOCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='
      };
      
      // Fetch pet details from pets collection
      if (request.petId) {
        try {
          const petDoc = await getDoc(doc(db, 'pets', request.petId));
          if (petDoc.exists()) {
            const fetchedPetData = petDoc.data();
            petData = {
              name: request.petName || fetchedPetData.name || 'Unknown Pet',
              breed: fetchedPetData.breed || 'Unknown breed',
              age: fetchedPetData.age || 'Unknown',
              gender: fetchedPetData.gender || 'Unknown',
              imageUrl: fetchedPetData.imageUrl || petData.imageUrl
            };
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch pet details:', err);
        }
      }
      
      const card = document.createElement('div');
      card.className = 'request-card';
      card.setAttribute('data-status', request.status || 'pending');
      
      // Determine badge class and text
      const status = request.status || 'pending';
      let badgeClass = status;
      let badgeText = status.charAt(0).toUpperCase() + status.slice(1);
      
      // Show cancel button only for pending requests
      const cancelButton = status === 'pending' 
        ? `<button class="btn-cancel" onclick="showCancelModal('${request.id}')">Cancel Request</button>`
        : '';
      
      card.innerHTML = `
        <img src="${petData.imageUrl}" 
             alt="${petData.name}" 
             class="request-card-image" 
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2U4ZjRmOCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
        <div class="request-card-body">
          <div class="request-card-header">
            <div class="request-card-title">
              <h3 class="request-card-name">${petData.name}</h3>
              <p class="request-card-breed">${petData.breed || 'Unknown breed'}</p>
            </div>
            <span class="status-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="request-card-details">
            <div class="detail-row">
              <span class="detail-label">Age:</span>
              <span class="detail-value">${petData.age || 'Unknown'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Gender:</span>
              <span class="detail-value">${petData.gender || 'Unknown'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Request Status:</span>
              <span class="detail-value">${badgeText}</span>
            </div>
            ${request.reason ? `
            <div class="detail-row">
              <span class="detail-label">Your Message:</span>
              <span class="detail-value">${request.reason}</span>
            </div>
            ` : ''}
          </div>
          <div class="request-card-footer">
            <div class="request-date">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
              </svg>
              <span>Submitted on ${formatDate(request.createdAt)}</span>
            </div>
            <div class="request-actions">
              ${cancelButton}
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(card);
    }
    
    // Apply current filter (default is 'all')
    const activeTab = document.querySelector('.status-tab.active');
    if (activeTab) {
      window.filterByStatus(activeTab.getAttribute('data-status'));
    }
    
  } catch (error) {
    console.error('❌ Error loading requests:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h3>Error Loading Requests</h3>
        <p>We couldn't load your adoption requests. ${error.message}</p>
        <button class="empty-state-btn" onclick="window.location.reload()">Try Again</button>
      </div>
    `;
  }
}

// ────────────────────────────────────────────────
// Show profile menu with user info
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
  
  // Try to get user profile from Firestore (UPDATED COLLECTION NAME)
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
  
  // Update profile menu
  userName.textContent = fullName;
  userEmail.textContent = user.email;
  profileName.textContent = firstName;
  profileAvatar.textContent = initials || 'U';
  
  console.log('✅ Profile menu updated for:', fullName);
}

// ────────────────────────────────────────────────
// Initialize page
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
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔄 Page loading...');
  
  // Initialize Firebase
  if (!initFirebase()) {
    console.error('❌ Failed to initialize Firebase');
    alert('Failed to connect to the database. Please check your configuration.');
    setTimeout(() => {
      window.location.href = 'homepage.html';
    }, 2000);
    return;
  }
  
  // Check authentication
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.log('❌ No user signed in, redirecting to login');
      window.location.href = 'register.html';
      return;
    }
    
    // Check if email is verified
    if (!user.emailVerified) {
      console.log('❌ Email not verified, redirecting to login');
      alert('Please verify your email before accessing this page.');
      await signOut(auth);
      window.location.href = 'register.html';
      return;
    }
    
    console.log('✅ User authenticated:', user.email);
    currentUser = user;
    
    try {
      // Show profile menu
      await showProfileMenu(user);
      showNotifBell(true);
      loadBadgeCount();
      
      // Load adoption requests
      await loadAdoptionRequests(user.uid);
    } catch (err) {
      console.error('❌ Error loading page:', err);
      alert('An error occurred. Please try again.');
    }
  });
});