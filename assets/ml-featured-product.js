// Constants
const SELECTORS = {
  section: '[data-ml-featured-product]',
  addToCart: '.ml-featured-product__add-to-cart',
  price: '.ml-featured-product__price',
  thumbnail: '.product__thumbnail',
  thumbnailList: '.product__thumbnails-list',
  media: '.product__media',
  cartDrawer: 'cart-drawer',
  variantPicker: 'variant-picker'
};

const DELAYS = {
  photoswipeInit: 500,
  scrollCheck: 150,
  thumbnailSync: 50
};

// PhotoSwipe initialization
function initPhotoSwipe(mediaGallery, gallery) {
  if (!mediaGallery || typeof PhotoSwipeLightbox === 'undefined' || typeof theme === 'undefined' || !theme.settings) {
    return;
  }

  const lightbox = new PhotoSwipeLightbox({
    arrowPrevSVG: '<svg class="pswp__icn icon" stroke="currentColor" fill="none" viewBox="0 0 30 30"><path d="M17.5 7.5L10 15L17.5 22.5"/></svg>',
    arrowNextSVG: '<svg class="pswp__icn icon" stroke="currentColor" fill="none" viewBox="0 0 30 30"><path d="M17.5 7.5L10 15L17.5 22.5"/></svg>',
    closeSVG: '<svg class="pswp__icn icon" stroke="currentColor" fill="none" viewBox="0 0 30 30"><path d="m7.5 22.5 15-15m-15 0 15 15"/></svg>',
    bgOpacity: 1,
    pswpModule: () => import(theme.settings.pswpModule),
    arrowPrevTitle: theme.strings?.previous || 'Previous',
    arrowNextTitle: theme.strings?.next || 'Next',
    closeTitle: theme.strings?.close || 'Close',
    allowPanToNext: false,
    allowMouseDrag: true,
    wheelToZoom: false,
    returnFocus: true,
    zoom: false,
  });

  lightbox.addFilter('thumbEl', (_thumbEl, data) => data.thumbnailElement);
  lightbox.init();

  const mediaItems = gallery.querySelectorAll(SELECTORS.media);
  mediaItems.forEach((item, index) => {
    if (item.getAttribute('data-media-type') !== 'image') return;

    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      const dataSource = Array.from(mediaItems)
        .filter(media => media.getAttribute('data-media-type') === 'image')
        .map(media => {
          const image = media.querySelector('img');
          if (!image) return null;

          return {
            thumbnailElement: image,
            src: image.src,
            srcset: image.srcset || '',
            msrc: image.currentSrc || image.src,
            width: parseInt(image.getAttribute('width')) || image.naturalWidth || 1200,
            height: parseInt(image.getAttribute('height')) || image.naturalHeight || 1200,
            alt: image.alt || '',
            thumbCropped: true
          };
        })
        .filter(Boolean);

      if (lightbox && dataSource.length > 0) {
        lightbox.loadAndOpen(index, dataSource);
      }
    });
  });
}

// Thumbnail active state sync
function syncThumbnailActiveClass(thumbnails) {
  if (!thumbnails) return;

  const thumbnailElements = thumbnails.querySelectorAll(SELECTORS.thumbnail);
  thumbnailElements.forEach(thumbnail => {
    thumbnail.classList.toggle('active', thumbnail.getAttribute('aria-current') === 'true');
  });
}

const thumbnailObservers = new WeakMap();
const galleryScrollHandlers = new WeakMap();

function setupThumbnailObserver(thumbnails, gallery) {
  if (!thumbnails) return;

  const thumbnailList = thumbnails.querySelector(SELECTORS.thumbnailList);
  if (!thumbnailList) return;

  // Disconnect existing observer if any
  const existingObserver = thumbnailObservers.get(thumbnails);
  if (existingObserver) {
    existingObserver.disconnect();
  }

  syncThumbnailActiveClass(thumbnails);

  const observer = new MutationObserver(() => syncThumbnailActiveClass(thumbnails));
  thumbnailObservers.set(thumbnails, observer);

  const thumbnailElements = thumbnailList.querySelectorAll(SELECTORS.thumbnail);

  thumbnailElements.forEach(thumbnail => {
    observer.observe(thumbnail, {
      attributes: true,
      attributeFilter: ['aria-current']
    });
  });

  if (gallery) {
    // Remove existing scroll handler if any
    const existingHandler = galleryScrollHandlers.get(gallery);
    if (existingHandler) {
      gallery.removeEventListener('scroll', existingHandler);
    }

    const scrollHandler = () => {
      setTimeout(() => syncThumbnailActiveClass(thumbnails), DELAYS.thumbnailSync);
    };
    galleryScrollHandlers.set(gallery, scrollHandler);
    gallery.addEventListener('scroll', scrollHandler);
  }
}

