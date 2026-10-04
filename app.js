'use strict';

(() => {
  const $ = (selector) => document.querySelector(selector);
  const grid = $('#animal-grid');
  const search = $('#search-input');
  const dialog = $('#animal-dialog');
  const filters = [...document.querySelectorAll('[data-category]')];
  const state = { animals: [], category: 'all', query: '', animal: null, image: 0, trigger: null, scroll: 0, loaded: false };
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = (node, frames, duration = 220) => {
    if (reducedMotion()) return null;
    node.getAnimations().forEach((motion) => motion.cancel());
    return node.animate(frames, { duration, easing: 'cubic-bezier(.22,.68,0,1)' });
  };
  let closing = false;
  let imageDirection = 0;
  const indexLabel = (index) => String(index + 1).padStart(2, '0');
  const normalized = (value) => String(value || '').normalize('NFKC').toLocaleLowerCase().trim();
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  // Only use local photo paths; content is inserted as text, never as HTML.
  const photoPath = (value) => {
    if (typeof value !== 'string' || !value.trim()) return '';
    const url = new URL(value, document.baseURI);
    return url.origin === location.origin && ['http:', 'https:', 'file:'].includes(url.protocol) ? url.href : '';
  };

  function createCard(animal, index) {
    const article = element('article', 'animal-card');
    const button = element('button', 'card-button');
    button.type = 'button';
    button.setAttribute('aria-label', `查看${animal.name}的照片与分类资料${animal.uncertain ? '，物种待确认' : ''}`);
    button.setAttribute('aria-haspopup', 'dialog');
    const frame = element('div', 'card-photo');
    const photo = animal.images[0];
    if (photo) {
      const image = element('img');
      image.src = photoPath(photo.thumb || photo.src);
      image.alt = photo.alt || animal.name;
      image.loading = index < 4 ? 'eager' : 'lazy';
      image.decoding = 'async';
      frame.append(image);
      if (animal.images.length > 1) frame.append(element('span', 'photo-count', `${animal.images.length} 张影像`));
    } else {
      frame.append(element('span', 'card-en', '影像待补充'));
    }
    const heading = element('div', 'card-heading');
    const number = element('span', 'card-number', indexLabel(index));
    number.setAttribute('aria-hidden', 'true');
    heading.append(number, element('h3', '', animal.name));
    const metadata = element('div', 'card-meta');
    metadata.append(element('span', '', animal.family));
    if (animal.uncertain) metadata.append(element('span', 'uncertain', '待确认'));
    button.append(frame, heading, element('p', 'card-en', animal.en), metadata);
    button.addEventListener('click', () => openDetail(animal, index, button));
    article.append(button);
    return article;
  }

  function render() {
    const query = normalized(state.query);
    const matches = state.animals.map((animal, index) => ({ animal, index })).filter(({ animal }) =>
      (state.category === 'all' || animal.category === state.category) &&
      (!query || [animal.name, animal.en, animal.family].some((value) => normalized(value).includes(query)))
    );
    const fragment = document.createDocumentFragment();
    matches.forEach(({ animal, index }) => fragment.append(createCard(animal, index)));
    grid.replaceChildren(fragment);
    animate(grid, [{ opacity: .35, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], 180);
    $('#empty-state').hidden = matches.length !== 0;
    $('#empty-title').textContent = state.animals.length ? '未找到匹配条目' : '暂无观察记录';
    $('#empty-description').textContent = state.animals.length ? '请调整检索词或分类条件。' : '影像与分类资料尚未录入。';
    $('#reset-filters').hidden = state.animals.length === 0;
    $('#result-status').textContent = `收录 ${state.animals.length} 条 · 当前 ${matches.length} 条`;
    $('#clear-search').hidden = search.value.length === 0;
    filters.forEach((button) => {
      const active = button.dataset.category === state.category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function showImage() {
    const photos = state.animal.images;
    const previous = $('#detail-image');
    const photo = photos[state.image];
    // A fresh node cannot retain pixels from the previous animal.
    const image = new Image();
    image.id = 'detail-image';
    image.hidden = true;
    image.alt = photo ? (photo.alt || `${state.animal.name}，第 ${state.image + 1} 张照片`) : '';
    previous.replaceWith(image);
    const frame = image.parentElement;
    let status = frame.querySelector('[role="status"]');
    if (!status) {
      status = element('p', 'identification');
      status.setAttribute('role', 'status');
      frame.append(status);
    }
    status.hidden = false;
    status.textContent = photo ? '图片加载中…' : '影像待补充';
    frame.setAttribute('aria-busy', String(Boolean(photo)));
    const isCurrent = () => image.isConnected && $('#detail-image') === image;
    image.onerror = () => {
      if (!isCurrent()) return;
      frame.setAttribute('aria-busy', 'false');
      status.textContent = '图片暂时无法载入。';
    };
    image.onload = async () => {
      try { await image.decode(); } catch (_) { image.onerror(); return; }
      if (!isCurrent()) return;
      frame.setAttribute('aria-busy', 'false');
      status.hidden = true;
      image.hidden = false;
      animate(image, [{ opacity: 0, transform: `translateX(${imageDirection * 28}px)` }, { opacity: 1, transform: 'translateX(0)' }], 220);
    };
    if (photo) image.src = photoPath(photo.src);
    $('#image-count').textContent = photo ? `${String(state.image + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}` : '影像待补充';

  }

  function openDetail(animal, index, trigger) {
    if (dialog.open) return;
    state.animal = animal;
    state.image = 0;
    imageDirection = 0;
    state.trigger = trigger;
    state.scroll = window.scrollY;
    $('#detail-index').textContent = `COLLECTION / ${indexLabel(index)}`;
    $('#detail-name').textContent = animal.name;
    $('#detail-en').textContent = animal.en;
    $('#detail-family').textContent = animal.family;
    $('#detail-intro').textContent = animal.intro;
    $('#detail-uncertain').hidden = !animal.uncertain;
    $('#detail-identification').hidden = !animal.uncertain;
    showImage();
    document.body.style.position = 'fixed';
    document.body.style.top = `-${state.scroll}px`;
    document.body.style.width = '100%';
    dialog.showModal();
    animate(dialog, [{ opacity: 0, transform: 'translateY(20px) scale(.985)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], 240);
    dialog.scrollTop = 0;
    $('#close-dialog').focus({ preventScroll: true });
  }

  function turnImage(step) {
    if (!state.animal || closing) return;
    const next = state.image + step;
    if (next < 0 || next >= state.animal.images.length) return;
    imageDirection = step;
    state.image = next;
    showImage();
  }

  function closeDetail() {
    if (!dialog.open || closing) return;
    closing = true;
    dialog.classList.add('is-closing');
    const motion = animate(dialog, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(14px)' }], 170);
    if (motion) motion.finished.catch(() => {}).then(() => { if (dialog.open) dialog.close(); });
    else dialog.close();
  }
  $('#close-dialog').addEventListener('click', closeDetail);
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeDetail(); });
  dialog.addEventListener('close', () => {
    closing = false;
    dialog.classList.remove('is-closing');
    dialog.getAnimations().forEach((motion) => motion.cancel());
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, state.scroll);
    document.documentElement.style.scrollBehavior = previousBehavior;
    if (state.trigger?.isConnected) state.trigger.focus({ preventScroll: true });
    state.animal = null;
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDetail();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); turnImage(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); turnImage(1); }
    // Escape and focus containment are provided by the native modal dialog.
  });
  const swipeSurface = $('.detail-photo');
  let gesture = null;
  swipeSurface.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || closing || !state.animal || state.animal.images.length < 2) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, animal: state.animal };
    if (event.isTrusted) swipeSurface.setPointerCapture(event.pointerId);
  });
  swipeSurface.addEventListener('pointermove', (event) => {
    if (!gesture || gesture.id !== event.pointerId || reducedMotion()) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (Math.abs(dx) <= Math.abs(dy) * 1.5) return;
    const image = $('#detail-image');
    image.getAnimations().forEach((motion) => motion.cancel());
    const edge = (dx > 0 && state.image === 0) || (dx < 0 && state.image === state.animal.images.length - 1);
    image.style.transform = `translateX(${Math.max(-120, Math.min(120, dx * (edge ? .15 : .55)))}px)`;
  });
  function resetDrag() {
    const image = $('#detail-image');
    const start = image.style.transform;
    image.style.transform = '';
    if (start) animate(image, [{ transform: start }, { transform: 'translateX(0)' }], 180);
  }
  swipeSurface.addEventListener('pointerup', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const start = gesture;
    gesture = null;
    resetDrag();
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (dialog.open && state.animal === start.animal && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) turnImage(dx < 0 ? 1 : -1);
  });
  swipeSurface.addEventListener('pointercancel', () => { gesture = null; resetDrag(); });
  swipeSurface.addEventListener('lostpointercapture', () => { if (gesture) { gesture = null; resetDrag(); } });
  swipeSurface.addEventListener('dragstart', (event) => event.preventDefault());
  dialog.addEventListener('close', () => { gesture = null; });
  filters.forEach((button) => button.addEventListener('click', () => {
    if (!state.loaded) return;
    state.category = button.dataset.category;
    render();
  }));
  $('#search-form').addEventListener('submit', (event) => event.preventDefault());
  search.addEventListener('input', () => {
    if (!state.loaded) return;
    state.query = search.value;
    render();
  });
  $('#clear-search').addEventListener('click', () => {
    search.value = '';
    state.query = '';
    render();
    search.focus();
  });
  $('#reset-filters').addEventListener('click', () => {
    if (!state.loaded) { load(); return; }
    state.category = 'all';
    state.query = '';
    search.value = '';
    render();
    filters[0].focus();
  });

  async function load() {
    grid.setAttribute('aria-busy', 'true');
    $('#empty-state').hidden = true;
    $('#result-status').textContent = '正在载入观察记录…';
    try {
      const dataUrl = new URL('animals.json', document.baseURI);
      dataUrl.searchParams.set('v', new URL(location.href).searchParams.get('v') || String(Date.now()));
      const response = await fetch(dataUrl.href, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Collection request failed: ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('The collection must be an array.');
      state.animals = data.map((animal) => ({
        ...animal,
        name: String(animal.name || '未命名动物'),
        en: String(animal.en || ''),
        family: String(animal.family || ''),
        intro: String(animal.intro || ''),
        uncertain: Boolean(animal.uncertain),
        images: Array.isArray(animal.images) ? animal.images.filter((photo) => photo && photoPath(photo.src)) : []
      }));
      state.loaded = true;
      state.query = search.value;
      document.querySelectorAll('[data-count]').forEach((count) => {
        count.textContent = count.dataset.count === 'all' ? state.animals.length : state.animals.filter((animal) => animal.category === count.dataset.count).length;
      });
      render();
    } catch (error) {
      console.error('Unable to load field notes:', error);
      $('#result-status').textContent = '资料暂时无法载入';
      $('#empty-title').textContent = '数据加载失败';
      $('#empty-description').textContent = '请检查网络连接，然后再试一次。';
      $('#reset-filters').textContent = '重新载入';
      $('#reset-filters').hidden = false;
      $('#empty-state').hidden = false;
    } finally {
      grid.setAttribute('aria-busy', 'false');
    }
  }
  load();
})();
