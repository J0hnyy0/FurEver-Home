// JS/homepage.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
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
  getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

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
    // firebaseConfig should be defined in config.js
    if (typeof firebaseConfig === 'undefined') {
      console.error('Firebase config not found. Make sure config.js is loaded.');
      return false;
    }

    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db   = getFirestore(app);
    console.log("Firebase initialized successfully");
    return true;
  } catch (err) {
    console.error("Firebase initialization failed:", err);
    return false;
  }
}

// ────────────────────────────────────────────────
// Prevent back navigation after login
// ────────────────────────────────────────────────

function blockBackButton() {
  window.history.pushState(null, null, window.location.href);
  window.onpopstate = function () {
    window.history.pushState(null, null, window.location.href);
  };
}
blockBackButton();

// ────────────────────────────────────────────────
// Pet category from species (UPDATED FOR MOBILE)
// ────────────────────────────────────────────────

function getPetCategory(species) {
  if (!species) return 'all';
  const lower = species.toLowerCase().trim();
  
  if (lower === 'dog') return 'dog';
  if (lower === 'cat') return 'cat';
  return 'all';
}

// ────────────────────────────────────────────────
// Shuffle array (Fisher-Yates)
// ────────────────────────────────────────────────

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ────────────────────────────────────────────────
// Load pets from Firestore (UPDATED FOR MOBILE STRUCTURE)
// ────────────────────────────────────────────────

