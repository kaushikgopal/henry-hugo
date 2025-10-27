/**
 * Heading anchor links with clipboard copy functionality
 * Minimal implementation - CSS handles all visual states
 */
(function () {
  "use strict";

  const postContent = document.querySelector(".post-content");
  if (!postContent) return;

  const anchors = postContent.querySelectorAll(".heading-anchor");

  anchors.forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      const hash = anchor.getAttribute("href");
      const url = window.location.origin + window.location.pathname + hash;

      // Try clipboard API if available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          function () {
            showFeedback(anchor);
          },
          function () {
            // Fallback: navigate to anchor
            window.location.hash = hash;
          }
        );
      } else {
        // No clipboard support: navigate to anchor
        window.location.hash = hash;
      }
    });
  });

  function showFeedback(anchor) {
    const originalText = anchor.textContent;
    anchor.textContent = "✓";

    setTimeout(function () {
      anchor.textContent = originalText;
    }, 1500);
  }
})();
