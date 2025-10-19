const API_BASE = "/api"; // Backend server URL (proxied through Netlify)

// ——— helpers ———
const saveAccess = (jwt) => localStorage.setItem("tbs_at", jwt);
const getAccess = () => localStorage.getItem("tbs_at");
const clearAccess = () => localStorage.removeItem("tbs_at");

// ——— fetch wrapper with refresh retry ———
async function api(path, opts = {}) {
  const token = getAccess();
  const headers = { ...(opts.headers||{}) };
  if ((opts.body && !(opts.body instanceof FormData)) || headers["Content-Type"]) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include", ...opts, headers });
  if (res.status === 401 && path !== "/auth/refresh") {
    const rr = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
    if (rr.ok) {
      const { accessToken } = await rr.json();
      if (accessToken) saveAccess(accessToken);
      return api(path, opts);
    } else {
      clearAccess();
      if (!location.pathname.endsWith("/login.html")) location.href = "/portal/login.html";
      throw new Error("Unauthorized");
    }
  }
  return res;
}

// ——— login page ———
if (location.pathname.endsWith("/login.html")) {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("loginMsg");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Signing in…";
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) { msg.textContent = data.error || "Login failed"; return; }
    saveAccess(data.accessToken);
    location.href = "/portal/dashboard.html";
  });
}

// ——— active link highlighting ———
(function setActive() {
  const map = {
    "/portal/dashboard.html": "dashboard",
    "/portal/staff.html": "staff",
    "/portal/contractors.html": "contractors",
    "/portal/calendar.html": "calendar",
    "/portal/projects.html": "projects",
    "/portal/warehouse.html": "warehouse",
    "/portal/finance.html": "finance"
  };
  const key = map[location.pathname];
  if (key) {
    const link = document.querySelector(`a[data-nav="${key}"]`);
    if (link) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  }
})();

// ——— auth guard for all portal pages ———
if (location.pathname.includes("/portal/") && !location.pathname.endsWith("/login.html")) {
  (async () => {
    try {
      const res = await api("/me");
      if (!res.ok) {
        location.href = "/portal/login.html";
        return;
      }
      // User is authenticated, continue loading the page
    } catch (err) {
      console.error("Auth check failed:", err);
      location.href = "/portal/login.html";
    }
  })();
}

// ——— simple config for location (PC-first; can make user-editable later) ———
const LOCATION = {
  name: "Norfolk, UK",
  lat: 52.6309,
  lon: 1.2974,
};