async function loadPets() {
  const grid = document.getElementById('petGrid');
  if (!grid) return;

  grid.innerHTML = '<p style="text-align:center; padding:20px;">Loading pets...</p>';

  if (!db) {
    grid.innerHTML = '<div class="no-pets-message"><p>Service unavailable. Please refresh the page.</p></div>';
    return;
  }

  try {
    // Step 1: Get all pets from 'pets' collection
    const petsSnapshot = await getDocs(collection(db, "pets"));
    
    // Step 2: Get all approved adoptions to filter out adopted pets
    const adoptedQuery = query(
      collection(db, "adoptionApplications"),
      where("status", "==", "approved")
    );
    const adoptedSnapshot = await getDocs(adoptedQuery);
    
    // Step 3: Create set of adopted pet IDs
    const adoptedPetIds = new Set();
    adoptedSnapshot.forEach(doc => {
      adoptedPetIds.add(doc.data().petId);
    });
    
    grid.innerHTML = '';

    if (petsSnapshot.empty) {
      grid.innerHTML = '<div class="no-pets-message"><p>No pets available for adoption at the moment. Check back soon!</p></div>';
      return;
    }

    // Step 4: Filter out adopted pets and convert to array
    const pets = petsSnapshot.docs
      .filter(doc => !adoptedPetIds.has(doc.id)) // Exclude adopted pets
      .map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
    
    if (pets.length === 0) {
      grid.innerHTML = '<div class="no-pets-message"><p>No pets available for adoption at the moment. Check back soon!</p></div>';
      return;
    }

    // Step 5: Shuffle pets for variety
    const shuffled = shuffleArray(pets);

    // Step 6: Create pet cards
    shuffled.forEach(pet => {
      const card = document.createElement('div');
      card.className = 'pet-card';
      card.dataset.category = getPetCategory(pet.species || '');
      card.onclick = () => adoptPet(pet.id, pet.name || 'Me');

      card.innerHTML = `
        <img src="${pet.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}" 
             alt="${pet.name || 'Pet'}"
             onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
        <div class="pet-info">
          <h4>${pet.name || 'Unnamed'}</h4>
          <p>${pet.age || '?'} · ${pet.breed || 'Unknown'}</p>
          <button onclick="event.stopPropagation(); adoptPet('${pet.id}', '${pet.name || 'Me'}')">
            Adopt ${pet.name || 'Me'}
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    // Re-apply current filter if any
    const activeFilter = document.querySelector('.filter-btn.active');
    if (activeFilter) {
      filterPets(activeFilter.dataset.filter);
    }

    console.log(`Loaded ${pets.length} available pets (${adoptedPetIds.size} pets already adopted)`);

  } catch (err) {
    console.error("Error loading pets from Firestore:", err);
    grid.innerHTML = '<div class="no-pets-message"><p>Error loading pets. Please try again later.</p></div>';
  }
}

// ────────────────────────────────────────────────
// Filter pets by category
// ────────────────────────────────────────────────

function filterPets(filterValue) {
  const cards = document.querySelectorAll('.pet-card');
  let visibleCount = 0;

  cards.forEach(card => {
    const category = card.dataset.category;
    const shouldShow = (filterValue === 'all' || category === filterValue);
    card.style.display = shouldShow ? 'block' : 'none';
    if (shouldShow) visibleCount++;
  });

  // Show message if no pets match filter
  const grid = document.getElementById('petGrid');
  const message = grid.querySelector('.no-pets-message');
  if (message) message.remove();

  if (visibleCount === 0 && cards.length > 0) {
    const noPetsMsg = document.createElement('div');
    noPetsMsg.className = 'no-pets-message';
    const categoryName = filterValue === 'dog' ? 'dogs' : filterValue === 'cat' ? 'cats' : 'pets';
    noPetsMsg.innerHTML = `<p>No ${categoryName} available right now. Check back soon!</p>`;
    grid.appendChild(noPetsMsg);
  }
}

// ────────────────────────────────────────────────
// Carousel logic
// ────────────────────────────────────────────────

let slides = [];
let dots = [];
let currentSlide = 0;
let carouselInterval = null;

function initCarousel() {
  slides = Array.from(document.querySelectorAll('.hero-slide'));
  dots   = Array.from(document.querySelectorAll('.carousel-dot'));

  if (!slides.length) return;

  // Dot navigation
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      showSlide(i);
      clearInterval(carouselInterval);
      carouselInterval = setInterval(nextSlide, 5000);
    });
  });

  // Arrow navigation
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);

  // Pause carousel on hover
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.addEventListener('mouseenter', () => clearInterval(carouselInterval));
    hero.addEventListener('mouseleave', () => {
      carouselInterval = setInterval(nextSlide, 5000);
    });
  }

  // Start
  showSlide(0);
  carouselInterval = setInterval(nextSlide, 5000);
}

function showSlide(n) {
  currentSlide = (n + slides.length) % slides.length;
  slides.forEach((slide, i) => slide.classList.toggle('active', i === currentSlide));
  dots.forEach((dot,  i) => dot.classList.toggle('active',  i === currentSlide));
}

function nextSlide() { showSlide(currentSlide + 1); }
function prevSlide() { showSlide(currentSlide - 1); }

// ────────────────────────────────────────────────
// Utility functions
// ────────────────────────────────────────────────

window.scrollToTop = function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.scrollToPets = function() {
  const petsSection = document.getElementById('pets');
  if (petsSection) {
    petsSection.scrollIntoView({ behavior: 'smooth' });
  }
};

window.scrollToMission = function() {
  const missionSection = document.getElementById('mission');
  if (missionSection) {
    missionSection.scrollIntoView({ behavior: 'smooth' });
  }
};

window.showPetDetails = function(petId, name) {
  window.location.href = `petprofile.html?petId=${encodeURIComponent(petId)}`;
};

window.adoptPet = function(petId, name) {
  window.location.href = `petprofile.html?petId=${encodeURIComponent(petId)}`;
};

window.showAlert = function(section) {
  alert(`${section} page coming soon!`);
};

// ────────────────────────────────────────────────
// Contact Modal functions
// ────────────────────────────────────────────────

const CONTACT_FORM_HTML = `
  <p class="contact-intro">Have a question or want to learn more? We would love to hear from you!</p>
  <div class="contact-info-grid">
    <div class="contact-info-item">
      <span class="contact-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
      </span>
      <div><strong>Email</strong><p>fureverhome@gmail.com</p></div>
    </div>
    <div class="contact-info-item">
      <span class="contact-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
      </span>
      <div><strong>Phone</strong><p>+63 912 345 6789</p></div>
    </div>
    <div class="contact-info-item">
      <span class="contact-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </span>
      <div><strong>Location</strong><p>Cebu, Philippines</p></div>
    </div>
    <div class="contact-info-item">
      <span class="contact-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </span>
      <div><strong>Hours</strong><p>Mon–Sat, 9AM – 5PM</p></div>
    </div>
  </div>
  <form class="contact-form" onsubmit="submitContactForm(event)">
    <div class="contact-form-row">
      <input type="text" id="contactName" placeholder="Your Name" required />
      <input type="email" id="contactEmail" placeholder="Your Email" required />
    </div>
    <input type="text" id="contactSubject" placeholder="Subject" required />
    <textarea id="contactMessage" placeholder="Your message..." rows="4" required></textarea>
    <button type="submit" class="contact-submit-btn">Send Message</button>
  </form>
`;

window.showContactModal = function() {
  const modal = document.getElementById('contactModal');
  if (!modal) return;
  // Always restore the form before showing
  const body = modal.querySelector('.contact-modal-body');
  if (body) body.innerHTML = CONTACT_FORM_HTML;
  modal.classList.add('show');
};

window.closeContactModal = function() {
  const modal = document.getElementById('contactModal');
  if (modal) modal.classList.remove('show');
};

window.submitContactForm = function(e) {
  e.preventDefault();
  const name    = document.getElementById('contactName').value.trim();
  const email   = document.getElementById('contactEmail').value.trim();
  const subject = document.getElementById('contactSubject').value.trim();
  const message = document.getElementById('contactMessage').value.trim();

  if (!name || !email || !subject || !message) return;

  const body = document.querySelector('.contact-modal-body');
  if (body) {
    body.innerHTML = `
      <div class="contact-success">
        <div class="contact-success-icon">✅</div>
        <h3>Message Sent!</h3>
        <p>Thank you, <strong>${name}</strong>! We received your message and will reply to <strong>${email}</strong> within 1–2 business days.</p>
        <button class="contact-submit-btn" onclick="closeContactModal()" style="margin-top:1rem;">Close</button>
      </div>
    `;
  }
};

// ────────────────────────────────────────────────
// Profile menu logic
// ────────────────────────────────────────────────

function showProfileMenu(user) {
  const signinBtn = document.getElementById('signinBtn');
  const container = document.getElementById('profileMenuContainer');

  if (signinBtn) signinBtn.classList.add('hidden');
  if (container) container.classList.remove('hidden');

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const firstName = displayName.split(' ')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const nameEl    = document.getElementById('userName');
  const emailEl   = document.getElementById('userEmail');
  const profName  = document.getElementById('profileName');
  const avatarEl  = document.getElementById('profileAvatar');

  if (nameEl)    nameEl.textContent   = displayName;
  if (emailEl)   emailEl.textContent  = user.email || '';
  if (profName)  profName.textContent = firstName;
  if (avatarEl)  avatarEl.textContent = initials;
}

function showSignInButton() {
  const signinBtn = document.getElementById('signinBtn');
  const container = document.getElementById('profileMenuContainer');

  if (signinBtn) signinBtn.classList.remove('hidden');
  if (container) container.classList.add('hidden');
}

window.toggleProfileMenu = function(e) {
  e?.stopPropagation();
  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
};

document.addEventListener('click', (e) => {
  const container = document.getElementById('profileMenuContainer');
  const dropdown = document.getElementById('profileDropdown');
  
  if (container && !container.contains(e.target)) {
    dropdown?.classList.remove('show');
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

// ────────────────────────────────────────────────
// Logout functions
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
// Page initialization
// ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  console.log("Initializing homepage...");

  // Initialize Firebase
  if (!initFirebase()) {
    const grid = document.getElementById('petGrid');
    if (grid) {
      grid.innerHTML = '<div class="no-pets-message"><p>Service unavailable. Please check your Firebase configuration.</p></div>';
    }
    showSignInButton();
    return;
  }

  // Monitor authentication state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User is signed in:", user.email);
      showProfileMenu(user);
      showNotifBell(true);
      loadBadgeCount();
    } else {
      console.log("No user signed in");
      showSignInButton();
      showNotifBell(false);
    }
  });

  // Load pets from Firestore
  loadPets();

  // Initialize carousel
  initCarousel();

  // Setup filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active state
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      
      // Apply filter
      filterPets(btn.dataset.filter);
    });
  });

  console.log("Homepage initialized successfully");
});
// ────────────────────────────────────────────────
// GCash Donation Modal
// ────────────────────────────────────────────────

window.showDonateModal = function() {
  const modal = document.getElementById('donateModal');
  if (modal) {
    modal.style.display = 'flex';
    // Close profile dropdown
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

// Close donate modal on backdrop click
document.addEventListener('click', function(e) {
  const modal = document.getElementById('donateModal');
  if (modal && e.target === modal) {
    closeDonateModal();
  }
});

// ────────────────────────────────────────────────
// Adoption Notification Bell
// ────────────────────────────────────────────────

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

async function loadAdoptionNotifications() {
  const list = document.getElementById('adoptionNotifList');
  const sub  = document.getElementById('adoptionNotifSub');
  const badge = document.getElementById('notifBadge');
  if (!list) return;

  list.innerHTML = '<p class="adoption-notif-empty">Loading...</p>';

  try {
    if (!initFirebase()) throw new Error('Firebase not ready');
    const user = auth.currentUser;
    if (!user) {
      list.innerHTML = '<p class="adoption-notif-empty">Please sign in to see notifications.</p>';
      return;
    }

    // Try both collections and both possible userId field names
    const uid = user.uid;
    const collections = ['adoptionApplications', 'adoptionRequests'];
    const userFields  = ['userId', 'uid', 'userUID'];

    let docs = [];

    for (const col of collections) {
      for (const field of userFields) {
        try {
          const q = query(collection(db, col), where(field, '==', uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            snap.docs.forEach(d => {
              // avoid duplicates
              if (!docs.find(x => x.id === d.id)) {
                docs.push({ id: d.id, _col: col, ...d.data() });
              }
            });
          }
        } catch(_) {}
      }
    }

    // Also try querying by email as fallback
    if (docs.length === 0 && user.email) {
      for (const col of collections) {
        try {
          const q = query(collection(db, col), where('email', '==', user.email));
          const snap = await getDocs(q);
          snap.docs.forEach(d => {
            if (!docs.find(x => x.id === d.id)) {
              docs.push({ id: d.id, _col: col, ...d.data() });
            }
          });
        } catch(_) {}
      }
    }

    if (docs.length === 0) {
      sub.textContent = 'You have no adoption requests.';
      list.innerHTML = '<p class="adoption-notif-empty">No requests yet. 🐾</p>';
      if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }
      return;
    }

    const approvedCount = docs.filter(d => (d.status || '').toLowerCase() === 'approved').length;
    sub.textContent = `You have ${docs.length} adoption request${docs.length !== 1 ? 's' : ''}.`;

    const badgeNum = approvedCount || docs.length;
    if (badge) {
      badge.textContent = badgeNum;
      badge.style.display = badgeNum > 0 ? 'flex' : 'none';
    }

    const svgPaw = `<svg width="22" height="22" viewBox="0 0 48.839 48.839" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M39.041,36.843c2.054,3.234,3.022,4.951,3.022,6.742c0,3.537-2.627,5.252-6.166,5.252c-1.56,0-2.567-0.002-5.112-1.326c0,0-1.649-1.509-5.508-1.354c-3.895-0.154-5.545,1.373-5.545,1.373c-2.545,1.323-3.516,1.309-5.074,1.309c-3.539,0-6.168-1.713-6.168-5.252c0-1.791,0.971-3.506,3.024-6.742c0,0,3.881-6.445,7.244-9.477c2.43-2.188,5.973-2.18,5.973-2.18h1.093v-0.001c0,0,3.698-0.009,5.976,2.181C35.059,30.51,39.041,36.844,39.041,36.843z M16.631,20.878c3.7,0,6.699-4.674,6.699-10.439S20.331,0,16.631,0S9.932,4.674,9.932,10.439S12.931,20.878,16.631,20.878z M10.211,30.988c2.727-1.259,3.349-5.723,1.388-9.971s-5.761-6.672-8.488-5.414s-3.348,5.723-1.388,9.971C3.684,29.822,7.484,32.245,10.211,30.988z M32.206,20.878c3.7,0,6.7-4.674,6.7-10.439S35.906,0,32.206,0s-6.699,4.674-6.699,10.439C25.507,16.204,28.506,20.878,32.206,20.878z M45.727,15.602c-2.728-1.259-6.527,1.165-8.488,5.414s-1.339,8.713,1.389,9.972c2.728,1.258,6.527-1.166,8.488-5.414S48.455,16.861,45.727,15.602z"/></svg>`;

    const svgApproved = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>`;

    const svgPending = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>`;

    const svgRejected = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;

    list.innerHTML = docs.map(req => {
      const status = (req.status || 'pending').toLowerCase();
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      const statusIcon = status === 'approved' ? svgApproved : status === 'rejected' ? svgRejected : svgPending;
      const dateStr = req.createdAt?.toDate
        ? req.createdAt.toDate().toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' })
        : (req.submittedAt || req.date || 'Unknown date');
      const petLabel = req.petName || req.name || 'Pet';
      return `
        <div class="adoption-notif-item">
          <div class="adoption-notif-paw">${svgPaw}</div>
          <div class="adoption-notif-info">
            <div class="adoption-notif-pet">${petLabel}</div>
            <div class="adoption-notif-date">Submitted: ${dateStr}</div>
          </div>
          <div class="adoption-notif-status ${status}">
            ${statusIcon} ${statusLabel}
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('Notification load error:', err);
    list.innerHTML = '<p class="adoption-notif-empty">Could not load notifications.</p>';
  }
}

// Show bell when user logs in
function showNotifBell(show) {
  const container = document.getElementById('notificationBellContainer');
  if (container) container.style.display = show ? 'flex' : 'none';
}

// Close notif modal on backdrop click
document.addEventListener('click', function(e) {
  const modal = document.getElementById('adoptionNotifModal');
  if (modal && e.target === modal) closeAdoptionNotif();
});

// Notification bell auth is handled in the main onAuthStateChanged below

async function loadBadgeCount() {
  try {
    if (!initFirebase() || !auth.currentUser) return;
    const badge = document.getElementById('notifBadge');
    const uid = auth.currentUser.uid;
    const email = auth.currentUser.email;
    const collections = ['adoptionApplications', 'adoptionRequests'];
    const userFields  = ['userId', 'uid', 'userUID'];

    let allDocs = [];
    for (const col of collections) {
      for (const field of userFields) {
        try {
          const snap = await getDocs(query(collection(db, col), where(field, '==', uid)));
          snap.docs.forEach(d => {
            if (!allDocs.find(x => x.id === d.id)) allDocs.push({ id: d.id, ...d.data() });
          });
        } catch(_) {}
      }
    }
    // fallback: email
    if (allDocs.length === 0 && email) {
      for (const col of collections) {
        try {
          const snap = await getDocs(query(collection(db, col), where('email', '==', email)));
          snap.docs.forEach(d => {
            if (!allDocs.find(x => x.id === d.id)) allDocs.push({ id: d.id, ...d.data() });
          });
        } catch(_) {}
      }
    }

    const approved = allDocs.filter(d => (d.status || '').toLowerCase() === 'approved').length;
    const count = allDocs.length > 0 ? (approved || allDocs.length) : 0;
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  } catch(e) { console.error(e); }
}