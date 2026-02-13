(function() {
  console.log('Async Color Swatches Loaded');
  // Build gallery HTML from product media
  function buildGalleryHTML(matchingProduct, matchingVariant, sectionId, productId, imageZoom) {
    const featuredMediaId = matchingVariant.featuredMediaId || matchingProduct.featuredMediaId;
    let mediaHTML = '';

    matchingProduct.media.forEach((media, index) => {
      const isPreload = media.id === featuredMediaId;
      const loadingAttr = isPreload ? 'eager' : 'lazy';
      const fetchPriorityAttr = isPreload ? 'fetchpriority="high"' : '';

      mediaHTML += `
        <div class="product__media card media media--adapt mobile:media--adapt media--contain flex w-full shrink-0 relative overflow-hidden"
             data-media-type="${media.type}"
             data-media-id="${media.id}">
          <img src="${media.src}"
               alt="${matchingProduct.handle}"
               loading="${loadingAttr}"
               ${fetchPriorityAttr}
               width="${media.width || 800}"
               height="${media.height || 800}"
               class="w-full">
          ${imageZoom !== 'none' && media.type === 'image' ? `
            <button type="button" class="absolute top-0 left-0 w-full h-full flex items-center justify-center" is="media-${imageZoom}-button" aria-label="Open media ${index + 1}" tabindex="-1">
              <svg class="icon icon--xs lg:hidden" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 3V9M3 3H9M3 3L9 9M21 21V15M21 21H15M21 21L15 15"></path>
              </svg>
            </button>
          ` : ''}
        </div>
      `;
    });

    return `
      <div class="relative w-full h-full">
        <slider-element id="SliderGallery-${sectionId}-${productId}"
                        class="slider slider--desktop slider--tablet block w-full h-full"
                        selector=".product__media"
                        tabindex="0">
          <div class="product__media-list flex gap-1">
            ${mediaHTML}
          </div>
        </slider-element>

        <div class="indicators hidden items-center justify-between opacity-0 z-1 absolute top-0 left-0 w-full h-full pointer-events-none">
          <button class="button button--secondary pointer-events-auto" type="button" is="previous-button" aria-controls="SliderGallery-${sectionId}-${productId}" disabled>
            <span class="btn-fill" data-fill></span>
            <span class="btn-text">
              <svg class="icon transform" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 6L8 12L14 18"/></svg>
            </span>
          </button>
          <button class="button button--secondary pointer-events-auto" type="button" is="next-button" aria-controls="SliderGallery-${sectionId}-${productId}">
            <span class="btn-fill" data-fill></span>
            <span class="btn-text">
              <svg class="icon transform" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6L16 12L10 18"/></svg>
            </span>
          </button>
        </div>
      </div>
    `;
  }

  // Build thumbnails HTML
  function buildThumbnailsHTML(matchingProduct, matchingVariant, sectionId, productId) {
    const featuredMediaId = matchingVariant.featuredMediaId || matchingProduct.featuredMediaId;
    let thumbnailsHTML = '';

    const featuredMedia = matchingProduct.media.find(m => m.id === featuredMediaId);
    if (featuredMedia) {
      thumbnailsHTML += `
        <button type="button"
          class="product__thumbnail media media--adapt mobile:media--adapt media--contain relative overflow-hidden"
          data-media-id="${featuredMedia.id}"
          aria-label="Go to item 1"
          aria-current="true">
          <img src="${featuredMedia.src}"
               alt="${matchingProduct.handle}"
               loading="lazy"
               sizes="(max-width: 1280px) 90px, 98px"
               class="w-full">
        </button>
      `;
    }

    matchingProduct.media.forEach((media, index) => {
      if (media.id !== featuredMediaId) {
        thumbnailsHTML += `
          <button type="button"
            class="product__thumbnail media media--adapt mobile:media--adapt media--contain relative overflow-hidden"
            data-media-id="${media.id}"
            aria-label="Go to item ${index + 1}"
            aria-current="false">
            <img src="${media.src}"
                 alt="${matchingProduct.handle}"
                 loading="lazy"
                 sizes="(max-width: 1280px) 90px, 98px"
                 class="w-full">
          </button>
        `;
      }
    });

    return thumbnailsHTML;
  }

  // Update gallery with new product media
  function updateGallery(product, variant, sectionId, productId) {
    console.log('🖼️ Updating gallery for product:', product.handle, 'with', product.media?.length, 'media items');

    const galleryContainer = document.getElementById(`ProductGallery-${sectionId}-${productId}`);
    if (!galleryContainer) {
      console.warn('❌ Gallery container not found:', `ProductGallery-${sectionId}-${productId}`);
      return;
    }

    if (!product.media || product.media.length === 0) {
      console.warn('❌ No media found for product:', product.handle);
      return;
    }

    const existingZoomButton = galleryContainer.querySelector('[is^="media-"]');
    let imageZoom = 'click';
    if (existingZoomButton) {
      const isAttr = existingZoomButton.getAttribute('is');
      if (isAttr) {
        imageZoom = isAttr.replace('media-', '').replace('-button', '');
      }
    }

    console.log('🔧 Building gallery HTML with zoom type:', imageZoom);
    const newGalleryHTML = buildGalleryHTML(product, variant, sectionId, productId, imageZoom);

    const scrollShadow = galleryContainer.querySelector('scroll-shadow');

    if (scrollShadow && product.media.length > 1) {
      const thumbnailsList = scrollShadow.querySelector('media-dots.product__thumbnails-list');

      if (thumbnailsList) {
        const newThumbnailsHTML = buildThumbnailsHTML(product, variant, sectionId, productId);
        thumbnailsList.innerHTML = newThumbnailsHTML;

        if (typeof thumbnailsList.init === 'function') {
          thumbnailsList.initialized = false;
          if (thumbnailsList.reset && typeof thumbnailsList.reset === 'function') {
            thumbnailsList.reset();
          }
          thumbnailsList.init();
        }
      }
    }

    const sliderContainer = galleryContainer.querySelector('.relative.w-full.h-full');
    if (sliderContainer) {
      console.log('✅ Replacing slider HTML');
      sliderContainer.outerHTML = newGalleryHTML;

      const sliderElement = galleryContainer.querySelector('slider-element');
      if (sliderElement) {
        console.log('🎯 Initializing new slider element');
        sliderElement.init?.();

        const featuredMediaId = variant.featuredMediaId || product.featuredMediaId;
        if (featuredMediaId) {
          const mediaIndex = product.media.findIndex(m => m.id === featuredMediaId);
          console.log('📍 Selecting media at index:', mediaIndex + 1, 'of', product.media.length);
          if (mediaIndex >= 0) {
            setTimeout(() => {
              sliderElement.select(mediaIndex + 1, true);
            }, 100);
          }
        }
      }
    } else {
      console.warn('❌ Slider container not found');
    }

    console.log('✨ Gallery update complete');
  }

  // Format money using theme's formatter
  function formatMoney(cents) {
    if (typeof window.theme !== 'undefined' && window.theme.formatMoney) {
      return window.theme.formatMoney(cents);
    }
    return '$' + (cents / 100).toFixed(2);
  }

  // Update active states for swatches
  function updateActiveStates(event, selectedOptions) {
    const jugColorSwatch = event.target.closest('a[data-jug-color]');
    if (jugColorSwatch) {
      const allJugSwatches = document.querySelectorAll('a[data-jug-color]');
      allJugSwatches.forEach(swatch => swatch.classList.remove('active'));
      jugColorSwatch.classList.add('active');
    }
  }

  // Update price display
  function updatePrice(variant, sectionId, productId) {
    const priceElement = document.getElementById(`Price-${sectionId}-${productId}`);
    if (!priceElement) return;

    const regularPriceEl = priceElement.querySelector('.price__regular .price-item--regular');
    if (regularPriceEl) {
      regularPriceEl.textContent = formatMoney(variant.price);
    }

    const salePriceEl = priceElement.querySelector('.product__price .price__regular');
    const compareAtPriceEl = priceElement.querySelector('.product__price :is(.price__sale,.unit-price)');

    if (variant.compareAtPrice && variant.compareAtPrice > variant.price) {
      console.log('✨ Variant is on sale:', variant.compareAtPrice, variant.price);
      priceElement.classList.add('price--on-sale');
      if (salePriceEl) salePriceEl.textContent = formatMoney(variant.price);
      if (compareAtPriceEl) compareAtPriceEl.textContent = formatMoney(variant.compareAtPrice);
    } else {
      priceElement.classList.remove('price--on-sale');
    }
  }

  // Update product title
  function updateTitle(product, sectionId, productId) {
    const titleElement = document.querySelector(`#ProductInfo-${sectionId}-${productId} .product__title`);
    if (titleElement) {
      const titleText = titleElement.querySelector('.split-words') || titleElement.querySelector('h1');
      if (titleText) {
        titleText.textContent = product.title.toUpperCase();
      }
    }
  }

  // Update browser URL
  function updateURL(variantUrl) {
    if (variantUrl && window.history && window.history.replaceState) {
      window.history.replaceState({}, '', variantUrl);
    }
  }

  // Update add to cart button
  function updateAddToCart(variant, sectionId, productId) {
    const form = document.getElementById(`ProductForm-${sectionId}-${productId}`);
    if (!form) return;

    const button = form.querySelector('[name="add"]');
    const buttonText = button?.querySelector('.btn-text span:not(.icon)') ||
                      button?.querySelector('.btn-text');

    if (!button) return;

    if (variant.available) {
      button.removeAttribute('disabled');
      if (buttonText) {
        buttonText.textContent = window.theme?.variantStrings?.addToCart || 'Add to cart';
      }
    } else {
      button.setAttribute('disabled', 'disabled');
      if (buttonText) {
        buttonText.textContent = window.theme?.variantStrings?.soldOut || 'Sold out';
      }
    }
  }

  // Update variant input hidden field
  function updateVariantInput(variantId, sectionId, productId) {
    const form = document.getElementById(`ProductForm-${sectionId}-${productId}`);
    const input = form?.querySelector('input[name="id"]');
    if (input) {
      input.value = variantId;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // Get currently selected options from all variant selectors
  function getCurrentlySelectedOptions(sectionId, productId, event) {
    const options = {};
    const variantPicker = document.getElementById(`VariantPicker-${sectionId}-${productId}`) ||
                         document.getElementById(`VariantPicker-${sectionId}-${productId}-swatch`) ||
                         document.getElementById(`VariantPicker-${sectionId}-${productId}-variant`);

    if (!variantPicker) return options;

    // Check jug color swatches (data-jug-color)
    const jugColorSwatches = variantPicker.querySelectorAll('a[data-jug-color]');
    jugColorSwatches.forEach(swatch => {
      if (swatch.classList.contains('active') || swatch === event.target.closest('a[data-jug-color]')) {
        options['Jug Color'] = swatch.getAttribute('data-jug-color');
      }
    });

    // Check radio buttons
    const radios = variantPicker.querySelectorAll('input[type="radio"]:checked');
    radios.forEach(radio => {
      const fieldset = radio.closest('fieldset');
      const legend = fieldset?.querySelector('legend')?.textContent?.trim();
      if (legend && radio.value) {
        options[legend] = radio.value;
      }
    });

    // Check if current event is changing a radio button
    const eventRadio = event.target.closest('input[type="radio"]');
    if (eventRadio) {
      const fieldset = eventRadio.closest('fieldset');
      const legend = fieldset?.querySelector('legend')?.textContent?.trim();
      if (legend) {
        options[legend] = eventRadio.value;
      }
    }

    // Check if a label was clicked and get its associated radio value
    const eventLabel = event.target.closest('label[for]');
    if (eventLabel) {
      const forId = eventLabel.getAttribute('for');
      const associatedRadio = document.getElementById(forId);
      if (associatedRadio && associatedRadio.type === 'radio') {
        const fieldset = associatedRadio.closest('fieldset');
        const legend = fieldset?.querySelector('legend')?.textContent?.trim();
        if (legend) {
          options[legend] = associatedRadio.value;
          // Mark the radio as checked for the next iteration
          associatedRadio.checked = true;
        }
      }
    }

    // Check dropdowns
    const selects = variantPicker.querySelectorAll('select');
    selects.forEach(select => {
      const label = select.previousElementSibling?.textContent?.trim() ||
                   select.closest('label')?.textContent?.trim();
      if (label && select.value) {
        options[label] = select.value;
      }
    });

    return options;
  }

  // Find matching product and variant from swatch collection
  function findMatchingProductAndVariant(products, selectedOptions) {
    for (const product of products) {
      let productMatches = true;

      for (const [optionName, optionValue] of Object.entries(selectedOptions)) {
        const productOption = product.options.find(opt =>
          opt.name.toLowerCase() === optionName.toLowerCase()
        );

        if (!productOption) {
          productMatches = false;
          break;
        }

        const hasValue = productOption.values.some(val =>
          val.toLowerCase() === optionValue.toLowerCase()
        );

        if (!hasValue) {
          productMatches = false;
          break;
        }
      }

      if (!productMatches) continue;

      const matchingVariant = product.variants.find(variant => {
        return Object.entries(selectedOptions).every(([optionName, optionValue]) => {
          const optionIndex = product.options.findIndex(opt =>
            opt.name.toLowerCase() === optionName.toLowerCase()
          );

          if (optionIndex === -1) return false;

          const variantOptionValue = variant[`option${optionIndex + 1}`];
          return variantOptionValue?.toLowerCase() === optionValue.toLowerCase();
        });
      });

      if (matchingVariant) {
        return { product, variant: matchingVariant };
      }
    }

    return null;
  }

  // Universal variant change handler
  function handleVariantChange(event, swatchData, sectionId, productId) {
    console.log('🔄 Variant change detected');

    // CRITICAL: Prevent default FIRST, before any other logic
    const clickedLink = event.target.closest('a[href]');
    const clickedInput = event.target.closest('input[type="radio"]');
    const clickedSelect = event.target.closest('select');
    const clickedLabel = event.target.closest('label[for]');

    // Prevent navigation for any variant interaction
    if (clickedLink) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    // Prevent default for radio inputs and selects too
    if (clickedInput || clickedSelect) {
      event.stopPropagation();
    }

    // Prevent label clicks that trigger radios
    if (clickedLabel) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Check if this is a JUG COLOR swatch click
    const jugColorSwatch = event.target.closest('a[data-jug-color]');

    if (jugColorSwatch) {
      // HANDLE JUG COLOR SELECTION
      const jugColor = jugColorSwatch.getAttribute('data-jug-color');
      console.log('🎨 Jug Color clicked:', jugColor);

      // Update active state
      const allJugSwatches = document.querySelectorAll('a[data-jug-color]');
      allJugSwatches.forEach(swatch => swatch.classList.remove('active'));
      jugColorSwatch.classList.add('active');

      // Find the product that has this jug color
      const matchingProduct = swatchData.products.find(product => {
        const jugColorOption = product.options.find(opt => opt.name.toLowerCase() === 'jug color');
        if (!jugColorOption) return false;
        return jugColorOption.values.some(value => value.toLowerCase() === jugColor.toLowerCase());
      });

      if (!matchingProduct) {
        console.warn('❌ No product found with jug color:', jugColor);
        return;
      }

      console.log('📦 Found matching product:', matchingProduct.handle, 'with', matchingProduct.media?.length || 0, 'media items');

      // Find the variant with this jug color
      const matchingVariant = matchingProduct.variants.find(variant => {
        return variant.option1?.toLowerCase() === jugColor.toLowerCase();
      });

      if (!matchingVariant) {
        console.warn('❌ No variant found with jug color:', jugColor);
        return;
      }

      console.log('✨ Found matching variant:', matchingVariant);

      // Update everything with the new product/variant
      updateGallery(matchingProduct, matchingVariant, sectionId, productId);
      updatePrice(matchingVariant, sectionId, productId);
      updateTitle(matchingProduct, sectionId, productId);
      updateURL(matchingVariant.url);
      updateAddToCart(matchingVariant, sectionId, productId);
      updateVariantInput(matchingVariant.id, sectionId, productId);

      console.log('✅ Jug color update complete!');
      return;
    }

    // HANDLE OTHER VARIANT SELECTIONS (Size, etc.)
    console.log('📝 Other variant selection detected');
    const selectedOptions = getCurrentlySelectedOptions(sectionId, productId, event);
    console.log('🎭 Selected options:', selectedOptions);

    const match = findMatchingProductAndVariant(swatchData.products, selectedOptions);

    if (!match) {
      console.warn('No matching product/variant found for:', selectedOptions);
      return;
    }

    const { product, variant } = match;

    console.log('📦 Matched product:', product.handle, 'variant:', variant.id);

    updateActiveStates(event, selectedOptions);
    updatePrice(variant, sectionId, productId);
    updateURL(variant.url);
    updateAddToCart(variant, sectionId, productId);
    updateVariantInput(variant.id, sectionId, productId);

    console.log('✅ Variant update complete!');
  }

  // Main initialization function
  function initAsyncVariants(sectionId, productId) {
    const dataScript = document.querySelector(`[data-swatch-collection="${sectionId}-${productId}"]`);
    if (!dataScript) {
      console.warn('No swatch collection data found for:', sectionId, productId);
      return;
    }

    const swatchData = JSON.parse(dataScript.textContent);
    const variantPicker = document.getElementById(`VariantPicker-${sectionId}-${productId}`) ||
                         document.getElementById(`VariantPicker-${sectionId}-${productId}-swatch`) ||
                         document.getElementById(`VariantPicker-${sectionId}-${productId}-variant`);

    if (!variantPicker) {
      console.warn('Variant picker not found for:', sectionId, productId);
      return;
    }

    console.log('Initializing async variants for:', sectionId, productId);

    // Use capture phase (true) to intercept events BEFORE they bubble
    // This ensures we prevent default before any other handlers
    variantPicker.addEventListener('click', (event) => {
      handleVariantChange(event, swatchData, sectionId, productId);
    }, true);

    // Also catch mousedown to prevent navigation even earlier
    variantPicker.addEventListener('mousedown', (event) => {
      const clickedLink = event.target.closest('a[href]');
      if (clickedLink) {
        event.preventDefault();
      }
    }, true);

    // Prevent any link navigation within the variant picker
    variantPicker.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (link) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, false);

    variantPicker.addEventListener('change', (event) => {
      if (event.target.tagName === 'SELECT') {
        handleVariantChange(event, swatchData, sectionId, productId);
      }
    });

    console.log('Async variant listeners attached');
  }

  // Expose to window for backwards compatibility
  if (typeof window !== 'undefined') {
    window.initAsyncVariants = initAsyncVariants;
    window.initAsyncSwatch = initAsyncVariants; // Keep old name for compatibility
  }
})();
