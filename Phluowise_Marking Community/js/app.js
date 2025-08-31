// Load dummy referral data
function loadReferrals() {
  const referrals = [
    {
      company: "TechCorp",
      location: "San Francisco, CA",
      amount: "$1,200",
      date: "2025-08-28",
    },
    {
      company: "WebSolutions",
      location: "New York, NY",
      amount: "$850",
      date: "2025-08-25",
    },
    {
      company: "DigitalLabs",
      location: "Austin, TX",
      amount: "$1,500",
      date: "2025-08-20",
    },
    {
      company: "CloudNine",
      location: "Seattle, WA",
      amount: "$2,100",
      date: "2025-08-15",
    },
    {
      company: "DataMinds",
      location: "Boston, MA",
      amount: "$950",
      date: "2025-08-10",
    },
  ];

  const tbody = document.getElementById("referralTableBody");
  const noReferralsMsg = document.getElementById("noReferralsMessage");

  if (!tbody) return;

  if (referrals.length === 0) {
    noReferralsMsg.classList.remove("hidden");
    return;
  }

  noReferralsMsg.classList.add("hidden");
  tbody.innerHTML = referrals
    .map(
      (referral) => `
    <tr class="hover:bg-gray-800/50 transition-colors">
      <td class="py-4 px-4">
        <div class="flex items-center">
          <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            ${referral.company.charAt(0)}
          </div>
          <div class="ml-4">
            <div class="text-sm font-medium text-gray-200">${
              referral.company
            }</div>
          </div>
        </div>
      </td>
      <td class="py-4 px-4 text-sm text-gray-400">${referral.location}</td>
      <td class="py-4 px-4">
        <span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-900/30 text-green-400">
          ${referral.amount}
        </span>
      </td>
      <td class="py-4 px-4 text-sm text-gray-400">${referral.date}</td>
    </tr>
  `
    )
    .join("");
}

// Menu toggle functionality
function setupMenuToggles() {
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

  // Add click event listeners to all menu toggles
  menuToggleButtons.forEach((button) => {
    button.addEventListener("click", toggleSidebar);
  });

  // Close sidebar when clicking on overlay
  overlay.addEventListener("click", toggleSidebar);

  // Close sidebar when clicking on a nav link (for mobile)
  document.querySelectorAll("#sidebar-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 768) {
        toggleSidebar();
      }
    });
  });
}

// Initialize the page when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  loadReferrals();
  setupMenuToggles();
});
