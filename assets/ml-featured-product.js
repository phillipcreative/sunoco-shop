// Constants
const SELECTORS = {
  section: '[data-ml-featured-product]',
  variantValue: '.ml-featured-product__variant-value',
  variantOption: '.ml-featured-product__variant-option',
  variantSelected: '.ml-featured-product__variant-selected',
  addToCart: '.ml-featured-product__add-to-cart',
  price: '.ml-featured-product__price',
  thumbnail: '.product__thumbnail',
  thumbnailList: '.product__thumbnails-list',
  media: '.product__media',
  cartDrawer: 'cart-drawer'
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

// Variant selection and cart functionality
class VariantSelector {
  constructor(form, productData, gallery, galleryId) {
    this.form = form;
    this.productData = productData;
    this.gallery = gallery;
    this.galleryId = galleryId;
    this.variantInput = form.querySelector('input[name="id"]');
    this.variantButtons = form.querySelectorAll(SELECTORS.variantValue);
    this.addToCartButton = form.querySelector(SELECTORS.addToCart);
    this.priceElement = document.querySelector(SELECTORS.price);
    this.quantityInput = form.querySelector('input[name="quantity"]');
    this.productVariants = productData.variants || [];
    this.selectedVariant = null;

    this.init();
  }

  init() {
    this.variantButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleVariantClick(e, button));
    });

    this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    this.updateVariantSelection();
  }

  findVariantByOptions(selectedOptions) {
    return this.productVariants.find(variant =>
      variant.options.every((option, index) =>
        String(option).trim().toLowerCase() === String(selectedOptions[index]).trim().toLowerCase()
      )
    );
  }

  getSelectedOptions() {
    const optionGroups = this.form.querySelectorAll(SELECTORS.variantOption);
    return Array.from(optionGroups)
      .map(optionGroup => {
        const selectedButton = optionGroup.querySelector(`${SELECTORS.variantValue}.selected`);
        return selectedButton?.getAttribute('data-option-value');
      })
      .filter(Boolean);
  }

  updateVariantSelection() {
    const selectedOptions = this.getSelectedOptions();
    const optionGroups = this.form.querySelectorAll(SELECTORS.variantOption);
    const totalOptions = optionGroups.length;

    if (this.productData.has_only_default_variant || totalOptions === 0) {
      this.selectedVariant = this.productVariants[0] || null;
    } else if (selectedOptions.length === totalOptions) {
      this.selectedVariant = this.findVariantByOptions(selectedOptions);
    } else {
      this.selectedVariant = null;
    }

    if (!this.selectedVariant) return;

    this.variantInput.value = this.selectedVariant.id;
    this.variantInput.removeAttribute('disabled');

    this.updatePrice();
    this.updateAddToCartButton();
    this.updateQuantityInput();
  }

  updatePrice() {
    if (!this.priceElement || typeof theme === 'undefined' || !theme.Currency) return;

    const priceFormat = theme.settings.currencyCodeEnabled
      ? theme.settings.moneyWithCurrencyFormat
      : theme.settings.moneyFormat;
    this.priceElement.textContent = theme.Currency.formatMoney(this.selectedVariant.price, priceFormat);
  }

  updateAddToCartButton() {
    if (!this.addToCartButton || typeof theme === 'undefined' || !theme.variantStrings) return;

    const buttonText = this.addToCartButton.querySelector('.btn-text');
    if (!buttonText) return;

    if (this.selectedVariant.available) {
      buttonText.textContent = theme.variantStrings.addToCart;
      this.addToCartButton.removeAttribute('disabled');
    } else {
      buttonText.textContent = theme.variantStrings.soldOut;
      this.addToCartButton.setAttribute('disabled', 'disabled');
    }
  }

  updateQuantityInput() {
    if (!this.quantityInput || !this.selectedVariant.quantity_rule) return;

    const rule = this.selectedVariant.quantity_rule;
    this.quantityInput.setAttribute('data-quantity-variant-id', this.selectedVariant.id);
    this.quantityInput.setAttribute('data-min', rule.min || 1);
    this.quantityInput.setAttribute('min', rule.min || 1);
    this.quantityInput.setAttribute('step', rule.increment || 1);

    if (rule.max) {
      this.quantityInput.setAttribute('data-max', rule.max);
      this.quantityInput.setAttribute('max', rule.max);
    } else {
      this.quantityInput.removeAttribute('data-max');
      this.quantityInput.removeAttribute('max');
    }
  }

  scrollToMedia(imageId) {
    if (!imageId || !this.gallery) return;

    const mediaElement = this.gallery.querySelector(`[data-media-id="${imageId}"]`);
    if (!mediaElement) return;

    const mediaItems = this.gallery.itemsToShow || this.gallery.querySelectorAll('[data-media-id]');
    const mediaIndex = Array.from(mediaItems).indexOf(mediaElement);

    if (mediaIndex !== -1 && typeof this.gallery.select === 'function') {
      this.gallery.select(mediaIndex + 1);
    } else {
      requestAnimationFrame(() => {
        const behavior = theme?.config?.motionReduced ? 'auto' : 'smooth';
        this.gallery.scrollTo({ left: mediaElement.offsetLeft, behavior });
      });
    }
  }

  handleVariantClick(event, button) {
    if (button.hasAttribute('disabled')) return;

    event.preventDefault();
    event.stopPropagation();

    const imageId = button.getAttribute('data-variant-media-id');
    const optionValue = button.getAttribute('data-option-value');
    const optionGroup = button.closest(SELECTORS.variantOption);

    if (imageId) {
      this.scrollToMedia(imageId);
    }

    optionGroup.querySelectorAll(SELECTORS.variantValue).forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');

    const selectedSpan = optionGroup.querySelector(SELECTORS.variantSelected);
    if (selectedSpan) {
      selectedSpan.textContent = optionValue;
    }

    this.updateVariantSelection();
  }

  async handleFormSubmit(event) {
    event.preventDefault();

    if (this.addToCartButton.hasAttribute('aria-disabled')) return;

    const variantId = this.getVariantId();
    if (!variantId) return;

    const quantity = parseInt(this.quantityInput.value) || 1;
    this.setLoadingState(true);

    try {
      const data = await this.addToCart(variantId, quantity);
      if (data.status) {
        console.error('Add to cart error:', data.description || data.message);
        this.setLoadingState(false);
        return;
      }

      this.setLoadingState(false);
      await this.handleCartUpdate(variantId, data);
      this.dispatchCustomEvent(data);
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.setLoadingState(false);
    }
  }

  getVariantId() {
    const selectedSwatch = this.form.querySelector(`${SELECTORS.variantValue}.selected.is-swatch`);
    const variantIdAttr = selectedSwatch?.getAttribute('data-variant-id');

    if (variantIdAttr) return parseInt(variantIdAttr);
    if (this.variantInput?.value) return parseInt(this.variantInput.value);

    return null;
  }

  setLoadingState(loading) {
    if (loading) {
      this.addToCartButton.setAttribute('aria-disabled', 'true');
      this.addToCartButton.setAttribute('aria-busy', 'true');
    } else {
      this.addToCartButton.removeAttribute('aria-disabled');
      this.addToCartButton.removeAttribute('aria-busy');
    }
  }

  async addToCart(variantId, quantity) {
    const sectionsToBundle = this.getSectionsToBundle();

    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: variantId,
        quantity,
        sections: sectionsToBundle,
        sections_url: window.location.pathname
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return response.json();
  }

  getSectionsToBundle() {
    const cartDrawer = document.querySelector(SELECTORS.cartDrawer);
    const sectionId = cartDrawer?.getAttribute('data-section-id');
    return sectionId ? [sectionId] : [];
  }

  async handleCartUpdate(variantId, data) {
    if (typeof theme === 'undefined' || !theme.pubsub) {
      this.showCartDrawer();
      return;
    }

    const cart = await fetch('/cart.js').then(res => res.json());
    if (data.sections) {
      cart.sections = data.sections;
    }

    theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, {
      source: 'ml-featured-product',
      productVariantId: variantId,
      cart
    });

    this.showCartDrawer();
  }

  showCartDrawer() {
    const cartDrawerElement = document.querySelector(SELECTORS.cartDrawer);
    cartDrawerElement?.show(this.addToCartButton);
  }

  dispatchCustomEvent(data) {
    document.dispatchEvent(new CustomEvent('ajaxProduct:added', {
      detail: { product: data }
    }));
  }
}

// Main initialization
function initMLFeaturedProduct(sectionElement) {
  const sectionId = sectionElement.getAttribute('data-section-id');
  const productId = sectionElement.getAttribute('data-product-id');
  const productDataJson = sectionElement.getAttribute('data-product-json');

  if (!productDataJson) return;

  const productData = JSON.parse(productDataJson);
  const formId = `MLProductForm-${sectionId}-${productId}`;
  const galleryId = `MLSliderGallery-${sectionId}-${productId}`;
  const thumbnailsId = `MLThumbnails-${sectionId}-${productId}`;
  const mediaGalleryId = `MLProductGallery-${sectionId}-${productId}`;

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

  // Initialize variant selector
  if (form) {
    new VariantSelector(form, productData, gallery, galleryId);
  }
}

function initAllMLFeaturedProducts() {
  document.querySelectorAll(SELECTORS.section).forEach(initMLFeaturedProduct);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAllMLFeaturedProducts);
