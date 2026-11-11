const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class TestTextNode {
  constructor(text) {
    this.text = text;
    this.parentElement = null;
  }

  get textContent() {
    return this.text;
  }

  cloneNode() {
    return new TestTextNode(this.text);
  }
}

class TestElement {
  constructor(tagName, attributes = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(Object.entries(attributes));
    this.children = [];
    this.parentElement = null;
    this.style = {};
    this.rect = { left: 0, right: 600, top: 0, height: 20 };
    this.listeners = new Map();
    this.listenerCounts = new Map();
  }

  get id() {
    return this.getAttribute('id') || '';
  }

  set id(value) {
    this.setAttribute('id', value);
  }

  get className() {
    return this.getAttribute('class') || '';
  }

  set className(value) {
    this.setAttribute('class', value);
  }

  get classList() {
    return {
      add: name => this.setAttribute('class', [...new Set([...this.className.split(/\s+/).filter(Boolean), name])].join(' ')),
      remove: name => this.setAttribute('class', this.className.split(/\s+/).filter(item => item && item !== name).join(' ')),
      contains: name => this.className.split(/\s+/).includes(name),
    };
  }

  get childNodes() {
    return this.children;
  }

  contains(element) {
    for (let current = element; current; current = current.parentElement) {
      if (current === this) return true;
    }
    return false;
  }

  get firstChild() {
    return this.children[0] || null;
  }

  get textContent() {
    return this.children.map(child => child.textContent).join('');
  }

  set textContent(value) {
    this.children.forEach(child => { child.parentElement = null; });
    this.children = [new TestTextNode(String(value))];
    this.children[0].parentElement = this;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(child) {
    if (child.parentElement) {
      const siblings = child.parentElement.children;
      siblings.splice(siblings.indexOf(child), 1);
    }
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (this.parentElement) {
      let document = this;
      while (document && document.tagName !== 'DOCUMENT') document = document.parentElement;
      if (document?.activeElement && this.contains(document.activeElement)) {
        document.activeElement = document.body;
      }
      const siblings = this.parentElement.children;
      siblings.splice(siblings.indexOf(this), 1);
      this.parentElement = null;
    }
  }

  addEventListener(type, callback) {
    this.listenerCounts.set(type, (this.listenerCounts.get(type) || 0) + 1);
    this.listeners.set(type, callback);
  }

  getBoundingClientRect() {
    return this.rect;
  }

  focus() {
    let document = this;
    while (document && document.tagName !== 'DOCUMENT') document = document.parentElement;
    if (document) document.activeElement = this;
  }

  scrollIntoView() {
    this.scrollCount = (this.scrollCount || 0) + 1;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(',').map(item => item.trim());
    const matches = element => selectors.some(part => {
      if (part === 'ol > li') return element.tagName === 'LI' && element.parentElement?.tagName === 'OL';
      if (part === '[id]') return element.hasAttribute('id');
      const idPrefix = part.match(/^sup\[id\^="(.+)"\]$/);
      if (idPrefix) return element.tagName === 'SUP' && element.id.startsWith(idPrefix[1]);
      if (part.startsWith('.')) return element.classList.contains(part.slice(1));
      return element.tagName === part.toUpperCase();
    });
    const found = [];
    const visit = element => {
      for (const child of element.children) {
        if (child instanceof TestElement) {
          if (matches(child)) found.push(child);
          visit(child);
        }
      }
    };
    visit(this);
    return found;
  }

  cloneNode(deep = false) {
    const clone = new TestElement(this.tagName, Object.fromEntries(this.attributes));
    clone.rect = { ...this.rect };
    if (deep) {
      this.children.forEach(child => clone.appendChild(child.cloneNode(true)));
    }
    return clone;
  }
}

class TestDocument extends TestElement {
  constructor() {
    super('document');
    this.readyState = 'complete';
    this.body = new TestElement('body');
    this.appendChild(this.body);
    this.activeElement = this.body;
  }