// Gallery navigation with fallback
function manualScroll(gallery, direction) {
  if (!gallery.itemsToShow || gallery.itemsToShow.length <= 1) return;

  const [firstItem, secondItem] = gallery.itemsToShow;
  const itemWidth = firstItem.clientWidth || firstItem.offsetWidth;
  const gap = secondItem.offsetLeft - (firstItem.offsetLeft + itemWidth);
  const scrollAmount = itemWidth + gap;
  const currentScroll = gallery.scrollLeft;
  const newScrollPosition = direction === 'next'
    ? currentScroll + scrollAmount
    : Math.max(0, currentScroll - scrollAmount);

  gallery.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
}

function checkScrollFallback(gallery, direction, scrollBefore) {
  setTimeout(() => {
    if (gallery.scrollLeft === scrollBefore || gallery.itemOffset === 0 || isNaN(gallery.perPage)) {
      manualScroll(gallery, direction);
    }
  }, DELAYS.scrollCheck);
}

const galleryNavigationHandlers = new WeakMap();
const touchState = new WeakMap();
const dragState = new WeakMap();

function isMobile() {
  return window.matchMedia('(max-width: 1023px)').matches;
}

function setupTouchSwipe(element, gallery) {
  if (!element || !gallery || !isMobile()) return;

  // Remove existing touch handlers if any
  const existingState = touchState.get(element);
  if (existingState) {
    element.removeEventListener('touchstart', existingState.touchStartHandler);
    element.removeEventListener('touchmove', existingState.touchMoveHandler);
    element.removeEventListener('touchend', existingState.touchEndHandler);
  }

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let isHorizontalSwipe = false;

  const touchStartHandler = (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    isHorizontalSwipe = false;
  };

  const touchMoveHandler = (e) => {
    if (!touchStartX || !touchStartY) return;

    const touchCurrentX = e.touches[0].clientX;
    const touchCurrentY = e.touches[0].clientY;
    const diffX = Math.abs(touchStartX - touchCurrentX);
    const diffY = Math.abs(touchStartY - touchCurrentY);

    // Determine if user is swiping horizontally
    if (diffX > diffY && diffX > 10) {
      isHorizontalSwipe = true;
      // Prevent default scrolling only if event is cancelable and not already prevented
      if (e.cancelable && !e.defaultPrevented) {
        try {
          e.preventDefault();
        } catch (err) {
          // Ignore errors if preventDefault fails
        }
      }
    }
  };

  const touchEndHandler = (e) => {
    if (!touchStartX || !touchStartY) {
      touchStartX = 0;
      touchStartY = 0;
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    const diffTime = Date.now() - touchStartTime;

    // Minimum swipe distance and maximum time for a swipe
    const minSwipeDistance = 50;
    const maxSwipeTime = 500;

    // Check if it's a horizontal swipe
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (absDiffX > absDiffY && absDiffX > minSwipeDistance && diffTime < maxSwipeTime) {
      if (diffX > 0) {
        // Swipe left - go to next
        if (typeof gallery.next === 'function') {
          gallery.next();
        } else {
          manualScroll(gallery, 'next');
        }
      } else {
        // Swipe right - go to previous
        if (typeof gallery.previous === 'function') {
          gallery.previous();
        } else {
          manualScroll(gallery, 'previous');
        }
      }
    }

    touchStartX = 0;
    touchStartY = 0;
    isHorizontalSwipe = false;
  };

  const touchStateObj = {
    touchStartHandler,
    touchMoveHandler,
    touchEndHandler
  };

  element.addEventListener('touchstart', touchStartHandler, { passive: true });
  element.addEventListener('touchmove', touchMoveHandler, { passive: false });
  element.addEventListener('touchend', touchEndHandler, { passive: true });

  touchState.set(element, touchStateObj);
}

function setupMouseDrag(element, gallery) {
  if (!element || !gallery) return;

  // Remove existing drag handlers if any
  const existingState = dragState.get(element);
  if (existingState) {
    element.removeEventListener('mousedown', existingState.mouseDownHandler);
    document.removeEventListener('mousemove', existingState.mouseMoveHandler);
    document.removeEventListener('mouseup', existingState.mouseUpHandler);
  }

  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartTime = 0;
  let isDragging = false;
  let startScrollLeft = 0;

  const mouseDownHandler = (e) => {
    // Only handle left mouse button
    if (e.button !== 0) return;

    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartTime = Date.now();
    isDragging = false;
    startScrollLeft = gallery.scrollLeft;

    element.style.cursor = 'grabbing';
    element.style.userSelect = 'none';
  };

  const mouseMoveHandler = (e) => {
    if (dragStartX === 0 && dragStartY === 0) return;

    const dragCurrentX = e.clientX;
    const dragCurrentY = e.clientY;
    const diffX = dragStartX - dragCurrentX;
    const diffY = dragStartY - dragCurrentY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    // Determine if user is dragging horizontally
    if (absDiffX > 5 || absDiffY > 5) {
      if (!isDragging && absDiffX > absDiffY) {
        isDragging = true;
      }

      if (isDragging && absDiffX > absDiffY) {
        e.preventDefault();
        // Scroll the gallery based on drag distance
        gallery.scrollLeft = startScrollLeft + diffX;
      }
    }
  };

  const mouseUpHandler = (e) => {
    if (dragStartX === 0 && dragStartY === 0) {
      return;
    }

    const dragEndX = e.clientX;
    const dragEndY = e.clientY;
    const diffX = dragStartX - dragEndX;
    const diffY = dragStartY - dragEndY;
    const diffTime = Date.now() - dragStartTime;

    // Minimum drag distance and maximum time for a drag/swipe
    const minDragDistance = 50;
    const maxDragTime = 500;

    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    // Check if it's a horizontal drag/swipe
    if (isDragging && absDiffX > absDiffY && absDiffX > minDragDistance && diffTime < maxDragTime) {
      if (diffX > 0) {
        // Drag left - go to next
        if (typeof gallery.next === 'function') {
          gallery.next();
        } else {
          manualScroll(gallery, 'next');
        }
      } else {
        // Drag right - go to previous
        if (typeof gallery.previous === 'function') {
          gallery.previous();
        } else {
          manualScroll(gallery, 'previous');
        }
      }
    } else if (isDragging) {
      // If dragging but not enough for swipe, snap back to nearest position
      const currentScroll = gallery.scrollLeft;
      const itemWidth = gallery.itemOffset || gallery.clientWidth;
      const nearestPage = Math.round(currentScroll / itemWidth);
      gallery.scrollTo({
        left: nearestPage * itemWidth,
        behavior: 'smooth'
      });
    }

    // Reset
    element.style.cursor = '';
    element.style.userSelect = '';
    dragStartX = 0;
    dragStartY = 0;
    isDragging = false;
  };

  const dragStateObj = {
    mouseDownHandler,
    mouseMoveHandler,
    mouseUpHandler
  };

  element.addEventListener('mousedown', mouseDownHandler);
  document.addEventListener('mousemove', mouseMoveHandler);
  document.addEventListener('mouseup', mouseUpHandler);

  dragState.set(element, dragStateObj);
}

function setupGalleryNavigation(gallery, galleryId) {
  if (!gallery) return;

  // Remove existing handlers if any
  const existingHandlers = galleryNavigationHandlers.get(gallery);
  if (existingHandlers) {
    existingHandlers.prevButton?.removeEventListener('click', existingHandlers.prevHandler);
    existingHandlers.nextButton?.removeEventListener('click', existingHandlers.nextHandler);
    existingHandlers.sliderHandlers?.forEach(({ eventType, handler }) => {
      gallery.removeEventListener(eventType, handler);
    });
  }

  const prevButton = document.querySelector(`[aria-controls="${galleryId}"][data-button="previous"]`);
  const nextButton = document.querySelector(`[aria-controls="${galleryId}"][data-button="next"]`);

  const handleNavigation = (direction, method) => {
    const scrollBefore = gallery.scrollLeft;
    gallery[method]();
    checkScrollFallback(gallery, direction, scrollBefore);
  };

  const prevHandler = () => {
    if (typeof gallery.previous === 'function') {
      handleNavigation('previous', 'previous');
    } else {
      manualScroll(gallery, 'previous');
    }
  };

  const nextHandler = () => {
    if (typeof gallery.next === 'function') {
      handleNavigation('next', 'next');
    } else {
      manualScroll(gallery, 'next');
    }
  };

  prevButton?.addEventListener('click', prevHandler);
  nextButton?.addEventListener('click', nextHandler);

  const sliderHandlers = [];
  ['slider:previous', 'slider:next'].forEach(eventType => {
    const handler = () => {
      const scrollBefore = gallery.scrollLeft;
      setTimeout(() => {
        if (gallery.scrollLeft === scrollBefore && (gallery.itemOffset === 0 || isNaN(gallery.perPage))) {
          manualScroll(gallery, eventType.includes('next') ? 'next' : 'previous');
        }
      }, 100);
    };
    sliderHandlers.push({ eventType, handler });
    gallery.addEventListener(eventType, handler);
  });

  galleryNavigationHandlers.set(gallery, {
    prevButton,
    nextButton,
    prevHandler,
    nextHandler,
    sliderHandlers
  });

  // Touch swipe is set up in initGalleryComponents on media container
}

// Listen to variant change events from ProductInfo to update ML-specific elements
function setupMLProductInfoListeners() {
  if (typeof theme === 'undefined' || !theme.pubsub) return;

  theme.pubsub.subscribe(
    theme.pubsub.PUB_SUB_EVENTS.variantChange,
    (data) => {
      const sectionId = data.data.sectionId;
      const variant = data.data.variant;

      if (!variant) return;

      // Find the ML featured product section
      const section = document.querySelector(`[data-ml-featured-product][data-section-id="${sectionId}"]`);
      if (!section) return;

      const productId = section.getAttribute('data-product-id');
      const form = document.getElementById(`ProductForm-${sectionId}-${productId}`);
      const addToCartButton = form?.querySelector('.ml-featured-product__add-to-cart');

      // Update add to cart button
      if (addToCartButton && typeof theme !== 'undefined' && theme.variantStrings) {
        const buttonText = addToCartButton.querySelector('.btn-text');
        if (buttonText) {
          if (variant.available) {
            buttonText.textContent = theme.variantStrings.addToCart;
            addToCartButton.removeAttribute('disabled');
          } else {
            buttonText.textContent = theme.variantStrings.soldOut;
            addToCartButton.setAttribute('disabled', 'disabled');
          }
        }
      }

      // Re-initialize gallery components after DOM update
      // Use requestAnimationFrame to ensure DOM has been updated
      requestAnimationFrame(() => {
        setTimeout(() => {
          initGalleryComponents(sectionId, productId);
        }, 100);
      });
    }
  );
}

// Initialize listeners when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMLProductInfoListeners);
} else {
  setupMLProductInfoListeners();
}

