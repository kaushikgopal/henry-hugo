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
      setProperty: (name, value) => { this.style[name] = value; },
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
    class: 'opacity-0 pointer-events-none',
    'aria-label': 'Table of contents',
  });
  aside.offsetHeight = 260;
  const scrollArea = element('div', { class: 'table-of-contents-scroll' });
  scrollArea.offsetHeight = 220;
  scrollArea.clientHeight = 220;
  scrollArea.scrollTop = 0;
  const link = element('a', { href: '#section-two' });
  link.offsetTop = 0;
  link.offsetHeight = 20;
  scrollArea.appendChild(link);
  aside.appendChild(scrollArea);
  aside.selectorResults = { '.table-of-contents-scroll': [scrollArea], 'a[href^="#"]': [link] };

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
  const desktopQuery = {
    matches: true,
    addEventListener: (type, callback) => desktopQueryListeners.set(type, callback),
  };
  const window = {
    innerHeight: 1000,
    scrollY: 0,
    location: { hash: '' },
    history: { pushState() {} },
    matchMedia: query => query.includes('prefers-reduced-motion')
      ? { matches: false, addEventListener() {} }
      : desktopQuery,
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

  return { document, aside, link, title, post, postContent, heading, mobileToc, desktopQuery, desktopQueryListeners, frames, scrollCalls, window, windowListeners };
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

test('collision hides an inert rail without changing the mobile fallback and safely moves focus', () => {
  const fixture = createFixture();
  loadTableOfContents(fixture);
  assert.equal(fixture.aside.inert, true, 'the rail is inert before its first visibility update');
  flushFrames(fixture);

  assert.equal(fixture.aside.inert, true, 'links in the visually hidden rail are inert');
  assert.equal(fixture.aside.classList.contains('opacity-0'), true);

  fixture.title.rect.bottom = 80;
  fixture.windowListeners.get('scroll')();
  flushFrames(fixture);
  assert.equal(fixture.aside.inert, false, 'the rail becomes available after the title passes');

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

test('the desktop rail keeps its no-JavaScript visibility fallback', () => {
  const partial = readFileSync(path.join(__dirname, '../../layouts/_partials/table-of-contents.html'), 'utf8');
  assert.match(partial, /\[html\.no-js_&\]:opacity-100/);
  assert.match(partial, /\[html\.no-js_&\]:pointer-events-auto/);
});
