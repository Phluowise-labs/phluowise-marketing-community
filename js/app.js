// Data Models
const DataModel = {
  users: 'phluowise_users',
  sessions: 'phluowise_sessions',
  referrals: 'phluowise_referrals',
  teams: 'phluowise_teams',
  transactions: 'phluowise_transactions',
  payments: 'phluowise_payments',
  userPayments: (userId) => `phluowise_user_${userId}_payments`
};

// Initialize data in localStorage if not exists
function initializeStorage() {
  const storageItems = [
    DataModel.users,
    DataModel.sessions,
    DataModel.referrals,
    DataModel.teams,
    DataModel.transactions,
    DataModel.payments
  ];

  storageItems.forEach(item => {
    if (!localStorage.getItem(item)) {
      localStorage.setItem(item, JSON.stringify([]));
    }
  });
}

// Authentication Functions
const Auth = {
  // Register a new user
  register: async (userData) => {
    const users = JSON.parse(localStorage.getItem(DataModel.users) || '[]');
    
    // Check if email already exists
    if (users.some(user => user.email === userData.email)) {
      throw new Error('Email already registered');
    }

    // Create new user
    const newUser = {
      id: generateId(),
      ...userData,
      balance: 0,
      totalEarned: 0,
      referralCount: 0,
      referralEarnings: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isVerified: false,
      referralCode: generateReferralCode(userData.firstName, userData.lastName),
      status: 'active',
      lastLogin: null,
      paymentMethods: []
    };
    
    // Process referral if referral code was provided
    if (userData.referralCode) {
      ReferralService.processReferralSignup(userData.referralCode, newUser.id);
    }

    users.push(newUser);
    localStorage.setItem(DataModel.users, JSON.stringify(users));
    
    return newUser;
  },

  // Login user
  login: async (email, password) => {
    const users = JSON.parse(localStorage.getItem(DataModel.users) || '[]');
    const user = users.find(u => u.email === email);
    
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password');
    }

    // Create session
    const session = {
      id: generateId(),
      userId: user.id,
      token: generateToken(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      createdAt: new Date().toISOString()
    };

    const sessions = JSON.parse(localStorage.getItem(DataModel.sessions) || '[]');
    sessions.push(session);
    localStorage.setItem(DataModel.sessions, JSON.stringify(sessions));

    // Store session in localStorage for auto-login
    localStorage.setItem('phluowise_auth_token', session.token);
    
    return { user, session };
  },

  // Get current user
  getCurrentUser: () => {
    const token = localStorage.getItem('phluowise_auth_token');
    if (!token) return null;

    const sessions = JSON.parse(localStorage.getItem(DataModel.sessions) || '[]');
    const session = sessions.find(s => s.token === token);
    
    if (!session || new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem('phluowise_auth_token');
      return null;
    }

    const users = JSON.parse(localStorage.getItem(DataModel.users) || '[]');
    return users.find(u => u.id === session.userId) || null;
  },

  // Logout user
  logout: () => {
    const token = localStorage.getItem('phluowise_auth_token');
    if (token) {
      const sessions = JSON.parse(localStorage.getItem(DataModel.sessions) || '[]');
      const updatedSessions = sessions.filter(s => s.token !== token);
      localStorage.setItem(DataModel.sessions, JSON.stringify(updatedSessions));
    }
    localStorage.removeItem('phluowise_auth_token');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!Auth.getCurrentUser();
  },
  
  // Update user data
  updateUser: (updatedUser) => {
    const users = JSON.parse(localStorage.getItem(DataModel.users) || '[]');
    const userIndex = users.findIndex(u => u.id === updatedUser.id);
    
    if (userIndex !== -1) {
      // Preserve existing data and update with new values
      const existingUser = users[userIndex];
      users[userIndex] = { ...existingUser, ...updatedUser, updatedAt: new Date().toISOString() };
      localStorage.setItem(DataModel.users, JSON.stringify(users));
      return true;
    }
    return false;
  }
};

