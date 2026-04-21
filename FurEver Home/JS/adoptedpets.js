// adoptedpets.js - Updated for Mobile Firebase Structure
// Displays pets that the current user has successfully adopted

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
  getDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

// ────────────────────────────────────────────────
// Globals
// ────────────────────────────────────────────────

let auth = null;
let db   = null;
let currentUser = null;

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

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const logoutModal = document.getElementById('logoutConfirmModal');
  
  if (!logoutModal || !logoutModal.classList.contains('show')) {
    return;
  }
  
  const modalContent = logoutModal.querySelector('.modal-content');
  
  if (modalContent && !modalContent.contains(e.target)) {
    window.closeLogoutModal();
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
// Load adopted pets (UPDATED FOR MOBILE)
// ────────────────────────────────────────────────

async function loadAdoptedPets(userId) {
  const container = document.getElementById('adoptedPetsContainer');
  
  if (!container) {
    console.error('❌ Container element not found');
    return;
  }
  
  try {
    console.log('🔄 Loading adopted pets for user:', userId);
    
    if (!db) {
      throw new Error('Firestore not initialized');
    }
    
    // UPDATED: Query by applicantUserId (mobile field name)
    const q = query(
      collection(db, 'adoptionApplications'),
      where('applicantUserId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    
    console.log('✅ Applications loaded:', snapshot.size);
    
    // Filter for approved status in JavaScript
    const approvedDocs = [];
    snapshot.forEach(doc => {
      if (doc.data().status === 'approved') {
        approvedDocs.push({ id: doc.id, ...doc.data() });
      }
    });
    
    // Sort by date in JavaScript (newest first)
    approvedDocs.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
    
    console.log('✅ Approved adoptions found:', approvedDocs.length);
    
    container.innerHTML = '';
    
    if (approvedDocs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
            </svg>
          </div>
          <h3>No Adopted Pets Yet</h3>
          <p>You haven't adopted any pets yet. Browse our available pets and find your perfect companion!</p>
          <a href="homepage.html#pets" class="empty-state-btn">Browse Pets</a>
        </div>
      `;
      return;
    }
    
    // Create pet cards for each approved adoption
    for (const adoption of approvedDocs) {
      // Get pet details from pets collection
      let petData = {
        name: adoption.petName || 'Unknown Pet',
        breed: 'Unknown',
        age: 'Unknown',
        gender: 'Unknown',
        imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2U4ZjRmOCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=',
        description: ''
      };
      
      // Fetch pet details from pets collection
      if (adoption.petId) {
        try {
          const petDoc = await getDoc(doc(db, 'pets', adoption.petId));
          if (petDoc.exists()) {
            const fetchedPetData = petDoc.data();
            petData = {
              name: adoption.petName || fetchedPetData.name || 'Unknown Pet',
              breed: fetchedPetData.breed || 'Unknown',
              age: fetchedPetData.age || 'Unknown',
              gender: fetchedPetData.gender || 'Unknown',
              imageUrl: fetchedPetData.imageUrl || petData.imageUrl,
              description: fetchedPetData.description || ''
            };
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch pet details:', err);
        }
      }
      
      const petCard = document.createElement('div');
      petCard.className = 'pet-card';
      petCard.innerHTML = `
        <img src="${petData.imageUrl}" 
             alt="${petData.name}" 
             class="pet-card-image" 
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2U4ZjRmOCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
        <div class="pet-card-body">
          <div class="pet-card-header">
            <h3 class="pet-card-name">${petData.name}</h3>
            <span class="adoption-badge">Adopted</span>
          </div>
          <div class="pet-card-details">
            <div class="detail-row">
              <span class="detail-label">Breed:</span>
              <span class="detail-value">${petData.breed || 'Unknown'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Age:</span>
              <span class="detail-value">${petData.age || 'Unknown'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Gender:</span>
              <span class="detail-value">${petData.gender || 'Unknown'}</span>
            </div>
          </div>
          <div class="adoption-info">
            <div class="adoption-date">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
              </svg>
              <span>Adopted on ${formatDate(adoption.createdAt)}</span>
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(petCard);
    }
    
  } catch (error) {
    console.error('❌ Error loading adopted pets:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h3>Error Loading Pets</h3>
        <p>We couldn't load your adopted pets. ${error.message}</p>
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
      
      // Load adopted pets
      await loadAdoptedPets(user.uid);
    } catch (err) {
      console.error('❌ Error loading page:', err);
      alert('An error occurred. Please try again.');
    }
  });
});