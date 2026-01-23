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

function setupThumbnailObserver(thumbnails, gallery) {
  if (!thumbnails) return;

  const thumbnailList = thumbnails.querySelector(SELECTORS.thumbnailList);
  if (!thumbnailList) return;

  syncThumbnailActiveClass(thumbnails);

  const observer = new MutationObserver(() => syncThumbnailActiveClass(thumbnails));
  const thumbnailElements = thumbnailList.querySelectorAll(SELECTORS.thumbnail);

  thumbnailElements.forEach(thumbnail => {
    observer.observe(thumbnail, {
      attributes: true,
      attributeFilter: ['aria-current']
    });
  });

  if (gallery) {
    gallery.addEventListener('scroll', () => {
      setTimeout(() => syncThumbnailActiveClass(thumbnails), DELAYS.thumbnailSync);
    });
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

function setupGalleryNavigation(gallery, galleryId) {
  if (!gallery) return;

  const prevButton = document.querySelector(`[aria-controls="${galleryId}"][data-button="previous"]`);
  const nextButton = document.querySelector(`[aria-controls="${galleryId}"][data-button="next"]`);

  const handleNavigation = (direction, method) => {
    const scrollBefore = gallery.scrollLeft;
    gallery[method]();
    checkScrollFallback(gallery, direction, scrollBefore);
  };

  prevButton?.addEventListener('click', () => {
    if (typeof gallery.previous === 'function') {
      handleNavigation('previous', 'previous');
    } else {
      manualScroll(gallery, 'previous');
    }
  });

  nextButton?.addEventListener('click', () => {
    if (typeof gallery.next === 'function') {
      handleNavigation('next', 'next');
    } else {
      manualScroll(gallery, 'next');
    }
  });

  ['slider:previous', 'slider:next'].forEach(eventType => {
    gallery.addEventListener(eventType, () => {
      const scrollBefore = gallery.scrollLeft;
      setTimeout(() => {
        if (gallery.scrollLeft === scrollBefore && (gallery.itemOffset === 0 || isNaN(gallery.perPage))) {
          manualScroll(gallery, eventType.includes('next') ? 'next' : 'previous');
        }
      }, 100);
    });
  });
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
    }
  );
}

// Initialize listeners when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMLProductInfoListeners);
} else {
  setupMLProductInfoListeners();
}

// Main initialization
function initMLFeaturedProduct(sectionElement) {
  const sectionId = sectionElement.getAttribute('data-section-id');
  const productId = sectionElement.getAttribute('data-product-id');
  const productDataJson = sectionElement.getAttribute('data-product-json');

  if (!productDataJson) return;

  const productData = JSON.parse(productDataJson);
  const formId = `ProductForm-${sectionId}-${productId}`;
  const galleryId = `SliderGallery-${sectionId}-${productId}`;
  const thumbnailsId = `MLThumbnails-${sectionId}-${productId}`;
  const mediaGalleryId = `ProductGallery-${sectionId}-${productId}`;

  const form = document.getElementById(formId);
  const gallery = document.getElementById(galleryId);
  const thumbnails = document.getElementById(thumbnailsId);
  const mediaGallery = document.getElementById(mediaGalleryId);

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

  // Variant updates are handled by ProductInfo component via AJAX
  // We just listen to variantChange events for ML-specific updates
}

function initAllMLFeaturedProducts() {
  document.querySelectorAll(SELECTORS.section).forEach(initMLFeaturedProduct);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAllMLFeaturedProducts);
