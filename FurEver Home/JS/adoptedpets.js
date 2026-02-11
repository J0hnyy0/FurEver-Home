// adoptedpets.js - Firebase v10 modular (NO INDEX REQUIRED VERSION)
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
// Load adopted pets (SIMPLIFIED - NO INDEX REQUIRED)
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
      const aTime = a.created_at?.toMillis() || 0;
      const bTime = b.created_at?.toMillis() || 0;
      return bTime - aTime;
    });
    
    console.log('✅ Approved adoptions found:', approvedDocs.length);
    
    container.innerHTML = '';
    
    if (approvedDocs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🐾</div>
          <h3>No Adopted Pets Yet</h3>
          <p>You haven't adopted any pets yet. Browse our available pets and find your perfect companion!</p>
          <a href="homepage.html#pets" class="empty-state-btn">Browse Pets</a>
        </div>
      `;
      return;
    }
    
    // Create pet cards for each approved adoption
    for (const adoption of approvedDocs) {
      // Get pet details from the adoption application (stored when approved)
      let petData = {
        name: adoption.pet_name || 'Unknown Pet',
        breed: adoption.pet_breed || 'Unknown',
        age: adoption.pet_age || 'Unknown',
        gender: adoption.pet_gender || 'Unknown',
        image_url: adoption.pet_image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2U4ZjRmOCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=',
        description: adoption.pet_description || ''
      };
      
      // If pet details are missing from application, try fetching from pets collection
      if (adoption.pet_id && (!adoption.pet_image_url || !adoption.pet_breed)) {
        try {
          const petDoc = await getDoc(doc(db, 'pets', adoption.pet_id));
          if (petDoc.exists()) {
            const fetchedPetData = petDoc.data();
            // Only override if the application data is missing
            petData = {
              name: adoption.pet_name || fetchedPetData.name || 'Unknown Pet',
              breed: adoption.pet_breed || fetchedPetData.breed || 'Unknown',
              age: adoption.pet_age || fetchedPetData.age || 'Unknown',
              gender: adoption.pet_gender || fetchedPetData.gender || 'Unknown',
              image_url: adoption.pet_image_url || fetchedPetData.image_url || petData.image_url,
              description: adoption.pet_description || fetchedPetData.description || ''
            };
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch pet details:', err);
        }
      }
      
      const petCard = document.createElement('div');
      petCard.className = 'pet-card';
      petCard.innerHTML = `
        <img src="${petData.image_url}" 
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
              <span class="detail-value">${petData.age || 'Unknown'} years</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Gender:</span>
              <span class="detail-value">${petData.gender || 'Unknown'}</span>
            </div>
          </div>
          <div class="adoption-info">
            <div class="adoption-date">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Adopted on ${formatDate(adoption.reviewed_at || adoption.created_at)}</span>
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
        <div class="empty-state-icon">⚠️</div>
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
      
      // Load adopted pets
      await loadAdoptedPets(user.uid);
    } catch (err) {
      console.error('❌ Error loading page:', err);
      alert('An error occurred. Please try again.');
    }
  });
});