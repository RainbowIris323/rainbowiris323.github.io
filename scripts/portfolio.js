const filterButtons = document.querySelectorAll('.filters .chip');
const cards = document.querySelectorAll('.grid .card');

function getTags(card) {
  const tags = (card.dataset.tags || '').trim().split(/\s+/).filter(Boolean);
  const order = (tag) => (TECH[tag] && TECH[tag].kind === 'tech' ? 0 : 1);
  return tags.sort((a, b) => order(a) - order(b));
}

function buildTagList(tags, className) {
  const list = document.createElement('ul');
  list.className = className;

  tags.forEach((tag) => {
    const tech = TECH[tag];
    const item = document.createElement('li');
    item.className = `tag tag--${tech ? tech.kind : 'other'}`;
    item.innerHTML = techIcon(tag);
    item.append(tech ? tech.label : tag);
    list.append(item);
  });

  return list;
}

function applyFilter(filter) {
  cards.forEach((card) => {
    if (!card.dataset.tags) return;
    const matches = filter === 'all' || getTags(card).includes(filter);
    card.classList.toggle('is-hidden', !matches);
  });
}

function setActiveButton(activeButton) {
  filterButtons.forEach((button) => {
    const isActive = button === activeButton;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

filterButtons.forEach((button) => {
  button.insertAdjacentHTML('afterbegin', techIcon(button.dataset.filter));

  button.addEventListener('click', () => {
    setActiveButton(button);
    applyFilter(button.dataset.filter);
  });
});

cards.forEach((card) => {
  if (!card.dataset.tags) return;
  card.classList.add('card--project');

  const body = card.querySelector('.card-body');
  const link = body.querySelector('.text-link');
  body.insertBefore(buildTagList(getTags(card), 'card-tags'), link);

  const title = card.querySelector('.card-title');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'card-open';
  button.setAttribute('aria-haspopup', 'dialog');
  button.textContent = title.textContent;
  title.replaceChildren(button);

  button.addEventListener('click', () => openProject(card));
});

const modal = document.getElementById('project-modal');
const modalScroll = modal.querySelector('.modal-inner');
const mediaBox = modal.querySelector('.modal-media');
const stage = modal.querySelector('.media-stage');
const thumbs = modal.querySelector('.media-thumbs');
const navButtons = modal.querySelectorAll('.media-nav');
const modalTitle = modal.querySelector('.modal-title');
const modalMeta = modal.querySelector('.modal-meta');
const modalTags = modal.querySelector('.modal-tags');
const modalDescription = modal.querySelector('.modal-description');
const modalLinks = modal.querySelector('.modal-links');

let media = [];
let current = 0;

function youtubeId(url) {
  const match = (url || '').match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|shorts\/|live\/|watch\?(?:.*&)?v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

function collectMedia(card, details) {
  const videos = [];
  const images = [];
  const seen = new Set();

  function add(list, item) {
    if (!item.src || seen.has(item.src)) return;
    seen.add(item.src);
    list.push(item);
  }

  const cardImage = card.querySelector(':scope > img');
  if (cardImage) {
    add(images, { type: 'image', src: cardImage.getAttribute('src'), alt: cardImage.alt });
  }

  const listed = details ? details.querySelectorAll('.details-media > *') : [];
  listed.forEach((el) => {
    if (el.matches('img')) {
      add(images, { type: 'image', src: el.getAttribute('src'), alt: el.alt });
      return;
    }

    const src = el.getAttribute('src')
      || el.getAttribute('href')
      || el.dataset.youtube
      || (el.querySelector('source') && el.querySelector('source').getAttribute('src'));
    const id = youtubeId(src) || (/^[\w-]{11}$/.test(src || '') && el.dataset.youtube ? src : null);

    if (id) {
      add(videos, { type: 'youtube', src: id, alt: el.title || 'YouTube video' });
    } else if (el.matches('video')) {
      add(videos, { type: 'video', src, alt: el.title || 'Video', poster: el.getAttribute('poster') });
    }
  });

  return [...videos, ...images];
}

function createStageElement(item) {
  if (item.type === 'video') {
    const video = document.createElement('video');
    video.src = item.src;
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = true;
    if (item.poster) video.poster = item.poster;
    return video;
  }

  if (item.type === 'youtube') {
    if (location.protocol === 'file:') {
      const link = document.createElement('a');
      link.className = 'youtube-fallback';
      link.href = `https://www.youtube.com/watch?v=${item.src}`;
      link.target = '_blank';
      link.rel = 'noopener';
      link.innerHTML = `<img src="https://i.ytimg.com/vi/${item.src}/hqdefault.jpg" alt="">`
        + '<span><i class="fa-brands fa-youtube" aria-hidden="true"></i> Watch on YouTube</span>';
      return link;
    }

    const iframe = document.createElement('iframe');
    const params = `autoplay=1&mute=1&playsinline=1&loop=1&playlist=${item.src}&rel=0`;
    iframe.src = `https://www.youtube-nocookie.com/embed/${item.src}?${params}`;
    iframe.title = item.alt;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    return iframe;
  }

  const img = document.createElement('img');
  img.src = item.src;
  img.alt = item.alt || '';
  return img;
}

function createThumb(item, index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'media-thumb';
  const kind = item.type === 'image' ? 'image' : 'video';
  button.setAttribute('aria-label', `Show ${kind} ${index + 1} of ${media.length}`);

  let preview;
  if (item.type === 'youtube') {
    preview = document.createElement('img');
    preview.src = `https://i.ytimg.com/vi/${item.src}/mqdefault.jpg`;
  } else if (item.type === 'video' && !item.poster) {
    preview = document.createElement('video');
    preview.src = `${item.src}#t=0.1`;
    preview.muted = true;
    preview.preload = 'metadata';
    preview.playsInline = true;
  } else {
    preview = document.createElement('img');
    preview.src = item.poster || item.src;
  }
  if (preview.tagName === 'IMG') preview.alt = '';
  button.append(preview);

  if (kind === 'video') {
    button.insertAdjacentHTML('beforeend',
      '<span class="thumb-play"><i class="fa-solid fa-play" aria-hidden="true"></i></span>');
  }

  button.addEventListener('click', () => showMedia(index));
  return button;
}

function showMedia(index) {
  if (!media.length) return;
  current = (index + media.length) % media.length;

  stage.replaceChildren(createStageElement(media[current]));
  const video = stage.querySelector('video');
  if (video) video.play().catch(() => {});

  thumbs.querySelectorAll('.media-thumb').forEach((thumb, i) => {
    const active = i === current;
    thumb.classList.toggle('active', active);
    thumb.setAttribute('aria-current', String(active));
    if (active) thumb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

function buildLink(source) {
  const link = document.createElement('a');
  link.href = source.href;
  link.className = 'modal-link';
  link.target = '_blank';
  link.rel = 'noopener';

  const host = link.hostname.replace(/^www\./, '');
  const text = source.textContent.replace(/→/g, '').trim();
  const generic = !text || /^view (project|github)/i.test(text);

  let icon = '<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>';
  let label = text;
  if (host.endsWith('roblox.com')) {
    icon = techIcon('roblox');
    if (generic) label = 'Play on Roblox';
  } else if (host === 'github.com') {
    icon = '<i class="fa-brands fa-github" aria-hidden="true"></i>';
    if (generic) label = 'View on GitHub';
  } else if (host === 'mod.io') {
    if (generic) label = 'View on mod.io';
  }

  link.innerHTML = icon;
  link.append(label);
  return link;
}

function openProject(card) {
  const template = card.querySelector('template.card-details');
  const details = template ? template.content.cloneNode(true) : null;

  modalTitle.textContent = card.querySelector('.card-title').textContent;

  const meta = details && details.querySelector('.details-meta');
  modalMeta.replaceChildren(...(meta ? meta.childNodes : []));
  modalMeta.hidden = !meta;

  modalTags.replaceChildren(buildTagList(getTags(card), 'tag-list'));

  const links = [
    ...card.querySelectorAll('.card-body .text-link'),
    ...(details ? details.querySelectorAll('.details-links a') : []),
  ];
  modalLinks.replaceChildren(...links.map(buildLink));
  modalLinks.hidden = links.length === 0;

  media = collectMedia(card, details);
  thumbs.replaceChildren(...media.map(createThumb));
  mediaBox.hidden = media.length === 0;
  thumbs.hidden = media.length < 2;
  navButtons.forEach((button) => { button.hidden = media.length < 2; });

  if (details) {
    details.querySelectorAll('.details-meta, .details-media, .details-links')
      .forEach((el) => el.remove());
  }
  const paragraphs = [...card.querySelectorAll('.card-body > p')].map((p) => p.cloneNode(true));
  modalDescription.replaceChildren(...paragraphs, ...(details ? [details] : []));

  modal.showModal();
  modalScroll.scrollTop = 0;
  showMedia(0);
}

modal.addEventListener('close', () => {
  stage.replaceChildren();
  thumbs.replaceChildren();
  media = [];
});

modal.querySelector('.modal-close').addEventListener('click', () => modal.close());
modal.querySelector('.media-prev').addEventListener('click', () => showMedia(current - 1));
modal.querySelector('.media-next').addEventListener('click', () => showMedia(current + 1));

let pressedOnBackdrop = false;
modal.addEventListener('pointerdown', (event) => { pressedOnBackdrop = event.target === modal; });
modal.addEventListener('click', (event) => {
  if (pressedOnBackdrop && event.target === modal) modal.close();
});

modal.addEventListener('keydown', (event) => {
  if (media.length < 2 || event.target.matches('video, iframe')) return;
  if (event.key === 'ArrowLeft') showMedia(current - 1);
  if (event.key === 'ArrowRight') showMedia(current + 1);
});