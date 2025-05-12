/**
 * Masonry layout implementation with minimal gaps
 */

/**
 * Calculate and apply optimal masonry layout
 */
function applyMasonryLayout() {
  const container = document.getElementById('quoteDetail');
  if (!container || container.classList.contains('loading')) return;
  
  const cards = Array.from(container.querySelectorAll('.quote-card'));
  if (cards.length === 0) return;
  
  // Reset container height first
  container.style.height = '';
  
  // Check if we're on mobile (single column)
  const containerWidth = container.offsetWidth;
  if (containerWidth < 768) {
    // Single column - remove absolute positioning
    cards.forEach(card => {
      card.style.position = '';
      card.style.left = '';
      card.style.top = '';
      card.style.width = '';
    });
    return;
  }
  
  // Two column layout
  const gap = 12; // 0.75rem
  const cardWidth = (containerWidth - gap) / 2;
  const columnHeights = [0, 0];
  
  // Position each card in the shortest column
  cards.forEach(card => {
    // Determine which column to place the card in
    const shortestColumn = columnHeights[0] <= columnHeights[1] ? 0 : 1;
    
    // Calculate position
    const left = shortestColumn * (cardWidth + gap);
    const top = columnHeights[shortestColumn];
    
    // Apply positioning
    card.style.position = 'absolute';
    card.style.width = cardWidth + 'px';
    card.style.left = left + 'px';
    card.style.top = top + 'px';
    
    // Force layout calculation
    card.offsetHeight;
    
    // Update column height
    columnHeights[shortestColumn] = top + card.offsetHeight + gap;
  });
  
  // Set container height to accommodate all cards
  container.style.height = Math.max(...columnHeights) + 'px';
  container.style.position = 'relative';
}

// Export for use in other modules
window.applyMasonryLayout = applyMasonryLayout;