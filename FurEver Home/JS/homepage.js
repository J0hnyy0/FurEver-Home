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
  orderBy,
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
// Pet category from breed
// ────────────────────────────────────────────────

function getPetCategory(breed) {
  if (!breed) return 'all';
  const lower = breed.toLowerCase().trim();

const dogWords = [
  'dog', 'puppy', 'labrador', 'retriever', 'golden', 'german shepherd', 
  'husky', 'rottweiler', 'doberman', 'poodle', 'bulldog', 'beagle', 
  'dachshund', 'boxer', 'dalmatian', 'spaniel', 'pomeranian', 'terrier', 
  'yorkshire', 'maltese', 'shih tzu', 'pug', 'corgi', 'shepherd', 
  'great dane', 'mastiff', 'collie', 'schnauzer', 'samoyed', 'shiba', 
  'german', 'aspin', 'mixed','affenpinscher', 'akita', 'american bulldog',
  'australian shepherd','bernese mountain dog', 'chihuahua'
];

const catWords = [
  'cat', 'kitten', 'persian', 'siamese', 'tabby', 'ragdoll', 
  'maine coon', 'bengal', 'sphynx', 'burmese', 'birman', 'abyssinian', 
  'tonkinese', 'calico', 'angora', 'balinese', 'himalayan', 
  'scottish fold', 'devon rex', 'domestic shorthair', 
  'domestic longhair', 'puspin', 'mixed',
  'exotic shorthair', 'chinchilla', 'siberian'
];

  if (dogWords.some(w => lower.includes(w))) return 'dog';
  if (catWords.some(c => lower.includes(c))) return 'cat';
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
// Load approved pets from Firestore
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
    // Query Firestore for approved pets only (not adopted), ordered by creation date
    const petsQuery = query(
      collection(db, "pets"),
      where("status", "==", "approved"),
      orderBy("created_at", "desc")
    );

    const petsSnapshot = await getDocs(petsQuery);
    
    grid.innerHTML = '';

    if (petsSnapshot.empty) {
      grid.innerHTML = '<div class="no-pets-message"><p>No pets available for adoption at the moment. Check back soon!</p></div>';
      return;
    }

    // Convert snapshot to array of pet objects
    const pets = petsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    // Shuffle pets for variety
    const shuffled = shuffleArray(pets);

    // Create pet cards
    shuffled.forEach(pet => {
      const card = document.createElement('div');
      card.className = 'pet-card';
      card.dataset.category = getPetCategory(pet.breed || '');
      card.onclick = () => showPetDetails(pet.name || 'Pet');

      card.innerHTML = `
        <img src="${pet.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}" 
             alt="${pet.name || 'Pet'}"
             onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
        <div class="pet-info">
          <h4>${pet.name || 'Unnamed'}</h4>
          <p>${pet.age ?? '?'} years · ${pet.breed || 'Unknown'}</p>
          <button onclick="event.stopPropagation(); adoptPet('${pet.name || 'Me'}')">
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

const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.carousel-dot');
let currentSlide = 0;

function showSlide(n) {
  currentSlide = (n + slides.length) % slides.length;

  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === currentSlide);
  });

  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentSlide);
  });
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function prevSlide() {
  showSlide(currentSlide - 1);
}

let carouselInterval = setInterval(nextSlide, 5000);

// Pause carousel on hover
const hero = document.querySelector('.hero');
if (hero) {
  hero.addEventListener('mouseenter', () => {
    clearInterval(carouselInterval);
  });
  
  hero.addEventListener('mouseleave', () => {
    carouselInterval = setInterval(nextSlide, 5000);
  });
}

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

// Initialize carousel
showSlide(0);

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

window.showPetDetails = function(name) {
  alert(`Viewing details for ${name} – full page coming soon!`);
};

window.adoptPet = function(name) {
  window.location.href = `petprofile.html?pet=${encodeURIComponent(name)}`;
};

window.showAlert = function(section) {
  alert(`${section} page coming soon!`);
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
  e?.stopPropagation();  // Prevent immediate close from document click
  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
    console.log('Dropdown toggled:', dropdown.classList.contains('show'));
  }
};

document.addEventListener('click', (e) => {
  const container = document.getElementById('profileMenuContainer');
  const dropdown = document.getElementById('profileDropdown');
  
  // Close only if the click is outside the entire container
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
    } else {
      console.log("No user signed in");
      showSignInButton();
    }
  });

  // Load pets from Firestore
  loadPets();

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