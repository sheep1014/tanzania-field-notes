'use strict';

(() => {
  const $ = (selector) => document.querySelector(selector);
  const grid = $('#animal-grid');
  const search = $('#search-input');
  const dialog = $('#animal-dialog');
  const filters = [...document.querySelectorAll('[data-category]')];
  const state = { animals: [], category: 'all', query: '', animal: null, image: 0, trigger: null, scroll: 0, loaded: false };
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
    button.setAttribute('aria-label', `查看${animal.name}的照片与手记${animal.uncertain ? '，物种待确认' : ''}`);
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
    $('#empty-state').hidden = matches.length !== 0;
    $('#empty-title').textContent = state.animals.length ? '这一页，还没有相遇' : '收藏正在整理中';
    $('#empty-description').textContent = state.animals.length ? '换一个名字，或看看其他类别。' : '新的野外相遇，将在这里留下记录。';
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
    const image = $('#detail-image');
    const photo = photos[state.image];
    image.hidden = !photo;
    if (photo) {
      image.src = photoPath(photo.src);
      image.alt = photo.alt || `${state.animal.name}，第 ${state.image + 1} 张照片`;
    } else {
      image.removeAttribute('src');
      image.alt = '';
    }
    $('#image-count').textContent = photo ? `${String(state.image + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}` : '影像待补充';
    $('#previous-image').disabled = state.image === 0;
    $('#next-image').disabled = state.image >= photos.length - 1;
    $('#previous-image').hidden = photos.length < 2;
    $('#next-image').hidden = photos.length < 2;
    $('#gallery-controls').style.justifyContent = photos.length < 2 ? 'center' : '';
  }

  function openDetail(animal, index, trigger) {
    if (dialog.open) return;
    state.animal = animal;
    state.image = 0;
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
    dialog.scrollTop = 0;
    $('#close-dialog').focus({ preventScroll: true });
  }

  function turnImage(step) {
    if (!state.animal) return;
    const next = state.image + step;
    if (next < 0 || next >= state.animal.images.length) return;
    state.image = next;
    showImage();
  }

  $('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
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
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); turnImage(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); turnImage(1); }
    // Escape and focus containment are provided by the native modal dialog.
  });
  $('#previous-image').addEventListener('click', () => turnImage(-1));
  $('#next-image').addEventListener('click', () => turnImage(1));
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
    $('#result-status').textContent = '正在载入相遇记录…';
    try {
      const response = await fetch('animals.json');
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
      $('#collection-total').textContent = `${state.animals.length} 个动物条目`;
      const coverAnimal = state.animals.find((animal) => animal.images.length && /象|elephant/i.test(`${animal.name} ${animal.en}`)) || state.animals.find((animal) => animal.images.length);
      if (coverAnimal) {
        $('#cover-image').src = photoPath(coverAnimal.images[0].src);
        $('#cover-image').alt = coverAnimal.images[0].alt || coverAnimal.name;
        $('#cover-caption').textContent = coverAnimal.name;
        $('#cover').hidden = false;
      }
      render();
    } catch (error) {
      console.error('Unable to load field notes:', error);
      $('#collection-total').textContent = '暂未载入';
      $('#result-status').textContent = '收藏暂时无法载入';
      $('#empty-title').textContent = '这一页，暂时未能翻开';
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
