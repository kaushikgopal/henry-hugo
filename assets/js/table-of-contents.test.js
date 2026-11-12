const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class TestElement {
  constructor(tagName, attributes = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(Object.entries(attributes));
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this.style = {
      setProperty: (name, value) => { this.style[name] = String(value); },
      removeProperty: name => { delete this.style[name]; },
    };
    this.rect = { left: 500, right: 800, top: 80, bottom: 300, height: 220 };
    this.offsetHeight = 0;
    this.offsetTop = 0;
  }

  get id() { return this.getAttribute('id') || ''; }
  get className() { return this.getAttribute('class') || ''; }
  set className(value) { this.setAttribute('class', value); }
  get classList() {
    const names = () => this.className.split(/\s+/).filter(Boolean);
    return {
      add: (...items) => this.className = [...new Set([...names(), ...items])].join(' '),
      remove: (...items) => this.className = names().filter(name => !items.includes(name)).join(' '),
      contains: name => names().includes(name),
      toggle: (name, force) => {
        const present = names().includes(name);
        const add = force === undefined ? !present : force;
        if (add) this.classList.add(name);
        else this.classList.remove(name);
        return add;
      },
    };
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  hasAttribute(name) { return this.attributes.has(name); }
  matches(selector) { return selector === ':focus-visible' && this.focusVisible === true; }
  removeAttribute(name) { this.attributes.delete(name); }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  contains(target) {
    return this === target || this.children.some(child => child.contains(target));
  }
  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) || [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }
  dispatch(type, event) {
    (this.listeners.get(type) || []).forEach(callback => callback(event));
  }
  focus(options) {
    this.focusOptions = options;
    this.document.activeElement = this;
    const event = { target: this };
    for (let element = this; element; element = element.parentElement) element.dispatch('focusin', event);
  }
  blur() {
    if (this.document.activeElement === this) this.document.activeElement = null;
    const event = { target: this };
    for (let element = this; element; element = element.parentElement) element.dispatch('focusout', event);
  }
  getBoundingClientRect() { return this.rect; }
  querySelector(selector) { return (this.selectorResults?.[selector] || [])[0] || null; }
  querySelectorAll(selector) { return this.selectorResults?.[selector] || []; }
}

function createFixture() {
  const document = {
    activeElement: null,
    querySelector(selector) { return this.selectors[selector] || null; },
    querySelectorAll(selector) { return this.selectorResults[selector] || []; },
    getElementById(id) { return this.ids.get(id) || null; },
    location: { hash: '' },
  };
  const element = (tag, attrs) => {
    const result = new TestElement(tag, attrs);
    result.document = document;
    return result;
  };

  const aside = element('aside', {
    class: 'opacity-100 pointer-events-auto',
    'aria-label': 'Table of contents',
  });
  aside.offsetHeight = 260;
  const scrollArea = element('div', { class: 'table-of-contents-scroll' });
  scrollArea.offsetHeight = 220;
  scrollArea.clientHeight = 220;
  scrollArea.scrollTop = 0;
  const tocList = element('ul');
  const firstItem = element('li');
  const link = element('a', { href: '#section-two' });
  link.offsetTop = 0;
  link.offsetHeight = 20;
  firstItem.appendChild(link);
  const nestedList = element('ul');
  const nestedItem = element('li');
  const nestedLink = element('a', { href: '#nested-section' });
  nestedItem.appendChild(nestedLink);
  nestedList.appendChild(nestedItem);
  firstItem.appendChild(nestedList);
  const lastItem = element('li');
  const lastLink = element('a', { href: '#last-section' });
  lastItem.appendChild(lastLink);
  tocList.appendChild(firstItem);
  tocList.appendChild(lastItem);
  scrollArea.appendChild(tocList);
  aside.appendChild(scrollArea);
  aside.selectorResults = { '.table-of-contents-scroll': [scrollArea], 'a[href^="#"]': [link, nestedLink, lastLink] };

  const title = element('h1', { class: 'post-title' });
  title.rect = { top: 200, bottom: 200, left: 0, right: 600, height: 40 };
  const postContent = element('div', { class: 'post-content' });
  const contentChild = element('p');
  contentChild.rect = { left: 0, right: 600, top: 200, bottom: 220, height: 20 };
  postContent.rect = { left: 0, right: 600, top: 200, bottom: 1000, height: 800 };
  postContent.selectorResults = { 'p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote': [contentChild] };

  const post = element('article', { class: 'post section-blog' });
  post.selectorResults = { '.sidenote, figure.full-bleed': [] };
  const heading = element('h2', { id: 'section-two' });
  heading.rect = { left: 0, right: 600, top: 400, bottom: 430, height: 30 };

  const mobileToc = element('details', { class: 'table-of-contents-mobile' });
  mobileToc.rect = { left: 0, right: 500, top: 500, bottom: 600, height: 100 };
  mobileToc.open = false;
  document.selectors = {
    '.table-of-contents-desktop': aside,
    '.post-title': title,
    '.post': post,
    '.post-content': postContent,
    '.table-of-contents-mobile': mobileToc,
  };
  document.selectorResults = { '.post-content :is(h1,h2,h3)[id]': [heading] };
  document.ids = new Map([[heading.id, heading]]);
  document.activeElement = element('body');

  const frames = [];
  const scrollCalls = [];
  const windowListeners = new Map();
  const desktopQueryListeners = new Map();
  const mediaQueries = [];
  const desktopQuery = {
    matches: true,
    addEventListener: (type, callback) => desktopQueryListeners.set(type, callback),
  };
  const window = {
    innerHeight: 1000,
    scrollY: 0,
    location: { hash: '' },
    history: { pushState() {} },
    matchMedia: query => {
      mediaQueries.push(query);
      return query.includes('prefers-reduced-motion')
        ? { matches: false, addEventListener() {} }
        : desktopQuery;
    },
    requestAnimationFrame: callback => frames.push(callback),
    addEventListener: (type, callback) => windowListeners.set(type, callback),
    scrollTo: options => {
      scrollCalls.push(options);
      const delta = options.top - window.scrollY;
      window.scrollY = options.top;
      [title, contentChild, postContent, heading].forEach(element => {
        element.rect.top -= delta;
        element.rect.bottom -= delta;
      });
    },
  };

  return { document, aside, link, nestedLink, lastLink, title, post, postContent, heading, mobileToc, desktopQuery, desktopQueryListeners, mediaQueries, frames, scrollCalls, window, windowListeners };
}