// ——— dashboard ———
if (location.pathname.endsWith("/dashboard.html")) {
  const who = document.getElementById("whoami");
  const greetingEl = document.getElementById("greeting");
  const datetimeEl = document.getElementById("datetime");
  const locationEl = document.getElementById("location");
  const wTempEl = document.getElementById("weatherTemp");
  const wCondEl = document.getElementById("weatherCond");
  const wWarnEl = document.getElementById("weatherWarn");

  // role-gated UI
  const toggleByRole = (role) => {
    const show = (cls) => document.querySelectorAll(`.${cls}`).forEach(el => el.hidden = false);
    if (["admin"].includes(role)) { show("only-admin"); show("only-worker"); show("only-foreman"); show("only-contractor"); }
    if (["foreman"].includes(role)) { show("only-foreman"); show("only-worker"); }
    if (["worker"].includes(role)) { show("only-worker"); }
    if (["contractor"].includes(role)) { show("only-contractor"); }
  };

  // clock + greeting
  function updateClock(name = "there") {
    const now = new Date();
    const hour = now.getHours();
    const greet =
      hour < 12 ? "Good morning" :
      hour < 18 ? "Good afternoon" : "Good evening";
    greetingEl.textContent = `${greet}, ${name}`;
    datetimeEl.textContent = new Intl.DateTimeFormat(undefined, {
      weekday:"short", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"
    }).format(now);
  }

  // weather mapping (Open-Meteo weather_code → text)
  const codeMap = {
    0:"Clear", 1:"Mostly clear", 2:"Partly cloudy", 3:"Overcast",
    45:"Fog", 48:"Depositing rime fog",
    51:"Light drizzle", 53:"Drizzle", 55:"Heavy drizzle",
    56:"Freezing drizzle", 57:"Freezing drizzle",
    61:"Light rain", 63:"Rain", 65:"Heavy rain",
    66:"Freezing rain", 67:"Freezing rain",
    71:"Light snow", 73:"Snow", 75:"Heavy snow",
    77:"Snow grains",
    80:"Rain showers", 81:"Heavy showers", 82:"Violent showers",
    85:"Snow showers", 86:"Heavy snow showers",
    95:"Thunderstorm", 96:"Thunderstorm w/ hail", 99:"Thunderstorm w/ heavy hail"
  };

  async function fetchWeather({ lat, lon, name }) {
    locationEl.textContent = name;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather API returned ${res.status}`);
      const j = await res.json();
      
      if (!j.current) throw new Error("Invalid weather data received");

    // current
    const cur = j.current || {};
    const temp = Math.round(cur.temperature_2m);
    const cond = codeMap[cur.weather_code] || "—";
    const wind = cur.wind_speed_10m ?? 0;
    wTempEl.textContent = `${temp}°C`;
    wCondEl.textContent = cond;

    // simple warning heuristics for "bad weather today"
    const daily = j.daily || {};
    const pSum = Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum[0] : 0;
    const tMax = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : 99;
    const tMin = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : -99;

    const bad =
      (pSum >= 5) ||    // ≥ 5 mm rain today
      (wind >= 12) ||   // ≥ 12 m/s (~27 mph)
      (tMin <= 0) || (tMax >= 30);

    wWarnEl.hidden = !bad;
    
    } catch (error) {
      console.warn("Weather fetch failed:", error);
      throw error; // Re-throw to be caught by the caller
    }
  }

  (async () => {
    try {
      const res = await api("/me");
      if (res.ok) {
        const me = await res.json();
        who.textContent = `${me.name} (${me.role})`;
        toggleByRole(me.role);
        updateClock(me.name);
        setInterval(() => updateClock(me.name), 30 * 1000); // update every 30s
      } else {
        // Fallback to mock user data
        const mockUser = { name: "Danny Tighe", role: "admin" };
        who.textContent = `${mockUser.name} (${mockUser.role})`;
        toggleByRole(mockUser.role);
        updateClock(mockUser.name);
        setInterval(() => updateClock(mockUser.name), 30 * 1000);
      }
    } catch (err) {
      console.warn("User API failed, using fallback:", err);
      // Fallback to mock user data
      const mockUser = { name: "Danny Tighe", role: "admin" };
      who.textContent = `${mockUser.name} (${mockUser.role})`;
      toggleByRole(mockUser.role);
      updateClock(mockUser.name);
      setInterval(() => updateClock(mockUser.name), 30 * 1000);
    }

    // Try weather with fallback
    try {
      await fetchWeather(LOCATION);
    } catch (err) {
      console.warn("Weather API failed, using fallback:", err);
      // Fallback weather data
      locationEl.textContent = LOCATION.name;
      wTempEl.textContent = "15°C";
      wCondEl.textContent = "Partly cloudy";
      wWarnEl.hidden = true;
    }
  })();
}

// ——— projects page ———
if (location.pathname.endsWith("/projects.html")) {
  const toggleByRole = (role) => {
    const show = (cls) => document.querySelectorAll(`.${cls}`).forEach(el => el.hidden = false);
    if (["admin"].includes(role)) { show("only-admin"); }
  };

  (async () => {
    try {
      const res = await api("/me");
      const me = await res.json();
      toggleByRole(me.role);

      // Projects page functionality
      if (location.pathname.includes('/projects.html')) {
        // Project card action handlers
        window.viewProjectDetails = (projectId) => {
          console.log(`Viewing details for project ${projectId}`);
          // TODO: Implement project details modal or page
          alert(`Viewing details for project ${projectId}`);
        };

        window.viewProjectSchedule = (projectId) => {
          console.log(`Viewing schedule for project ${projectId}`);
          // TODO: Navigate to calendar with project filter
          sessionStorage.setItem('calendarFilter', JSON.stringify({ projectId }));
          location.href = "/portal/calendar.html";
        };

        window.viewProjectPhotos = (projectId) => {
          console.log(`Viewing photos for project ${projectId}`);
          // TODO: Implement photo gallery
          alert(`Photo gallery for project ${projectId} - Coming soon!`);
        };
      }

      // Contractors page functionality
      if (location.pathname.includes('/contractors.html')) {
        // Contractor card action handlers
        window.viewContractorSchedule = (contractorId) => {
          console.log(`Viewing schedule for contractor ${contractorId}`);
          // TODO: Navigate to calendar with contractor filter
          sessionStorage.setItem('calendarFilter', JSON.stringify({ contractorId }));
          location.href = "/portal/calendar.html";
        };

        window.viewContractorProjects = (contractorId) => {
          console.log(`Viewing projects for contractor ${contractorId}`);
          // TODO: Navigate to projects with contractor filter
          sessionStorage.setItem('projectFilter', JSON.stringify({ contractorId }));
          location.href = "/portal/projects.html";
        };

        window.viewContractorInvoices = (contractorId) => {
          console.log(`Viewing invoices for contractor ${contractorId}`);
          // TODO: Navigate to finance with contractor filter
          sessionStorage.setItem('financeFilter', JSON.stringify({ contractorId }));
          location.href = "/portal/finance.html";
        };

        // Quick action handlers
        window.addNewContractor = () => {
          alert("Add Contractor functionality - Coming soon!");
        };

        window.viewAllSchedules = () => {
          // Navigate to calendar without filters
          sessionStorage.removeItem('calendarFilter');
          location.href = "/portal/calendar.html";
        };

        window.generateInvoices = () => {
          alert("Generate Invoices functionality - Coming soon!");
        };

        window.exportContractorData = () => {
          alert("Export Contractor Data functionality - Coming soon!");
        };
      }

      // Warehouse page functionality
      if (location.pathname.includes('/warehouse.html')) {
        // Location management handlers
        window.viewLocationInventory = (locationType) => {
          console.log(`Viewing inventory for ${locationType} location`);
          alert(`Viewing inventory for ${locationType} location - Coming soon!`);
        };

        window.manageLocation = (locationType) => {
          console.log(`Managing ${locationType} location`);
          alert(`Managing ${locationType} location - Coming soon!`);
        };

        // Quick action handlers
        window.addNewItem = () => {
          alert("Add New Item functionality - Coming soon!");
        };

        window.transferItems = () => {
          alert("Transfer Items functionality - Coming soon!");
        };

        window.generateReport = () => {
          alert("Generate Report functionality - Coming soon!");
        };

        window.exportInventory = () => {
          alert("Export Inventory functionality - Coming soon!");
        };

        // Phantom stock handlers
        window.editStockItem = (itemType) => {
          console.log(`Editing stock item: ${itemType}`);
          alert(`Edit ${itemType} functionality - Coming soon!`);
        };
      }
    } catch (err) {
      console.error(err);
    }
  })();
}

// ——— burger menu functionality ———
if (location.pathname.includes("/portal/") && !location.pathname.endsWith("/login.html")) {
  const burgerMenu = document.getElementById("burgerMenu");
  const sidebar = document.querySelector(".sidebar");
  
  burgerMenu?.addEventListener("click", () => {
    burgerMenu.classList.toggle("active");
    sidebar?.classList.toggle("open");
  });
  
  // Close sidebar when clicking on a navigation link (mobile)
  const navLinks = document.querySelectorAll(".sidebar a");
  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        burgerMenu?.classList.remove("active");
        sidebar?.classList.remove("open");
      }
    });
  });
  
  // Close sidebar when clicking outside (mobile)
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768 && 
        !sidebar?.contains(e.target) && 
        !burgerMenu?.contains(e.target) &&
        sidebar?.classList.contains("open")) {
      burgerMenu?.classList.remove("active");
      sidebar?.classList.remove("open");
    }
  });
}

// ——— logout handler removed - logout buttons removed from all portal pages ———

// ——— staff page ———
if (location.pathname.endsWith("/staff.html")) {
  // Staff management functions
  window.viewSchedule = (userId) => {
    // Navigate to calendar with user filter
    const user = getStaffMember(userId);
    sessionStorage.setItem('calendarFilter', JSON.stringify({ userId, userName: user.name }));
    location.href = "/portal/calendar.html";
  };

  window.viewPayroll = (userId) => {
    // Navigate to finance with user filter
    const user = getStaffMember(userId);
    sessionStorage.setItem('payrollFilter', JSON.stringify({ userId, userName: user.name }));
    location.href = "/portal/finance.html";
  };

  window.viewTasks = (userId) => {
    // Navigate to projects with user filter
    const user = getStaffMember(userId);
    sessionStorage.setItem('projectFilter', JSON.stringify({ userId, userName: user.name }));
    location.href = "/portal/projects.html";
  };

  window.addNewStaff = () => {
    // Close dropdown and open add staff modal
    closeStaffDropdown();
    document.getElementById('addStaffModal').style.display = 'flex';
  };

  window.toggleStaffDropdown = () => {
    const dropdown = document.getElementById('staffDropdown');
    const btn = document.querySelector('.staff-management-btn');
    
    if (dropdown.classList.contains('open')) {
      closeStaffDropdown();
    } else {
      openStaffDropdown();
    }
  };

  window.openStaffDropdown = () => {
    const dropdown = document.getElementById('staffDropdown');
    const btn = document.querySelector('.staff-management-btn');
    
    dropdown.classList.add('open');
    btn.classList.add('active');
    
    // Populate staff list
    populateStaffDropdown();
  };

  window.closeStaffDropdown = () => {
    const dropdown = document.getElementById('staffDropdown');
    const btn = document.querySelector('.staff-management-btn');
    
    dropdown.classList.remove('open');
    btn.classList.remove('active');
  };

  window.populateStaffDropdown = () => {
    const staffList = document.getElementById('staffList');
    const staffCards = document.querySelectorAll('.staff-card');
    
    staffList.innerHTML = '';
    
    staffCards.forEach(card => {
      const userId = card.getAttribute('data-user-id');
      const role = card.getAttribute('data-role');
      const name = card.querySelector('.staff-name').textContent;
      const position = card.querySelector('.staff-position').textContent;
      const email = card.querySelector('.staff-email').textContent;
      
      const staffItem = document.createElement('div');
      staffItem.className = 'staff-item';
      staffItem.innerHTML = `
        <div class="staff-item-info">
          <div class="staff-item-avatar">${name.charAt(0)}</div>
          <div class="staff-item-details">
            <h5>${name}</h5>
            <p>${position} • ${email}</p>
          </div>
        </div>
        <div class="staff-item-actions">
          <span class="staff-item-role ${role}">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
          <button class="staff-item-btn danger" onclick="removeStaffFromDropdown(${userId}, '${name}')">Remove</button>
        </div>
      `;
      
      staffList.appendChild(staffItem);
    });
  };

  window.removeStaffFromDropdown = (userId, userName) => {
    // Store the user ID for removal
    window.staffToRemove = userId;
    document.getElementById('removeStaffName').textContent = userName;
    document.getElementById('removeStaffModal').style.display = 'flex';
  };

  window.closeAddStaffModal = () => {
    document.getElementById('addStaffModal').style.display = 'none';
    document.getElementById('addStaffForm').reset();
  };

  window.removeStaff = (userId, userName) => {
    // Store the user ID for removal
    window.staffToRemove = userId;
    document.getElementById('removeStaffName').textContent = userName;
    document.getElementById('removeStaffModal').style.display = 'flex';
  };

  window.closeRemoveStaffModal = () => {
    document.getElementById('removeStaffModal').style.display = 'none';
    window.staffToRemove = null;
  };

  window.confirmRemoveStaff = async () => {
    if (!window.staffToRemove) return;
    
    try {
      // Call API to remove staff member
      const res = await api(`/staff/${window.staffToRemove}`, { method: 'DELETE' });
      
      if (res.ok) {
        // Remove the staff card from the UI
        const staffCard = document.querySelector(`[data-user-id="${window.staffToRemove}"]`);
        if (staffCard) {
          staffCard.remove();
        }
        
        // Show success message
        alert('Staff member removed successfully!');
        closeRemoveStaffModal();
      } else {
        const error = await res.json().catch(() => ({}));
        alert(`Error removing staff: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error removing staff:', err);
      alert('Error removing staff member. Please try again.');
    }
  };

  // Add staff form submission handler
  document.addEventListener('DOMContentLoaded', () => {
    const addStaffForm = document.getElementById('addStaffForm');
    if (addStaffForm) {
      addStaffForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(addStaffForm);
        const staffData = {
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          role: formData.get('role'),
          position: formData.get('position'),
          password: formData.get('password')
        };
        
        try {
          const res = await api('/staff', {
            method: 'POST',
            body: JSON.stringify(staffData)
          });
          
          if (res.ok) {
            const newStaff = await res.json();
            
            // Add new staff card to the UI
            addStaffCardToUI(newStaff);
            
            // Show success message and close modal
            alert('Staff member added successfully!');
            closeAddStaffModal();
          } else {
            const error = await res.json().catch(() => ({}));
            alert(`Error adding staff: ${error.error || 'Unknown error'}`);
          }
        } catch (err) {
          console.error('Error adding staff:', err);
          alert('Error adding staff member. Please try again.');
        }
      });
    }
  });

  // Function to add new staff card to UI
  window.addStaffCardToUI = (staff) => {
    const staffGrid = document.querySelector('.staff-grid');
    if (!staffGrid) return;
    
    const staffCard = document.createElement('div');
    staffCard.className = 'staff-card';
    staffCard.setAttribute('data-user-id', staff.id);
    staffCard.setAttribute('data-role', staff.role);
    
    const roleClass = staff.role === 'admin' ? 'admin' : 
                     staff.role === 'foreman' ? 'foreman' : 
                     staff.role === 'worker' ? 'worker' : 
                     staff.role === 'contractor' ? 'contractor' : 'labourer';
    
    staffCard.innerHTML = `
      <div class="staff-card-header">
        <span class="role-badge ${roleClass}">${staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}</span>
      </div>
      <div class="staff-avatar">
        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=4A90E2&color=fff&size=80" 
             alt="${staff.name}" class="profile-img">
      </div>
      <div class="staff-info">
        <h4 class="staff-name">${staff.name}</h4>
        <p class="staff-position">${staff.position}</p>
        <p class="staff-email">${staff.email}</p>
      </div>
      <div class="staff-actions">
        <button class="action-btn primary" onclick="viewSchedule(${staff.id})">Schedule</button>
        <button class="action-btn secondary" onclick="viewPayroll(${staff.id})">Payroll</button>
        <button class="action-btn secondary" onclick="viewTasks(${staff.id})">Tasks</button>
      </div>
    `;
    
    staffGrid.appendChild(staffCard);
  };

  window.viewAllSchedules = () => {
    // Navigate to calendar without filters
    sessionStorage.removeItem('calendarFilter');
    location.href = "/portal/calendar.html";
  };

  window.generatePayroll = () => {
    // Navigate to finance for payroll generation
    sessionStorage.setItem('payrollAction', 'generate');
    location.href = "/portal/finance.html";
  };

  window.exportStaffData = () => {
    // Export staff data functionality
    alert("Export Staff Data functionality - Coming soon!");
  };

  // Helper function to get staff member data
  function getStaffMember(userId) {
    const staffData = {
      1: { name: "Danny Tighe", role: "admin", position: "Managing Director" },
      2: { name: "Pat", role: "foreman", position: "Foreman" },
      3: { name: "Adam", role: "foreman", position: "Foreman" },
      4: { name: "Charlie", role: "worker", position: "Labourer" }
    };
    return staffData[userId] || { name: "Unknown", role: "unknown", position: "Unknown" };
  }

  // Load staff data from API (when available)
  (async () => {
    try {
      // Future: Load staff data from API
      // const res = await api("/staff");
      // const staff = await res.json();
      // populateStaffCards(staff);
    } catch (err) {
      console.error("Error loading staff data:", err);
    }
  })();
}

