/**
 * Sidenotes - Display footnotes in the margin (Tufte-style)
 *
 * On wide screens (≥1024px), footnotes are positioned in the right margin
 * aligned with their reference. On narrow screens, standard bottom footnotes
 * are shown instead.
 */
(function () {
  const BREAKPOINT = 1024;
  const DESKTOP_TOC_BREAKPOINT = 1024;
  const SIDENOTE_MARGIN = 48; // gap between content and shared rail
  const SIDENOTE_MIN_WIDTH = 100;
  const SIDENOTE_MAX_WIDTH = 180;
  const SHARED_RAIL_WIDTH = 312;
  const SIDENOTE_VERTICAL_GAP = 24; // gap between stacked sidenotes
  const transferredIds = new WeakMap();
  const referenceHoverBindings = new WeakMap();

  function init() {
    const footnotes = document.querySelector('.footnotes');
    if (!footnotes) return;

    const mediaQuery = window.matchMedia(`(min-width: ${BREAKPOINT}px)`);

    function handleViewportChange(initial = false) {
      const focusedFootnote = captureFocusedFootnote(footnotes);
      clearSidenotes();
      if (mediaQuery.matches) {
        createSidenotes(footnotes);
      }
      restoreFocusedFootnote(focusedFootnote, footnotes);
      if (initial && mediaQuery.matches) {
        scrollToInitialFragment();
      }
    }

    // Initial setup after images load (affects positioning)
    if (document.readyState === 'complete') {
      handleViewportChange(true);
    } else {
      window.addEventListener('load', () => handleViewportChange(true));
    }

    // Re-run on viewport changes
    mediaQuery.addEventListener('change', () => handleViewportChange());

    // Re-run on resize (for sidenote repositioning when content reflows)
    let resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => handleViewportChange(), 150);
    });
  }

  function clearSidenotes() {
    document.querySelectorAll('.sidenote').forEach(sidenote => {
      const idsToRestore = transferredIds.get(sidenote) || [];
      sidenote.remove();
      idsToRestore.forEach(({ element, id }) => element.setAttribute('id', id));
    });
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
    const availableWidth = window.innerWidth - contentRect.right - SIDENOTE_MARGIN;

    if (availableWidth < SIDENOTE_MIN_WIDTH) {
      // Not enough space for sidenotes
      return;
    }

    const toc = document.querySelector('.table-of-contents-desktop');
    const sharedRailWidth = toc ? toc.getBoundingClientRect().width : SHARED_RAIL_WIDTH;
    const desktopTocBreakpoint = post.classList.contains('section-blog')
      ? BREAKPOINT
      : DESKTOP_TOC_BREAKPOINT;
    const sidenoteWidth = window.innerWidth >= desktopTocBreakpoint && availableWidth >= sharedRailWidth
      ? sharedRailWidth
      : Math.min(availableWidth, SIDENOTE_MAX_WIDTH);
    const sidenoteLeft = contentRightEdge + SIDENOTE_MARGIN;

    // Track vertical positions to avoid overlap
    let lastBottom = 0;

    const footnoteItems = footnotes.querySelectorAll('ol > li');
    const footnotesById = new Map(Array.from(footnoteItems, item => [item.id, item]));
    const sidenotesByFootnote = new Map();
    const supRefs = document.querySelectorAll('sup[id^="fnref"]');

    supRefs.forEach((sup, index) => {
      const referenceLink = sup.querySelector('a');
      const href = referenceLink?.getAttribute('href');
      const footnoteItem = href
        ? footnotesById.get(href.slice(1))
        : footnoteItems[index];
      if (!footnoteItem) return;
      const existingSidenote = sidenotesByFootnote.get(footnoteItem);
      if (existingSidenote) {
        bindReferenceHover(sup, existingSidenote);
        return;
      }

      // Get footnote number from the sup element
      const footnoteNum = referenceLink?.textContent || (index + 1);

      // Clone the note contents, then move their IDs to the visible copy so
      // fragment links do not target the hidden bottom footnotes.
      const content = footnoteItem.cloneNode(true);
      const sidenote = document.createElement('div');
      sidenote.className = 'sidenote';
      sidenote.setAttribute('role', 'doc-endnote');
      const idsToRestore = [];
      transferId(footnoteItem, sidenote, idsToRestore);
      const originalIdElements = footnoteItem.querySelectorAll('[id]');
      const clonedIdElements = content.querySelectorAll('[id]');
      originalIdElements.forEach((element, idIndex) => {
        transferId(element, clonedIdElements[idIndex], idsToRestore);
      });

      // Create sidenote element with number prefix
      const sidenoteNumber = document.createElement('span');
      sidenoteNumber.className = 'sidenote-number';
      sidenoteNumber.textContent = `${footnoteNum}.`;
      sidenote.appendChild(sidenoteNumber);
      sidenote.appendChild(document.createTextNode(' '));
      while (content.firstChild) {
        sidenote.appendChild(content.firstChild);
      }
      if (idsToRestore.length) {
        transferredIds.set(sidenote, idsToRestore);
      }

      sidenotesByFootnote.set(footnoteItem, sidenote);
      bindReferenceHover(sup, sidenote);

      // Calculate vertical position (relative to .post container)
      const supRect = sup.getBoundingClientRect();
      let topPosition = supRect.top - postRect.top;

      // Prevent overlap with previous sidenote
      if (topPosition < lastBottom + SIDENOTE_VERTICAL_GAP) {
        topPosition = lastBottom + SIDENOTE_VERTICAL_GAP;
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

  function captureFocusedFootnote(footnotes) {
    const activeElement = document.activeElement;
    const sidenotes = Array.from(document.querySelectorAll('.sidenote'));
    const footnoteItems = footnotes.querySelectorAll('ol > li');
    let note = sidenotes.find(item => item.contains(activeElement));
    let index = sidenotes.indexOf(note);
    const isSidenote = Boolean(note);
    if (!note) {
      note = Array.from(footnoteItems).find(item => item.contains(activeElement));
      index = Array.prototype.indexOf.call(footnoteItems, note);
    }
    if (!note) return null;

    const path = [];
    let element = activeElement;
    while (element !== note) {
      const parent = element.parentElement;
      if (!parent) return null;
      path.unshift(Array.prototype.indexOf.call(parent.childNodes, element));
      element = parent;
    }
    if (!path.length) return null;
    if (isSidenote) {
      if (path[0] < 2) return null;
      path[0] -= 2;
    }

    return { id: note.id, index, path };
  }

  function restoreFocusedFootnote(focused, footnotes) {
    if (!focused) return;

    const sidenotes = Array.from(document.querySelectorAll('.sidenote'));
    const footnoteItems = footnotes.querySelectorAll('ol > li');
    const sidenote = (focused.id && sidenotes.find(note => note.id === focused.id)) || sidenotes[focused.index];
    const footnote = (focused.id && Array.from(footnoteItems).find(note => note.id === focused.id)) || footnoteItems[focused.index];
    const targetRoot = sidenote || footnote;
    if (!targetRoot) return;

    const path = targetRoot === sidenote
      ? [focused.path[0] + 2, ...focused.path.slice(1)]
      : focused.path;
    let target = targetRoot;
    for (const index of path) {
      target = target?.childNodes[index];
      if (!target) return;
    }
    if (typeof target.focus === 'function') {
      target.focus({ preventScroll: true });
    }
  }


  function scrollToInitialFragment() {
    // The browser may scroll before the load handler moves the fragment ID.
    const hash = window.location?.hash;
    if (!hash || hash.length < 2) return;

    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch (_) {}
    const target = document.getElementById(id);
    for (let element = target; element; element = element.parentElement) {
      if (element.classList?.contains('sidenote')) {
        target.scrollIntoView({ block: 'nearest' });
        return;
      }
    }
  }


  function bindReferenceHover(sup, sidenote) {
    let binding = referenceHoverBindings.get(sup);
    if (binding) {
      binding.sidenote = sidenote;
      return;
    }
    binding = { sidenote };
    referenceHoverBindings.set(sup, binding);
    sup.addEventListener('mouseenter', () => binding.sidenote.classList.add('sidenote-highlight'));
    sup.addEventListener('mouseleave', () => binding.sidenote.classList.remove('sidenote-highlight'));
  }


  function transferId(source, target, idsToRestore) {
    if (!source.hasAttribute('id')) return;

    const id = source.getAttribute('id');
    target.setAttribute('id', id);
    source.removeAttribute('id');
    idsToRestore.push({ element: source, id });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
