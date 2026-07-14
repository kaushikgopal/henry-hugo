(function () {
  "use strict";

  const aside = document.querySelector(".table-of-contents-desktop");
  const postTitle = document.querySelector(".post-title");
  const post = document.querySelector(".post");
  const headings = Array.from(
    document.querySelectorAll(".post-content :is(h1,h2,h3)[id]")
  );

  if (!aside || !postTitle || !headings.length) return;

  const links = Array.from(aside.querySelectorAll('a[href^="#"]'));
  const scrollArea = aside.querySelector(".table-of-contents-scroll");
  const desktopQuery = window.matchMedia("(min-width: 1280px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const activationLine = 100;
  const activationTolerance = 12;
  const normalTop = 80;
  const viewportGap = 24;
  const railGap = 48;
  const collisionGap = 12;
  const minimumListHeight = 96;
  let titlePassed = false;
  let collisionHidden = false;
  let frameRequested = false;
  let activeHeading = null;

  const linkById = new Map();
  links.forEach(function (link) {
    const hash = link.getAttribute("href").slice(1);
    try {
      linkById.set(decodeURIComponent(hash), link);
    } catch (_) {
      linkById.set(hash, link);
    }
  });

  function setActive(heading) {
    if (!heading || heading === activeHeading) return;
    activeHeading = heading;

    links.forEach(function (link) {
      link.classList.remove("text-hc");
      link.removeAttribute("aria-current");
    });

    const activeLink = linkById.get(heading.id);
    if (activeLink) {
      activeLink.classList.add("text-hc");
      activeLink.setAttribute("aria-current", "location");
      activeLink.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }

  function closestHeadingToActivationLine() {
    let candidate = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= activationLine + activationTolerance) candidate = heading;
      else break;
    }
    return candidate;
  }

  const headingObserver = new IntersectionObserver(
    scheduleUpdate,
    { rootMargin: "-100px 0px -66% 0px", threshold: [0, 1] }
  );
  headings.forEach(function (heading) { headingObserver.observe(heading); });

  function rectanglesOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function readingColumnRight() {
    const content = document.querySelector(".post-content");
    const firstContentChild = content && content.querySelector(
      "p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote"
    );
    return firstContentChild ? firstContentChild.getBoundingClientRect().right : null;
  }

  function placeAside() {
    if (!desktopQuery.matches) return;

    const contentRight = readingColumnRight();
    if (contentRight !== null) {
      aside.style.setProperty("--toc-left", contentRight + railGap + "px");
    }

    titlePassed = postTitle.getBoundingClientRect().bottom <= 100;
    let top = normalTop;
    let usableListHeight = 0;
    let hasRoom = true;
    const sidenotes = Array.from(post.querySelectorAll(".sidenote"));
    const maxPasses = Math.min(sidenotes.length + 1, 100);

    for (let pass = 0; pass < maxPasses; pass += 1) {
      const panelChrome = Math.max(0, aside.offsetHeight - scrollArea.offsetHeight);
      usableListHeight = window.innerHeight - top - viewportGap - panelChrome;
      hasRoom = usableListHeight >= minimumListHeight;
      aside.style.setProperty("--toc-top", top + "px");
      aside.style.setProperty("--toc-max-height", Math.max(0, usableListHeight) + "px");

      if (!hasRoom) break;

      const panelRect = aside.getBoundingClientRect();
      const collidingBottom = sidenotes
        .map(function (sidenote) { return sidenote.getBoundingClientRect(); })
        .filter(function (rect) { return rectanglesOverlap(panelRect, rect); })
        .reduce(function (bottom, rect) { return Math.max(bottom, rect.bottom); }, 0);

      if (!collidingBottom) break;
      const nextTop = Math.ceil(collidingBottom + collisionGap);
      if (nextTop <= top) break;
      top = nextTop;
    }

    collisionHidden = !hasRoom;
    const visible = titlePassed && !collisionHidden;
    aside.classList.toggle("opacity-0", !visible);
    aside.classList.toggle("pointer-events-none", !visible);
    aside.classList.toggle("opacity-100", visible);
    aside.classList.toggle("pointer-events-auto", visible);
  }

  function update() {
    frameRequested = false;
    setActive(closestHeadingToActivationLine());
    placeAside();
  }

  function scheduleUpdate() {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(update);
  }

  links.forEach(function (link) {
    link.addEventListener("click", function (event) {
      const rawId = link.getAttribute("href").slice(1);
      let id = rawId;
      try { id = decodeURIComponent(rawId); } catch (_) {}
      const heading = document.getElementById(id);
      if (!heading) return;

      event.preventDefault();
      const top = window.scrollY + heading.getBoundingClientRect().top - 100;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: reducedMotionQuery.matches ? "auto" : "smooth"
      });
      window.history.pushState(null, "", link.hash);
      setActive(heading);
    });
  });

  const initialHash = window.location.hash.slice(1);
  let initialHeading = null;
  if (initialHash) {
    try { initialHeading = document.getElementById(decodeURIComponent(initialHash)); } catch (_) {}
  }
  setActive(initialHeading || closestHeadingToActivationLine());

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.addEventListener("load", scheduleUpdate, { once: true });
  desktopQuery.addEventListener("change", scheduleUpdate);

  const sidenoteObserver = new MutationObserver(scheduleUpdate);
  sidenoteObserver.observe(post, { childList: true });

  scheduleUpdate();
})();
