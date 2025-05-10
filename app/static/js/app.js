/**
 * Main application entry point
 */
document.addEventListener('DOMContentLoaded', function() {
  // Initialize toast notifications
  initToasts();
  
  // Initialize the resizable panes
  initResizablePanes();
  
  // Initialize the responsive layout
  initResponsiveLayout();
  
  // Initialize the modules - Settings first to make sure sales reps are loaded
  SettingsModule.init();
  QuotesModule.init();
  
  // Initialize dropdown in the new quote modal (if it exists)
  const salesRepDropdown = document.getElementById('salesRepDropdown');
  if (salesRepDropdown) {
    SettingsModule.updateSalesRepDropdown(salesRepDropdown);
  }
  
  // Load initial data
  QuotesModule.loadQuotes();
});

/**
 * Initialize the resizable panes functionality
 */
function initResizablePanes() {
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
      updateDetailLayout();
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
 * Initialize responsive layout
 */
function initResponsiveLayout() {
  // Check on load
  updateDetailLayout();
  updateScrollIndicators();
  
  // Check on window resize
  window.addEventListener('resize', function() {
    updateDetailLayout();
    updateScrollIndicators();
  });
  
  // Check when content changes might have occurred
  document.addEventListener('DOMContentLoaded', updateScrollIndicators);
  window.addEventListener('load', updateScrollIndicators);
}

/**
 * Update scroll indicators on cards that have overflowing content
 */
function updateScrollIndicators() {
  const cardContents = document.querySelectorAll('.card-content');
  
  cardContents.forEach(content => {
    // Clear any existing indicators
    const existingIndicator = content.querySelector('.scroll-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Check if content area has scrollable content
    const hasOverflow = content.scrollHeight > content.clientHeight;
    
    if (hasOverflow) {
      // Create and append a container for the indicator at the end
      const container = document.createElement('div');
      container.className = 'scroll-indicator-container';
      container.style.position = 'relative';
      content.appendChild(container);
      
      // Create and append scroll indicator
      const indicator = document.createElement('div');
      indicator.className = 'scroll-indicator';
      container.appendChild(indicator);
      
      // Add scroll event listener to hide indicator when at bottom
      content.addEventListener('scroll', function() {
        const atBottom = Math.abs(this.scrollHeight - this.clientHeight - this.scrollTop) < 5;
        indicator.style.opacity = atBottom ? '0' : '1';
      });
      
      // Initial check - hide if already at bottom
      const atBottom = Math.abs(content.scrollHeight - content.clientHeight - content.scrollTop) < 5;
      indicator.style.opacity = atBottom ? '0' : '1';
    }
  });
}

/**
 * Update detail layout based on container width
 */
function updateDetailLayout() {
  const detailContainer = document.getElementById('quoteDetail');
  const rightPane = document.getElementById('rightPane');
  
  if (!detailContainer || !rightPane) return;
  
  const containerWidth = rightPane.offsetWidth;
  
  // If width is less than threshold, switch to single column
  if (containerWidth < 768) {
    detailContainer.style.gridTemplateColumns = '1fr';
    
    // Make all cards full width in narrow layout
    document.querySelectorAll('.quote-card').forEach(card => {
      card.style.maxWidth = '100%';
      card.style.maxHeight = '45vh';
    });
  } else {
    detailContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
    
    // Set max width for all cards
    document.querySelectorAll('.quote-card').forEach(card => {
      card.style.maxWidth = '30vw';
      card.style.maxHeight = '45vh';
    });
  }
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