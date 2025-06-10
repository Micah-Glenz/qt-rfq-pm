/**
 * Tabs module for managing bottom tabs with iframes
 */
const TabsModule = (function() {
    let currentQuote = null;
    let isExpanded = false;
    let currentSizeIndex = 0;
    let mpsfLoadedUrls = {}; // Cache to store which quotes have loaded MPSF
    
    // Fixed height options (percentages of viewport)
    const HEIGHT_OPTIONS = [50, 80];
    
    /**
     * Initialize the tabs module
     */
    function init() {
        // Set up event listeners
        const tabToggle = document.getElementById('tabToggle');
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabResizer = document.getElementById('tabResizer');
        const tabHeader = document.querySelector('.tab-header');
        
        if (tabToggle) {
            tabToggle.addEventListener('click', toggleTabBar);
        }
        
        // Add click handler to tab header (except on buttons)
        if (tabHeader) {
            tabHeader.addEventListener('click', (e) => {
                // Only toggle if clicking on header background, not buttons or tabs
                if (!e.target.closest('.tab-button') && !e.target.closest('#tabToggle')) {
                    toggleTabBar();
                }
            });
        }
        
        // Change resizer to cycle through sizes on click
        if (tabResizer) {
            tabResizer.addEventListener('click', cycleSizes);
            tabResizer.style.cursor = 'pointer'; // Change cursor to indicate clickable
        }
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => selectTab(button.dataset.tab));
        });
        
        // Handle iframe errors
        const iframes = document.querySelectorAll('.tab-iframe');
        iframes.forEach(iframe => {
            iframe.addEventListener('error', handleIframeError);
        });
        
        // Restore size index from session storage
        const savedSizeIndex = sessionStorage.getItem('tabBarSizeIndex');
        
        if (savedSizeIndex) {
            currentSizeIndex = parseInt(savedSizeIndex, 10);
        }
        
        // Always start with tab bar minimized on page reload
        // Don't restore expanded state from sessionStorage
        isExpanded = false;
        
        // Clear the sessionStorage expanded state
        sessionStorage.setItem('tabBarExpanded', 'false');
    }
    
    /**
     * Cycle through predefined sizes
     */
    function cycleSizes() {
        if (!isExpanded) return;
        
        currentSizeIndex = (currentSizeIndex + 1) % HEIGHT_OPTIONS.length;
        const newHeightPercent = HEIGHT_OPTIONS[currentSizeIndex];
        const newHeight = window.innerHeight * (newHeightPercent / 100);
        
        const tabBar = document.getElementById('tabBar');
        const appContainer = document.querySelector('.app-container');

        // Animate padding change
        appContainer.classList.add('tab-transitioning');

        tabBar.style.height = newHeight + 'px';
        appContainer.style.paddingBottom = newHeight + 'px';

        setTimeout(() => appContainer.classList.remove('tab-transitioning'), 300);
        
        // Save the current size index
        sessionStorage.setItem('tabBarSizeIndex', currentSizeIndex);
        
        // Show size indicator
        showSizeIndicator(newHeightPercent);
    }
    
    /**
     * Show a temporary size indicator
     */
    function showSizeIndicator(percent) {
        const indicator = document.createElement('div');
        indicator.className = 'size-indicator';
        indicator.textContent = `${percent}%`;
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            indicator.remove();
        }, 1000);
    }
    
    /**
     * Toggle the tab bar expanded/collapsed state
     */
    function toggleTabBar() {
        const tabBar = document.getElementById('tabBar');
        const appContainer = document.querySelector('.app-container');
        
        // Add animation class for smooth transitions
        tabBar.classList.add('animated');
        appContainer.classList.add('tab-transitioning');
        
        isExpanded = !isExpanded;
        
        if (isExpanded) {
            const heightPercent = HEIGHT_OPTIONS[currentSizeIndex];
            const height = window.innerHeight * (heightPercent / 100);
            
            tabBar.classList.remove('collapsed');
            tabBar.classList.add('expanded');
            tabBar.style.height = height + 'px';
            
            appContainer.classList.add('tab-expanded');
            appContainer.style.paddingBottom = height + 'px';
            
            updateIframeSrc();
        } else {
            tabBar.classList.remove('expanded');
            tabBar.classList.add('collapsed');
            tabBar.style.height = '';
            
            appContainer.classList.remove('tab-expanded');
            appContainer.style.paddingBottom = '';
        }
        
        // Save state
        sessionStorage.setItem('tabBarExpanded', isExpanded);
        
        // Remove animation class after transition
        setTimeout(() => {
            tabBar.classList.remove('animated');
            appContainer.classList.remove('tab-transitioning');
        }, 300);
    }
    
    /**
     * Select a specific tab
     * @param {string} tabName - The name of the tab to select
     */
    function selectTab(tabName) {
        // Only allow tab selection if we have a quote with the corresponding link
        if (!currentQuote || !hasLinkForTab(tabName)) {
            showToast(`No ${tabName} link available for this quote`, 'warning');
            return;
        }
        
        // Update active states
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}Tab`);
        });
        
        // Update iframe source if expanded
        if (isExpanded) {
            updateIframeSrc();
        }
    }
    
    /**
     * Check if current quote has link for specific tab
     * @param {string} tabName - The tab name
     * @returns {boolean} - Whether the link exists
     */
    function hasLinkForTab(tabName) {
        if (!currentQuote) return false;
        
        switch(tabName) {
            case 'mpsf':
                return !!currentQuote.mpsf_link;
            default:
                return false;
        }
    }
    
    /**
     * Get link for specific tab
     * @param {string} tabName - The tab name
     * @returns {string|null} - The link URL or null
     */
    function getLinkForTab(tabName) {
        if (!currentQuote) return null;
        
        switch(tabName) {
            case 'mpsf':
                return currentQuote.mpsf_link;
            default:
                return null;
        }
    }
    
    /**
     * Update the iframe source based on the current quote and active tab
     */
    function updateIframeSrc() {
        if (!currentQuote || !isExpanded) return;
        
        const activeTab = document.querySelector('.tab-button.active');
        if (!activeTab) return;
        
        const tabName = activeTab.dataset.tab;
        const link = getLinkForTab(tabName);
        const iframe = document.getElementById(`${tabName}Frame`);
        
        if (iframe && link) {
            // Check if we've already loaded this URL for this quote
            const cacheKey = `${currentQuote.id}-${tabName}`;
            
            // Only update if URL has changed or not loaded yet
            if (!mpsfLoadedUrls[cacheKey] || mpsfLoadedUrls[cacheKey] !== link) {
                // Check if the URL is valid
                if (isValidUrl(link)) {
                    iframe.src = link;
                    mpsfLoadedUrls[cacheKey] = link;
                } else {
                    iframe.src = 'about:blank';
                    showToast(`Invalid ${tabName} link`, 'warning');
                }
            }
            // If already loaded, just leave it as is
        } else if (iframe) {
            iframe.src = 'about:blank';
        }
    }
    
    /**
     * Clear all iframes (removed caching for MPSF)
     */
    function clearAllIframes() {
        // Don't clear MPSF iframe to maintain state
    }
    
    /**
     * Update the current quote
     * @param {Object} quote - The currently selected quote
     */
    function updateCurrentQuote(quote) {
        // Check if we're switching to a different quote
        const isNewQuote = currentQuote && currentQuote.id !== quote.id;
        
        // Store the new quote immediately
        currentQuote = quote;
        
        // If we're switching to a different quote while expanded, collapse the tab bar
        if (isNewQuote && isExpanded) {
            // Directly collapse without using toggleTabBar to avoid animation delays
            const tabBar = document.getElementById('tabBar');
            const appContainer = document.querySelector('.app-container');
            
            isExpanded = false;
            tabBar.classList.remove('expanded');
            tabBar.classList.add('collapsed');
            tabBar.style.height = '';
            
            appContainer.classList.remove('tab-expanded');
            appContainer.style.paddingBottom = '';
            
            // Clear the iframe immediately
            const iframe = document.getElementById('mpsfFrame');
            if (iframe) {
                iframe.src = 'about:blank';
            }
            
            // Save state
            sessionStorage.setItem('tabBarExpanded', 'false');
        }
        
        // Update tab states based on available links
        updateTabStates();
        
        // Clear the cache to ensure new content loads when expanded
        if (currentQuote) {
            const cacheKey = `${currentQuote.id}-mpsf`;
            delete mpsfLoadedUrls[cacheKey];
        }
    }
    
    /**
     * Update tab states based on available links
     */
    function updateTabStates() {
        const tabs = document.querySelectorAll('.tab-button');
        
        tabs.forEach(tab => {
            const tabName = tab.dataset.tab;
            const hasLink = hasLinkForTab(tabName);
            
            // Update visual state
            if (hasLink) {
                tab.classList.remove('disabled');
                tab.title = `View ${tabName}`;
            } else {
                tab.classList.add('disabled');
                tab.title = `No ${tabName} link available`;
            }
        });
    }
    
    /**
     * Handle iframe loading errors
     * @param {Event} event - Error event
     */
    function handleIframeError(event) {
        showToast('Unable to load content in iframe. The site may block embedding.', 'error');
    }
    
    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {boolean} - Whether the URL is valid
     */
    function isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    return {
        init,
        updateCurrentQuote,
        toggleTabBar,
        selectTab
    };
})();