// Initialize gallery components
function initGalleryComponents(sectionId, productId) {
  const galleryId = `SliderGallery-${sectionId}-${productId}`;
  const thumbnailsId = `MLThumbnails-${sectionId}-${productId}`;
  const mediaGalleryId = `ProductGallery-${sectionId}-${productId}`;

  const gallery = document.getElementById(galleryId);
  const thumbnails = document.getElementById(thumbnailsId);
  const mediaGallery = document.getElementById(mediaGalleryId);

  if (!gallery || !mediaGallery) return;

  // Re-initialize slider element if it's a custom element
  if (gallery.init && typeof gallery.init === 'function') {
    gallery.init();
  } else if (gallery.reset && typeof gallery.reset === 'function') {
    gallery.reset();
    if (gallery.init && typeof gallery.init === 'function') {
      gallery.init();
    }
  }

  // Initialize PhotoSwipe
  if (typeof PhotoSwipeLightbox === 'undefined') {
    setTimeout(() => initPhotoSwipe(mediaGallery, gallery), DELAYS.photoswipeInit);
  } else {
    initPhotoSwipe(mediaGallery, gallery);
  }

  // Setup thumbnail observer
  setupThumbnailObserver(thumbnails, gallery);

  // Setup gallery navigation
  setupGalleryNavigation(gallery, galleryId);

  // Setup touch swipe on media container for better event capture
  const mediaContainer = mediaGallery.querySelector('.product__media-container');
  const swipeElement = mediaContainer || gallery;

  if (isMobile()) {
    setupTouchSwipe(swipeElement, gallery);
  }

  // Setup mouse drag for desktop
  setupMouseDrag(swipeElement, gallery);
}

// Main initialization
function initMLFeaturedProduct(sectionElement) {
  const sectionId = sectionElement.getAttribute('data-section-id');
  const productId = sectionElement.getAttribute('data-product-id');
  const productDataJson = sectionElement.getAttribute('data-product-json');

  if (!productDataJson) return;

  // Initialize gallery components
  initGalleryComponents(sectionId, productId);
}

function initAllMLFeaturedProducts() {
  document.querySelectorAll(SELECTORS.section).forEach(initMLFeaturedProduct);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAllMLFeaturedProducts);