function loadTableOfContents(fixture) {
  const script = readFileSync(path.join(__dirname, 'table-of-contents.js'), 'utf8');
  class TestObserver { observe() {} }
  vm.runInNewContext(script, {
    document: fixture.document,
    window: fixture.window,
    IntersectionObserver: TestObserver,
    MutationObserver: TestObserver,
  });
}

function flushFrames(fixture) {
  while (fixture.frames.length) fixture.frames.shift()();
}

test('desktop TOC media queries match the CSS breakpoints for blog and non-blog pages', () => {
  const blogFixture = createFixture();
  loadTableOfContents(blogFixture);
  assert.deepEqual(blogFixture.mediaQueries, [
    '(min-width: 64rem)',
    '(prefers-reduced-motion: reduce)',
  ]);

  const nonBlogFixture = createFixture();
  nonBlogFixture.post.classList.remove('section-blog');
  loadTableOfContents(nonBlogFixture);
  assert.deepEqual(nonBlogFixture.mediaQueries, [
    '(min-width: 80rem)',
    '(prefers-reduced-motion: reduce)',
  ]);
});

test('desktop TOC reveal indices follow nested links in DOM order, even when TOC behavior exits early', () => {
  const fixture = createFixture();
  fixture.document.selectorResults['.post-content :is(h1,h2,h3)[id]'] = [];
  loadTableOfContents(fixture);

  assert.deepEqual(
    [fixture.link, fixture.nestedLink, fixture.lastLink].map(link => link.style['--i']),
    ['0', '1', '2'],
  );
  assert.equal(fixture.aside.classList.contains('opacity-100'), true);
  assert.equal(fixture.aside.classList.contains('opacity-0'), false);
});

test('keyboard focus keeps an interrupted desktop TOC link reveal visible after blur', () => {
  const fixture = createFixture();
  loadTableOfContents(fixture);
  flushFrames(fixture);

  fixture.link.focus();
  assert.equal(fixture.link.classList.contains('toc-reveal-interrupted'), false, 'ordinary focus does not interrupt the reveal');
  fixture.link.blur();

  fixture.link.focusVisible = true;
  fixture.link.focus();
  assert.equal(fixture.link.classList.contains('toc-reveal-interrupted'), true, 'keyboard focus interrupts the reveal');

  fixture.link.blur();
  flushFrames(fixture);
  assert.equal(fixture.link.classList.contains('toc-reveal-interrupted'), true, 'the reveal stays disabled after blur');
  assert.equal(fixture.nestedLink.classList.contains('toc-reveal-interrupted'), false, 'other links keep their staggered reveal');
});