  createElement(tagName) {
    return new TestElement(tagName);
  }

  createTextNode(text) {
    return new TestTextNode(text);
  }

  getElementById(id) {
    return this.querySelectorAll('[id]').find(element => element.id === id) || null;
  }
}

function createFixture() {
  const document = new TestDocument();
  const post = new TestElement('article', { class: 'post' });
  post.rect = { left: 0, right: 1200, top: 0, height: 900 };
  const postContent = new TestElement('div', { class: 'post-content' });
  const paragraph = new TestElement('p');
  const firstReference = new TestElement('sup', { id: 'fnref:1' });
  firstReference.rect = { left: 600, right: 610, top: 100, height: 16 };
  const firstReferenceLink = new TestElement('a', { href: '#fn:1', role: 'doc-noteref' });
  firstReferenceLink.textContent = '1';
  firstReference.appendChild(firstReferenceLink);
  const repeatedReference = new TestElement('sup', { id: 'fnref1:1' });
  repeatedReference.rect = { left: 600, right: 610, top: 160, height: 16 };
  const repeatedReferenceLink = new TestElement('a', { href: '#fn:1', role: 'doc-noteref' });
  repeatedReferenceLink.textContent = '1';
  repeatedReference.appendChild(repeatedReferenceLink);
  const secondReference = new TestElement('sup', { id: 'fnref:2' });
  secondReference.rect = { left: 600, right: 610, top: 240, height: 16 };
  const secondReferenceLink = new TestElement('a', { href: '#fn:2', role: 'doc-noteref' });
  secondReferenceLink.textContent = '2';
  secondReference.appendChild(secondReferenceLink);
  paragraph.appendChild(firstReference);
  paragraph.appendChild(repeatedReference);
  paragraph.appendChild(secondReference);
  postContent.appendChild(paragraph);

  const footnotes = new TestElement('div', { class: 'footnotes' });
  const list = new TestElement('ol');
  const firstItem = new TestElement('li', { id: 'fn:1' });
  const firstNoteParagraph = new TestElement('p');
  firstNoteParagraph.appendChild(new TestTextNode('First note '));
  const detail = new TestElement('span', { id: 'note-detail' });
  detail.textContent = 'with a linked detail';
  firstNoteParagraph.appendChild(detail);
  const firstBackref = new TestElement('a', {
    href: '#fnref:1',
    class: 'footnote-backref',
    role: 'doc-backlink',
  });
  firstBackref.textContent = '↩';
  const repeatedBackref = new TestElement('a', {
    href: '#fnref1:1',
    class: 'footnote-backref',
    role: 'doc-backlink',
  });
  repeatedBackref.textContent = '↩';
  firstNoteParagraph.appendChild(firstBackref);
  firstNoteParagraph.appendChild(repeatedBackref);
  firstItem.appendChild(firstNoteParagraph);
  list.appendChild(firstItem);
  const secondItem = new TestElement('li', { id: 'fn:2' });
  const secondNoteParagraph = new TestElement('p');
  secondNoteParagraph.appendChild(new TestTextNode('Second note '));
  const secondBackref = new TestElement('a', {
    href: '#fnref:2',
    class: 'footnote-backref',
    role: 'doc-backlink',
  });
  secondBackref.textContent = '↩';
  secondNoteParagraph.appendChild(secondBackref);
  secondItem.appendChild(secondNoteParagraph);
  list.appendChild(secondItem);
  footnotes.appendChild(list);
  post.appendChild(postContent);
  post.appendChild(footnotes);
  document.body.appendChild(post);

  const mediaQuery = {
    matches: true,
    listener: null,
    addEventListener(type, callback) {
      if (type === 'change') this.listener = callback;
    },
    change(matches) {
      this.matches = matches;
      this.listener({ matches });
    },
  };
  const window = {
    innerWidth: 1200,
    location: { hash: '' },
    listeners: new Map(),
    matchMedia: () => mediaQuery,
    addEventListener(type, callback) {
      this.listeners.set(type, callback);
    },
  };

  return { document, footnotes, firstItem, secondItem, detail, firstReference, firstReferenceLink, repeatedReference, repeatedReferenceLink, secondReference, secondReferenceLink, firstBackref, repeatedBackref, secondBackref, mediaQuery, window };
}

function assertUniqueIds(document) {
  const ids = document.querySelectorAll('[id]').map(element => element.id);
  assert.equal(new Set(ids).size, ids.length, 'every document ID is unique');
}

function loadSidenotes(fixture) {
  const script = readFileSync(path.join(__dirname, 'sidenotes.js'), 'utf8');
  const timeouts = new Map();
  let nextTimeoutId = 0;
  vm.runInNewContext(script, {
    document: fixture.document,
    window: fixture.window,
    setTimeout(callback) {
      const id = ++nextTimeoutId;
      timeouts.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      timeouts.delete(id);
    },
  });
  return {
    flush() {
      const callbacks = [...timeouts.values()];
      timeouts.clear();
      callbacks.forEach(callback => callback());
    },
  };
}

test('footnote fragment targets and backrefs follow sidenotes across viewport changes', () => {
  const fixture = createFixture();
  assert.deepEqual(
    fixture.document.querySelectorAll('sup[id^="fnref"]').map(reference => reference.id),
    ['fnref:1', 'fnref1:1', 'fnref:2'],
  );
  loadSidenotes(fixture);

  const [sidenote, secondSidenote] = fixture.document.querySelectorAll('.sidenote');
  assert.ok(sidenote);
  assert.ok(secondSidenote);
  assert.equal(fixture.document.querySelectorAll('.sidenote').length, 2);
  assert.equal(fixture.document.getElementById(fixture.firstReferenceLink.getAttribute('href').slice(1)), sidenote);
  assert.equal(fixture.document.getElementById('fn:1'), sidenote);
  assert.equal(fixture.firstItem.hasAttribute('id'), false);
  assert.equal(sidenote.getAttribute('role'), 'doc-endnote');
  assert.equal(fixture.firstReferenceLink.getAttribute('role'), 'doc-noteref');
  assert.equal(fixture.document.getElementById('note-detail'), sidenote.querySelector('[id]'));
  const sidenoteBackref = sidenote.querySelector('.footnote-backref');
  assert.equal(sidenoteBackref.getAttribute('role'), 'doc-backlink');
  assert.equal(fixture.document.getElementById(sidenoteBackref.getAttribute('href').slice(1)), fixture.firstReference);
  const repeatedSidenoteBackref = sidenote.querySelectorAll('.footnote-backref')[1];
  assert.equal(fixture.document.getElementById(repeatedSidenoteBackref.getAttribute('href').slice(1)), fixture.repeatedReference);
  assert.equal(fixture.repeatedReferenceLink.getAttribute('role'), 'doc-noteref');
  assert.equal(fixture.document.getElementById(fixture.repeatedReferenceLink.getAttribute('href').slice(1)), sidenote);
  assert.equal(fixture.document.getElementById(fixture.secondReferenceLink.getAttribute('href').slice(1)), secondSidenote);
  assert.equal(fixture.document.getElementById('fn:2'), secondSidenote);
  assert.equal(secondSidenote.style.top, '240px');
  assert.equal(fixture.document.getElementById(fixture.secondBackref.getAttribute('href').slice(1)), fixture.secondReference);
  fixture.repeatedReference.listeners.get('mouseenter')();
  assert.equal(sidenote.classList.contains('sidenote-highlight'), true);
  fixture.repeatedReference.listeners.get('mouseleave')();
  assert.equal(sidenote.classList.contains('sidenote-highlight'), false);
  assert.equal(fixture.repeatedReference.listenerCounts.get('mouseenter'), 1);
  assert.equal(fixture.repeatedReference.listenerCounts.get('mouseleave'), 1);
  assertUniqueIds(fixture.document);

  fixture.mediaQuery.change(false);
  assert.equal(fixture.document.querySelector('.sidenote'), null);
  assert.equal(fixture.footnotes.classList.contains('sidenotes-active'), false);
  assert.equal(fixture.document.getElementById(fixture.firstReferenceLink.getAttribute('href').slice(1)), fixture.firstItem);
  assert.equal(fixture.document.getElementById('fn:1'), fixture.firstItem);
  assert.equal(fixture.document.getElementById('fn:2'), fixture.secondItem);
  assert.equal(fixture.firstItem.querySelector('[id]'), fixture.detail);
  assert.equal(fixture.document.getElementById('note-detail'), fixture.detail);
  assert.equal(fixture.document.getElementById(fixture.firstBackref.getAttribute('href').slice(1)), fixture.firstReference);
  assert.equal(fixture.firstBackref.getAttribute('href'), '#fnref:1');
  assert.equal(fixture.document.getElementById(fixture.repeatedBackref.getAttribute('href').slice(1)), fixture.repeatedReference);
  assert.equal(fixture.repeatedBackref.getAttribute('href'), '#fnref1:1');
  assert.equal(fixture.document.getElementById(fixture.secondBackref.getAttribute('href').slice(1)), fixture.secondReference);
  assertUniqueIds(fixture.document);

  fixture.mediaQuery.change(true);
  const recreatedSidenote = fixture.document.querySelector('.sidenote');
  assert.ok(recreatedSidenote);
  assert.equal(fixture.document.querySelectorAll('.sidenote').length, 2);
  assert.equal(fixture.document.getElementById('fn:1'), recreatedSidenote);
  assert.equal(fixture.document.getElementById(fixture.firstReferenceLink.getAttribute('href').slice(1)), recreatedSidenote);
  assert.equal(fixture.document.getElementById(fixture.repeatedReferenceLink.getAttribute('href').slice(1)), recreatedSidenote);
  assert.equal(fixture.document.getElementById(fixture.secondReferenceLink.getAttribute('href').slice(1)), fixture.document.getElementById('fn:2'));
  assertUniqueIds(fixture.document);
});

test('keeps focus on a sidenote link when resizing or changing layouts', () => {
  const fixture = createFixture();
  const timers = loadSidenotes(fixture);
  const originalBackref = fixture.document.querySelector('.sidenote').querySelectorAll('.footnote-backref')[1];
  originalBackref.focus();

  fixture.window.listeners.get('resize')();
  timers.flush();

  const resizedBackref = fixture.document.querySelector('.sidenote').querySelectorAll('.footnote-backref')[1];
  assert.notEqual(resizedBackref, originalBackref);
  assert.equal(fixture.document.activeElement, resizedBackref);
  assert.equal(fixture.repeatedReference.listenerCounts.get('mouseenter'), 1);
  assert.equal(fixture.repeatedReference.listenerCounts.get('mouseleave'), 1);

  fixture.mediaQuery.change(false);
  assert.equal(fixture.document.activeElement, fixture.repeatedBackref);

  fixture.mediaQuery.change(true);
  const restoredBackref = fixture.document.querySelector('.sidenote').querySelectorAll('.footnote-backref')[1];
  assert.equal(fixture.document.activeElement, restoredBackref);
});

test('sidenote backrefs are not hidden by the stylesheet', () => {
  const css = readFileSync(path.join(__dirname, '../css/henry.css'), 'utf8');
  assert.doesNotMatch(css, /\.sidenote\s+\.footnote-backref\s*\{[^}]*\bhidden\b/s);
});

test('scrolls an initial fragment target into the visible sidenote', () => {
  const fixture = createFixture();
  fixture.document.readyState = 'interactive';
  fixture.window.location.hash = '#fn:1';
  loadSidenotes(fixture);
  assert.equal(fixture.document.querySelector('.sidenote'), null);
  fixture.window.listeners.get('load')();

  const target = fixture.document.getElementById('fn:1');
  assert.ok(target.classList.contains('sidenote'));
  assert.equal(target.scrollCount, 1);
});