// Referral Functions
const ReferralService = {
  // Create a new referral
  createReferral: (referralData) => {
    const referrals = JSON.parse(localStorage.getItem(DataModel.referrals) || '[]');
    const newReferral = {
      id: generateId(),
      ...referralData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    referrals.push(newReferral);
    localStorage.setItem(DataModel.referrals, JSON.stringify(referrals));
    return newReferral;
  },

  // Get referrals by user ID
  getUserReferrals: (userId) => {
    const referrals = JSON.parse(localStorage.getItem(DataModel.referrals) || '[]');
    return referrals.filter(r => r.userId === userId);
  },

  // Update referral status
  updateReferralStatus: (referralId, status) => {
    const referrals = JSON.parse(localStorage.getItem(DataModel.referrals) || '[]');
    const index = referrals.findIndex(r => r.id === referralId);
    
    if (index === -1) {
      throw new Error('Referral not found');
    }

    referrals[index] = {
      ...referrals[index],
      status,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(DataModel.referrals, JSON.stringify(referrals));
    return referrals[index];
  }
};

// Team Functions
const TeamService = {
  // Create a new team
  createTeam: (teamData) => {
    const teams = JSON.parse(localStorage.getItem(DataModel.teams) || '[]');
    const newTeam = {
      id: generateId(),
      ...teamData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    teams.push(newTeam);
    localStorage.setItem(DataModel.teams, JSON.stringify(teams));
    return newTeam;
  },

  // Add member to team
  addTeamMember: (teamId, userId, role = 'member') => {
    const teams = JSON.parse(localStorage.getItem(DataModel.teams) || '[]');
    const team = teams.find(t => t.id === teamId);
    
    if (!team) {
      throw new Error('Team not found');
    }

    if (!team.members) {
      team.members = [];
    }

    if (team.members.some(m => m.userId === userId)) {
      throw new Error('User is already a member of this team');
    }

    team.members.push({ userId, role, joinedAt: new Date().toISOString() });
    team.updatedAt = new Date().toISOString();
    
    localStorage.setItem(DataModel.teams, JSON.stringify(teams));
    return team;
  },

  // Get user's teams
  getUserTeams: (userId) => {
    const teams = JSON.parse(localStorage.getItem(DataModel.teams) || '[]');
    return teams.filter(team => 
      team.ownerId === userId || 
      (team.members && team.members.some(m => m.userId === userId))
    );
  }
};

// Transaction Functions
const TransactionService = {
  // Create a new transaction
  createTransaction: (transactionData) => {
    const transactions = JSON.parse(localStorage.getItem(DataModel.transactions) || '[]');
    const newTransaction = {
      id: generateId(),
      ...transactionData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    transactions.push(newTransaction);
    localStorage.setItem(DataModel.transactions, JSON.stringify(transactions));
    return newTransaction;
  },

  // Get user transactions
  getUserTransactions: (userId) => {
    const transactions = JSON.parse(localStorage.getItem(DataModel.transactions) || '[]');
    return transactions.filter(t => t.userId === userId);
  }
};

// Helper Functions
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function generateToken() {
  return Math.random().toString(36).substr(2);
}

function generateReferralCode(firstName, lastName) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Payment Service
const PaymentService = {
  // Record a new payment request
  recordPaymentRequest: (paymentData) => {
    const payments = JSON.parse(localStorage.getItem(DataModel.payments) || '[]');
    const newPayment = {
      id: `req_${generateId()}`,
      ...paymentData,
      type: 'payout_request',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    payments.push(newPayment);
    localStorage.setItem(DataModel.payments, JSON.stringify(payments));
    
    return newPayment;
  },
  
  // Get user's payment history
  getUserPayments: (userId) => {
    const payments = JSON.parse(localStorage.getItem(DataModel.payments) || '[]');
    return payments
      .filter(payment => payment.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  
  // Get total earnings (sum of all completed payment requests)
  getTotalEarnings: (userId) => {
    const payments = PaymentService.getUserPayments(userId);
    return payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  },
  
  // Get pending payment requests
  getPendingRequests: (userId) => {
    return PaymentService.getUserPayments(userId)
      .filter(p => p.status === 'pending' && p.type === 'payout_request');
  },
  
  // Update payment request status
  updatePaymentStatus: (paymentId, status, notes = '') => {
    const payments = JSON.parse(localStorage.getItem(DataModel.payments) || '[]');
    const paymentIndex = payments.findIndex(p => p.id === paymentId);
    
    if (paymentIndex === -1) {
      throw new Error('Payment request not found');
    }
    
    payments[paymentIndex] = {
      ...payments[paymentIndex],
      status,
      notes: notes || payments[paymentIndex].notes,
      updatedAt: new Date().toISOString(),
      processedAt: status === 'completed' ? new Date().toISOString() : payments[paymentIndex].processedAt
    };
    
    localStorage.setItem(DataModel.payments, JSON.stringify(payments));
    return payments[paymentIndex];
  },
  
  // Request a payout
  requestPayout: (userId, amount, paymentMethod, description = '') => {
    const user = Auth.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid payment amount');
    }
    
    // Create payment request
    const paymentRequest = PaymentService.recordPaymentRequest({
      userId,
      amount: numericAmount,
      paymentMethod: {
        type: paymentMethod.type, // e.g., 'mobile_money', 'bank_transfer'
        provider: paymentMethod.provider, // e.g., 'MTN', 'Airtel', 'Chase Bank'
        accountNumber: paymentMethod.accountNumber,
        accountName: paymentMethod.accountName,
        currency: paymentMethod.currency || 'USD'
      },
      description: description || `Payout request for $${numericAmount.toFixed(2)}`,
      reference: `PAY-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
    });
    
    return paymentRequest;
  },
  
  // Mark payment as completed
  markAsPaid: (paymentId, notes = '') => {
    return PaymentService.updatePaymentStatus(paymentId, 'completed', notes);
  },
  
  // Mark payment as failed
  markAsFailed: (paymentId, reason = '') => {
    return PaymentService.updatePaymentStatus(paymentId, 'failed', reason);
  },
  
  // Generate test payment requests
  generateTestPayments: (userId, count = 5) => {
    const statuses = ['completed', 'pending', 'failed'];
    const paymentMethods = [
      { type: 'mobile_money', provider: 'MTN', accountNumber: '2567**123456' },
      { type: 'mobile_money', provider: 'Airtel', accountNumber: '2567**654321' },
      { type: 'bank_transfer', provider: 'Chase Bank', accountNumber: '****4567' }
    ];
    
    const payments = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const status = statuses[Math.min(i, statuses.length - 1)]; // Ensure we get all statuses
      const amount = (Math.random() * 1000 + 50).toFixed(2);
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date(now);
      createdAt.setDate(now.getDate() - daysAgo);
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      payments.push({
        id: `test_${i}_${Date.now()}`,
        userId,
        type: 'payout_request',
        amount: parseFloat(amount),
        description: `Payment request #${i + 1}`,
        status,
        paymentMethod: {
          ...method,
          accountName: 'John Doe' // Test name
        },
        reference: `PAY-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        createdAt: createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
        ...(status === 'completed' ? { processedAt: new Date(createdAt.getTime() + 86400000).toISOString() } : {})
      });
    }
    
    localStorage.setItem(DataModel.payments, JSON.stringify([
      ...JSON.parse(localStorage.getItem(DataModel.payments) || '[]'),
      ...payments
    ]));
    
    return payments;
  }
}; // End of PaymentService

// Initialize storage when app loads
initializeStorage();

// Navigation Functions
const Navigation = {
  // Initialize navigation
  init: () => {
    Navigation.setupMenuToggles();
    Navigation.setupAuthLinks();
    Navigation.protectRoutes();
  },

  // Setup menu toggles for mobile and desktop
  setupMenuToggles: () => {
    const menuToggleButtons = document.querySelectorAll(
      "#desktopMenuToggle, #mobileMenuToggle"
    );
    const sidebar = document.getElementById("sidebar-nav");
    const overlay = document.createElement("div");

    // Create overlay for mobile
    overlay.className = "fixed inset-0 bg-black bg-opacity-50 z-40 hidden";
    document.body.appendChild(overlay);

    // Toggle sidebar function
    const toggleSidebar = () => {
      const isOpen = !sidebar.classList.contains("-translate-x-full");
      sidebar.classList.toggle("-translate-x-full");
      overlay.classList.toggle("hidden");
      document.body.classList.toggle("overflow-hidden");

      // Update ARIA attributes
      menuToggleButtons.forEach((button) => {
        button.setAttribute("aria-expanded", !isOpen);
      });
    };

    // Add event listeners
    menuToggleButtons.forEach(button => {
      button.addEventListener('click', toggleSidebar);
    });

    // Close sidebar when clicking overlay
    overlay.addEventListener('click', toggleSidebar);

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && 
          !Array.from(menuToggleButtons).some(btn => btn.contains(e.target)) &&
          !sidebar.classList.contains('-translate-x-full')) {
        toggleSidebar();
      }
    });
  },

  // Setup authentication links (login/logout)
  setupAuthLinks: () => {
    const authLinks = document.querySelectorAll('[data-auth]');
    authLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (link.dataset.auth === 'login') {
          window.location.href = 'signin.html';
        } else if (link.dataset.auth === 'signup') {
          window.location.href = 'signup.html';
        } else if (link.dataset.auth === 'logout') {
          Auth.logout();
          window.location.href = 'landing.html';
        }
      });
    });
  },

  // Protect routes that require authentication
  protectRoutes: () => {
    const publicPages = ['landing.html', 'signin.html', 'signup.html', 'forgot-password.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    // If user is not authenticated and trying to access protected page
    if (!Auth.isAuthenticated() && !publicPages.includes(currentPage)) {
      window.location.href = 'signin.html';
      return;
    }
    
    // If user is authenticated and trying to access auth pages
    if (Auth.isAuthenticated() && 
        (currentPage === 'signin.html' || currentPage === 'signup.html')) {
      window.location.href = 'index.html';
      return;
    }
    
    // Load user data from Auth service
    function loadUserData() {
      // Check if user is authenticated
      if (!Auth.isAuthenticated()) {
        window.location.href = 'signin.html';
        return;
      }

      // Get current user data
      const user = Auth.getCurrentUser();
      if (!user) {
        window.location.href = 'signin.html';
        return;
      }
      
      // Update user info in the UI
      updateUserInfo(user);
      
      // Load user's payments and referrals
      loadUserPayments(user.id);
      loadUserReferrals(user.id);
      
      // Generate test data if no payments exist
      const payments = PaymentService.getUserPayments(user.id);
      if (payments.length === 0) {
        PaymentService.generateTestPayments(user.id, 5);
        // Reload payments after generating test data
        loadUserPayments(user.id);
      }
    }
    
    // Update UI based on authentication status
    Navigation.updateAuthUI();
    loadUserData();
  },
  
  // Update UI based on authentication status
  updateAuthUI: () => {
    const isAuthenticated = Auth.isAuthenticated();
    const user = Auth.getCurrentUser();
    
    // Update user info in the UI
    const userElements = document.querySelectorAll('[data-user]');
    userElements.forEach(el => {
      const prop = el.dataset.user;
      if (prop === 'name' && user) {
        el.textContent = `${user.firstName} ${user.lastName}`;
      } else if (prop === 'email' && user) {
        el.textContent = user.email;
      } else if (prop === 'avatar' && user) {
        el.textContent = user.firstName.charAt(0) + user.lastName.charAt(0);
      }
    });
    
    // Toggle auth-specific elements
    document.querySelectorAll('[data-auth-only]').forEach(el => {
      const shouldShow = el.dataset.authOnly === 'true' ? isAuthenticated : !isAuthenticated;
      el.style.display = shouldShow ? '' : 'none';
    });
  }
};

// Update user information in the UI
function updateUserInfo(user) {
  // Basic user info
  document.getElementById('userGreeting').textContent = `Welcome, ${user.firstName || 'User'}!`;
  document.getElementById('userEmail').textContent = user.email || 'user@example.com';
  document.getElementById('userBalance').textContent = `$${(user.balance || 0).toFixed(2)}`;
  
  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  document.getElementById('memberSince').textContent = formatDate(user.createdAt);
  document.getElementById('lastLogin').textContent = formatDate(user.lastLogin) || 'Just now';
  
  // Update stats
  updateUserStats(user);
}

// Update user stats in the UI
function updateUserStats(user) {
  // Total earnings
  const totalEarnings = PaymentService.getTotalEarnings(user.id);
  document.getElementById('totalEarnings').textContent = `$${totalEarnings.toFixed(2)}`;
  
  // Referral stats
  const referralStats = ReferralService.getReferralStats(user.id);
  document.getElementById('referralEarnings').textContent = `$${referralStats.totalEarned.toFixed(2)}`;
  document.getElementById('referralCount').textContent = referralStats.total;
  document.getElementById('activeReferrals').textContent = referralStats.completed;
  
  // Update monthly earnings (last 30 days)
  const monthlyEarnings = PaymentService.getMonthlyEarnings(user.id);
  const monthlyEarningsElement = document.getElementById('monthlyEarnings');
  if (monthlyEarnings > 0) {
    monthlyEarningsElement.textContent = `+$${monthlyEarnings.toFixed(2)}`;
    monthlyEarningsElement.className = 'text-green-400';
  } else {
    monthlyEarningsElement.textContent = `$${monthlyEarnings.toFixed(2)}`;
    monthlyEarningsElement.className = 'text-gray-400';
  }
  
  // Update next payout (if any)
  const nextPayout = PaymentService.getNextPayout(user.id);
  const nextPayoutElement = document.getElementById('nextPayout');
  const payoutDateElement = document.getElementById('payoutDate');
  
  if (nextPayout && nextPayout.amount > 0) {
    nextPayoutElement.textContent = `$${nextPayout.amount.toFixed(2)}`;
    payoutDateElement.textContent = `Processing on ${formatDate(nextPayout.date)}`;
  } else {
    nextPayoutElement.textContent = '$0.00';
    payoutDateElement.textContent = 'No pending payouts';
  }
  
  // Update available balance
  document.getElementById('availableBalance').textContent = `$${(user.balance || 0).toFixed(2)}`;
}

// Load user's payment history
function loadUserPayments(userId) {
  const payments = PaymentService.getUserPayments(userId);
  const transactionsContainer = document.getElementById('recentTransactions');
  
  if (!transactionsContainer) return;
  
  if (payments.length === 0) {
    transactionsContainer.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-receipt text-2xl mb-2"></i>
        <p>No transactions yet</p>
      </div>
    `;
    return;
  }
  
  // Sort by date (newest first) and take first 5
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  
  const transactionItems = recentPayments.map(payment => {
    const isCredit = payment.type === 'credit';
    const statusClass = {
      completed: 'text-green-400',
      pending: 'text-yellow-400',
      failed: 'text-red-400'
    }[payment.status] || 'text-gray-400';
    
    return `
      <div class="flex items-center justify-between p-3 hover:bg-gray-800/50 rounded-lg transition-colors">
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-full ${isCredit ? 'bg-green-900/20' : 'bg-red-900/20'} flex items-center justify-center mr-3">
            <i class="fas fa-${isCredit ? 'plus' : 'minus'} ${isCredit ? 'text-green-400' : 'text-red-400'}"></i>
          </div>
          <div>
            <p class="font-medium">${payment.description || 'Payment'}</p>
            <p class="text-xs text-gray-400">${new Date(payment.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-medium ${isCredit ? 'text-green-400' : 'text-red-400'}">
            ${isCredit ? '+' : '-'}$${Math.abs(payment.amount).toFixed(2)}
          </p>
          <span class="text-xs ${statusClass}">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
        </div>
      </div>
    `;
  }).join('');
  
  transactionsContainer.innerHTML = transactionItems;
}

// Load user's referrals
function loadUserReferrals(userId) {
  const referrals = ReferralService.getUserReferrals(userId);
  const referralsContainer = document.getElementById('referralList');
  
  if (!referralsContainer) return;
  
  if (referrals.length === 0) {
    referralsContainer.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-users text-2xl mb-2"></i>
        <p>No referrals yet</p>
        <button id="startReferringBtn" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm">
          Start Referring
        </button>
      </div>
    `;
    
    // Add event listener to start referring button
    const startReferringBtn = document.getElementById('startReferringBtn');
    if (startReferringBtn) {
      startReferringBtn.addEventListener('click', () => {
        if (typeof showReferralView === 'function') {
          showReferralView();
        }
      });
    }
    
    return;
  }
  
  // Sort by date (newest first)
  const sortedReferrals = [...referrals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const referralItems = sortedReferrals.map(referral => {
    const statusClass = {
      completed: 'bg-green-900/20 text-green-400',
      pending: 'bg-yellow-900/20 text-yellow-400',
      failed: 'bg-red-900/20 text-red-400'
    }[referral.status] || 'bg-gray-800 text-gray-400';
    
    const bonusAmount = referral.bonusAmount || 0;
    const formattedAmount = typeof bonusAmount.toFixed === 'function' ? bonusAmount.toFixed(2) : '0.00';
    
    return `
      <div class="flex items-center justify-between p-4 hover:bg-gray-800/50 rounded-lg transition-colors">
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3">
            <i class="fas fa-user"></i>
          </div>
          <div>
            <p class="font-medium">${referral.email || 'New User'}</p>
            <p class="text-xs text-gray-400">${new Date(referral.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm font-medium">$${formattedAmount}</p>
          <span class="text-xs px-2 py-1 rounded-full ${statusClass}">
            ${referral.status ? (referral.status.charAt(0).toUpperCase() + referral.status.slice(1)) : 'Pending'}
          </span>
        </div>
      </div>
    `;
  }).join('');
  
  referralsContainer.innerHTML = referralItems;
}


// Setup event listeners for the dashboard
function setupEventListeners() {
  // Copy referral link button
  const copyReferralBtn = document.getElementById('copyReferralLink');
  if (copyReferralBtn) {
    copyReferralBtn.addEventListener('click', () => {
      const user = Auth.getCurrentUser();
      if (!user) return;
      
      const referralLink = ReferralService.generateReferralLink(user.id);
      if (referralLink) {
        navigator.clipboard.writeText(referralLink).then(() => {
          // Show success message
          const originalText = copyReferralBtn.innerHTML;
          copyReferralBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
          setTimeout(() => {
            copyReferralBtn.innerHTML = originalText;
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy referral link:', err);
        });
      }
    });
  }
  
  // Request withdrawal button
  const requestWithdrawalBtn = document.getElementById('requestWithdrawal');
  if (requestWithdrawalBtn) {
    requestWithdrawalBtn.addEventListener('click', () => {
      const user = Auth.getCurrentUser();
      if (!user) return;
      
      // Show withdrawal modal
      Swal.fire({
        title: 'Request Withdrawal',
        html: `
          <div class="text-left">
            <div class="mb-4">
              <label class="block text-gray-300 text-sm font-medium mb-2">Amount</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span class="text-gray-400">$</span>
                </div>
                <input type="number" 
                       id="withdrawalAmount" 
                       class="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 p-2.5" 
                       placeholder="0.00" 
                       min="10" 
                       max="${user.balance || 0}" 
                       step="0.01" 
                       required>
              </div>
              <p class="text-xs text-gray-400 mt-1">Available: $${(user.balance || 0).toFixed(2)}</p>
            </div>
            <div class="mb-4">
              <label class="block text-gray-300 text-sm font-medium mb-2">Payment Method</label>
              <select id="paymentMethod" 
                      class="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                <option value="paypal">PayPal</option>
                <option value="bank">Bank Transfer</option>
                <option value="crypto">Cryptocurrency</option>
              </select>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Request Withdrawal',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#6b7280',
        reverseButtons: true,
        focusConfirm: false,
        preConfirm: () => {
          const amount = parseFloat(document.getElementById('withdrawalAmount').value);
          const paymentMethod = document.getElementById('paymentMethod').value;
          
          if (isNaN(amount) || amount < 10) {
            Swal.showValidationMessage('Minimum withdrawal amount is $10');
            return false;
          }
          
          if (amount > (user.balance || 0)) {
            Swal.showValidationMessage('Insufficient balance');
            return false;
          }
          
          return { amount, paymentMethod };
        }
      }).then((result) => {
        if (result.isConfirmed) {
          const { amount, paymentMethod } = result.value;
          
          try {
            // Process withdrawal request
            const success = PaymentService.requestWithdrawal(user.id, amount, paymentMethod);
            
            if (success) {
              Swal.fire({
                icon: 'success',
                title: 'Withdrawal Requested',
                text: `Your withdrawal request of $${amount.toFixed(2)} has been submitted.`,
                confirmButtonColor: '#2563eb'
              });
              
              // Update UI
              const updatedUser = Auth.getCurrentUser();
              updateUserInfo(updatedUser);
              updateUserStats(updatedUser);
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to process withdrawal request. Please try again later.',
                confirmButtonColor: '#2563eb'
              });
            }
          } catch (error) {
            console.error('Withdrawal error:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'An unexpected error occurred. Please try again later.',
              confirmButtonColor: '#2563eb'
            });
          }
        }
      });
    });
  }
}

// Setup navigation
function setupNavigation() {
  // Add active class to current page in navigation
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPage === href) {
      link.classList.add('bg-gray-800', 'text-white');
      link.classList.remove('text-gray-300', 'hover:bg-gray-700', 'hover:text-white');
    }
  });
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
      window.location.href = 'signin.html';
    });
  }
}

