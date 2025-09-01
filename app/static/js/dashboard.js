/**
 * Dashboard module for displaying quote overview and statistics
 */
const DashboardModule = (function() {
  
  /**
   * Initialize the dashboard module
   */
  function init() {
    const dashboardBtn = document.getElementById('dashboardBtn');
    const dashboardModal = document.getElementById('dashboardModal');
    const closeModal = dashboardModal.querySelector('.close-modal');
    
    dashboardBtn.addEventListener('click', openDashboard);
    closeModal.addEventListener('click', closeDashboard);
    
    // Close modal when clicking outside
    dashboardModal.addEventListener('click', (e) => {
      if (e.target === dashboardModal) {
        closeDashboard();
      }
    });
  }
  
  /**
   * Open the dashboard modal and load data
   */
  async function openDashboard() {
    const modal = document.getElementById('dashboardModal');
    modal.style.display = 'block';
    
    // Load dashboard data
    await loadDashboardData();
  }
  
  /**
   * Close the dashboard modal
   */
  function closeDashboard() {
    const modal = document.getElementById('dashboardModal');
    modal.style.display = 'none';
  }
  
  /**
   * Load dashboard data and populate the UI
   */
  async function loadDashboardData() {
    try {
      // Get all quotes data
      const quotes = await API.getQuotes('', true); // Include hidden quotes for full overview
      
      // Calculate statistics
      const stats = calculateStatistics(quotes);
      
      // Update the UI
      updateStatistics(stats);
      updateTaskCompletionChart(stats);
      updateRecentQuotes(quotes);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    }
  }
  
  /**
   * Calculate statistics from quotes data
   */
  function calculateStatistics(quotes) {
    const stats = {
      totalQuotes: quotes.length,
      totalTasks: 0,
      completedTasks: 0,
      fullyCompletedQuotes: 0,
      totalVendorQuotes: 0,
      totalNotes: 0,
      hiddenQuotes: 0,
      completedVendorQuotes: 0,
      quotesWithTasks: 0,
      quotesWithVendorQuotes: 0,
      taskCompletion: {},
      recentQuotes: []
    };
    
    quotes.forEach(quote => {
      // Hidden quotes count
      if (quote.hidden) {
        stats.hiddenQuotes++;
      }
      
      // Task statistics
      if (quote.task_count > 0) {
        stats.quotesWithTasks++;
        stats.totalTasks += quote.task_count;
        stats.completedTasks += (quote.completed_tasks || 0);
        
        if (quote.completed_tasks === quote.task_count) {
          stats.fullyCompletedQuotes++;
        }
        
        // Task completion categories
        const completionRate = (quote.completed_tasks || 0) / quote.task_count;
        let category;
        if (completionRate === 0) {
          category = 'Not Started';
        } else if (completionRate < 0.5) {
          category = 'In Progress (< 50%)';
        } else if (completionRate < 1) {
          category = 'Nearly Complete';
        } else {
          category = 'Completed';
        }
        
        if (!stats.taskCompletion[category]) {
          stats.taskCompletion[category] = 0;
        }
        stats.taskCompletion[category]++;
      }
      
      // Vendor quote statistics
      if (quote.vendor_quote_count > 0) {
        stats.quotesWithVendorQuotes++;
        stats.totalVendorQuotes += quote.vendor_quote_count;
      }
      
      // Notes statistics
      if (quote.note_count > 0) {
        stats.totalNotes += quote.note_count;
      }
    });
    
    // Calculate completion percentage
    stats.taskCompletionPercentage = stats.totalTasks > 0 ? 
      Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
    
    stats.vendorQuoteProgress = stats.totalVendorQuotes > 0 ? 
      `${stats.totalVendorQuotes} total` : 'No vendor quotes';
    
    return stats;
  }
  
  /**
   * Update the statistics cards
   */
  function updateStatistics(stats) {
    document.getElementById('totalQuotesCount').textContent = stats.totalQuotes;
    document.getElementById('activeQuotesCount').textContent = stats.totalQuotes - (stats.hiddenQuotes || 0);
    document.getElementById('totalTasksCount').textContent = stats.totalTasks;
    document.getElementById('completedTasksCount').textContent = stats.completedTasks;
    document.getElementById('taskCompletionRate').textContent = stats.taskCompletionPercentage + '%';
    document.getElementById('fullyCompletedQuotesCount').textContent = stats.fullyCompletedQuotes;
    document.getElementById('totalVendorQuotesCount').textContent = stats.totalVendorQuotes;
    document.getElementById('totalNotesCount').textContent = stats.totalNotes;
  }
  
  /**
   * Update the task completion chart
   */
  function updateTaskCompletionChart(stats) {
    const chartContainer = document.getElementById('taskCompletionChart');
    const categories = ['Completed', 'Nearly Complete', 'In Progress (< 50%)', 'Not Started'];
    const colors = ['completed', 'completed', 'incomplete', 'incomplete'];
    
    let html = '';
    
    categories.forEach((category, index) => {
      const count = stats.taskCompletion[category] || 0;
      const percentage = stats.quotesWithTasks > 0 ? 
        Math.round((count / stats.quotesWithTasks) * 100) : 0;
      
      html += `
        <div class="chart-bar">
          <div class="chart-label">${category}</div>
          <div class="chart-progress">
            <div class="chart-progress-fill ${colors[index]}" 
                 style="width: ${percentage}%"></div>
            <div class="chart-value">${count}</div>
          </div>
        </div>
      `;
    });
    
    chartContainer.innerHTML = html;
  }
  
  /**
   * Update the recent quotes section
   */
  function updateRecentQuotes(quotes) {
    const recentContainer = document.getElementById('recentQuotes');
    
    // Sort quotes by ID (assuming higher ID = more recent) and take first 10
    const sortedQuotes = [...quotes]
      .sort((a, b) => b.id - a.id)
      .slice(0, 10);
    
    let html = '';
    
    sortedQuotes.forEach(quote => {
      const hasAllTasksCompleted = quote.task_count > 0 && 
        quote.completed_tasks === quote.task_count;
      const hasAnyTasks = quote.task_count > 0;
      
      html += `
        <div class="recent-quote-item" onclick="QuotesModule.loadQuoteDetail(${quote.id}); DashboardModule.closeDashboard();">
          ${hasAnyTasks ? `
            <div class="recent-quote-completion ${hasAllTasksCompleted ? 'completed' : 'incomplete'}"></div>
          ` : '<div style="width: 12px;"></div>'}
          <div class="recent-quote-info">
            <div class="recent-quote-customer">${quote.customer}</div>
            <div class="recent-quote-number">${quote.quote_no}${quote.sales_rep ? ' • ' + quote.sales_rep : ''}</div>
          </div>
          ${hasAnyTasks ? `<div style="font-size: var(--font-size-xs); color: var(--text-tertiary);">${quote.completed_tasks}/${quote.task_count}</div>` : ''}
        </div>
      `;
    });
    
    recentContainer.innerHTML = html || '<div class="empty-state">No quotes found</div>';
  }
  
  // Public API
  return {
    init,
    openDashboard,
    closeDashboard: closeDashboard
  };
})();