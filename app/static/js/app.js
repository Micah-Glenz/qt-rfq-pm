/**
 * Main application entry point
 */
document.addEventListener('DOMContentLoaded', function() {
  // Initialize theme
  SettingsModule.initTheme();
  
  // Initialize font size
  SettingsModule.initFontSize();
  
  // Initialize toast notifications
  initToasts();
  
  // Initialize the resizable panes - DISABLED
  // initResizablePanes();
  
  // Initialize the modules
  SettingsModule.init();
  QuotesModule.init();
  EmailModule.init();
  TabsModule.init();
  
  // Initialize dropdown in the new quote modal
  const salesRepDropdown = document.getElementById('salesRepDropdown');
  if (salesRepDropdown) {
    SettingsModule.updateSalesRepDropdown(salesRepDropdown);
  }
  
  // Load initial data
  QuotesModule.loadQuotes();
});

/**
 * Initialize the resizable panes functionality - DISABLED
 */
function initResizablePanes() {
  // Functionality disabled - no resizing between panes
  return;
  
  const leftPane = document.getElementById('leftPane');
  const resizer = document.getElementById('resizer');
  const rightPane = document.getElementById('rightPane');
  let isResizing = false;
  let initialX, initialWidth;
  
  resizer.addEventListener('mousedown', function(e) {
    isResizing = true;
    initialX = e.clientX;
    initialWidth = leftPane.offsetWidth;
    
    document.body.classList.add('resizing');
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    
    const deltaX = e.clientX - initialX;
    const newWidth = initialWidth + deltaX;
    const containerWidth = document.querySelector('.split-pane').offsetWidth;
    
    // Set min and max widths as percentages of the container
    const minWidth = containerWidth * 0.2; // 20%
    const maxWidth = containerWidth * 0.8; // 80%
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      leftPane.style.width = newWidth + 'px';
    }
  });
  
  document.addEventListener('mouseup', function() {
    if (isResizing) {
      isResizing = false;
      document.body.classList.remove('resizing');
    }
  });
}

/**
 * Initialize toast notifications
 */
function initToasts() {
  // Create toast container if it doesn't exist
  if (!document.getElementById('toastContainer')) {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, warning)
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Remove the toast after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}