// Setup referral functionality
function setupReferralFunctionality() {
  // Show referral view when clicking "Start Referring"
  const showReferralView = () => {
    const user = Auth.getCurrentUser();
    if (!user) return;
    
    const referralLink = ReferralService.generateReferralLink(user.id);
    
    Swal.fire({
      title: 'Your Referral Link',
      html: `
        <p class="mb-4">Share your unique link and earn $50 for each successful referral!</p>
        <div class="bg-gray-800 p-3 rounded-lg flex items-center justify-between mb-4">
          <span id="referralLinkText" class="text-blue-400 break-all">${referralLink}</span>
          <button id="copyLinkBtn" class="ml-2 p-2 text-gray-300 hover:text-white">
            <i class="far fa-copy"></i>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-4">
          <a href="https://wa.me/?text=${encodeURIComponent(`Join me on Phluowise and earn money! ${referralLink}`)}" 
             target="_blank" 
             class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-center">
            <i class="fab fa-whatsapp mr-2"></i> WhatsApp
          </a>
          <a href="https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join me on Phluowise and earn money!')}" 
             target="_blank" 
             class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-center">
            <i class="fab fa-telegram mr-2"></i> Telegram
          </a>
          <a href="mailto:?subject=Join me on Phluowise&body=Check out this amazing opportunity: ${encodeURIComponent(referralLink)}" 
             class="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-center">
            <i class="far fa-envelope mr-2"></i> Email
          </a>
          <button id="copyLinkBtn2" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-center">
            <i class="far fa-copy mr-2"></i> Copy Link
          </button>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      width: '500px'
    });
    
    // Add copy functionality
    const copyLink = () => {
      navigator.clipboard.writeText(referralLink).then(() => {
        const copyBtn = document.getElementById('copyLinkBtn');
        const copyBtn2 = document.getElementById('copyLinkBtn2');
        if (copyBtn) copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        if (copyBtn2) copyBtn2.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
        
        setTimeout(() => {
          if (copyBtn) copyBtn.innerHTML = '<i class="far fa-copy"></i>';
          if (copyBtn2) copyBtn2.innerHTML = '<i class="far fa-copy mr-2"></i> Copy Link';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    };
    
    document.getElementById('copyLinkBtn')?.addEventListener('click', copyLink);
    document.getElementById('copyLinkBtn2')?.addEventListener('click', copyLink);
  };
  
  // Add click handler to "Start Referring" button if it exists
  document.getElementById('startReferringBtn')?.addEventListener('click', showReferralView);
  
  // Add click handler to "Invite Friends" button
  document.getElementById('inviteFriendsBtn')?.addEventListener('click', showReferralView);
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  try {
    // Initialize navigation first (from app.js)
    if (typeof Navigation !== 'undefined') {
      Navigation.init();
    }
    
    // Check authentication
    if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
      // Load user data
      loadUserData();
      
      // Initialize charts if function exists
      if (typeof initializeEarningsChart === 'function') {
        initializeEarningsChart();
      }
      
      // Setup event listeners
      if (typeof setupEventListeners === 'function') {
        setupEventListeners();
      }
      
      // Setup navigation
      if (typeof setupNavigation === 'function') {
        setupNavigation();
      }
      
      // Setup referral functionality
      if (typeof setupReferralFunctionality === 'function') {
        setupReferralFunctionality();
      }
      
      // Update last login time
      const user = Auth.getCurrentUser();
      if (user) {
        user.lastLogin = new Date().toISOString();
        Auth.updateUser(user);
        
        // Generate test data if no payments exist
        if (typeof PaymentService !== 'undefined' && typeof PaymentService.getUserPayments === 'function') {
          const payments = PaymentService.getUserPayments(user.id);
          if (payments && payments.length === 0 && typeof PaymentService.generateTestPayments === 'function') {
            PaymentService.generateTestPayments(user.id, 8);
            // Reload data after generating test data
            if (typeof loadUserData === 'function') {
              loadUserData();
            }
          }
        }
      }
    } else {
      // Redirect to signin if not authenticated
      window.location.href = 'signin.html';
    }
  } catch (error) {
    console.error('Error initializing application:', error);
    // Redirect to error page or show error message
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while initializing the application. Please try again later.',
        confirmButtonColor: '#2563eb'
      });
    }
  }