test('the desktop rail is available before the title passes and hides for collisions while moving focus safely', () => {
  const fixture = createFixture();
  loadTableOfContents(fixture);
  assert.equal(fixture.aside.inert, false, 'the desktop rail starts available');
  flushFrames(fixture);

  assert.equal(fixture.aside.inert, false, 'the rail is available before the title passes');
  assert.equal(fixture.aside.classList.contains('opacity-100'), true);
  assert.equal(fixture.aside.classList.contains('opacity-0'), false);

  fixture.title.rect.bottom = 80;
  fixture.windowListeners.get('scroll')();
  flushFrames(fixture);
  assert.equal(fixture.aside.inert, false, 'the rail stays available after the title passes');

  fixture.link.focus();
  flushFrames(fixture);
  const collision = new TestElement('aside');
  collision.document = fixture.document;
  collision.rect = { left: 500, right: 800, top: 100, bottom: 150, height: 50 };
  fixture.post.selectorResults['.sidenote, figure.full-bleed'].push(collision);
  fixture.windowListeners.get('scroll')();
  flushFrames(fixture);

  assert.equal(fixture.document.activeElement, fixture.heading, 'focus moves to the matching heading');
  assert.equal(fixture.heading.getAttribute('tabindex'), '-1');
  assert.equal(fixture.heading.focusOptions.preventScroll, true, 'focus transfer prevents a second browser scroll');
  assert.deepEqual(fixture.scrollCalls, [], 'an in-view heading does not cause a page scroll');
  assert.equal(fixture.aside.inert, true, 'the now-hidden rail is inert');
  assert.equal(fixture.aside.classList.contains('opacity-0'), true);
  assert.equal(fixture.mobileToc.style.display, undefined, 'collision handling does not force the in-flow fallback to display');
  assert.equal(fixture.mobileToc.open, false, 'collision handling does not open the mobile fallback');
  assert.equal(fixture.mobileToc.rect.top, 500, 'the mobile fallback keeps its existing layout position');

  fixture.post.selectorResults['.sidenote, figure.full-bleed'].length = 0;
  fixture.windowListeners.get('scroll')();
  flushFrames(fixture);
  assert.equal(fixture.aside.inert, false, 'the rail becomes available again after the collision ends');
  assert.equal(fixture.aside.classList.contains('opacity-100'), true);
  assert.equal(fixture.aside.classList.contains('pointer-events-auto'), true);
});

test('collision focus transfer scrolls an offscreen heading into view', () => {
  const fixture = createFixture();
  fixture.heading.rect = { left: 0, right: 600, top: 1200, bottom: 1230, height: 30 };
  loadTableOfContents(fixture);
  flushFrames(fixture);

  fixture.title.rect.bottom = 80;
  fixture.windowListeners.get('scroll')();
  flushFrames(fixture);
  fixture.link.focus();
  flushFrames(fixture);

  const collision = new TestElement('aside');
  collision.document = fixture.document;
  collision.rect = { left: 500, right: 800, top: 100, bottom: 150, height: 50 };
  fixture.post.selectorResults['.sidenote, figure.full-bleed'].push(collision);
  fixture.windowListeners.get('scroll')();
  flushFrames(fixture);

  assert.equal(fixture.document.activeElement, fixture.heading);
  assert.equal(fixture.scrollCalls.length, 1);
  assert.equal(fixture.scrollCalls[0].top, 230, 'scrolls only enough to reveal the heading');
  assert.equal(fixture.scrollCalls[0].behavior, 'instant');
  assert.ok(fixture.heading.rect.top >= 0 && fixture.heading.rect.bottom <= fixture.window.innerHeight);
  assert.equal(fixture.heading.focusOptions.preventScroll, true);
});

test('the rail is inert when the viewport cannot fit it and returns when space is available', () => {
  const fixture = createFixture();
  fixture.window.innerHeight = 100;
  loadTableOfContents(fixture);
  flushFrames(fixture);

  assert.equal(fixture.aside.inert, true);
  assert.equal(fixture.aside.classList.contains('opacity-0'), true);

  fixture.window.innerHeight = 1000;
  fixture.windowListeners.get('resize')();
  flushFrames(fixture);

  assert.equal(fixture.aside.inert, false);
  assert.equal(fixture.aside.classList.contains('opacity-100'), true);
});


