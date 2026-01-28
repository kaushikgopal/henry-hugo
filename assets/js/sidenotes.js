/**
 * Sidenotes - Display footnotes in the margin (Tufte-style)
 *
 * On wide screens (≥1024px), footnotes are positioned in the right margin
 * aligned with their reference. On narrow screens, standard bottom footnotes
 * are shown instead.
 */
(function () {
  const BREAKPOINT = 1024;
  const SIDENOTE_MARGIN = 16; // gap between content and sidenote
  const SIDENOTE_MIN_WIDTH = 140;
  const SIDENOTE_MAX_WIDTH = 250;

  function init() {
    const footnotes = document.querySelector('.footnotes');
    if (!footnotes) return;

    const mediaQuery = window.matchMedia(`(min-width: ${BREAKPOINT}px)`);

    function handleViewportChange() {
      clearSidenotes();
      if (mediaQuery.matches) {
        createSidenotes(footnotes);
      }
    }

    // Initial setup after images load (affects positioning)
    if (document.readyState === 'complete') {
      handleViewportChange();
    } else {
      window.addEventListener('load', handleViewportChange);
    }

    // Re-run on viewport changes
    mediaQuery.addEventListener('change', handleViewportChange);

    // Re-run on resize (for sidenote repositioning when content reflows)
    let resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleViewportChange, 150);
    });
  }

  function clearSidenotes() {
    document.querySelectorAll('.sidenote').forEach(el => el.remove());
    const footnotes = document.querySelector('.footnotes');
    if (footnotes) {
      footnotes.classList.remove('sidenotes-active');
    }
  }

  function createSidenotes(footnotes) {
    const post = document.querySelector('.post');
    const postContent = document.querySelector('.post-content');
    if (!post || !postContent) return;

    // Get the content area boundaries
    const firstContentChild = postContent.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
    if (!firstContentChild) return;

    const contentRect = firstContentChild.getBoundingClientRect();
    const postRect = post.getBoundingClientRect();

    // Calculate available space for sidenotes (right of content)
    const contentRightEdge = contentRect.right - postRect.left;
    const availableWidth = postRect.width - contentRightEdge - SIDENOTE_MARGIN;

    if (availableWidth < SIDENOTE_MIN_WIDTH) {
      // Not enough space for sidenotes
      return;
    }

    const sidenoteWidth = Math.min(availableWidth, SIDENOTE_MAX_WIDTH);
    const sidenoteLeft = contentRightEdge + SIDENOTE_MARGIN;

    // Track vertical positions to avoid overlap
    let lastBottom = 0;

    const footnoteItems = footnotes.querySelectorAll('ol > li');
    const supRefs = document.querySelectorAll('sup[id^="fnref:"]');

    supRefs.forEach((sup, index) => {
      const footnoteItem = footnoteItems[index];
      if (!footnoteItem) return;

      // Get footnote content (clone to avoid modifying original)
      const content = footnoteItem.cloneNode(true);

      // Create sidenote element
      const sidenote = document.createElement('div');
      sidenote.className = 'sidenote';
      sidenote.innerHTML = content.innerHTML;

      // Calculate vertical position (relative to .post container)
      const supRect = sup.getBoundingClientRect();
      let topPosition = supRect.top - postRect.top;

      // Prevent overlap with previous sidenote
      if (topPosition < lastBottom + 8) {
        topPosition = lastBottom + 8;
      }

      // Apply positioning
      sidenote.style.left = `${sidenoteLeft}px`;
      sidenote.style.top = `${topPosition}px`;
      sidenote.style.width = `${sidenoteWidth}px`;

      post.appendChild(sidenote);

      // Update lastBottom for next sidenote
      const sidenoteRect = sidenote.getBoundingClientRect();
      lastBottom = topPosition + sidenoteRect.height;
    });

    // Hide bottom footnotes
    footnotes.classList.add('sidenotes-active');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
