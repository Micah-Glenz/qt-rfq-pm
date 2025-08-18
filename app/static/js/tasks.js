/**
 * Tasks module for managing tasks
 */
const TasksModule = (function() {
  let sortableInstance = null;
  let tasksOrder = []; // Store the current order of tasks
  
  /**
   * Initialize task-related event listeners
   */
  function initTaskCheckboxes() {
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', handleTaskStatusChange);
    });
    
    document.querySelectorAll('.task-delete-btn').forEach(btn => {
      btn.addEventListener('click', handleDeleteTask);
    });
    
    // Initialize sortable for tasks
    initTaskSortable();
    
    // Store initial order
    storeCurrentOrder();
  }
  
  /**
   * Store the current order of tasks
   */
  function storeCurrentOrder() {
    const tasksList = document.querySelector('#tasksList .tasks-list');
    if (!tasksList) return;
    
    const taskElements = tasksList.querySelectorAll('.task-row, .task-separator');
    tasksOrder = Array.from(taskElements).map(el => {
      const deleteBtn = el.querySelector('.task-delete-btn');
      return deleteBtn ? parseInt(deleteBtn.dataset.id, 10) : null;
    }).filter(id => id !== null);
  }
  
  /**
   * Initialize sortable functionality for tasks
   */
  function initTaskSortable() {
    const tasksList = document.querySelector('#tasksList .tasks-list');
    if (!tasksList) return;
    
    // Destroy existing instance if it exists
    if (sortableInstance) {
      sortableInstance.destroy();
    }
    
    sortableInstance = new Sortable(tasksList, {
      animation: 150,
      handle: '.task-label-cell',
      draggable: '.task-row, .task-separator',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      
      onEnd: async function(evt) {
        // Store the new order
        storeCurrentOrder();
        
        try {
          // Update task order in backend (just for persistence)
          await API.updateTaskOrder(QuotesModule.getCurrentQuote().id, tasksOrder);
          // No refresh needed - the visual order is already correct
        } catch (error) {
          showToast('Failed to save task order', 'error');
          // Revert to previous order on error
          renderTasksInOrder(tasksOrder);
        }
      }
    });
  }
  
  /**
   * Render tasks in a specific order
   */
  function renderTasksInOrder(orderedTaskIds) {
    const tasksList = document.querySelector('#tasksList .tasks-list');
    if (!tasksList) return;
    
    // Create a map of task elements by ID
    const taskElements = {};
    tasksList.querySelectorAll('.task-row, .task-separator').forEach(el => {
      const deleteBtn = el.querySelector('.task-delete-btn');
      if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.id, 10);
        taskElements[id] = el;
      }
    });
    
    // Clear the list
    tasksList.innerHTML = '';
    
    // Add tasks back in the specified order
    orderedTaskIds.forEach(id => {
      if (taskElements[id]) {
        tasksList.appendChild(taskElements[id]);
      }
    });
  }
  
  /**
   * Render tasks for a quote
   * @param {Array} tasks - Array of task objects
   * @returns {string} - HTML string
   */
  function renderTasks(tasks) {
    if (!tasks || tasks.length === 0) {
      return '<div class="empty-state">No tasks</div>';
    }
    
    // If we have a stored order, use it
    if (tasksOrder.length > 0) {
      // Sort tasks based on stored order
      const orderedTasks = [];
      tasksOrder.forEach(id => {
        const task = tasks.find(t => t.id === id);
        if (task) {
          orderedTasks.push(task);
        }
      });
      
      // Add any new tasks that aren't in the stored order
      tasks.forEach(task => {
        if (!tasksOrder.includes(task.id)) {
          orderedTasks.push(task);
        }
      });
      
      tasks = orderedTasks;
    }
    
    // Group tasks by separator
    let currentGroup = [];
    let groups = [];
    let hasSeparator = false;
    
    tasks.forEach(task => {
      if (task.is_separator) {
        hasSeparator = true;
        if (currentGroup.length > 0) {
          groups.push({ tasks: currentGroup, separator: null });
          currentGroup = [];
        }
        groups.push({ tasks: [], separator: task });
      } else {
        currentGroup.push(task);
      }
    });
    
    // Add the last group if it has tasks
    if (currentGroup.length > 0) {
      groups.push({ tasks: currentGroup, separator: null });
    }
    
    // If there are no separators, just use the tasks directly
    if (!hasSeparator) {
      groups = [{ tasks: tasks, separator: null }];
    }
    
    let html = '<div class="tasks-list">';
    
    // Render each group
    groups.forEach(group => {
      if (group.separator) {
        html += `
          <div class="task-separator" data-task-id="${group.separator.id}">
            <span class="task-separator-text">${group.separator.label}</span>
            <span class="task-delete-btn" data-id="${group.separator.id}">×</span>
          </div>
        `;
      }
      
      group.tasks.forEach(task => {
        html += `
          <div class="task-row ${task.done ? 'completed' : ''}" data-task-id="${task.id}">
            <div class="task-checkbox-cell">
              <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
            </div>
            <div class="task-label-cell">
              <span class="task-label">${task.label}</span>
            </div>
            <div class="task-actions-cell">
              <span class="task-delete-btn" data-id="${task.id}">×</span>
            </div>
          </div>
        `;
      });
    });
    
    html += '</div>';
    return html;
  }
  
  /**
   * Update task count statistics optimistically in the quotes list
   * @param {number} quoteId - The quote ID
   * @param {boolean} taskCompleted - Whether the task was completed (true) or uncompleted (false)
   */
  function updateTaskCountsOptimistically(quoteId, taskCompleted) {
    // Find the quote item in the list and update its task count display
    const quoteItem = document.querySelector(`.quote-item[data-id="${quoteId}"]`);
    if (!quoteItem) return;
    
    const taskIcon = quoteItem.querySelector('.quote-icon[title="Tasks"]');
    if (!taskIcon) return;
    
    // Extract current counts from the display text
    const taskCountText = taskIcon.textContent.trim();
    const match = taskCountText.match(/(\d+)\/(\d+)/);
    if (!match) return;
    
    let completedTasks = parseInt(match[1], 10);
    const totalTasks = parseInt(match[2], 10);
    
    // Update completed count based on the change
    if (taskCompleted) {
      completedTasks = Math.min(completedTasks + 1, totalTasks);
    } else {
      completedTasks = Math.max(completedTasks - 1, 0);
    }
    
    // Update the display
    taskIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
      </svg>
      ${completedTasks}/${totalTasks}
    `;
  }
  
  /**
   * Handle task status change
   * @param {Event} event - Change event
   */
  async function handleTaskStatusChange(event) {
    const checkbox = event.target;
    const taskId = parseInt(checkbox.dataset.id, 10);
    const done = checkbox.checked;
    
    // Update UI immediately for responsive feel
    const taskRow = checkbox.closest('.task-row');
    if (taskRow) {
      taskRow.classList.toggle('completed', done);
    }
    
    // Update task count statistics optimistically in the quotes list
    const currentQuote = QuotesModule.getCurrentQuote();
    if (currentQuote) {
      updateTaskCountsOptimistically(currentQuote.id, done);
    }
    
    try {
      await API.updateTask(taskId, { done });
      // No need for toast on simple checkbox toggle
      // No full refresh needed - optimistic updates are already applied
    } catch (error) {
      // Revert the checkbox if the update fails
      checkbox.checked = !done;
      if (taskRow) {
        taskRow.classList.toggle('completed', !done);
      }
      
      // Revert the optimistic task count update
      if (currentQuote) {
        updateTaskCountsOptimistically(currentQuote.id, !done);
      }
      
      showToast(`Failed to update task: ${error.message}`, 'error');
    }
  }
  
  /**
   * Open add task modal
   * @param {number} quoteId - The quote ID
   */
  function openAddTaskModal(quoteId) {
    // Create a simple form for adding a task
    const modalHtml = `
      <div id="addTaskModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Add Task</h2>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <form id="addTaskForm">
              <div class="form-group">
                <label for="taskLabel">Task</label>
                <input type="text" id="taskLabel" name="taskLabel" required>
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="taskIsSeparator" name="taskIsSeparator">
                  This is a separator (section header)
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="btn cancel-modal">Cancel</button>
                <button type="submit" class="btn primary">Add Task</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    // Inject the modal if it doesn't exist
    if (!document.getElementById('addTaskModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
      // Add event listeners
      document.querySelector('#addTaskModal .close-modal').addEventListener('click', closeTaskModal);
      document.querySelector('#addTaskModal .cancel-modal').addEventListener('click', closeTaskModal);
      document.getElementById('addTaskForm').addEventListener('submit', e => handleAddTaskSubmit(e, quoteId));
    }
    
    // Show the modal
    document.getElementById('addTaskModal').style.display = 'block';
    document.getElementById('taskLabel').focus();
  }
  
  /**
   * Close task modal
   */
  function closeTaskModal() {
    const modal = document.getElementById('addTaskModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
  
  /**
   * Handle add task form submission
   * @param {Event} event - Submit event
   * @param {number} quoteId - The quote ID
   */
  async function handleAddTaskSubmit(event, quoteId) {
    event.preventDefault();
    
    const label = document.getElementById('taskLabel').value;
    const isSeparator = document.getElementById('taskIsSeparator').checked;
    
    try {
      await API.createTask(quoteId, { label, is_separator: isSeparator });
      showToast('Task added successfully', 'success');
      
      // Reset the form
      document.getElementById('taskLabel').value = '';
      document.getElementById('taskIsSeparator').checked = false;
      
      // Close the modal
      closeTaskModal();
      
      // Refresh the quote detail view
      QuotesModule.refreshCurrentQuote();
    } catch (error) {
      showToast(`Failed to add task: ${error.message}`, 'error');
    }
  }
  
  /**
   * Handle delete task
   * @param {Event} event - Click event
   */
  async function handleDeleteTask(event) {
    event.stopPropagation();
    const taskId = parseInt(event.target.dataset.id, 10);
    
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await API.deleteTask(taskId);
        showToast('Task deleted successfully', 'success');
        
        // Refresh the quote detail view
        QuotesModule.refreshCurrentQuote();
      } catch (error) {
        showToast(`Failed to delete task: ${error.message}`, 'error');
      }
    }
  }
  
  // Public API
  return {
    initTaskCheckboxes,
    renderTasks,
    openAddTaskModal,
    // Clear stored order when changing quotes
    clearStoredOrder: function() {
      tasksOrder = [];
    }
  };
})();