test('breakpoint focus transfer scrolls an offscreen heading into view', () => {
  const fixture = createFixture();
  fixture.heading.rect = { left: 0, right: 600, top: -250, bottom: -220, height: 30 };
  fixture.window.scrollY = 1000;
  loadTableOfContents(fixture);
  flushFrames(fixture);

  fixture.title.rect.bottom = 80;
  fixture.windowListeners.get('scroll')();
  flushFrames(fixture);
  fixture.link.focus();
  flushFrames(fixture);

  fixture.desktopQuery.matches = false;
  fixture.desktopQueryListeners.get('change')();
  flushFrames(fixture);

  assert.equal(fixture.document.activeElement, fixture.heading);
  assert.equal(fixture.aside.inert, true);
  assert.equal(fixture.scrollCalls.length, 1);
  assert.equal(fixture.scrollCalls[0].top, 750, 'scrolls upward only enough to reveal the heading');
  assert.ok(fixture.heading.rect.top >= 0 && fixture.heading.rect.bottom <= fixture.window.innerHeight);
  assert.equal(fixture.heading.focusOptions.preventScroll, true);
});

test('no-JavaScript TOC uses in-flow details at every width and hides the desktop rail', () => {
  const partial = readFileSync(path.join(__dirname, '../../layouts/_partials/table-of-contents.html'), 'utf8');
  const mobileToc = partial.match(/<details class="[^>]*>/)?.[0];
  const desktopToc = partial.match(/<aside\s+class="[^>]*>/)?.[0];
  assert.ok(mobileToc, 'the in-flow details fallback is present');
  assert.ok(desktopToc, 'the desktop rail is present');
  assert.match(mobileToc, /\[html\.no-js_&\]:block/, 'the details override responsive hiding without JavaScript');
  assert.doesNotMatch(mobileToc, /\bfixed\b/, 'the fallback remains in document flow');
  assert.match(mobileToc, /\{\{ if eq \.Section "blog" \}\}lg:hidden/);
  assert.match(mobileToc, /\{\{ else \}\}xl:hidden/);
  assert.match(desktopToc, /\[html\.no-js_&\]:hidden/, 'the fixed rail is hidden without JavaScript');
  assert.match(desktopToc, /\{\{ if eq \.Section "blog" \}\}lg:block/);
  assert.match(desktopToc, /\{\{ else \}\}xl:block/);
});

test('short article content keeps the desktop rail aligned with the visible title', () => {
  const fixture = createFixture();
  fixture.postContent.rect.bottom = 250;
  loadTableOfContents(fixture);
  flushFrames(fixture);

  assert.equal(fixture.aside.style['--toc-top'], '200px');
});

test('the desktop rail stays at its safe viewport position after scrolling past the article', () => {
  const fixture = createFixture();
  loadTableOfContents(fixture);
  flushFrames(fixture);

  fixture.title.rect.top = -100;
  fixture.title.rect.bottom = -60;
  fixture.postContent.rect.bottom = -100;
  fixture.windowListeners.get('scroll')();
  flushFrames(fixture);

  assert.equal(fixture.aside.style['--toc-top'], '80px');
});

test('the desktop rail starts at the visible title and follows it up to its fixed position', () => {
  const fixture = createFixture();
  fixture.title.rect = { left: 0, right: 600, top: 220, bottom: 260, height: 40 };
  loadTableOfContents(fixture);
  flushFrames(fixture);

  assert.equal(fixture.aside.style['--toc-top'], '220px');
  assert.equal(fixture.aside.inert, false);

  fixture.title.rect.top = 120;
  fixture.title.rect.bottom = 160;
  fixture.windowListeners.get('scroll')();
  flushFrames(fixture);
  assert.equal(fixture.aside.style['--toc-top'], '120px');

  fixture.title.rect.top = 60;
  fixture.title.rect.bottom = 100;
  fixture.windowListeners.get('scroll')();
  flushFrames(fixture);
  assert.equal(fixture.aside.style['--toc-top'], '80px');
});

test('the desktop rail hides when the title is below a short viewport', () => {
  const fixture = createFixture();
  fixture.window.innerHeight = 800;
  fixture.title.rect = { left: 0, right: 600, top: 850, bottom: 890, height: 40 };
  loadTableOfContents(fixture);
  flushFrames(fixture);

  assert.equal(fixture.aside.style['--toc-top'], '850px');
  assert.equal(fixture.aside.style['--toc-max-height'], '0px');
  assert.equal(fixture.aside.inert, true);
  assert.equal(fixture.aside.classList.contains('opacity-0'), true);
});

test('TOC link navigation does not animate when reduced motion is requested', () => {
  const fixture = createFixture();
  fixture.window.matchMedia = query => query.includes('prefers-reduced-motion')
    ? { matches: true, addEventListener() {} }
    : fixture.desktopQuery;
  loadTableOfContents(fixture);

  let prevented = false;
  fixture.link.dispatch('click', { preventDefault() { prevented = true; } });

  assert.equal(prevented, true);
  assert.equal(fixture.scrollCalls[0].behavior, 'auto');
});
