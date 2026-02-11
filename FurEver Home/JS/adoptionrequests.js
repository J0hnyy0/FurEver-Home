// adoptionrequests.js - Firebase v10 modular (NO INDEX REQUIRED VERSION)
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
    
    // Delete the request from Firestore
    await deleteDoc(doc(db, 'adoption_applications', currentRequestToCancel));
    
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
        <div class="empty-state-icon">🔍</div>
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
// Load adoption requests (SIMPLIFIED - NO INDEX REQUIRED)
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
    
    const userEmail = currentUser?.email;
    
    if (!userEmail) {
      throw new Error('User email not found');
    }
    
    // SIMPLIFIED QUERY - Only filter by email (no compound index needed)
    const q = query(
      collection(db, 'adoption_applications'),
      where('applicant_email', '==', userEmail)
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
      const aTime = a.created_at?.toMillis() || 0;
      const bTime = b.created_at?.toMillis() || 0;
      return bTime - aTime;
    });
    
    // Update counts
    updateStatusCounts();
    
    container.innerHTML = '';
    
    if (allRequests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No Adoption Requests</h3>
          <p>You haven't submitted any adoption requests yet. Browse our available pets and start your adoption journey!</p>
          <a href="homepage.html#pets" class="empty-state-btn">Browse Pets</a>
        </div>
      `;
      return;
    }
    
    // Create request cards
    for (const request of allRequests) {
      // Get pet details from the request (stored when approved, or from initial submission)
      let petData = {
        name: request.pet_name || 'Unknown Pet',
        breed: request.pet_breed || 'Unknown breed',
        age: request.pet_age || 'Unknown',
        gender: request.pet_gender || 'Unknown',
        image_url: request.pet_image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2U4ZjRmOCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='
      };
      
      // If pet details are missing from request, try fetching from pets collection
      if (request.pet_id && (!request.pet_image_url || !request.pet_breed)) {
        try {
          const petDoc = await getDoc(doc(db, 'pets', request.pet_id));
          if (petDoc.exists()) {
            const fetchedPetData = petDoc.data();
            // Only override if the request data is missing
            petData = {
              name: request.pet_name || fetchedPetData.name || 'Unknown Pet',
              breed: request.pet_breed || fetchedPetData.breed || 'Unknown breed',
              age: request.pet_age || fetchedPetData.age || 'Unknown',
              gender: request.pet_gender || fetchedPetData.gender || 'Unknown',
              image_url: request.pet_image_url || fetchedPetData.image_url || petData.image_url
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
        <img src="${petData.image_url}" 
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
              <span class="detail-value">${petData.age || 'Unknown'} years</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Gender:</span>
              <span class="detail-value">${petData.gender || 'Unknown'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Request Status:</span>
              <span class="detail-value">${badgeText}</span>
            </div>
            ${request.message ? `
            <div class="detail-row">
              <span class="detail-label">Your Message:</span>
              <span class="detail-value">${request.message}</span>
            </div>
            ` : ''}
          </div>
          <div class="request-card-footer">
            <div class="request-date">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Submitted on ${formatDate(request.created_at)}</span>
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
        <div class="empty-state-icon">⚠️</div>
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
  
  // Try to get user profile from Firestore
  try {
    const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      if (profileData.full_name) {
        fullName = profileData.full_name;
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
      
      // Load adoption requests
      await loadAdoptionRequests(user.uid);
    } catch (err) {
      console.error('❌ Error loading page:', err);
      alert('An error occurred. Please try again.');
    }
  });
});