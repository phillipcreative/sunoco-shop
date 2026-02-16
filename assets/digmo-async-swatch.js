(function() {
  console.log('Async Color Swatches Loaded');

  const GALLERY_TRANSITION_MS = 200;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function getVariantPicker(sectionId, productId) {
    return document.getElementById(`VariantPicker-${sectionId}-${productId}`) ||
           document.getElementById(`VariantPicker-${sectionId}-${productId}-swatch`) ||
           document.getElementById(`VariantPicker-${sectionId}-${productId}-variant`);
  }

  function formatMoney(cents) {
    if (typeof window.theme !== 'undefined' && window.theme.formatMoney) {
      return window.theme.formatMoney(cents);
    }
    return '$' + (cents / 100).toFixed(2);
  }

  // ---------------------------------------------------------------------------
  // Gallery & thumbnails HTML
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // DOM updates
  // ---------------------------------------------------------------------------

  function updateGallery(product, variant, sectionId, productId) {
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

    const newGalleryHTML = buildGalleryHTML(product, variant, sectionId, productId, imageZoom);

    function performSwap() {
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
        sliderContainer.outerHTML = newGalleryHTML;

        const sliderElement = galleryContainer.querySelector('slider-element');
        if (sliderElement) {
          sliderElement.init?.();
          const featuredMediaId = variant.featuredMediaId || product.featuredMediaId;
          if (featuredMediaId) {
            const mediaIndex = product.media.findIndex(m => m.id === featuredMediaId);
            if (mediaIndex >= 0) {
              setTimeout(() => sliderElement.select(mediaIndex + 1, true), 50);
            }
          }
        }
      }
    }

    galleryContainer.classList.add('product__gallery--updating');

    setTimeout(() => {
      performSwap();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          galleryContainer.classList.remove('product__gallery--updating');
        });
      });
    }, GALLERY_TRANSITION_MS);
  }

  function updateActiveStates(event, selectedOptions) {
    const jugColorSwatch = event.target.closest('[data-jug-color]');
    if (jugColorSwatch) {
      const allJugSwatches = document.querySelectorAll('[data-jug-color]');
      allJugSwatches.forEach(swatch => swatch.classList.remove('active'));
      jugColorSwatch.classList.add('active');
    }
  }

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
      priceElement.classList.add('price--on-sale');
      if (salePriceEl) salePriceEl.textContent = formatMoney(variant.price);
      if (compareAtPriceEl) compareAtPriceEl.textContent = formatMoney(variant.compareAtPrice);
    } else {
      priceElement.classList.remove('price--on-sale');
    }
  }

  function updateTitle(product, sectionId, productId) {
    const titleElement = document.querySelector(`#ProductInfo-${sectionId}-${productId} .product__title`);
    if (titleElement) {
      const titleText = titleElement.querySelector('.split-words') || titleElement.querySelector('h1');
      if (titleText) {
        titleText.textContent = product.title.toUpperCase();
      }
    }
  }

  function updateURL(variantUrl) {
    if (variantUrl && window.history && window.history.replaceState) {
      window.history.replaceState({}, '', variantUrl);
    }
  }

  function updateAddToCart(variant, sectionId, productId) {
    const formId = `ProductForm-${sectionId}-${productId}`;
    const form = document.getElementById(formId);
    const buttons = form
      ? [form.querySelector('[name="add"]'), ...document.querySelectorAll(`[name="add"][form="${formId}"]`)].filter(Boolean)
      : [];

    buttons.forEach(button => {
      const buttonText = button.querySelector('.btn-text span:not(.icon)') ||
                        button.querySelector('.btn-text');

      button.removeAttribute('unavailable');

      if (!variant) {
        button.setAttribute('disabled', 'disabled');
        button.setAttribute('unavailable', '');
        if (buttonText) {
          buttonText.textContent = window.theme?.variantStrings?.unavailable || 'Unavailable';
        }
        return;
      }

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
    });
  }

  function updateVariantInput(variantId, sectionId, productId) {
    const form = document.getElementById(`ProductForm-${sectionId}-${productId}`);
    const input = form?.querySelector('input[name="id"]');
    if (input) {
      input.value = variantId;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function updateDropdownOptionsForProduct(product, variant, sectionId, productId) {
    const variantPicker = getVariantPicker(sectionId, productId);
    if (!variantPicker) return;

    product.options.forEach((opt, index) => {
      const optNameLower = opt.name.toLowerCase();
      if (optNameLower === 'jug color') return;

      const select = variantPicker.querySelector(`select[name="options[${opt.name}]"]`);
      if (!select) return;

      const values = opt.values?.map(v => (typeof v === 'string' ? v : v?.value ?? String(v))) || [];
      if (values.length === 0) return;

      const selectedValue = variant?.[`option${index + 1}`] || values[0];
      const valueToSelect = values.some(v => String(v).toLowerCase() === String(selectedValue).toLowerCase())
        ? selectedValue
        : values[0];

      select.innerHTML = values.map(val => {
        const valStr = String(val);
        const selected = valStr.toLowerCase() === String(valueToSelect).toLowerCase() ? ' selected' : '';
        return `<option value="${valStr.replace(/"/g, '&quot;')}"${selected}>${valStr}</option>`;
      }).join('');
    });
  }

  function syncVariantPickerToVariant(product, variant, sectionId, productId) {
    const variantPicker = getVariantPicker(sectionId, productId);
    if (!variantPicker) return;

    product.options.forEach((opt, index) => {
      const optionValue = variant[`option${index + 1}`];
      if (!optionValue) return;

      const optionName = opt.name;
      const optNameLower = optionName.toLowerCase();

      if (optNameLower === 'jug color') {
        const swatch = Array.from(variantPicker.querySelectorAll('[data-jug-color]')).find(s =>
          s.getAttribute('data-jug-color')?.toLowerCase() === optionValue?.toLowerCase()
        );
        if (swatch) {
          variantPicker.querySelectorAll('[data-jug-color]').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
        }
      }

      const radioName = `${optionName}-${sectionId}-${productId}`;
      variantPicker.querySelectorAll(`input[type="radio"][name="${radioName}"]`).forEach(radio => {
        radio.checked = radio.value?.toLowerCase() === optionValue?.toLowerCase();
      });

      const select = variantPicker.querySelector(`select[name="options[${optionName}]"]`);
      if (select && select.value !== optionValue) {
        select.value = optionValue;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Option selection & matching
  // ---------------------------------------------------------------------------

  function getCurrentlySelectedOptions(sectionId, productId, event) {
    const options = {};
    const variantPicker = getVariantPicker(sectionId, productId);
    if (!variantPicker) return options;

    const radios = variantPicker.querySelectorAll('input[type="radio"]:checked');
    radios.forEach(radio => {
      const fieldset = radio.closest('fieldset');
      const legend = fieldset?.querySelector('legend')?.textContent?.trim();
      if (legend && radio.value) {
        options[legend] = radio.value;
      }
    });

    const selects = variantPicker.querySelectorAll('select');
    selects.forEach(select => {
      const label = select.closest('fieldset')?.querySelector('legend')?.textContent?.trim() ||
                   select.name?.match(/options\[([^\]]+)\]/)?.[1] ||
                   select.previousElementSibling?.textContent?.trim() ||
                   select.closest('label')?.textContent?.trim();
      if (label && select.value) {
        options[label] = select.value;
      }
    });

    const eventSelect = event?.target?.closest?.('select');
    if (eventSelect) {
      const label = eventSelect.closest('fieldset')?.querySelector('legend')?.textContent?.trim() ||
                   eventSelect.name?.match(/options\[([^\]]+)\]/)?.[1];
      if (label) {
        options[label] = eventSelect.value;
      }
    }

    const eventRadio = event?.target?.closest?.('input[type="radio"]');
    if (eventRadio) {
      const fieldset = eventRadio.closest('fieldset');
      const legend = fieldset?.querySelector('legend')?.textContent?.trim();
      if (legend) {
        options[legend] = eventRadio.value;
      }
    }

    const eventLabel = event?.target?.closest?.('label[for]');
    if (eventLabel) {
      const forId = eventLabel.getAttribute('for');
      const associatedRadio = document.getElementById(forId);
      if (associatedRadio && associatedRadio.type === 'radio') {
        const fieldset = associatedRadio.closest('fieldset');
        const legend = fieldset?.querySelector('legend')?.textContent?.trim();
        if (legend) {
          options[legend] = associatedRadio.value;
          associatedRadio.checked = true;
        }
      }
    }

    const jugColorSwatches = variantPicker.querySelectorAll('[data-jug-color]');
    const clickedJugSwatch = event.target?.closest('[data-jug-color]');
    for (const swatch of jugColorSwatches) {
      if (swatch.classList.contains('active') || swatch === clickedJugSwatch) {
        options['Jug Color'] = swatch.getAttribute('data-jug-color');
        break;
      }
    }

    return options;
  }

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

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function handleVariantChange(event, swatchData, sectionId, productId) {
    const jugColorSwatch = event.target.closest('[data-jug-color]');
    const clickedRadio = event.target.closest('input[type="radio"]');
    const clickedLabel = event.target.closest('label[for]');

    if (jugColorSwatch) {
      if (jugColorSwatch.classList.contains('active')) return;
      const clickedLink = event.target.closest('a[href]');
      if (clickedLink) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
      handleJugColorChange(event, swatchData, sectionId, productId);
      return;
    }

    if (clickedRadio && clickedRadio.checked) return;
    if (clickedLabel) {
      const forId = clickedLabel.getAttribute('for');
      const associatedRadio = document.getElementById(forId);
      if (associatedRadio?.type === 'radio' && associatedRadio.checked) return;
    }

    const clickedLink = event.target.closest('a[href]');
    if (clickedLink) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    const selectedOptions = getCurrentlySelectedOptions(sectionId, productId, event);
    const match = findMatchingProductAndVariant(swatchData.products, selectedOptions);

    if (!match) {
      console.warn('No matching product/variant found for:', selectedOptions);
      updateAddToCart(null, sectionId, productId);
      return;
    }

    const { product, variant } = match;
    updateActiveStates(event, selectedOptions);
    updateGallery(product, variant, sectionId, productId);
    updatePrice(variant, sectionId, productId);
    updateURL(variant.url);
    updateAddToCart(variant, sectionId, productId);
    updateVariantInput(variant.id, sectionId, productId);
    // updateOptionsAvailability(product, sectionId, productId, event);


    if (window.theme && theme.pubsub) {
      theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.variantChange, {
        variant: variant,
        product: product,
        sectionId: sectionId
      });
    }
  }

  function handleJugColorChange(event, swatchData, sectionId, productId) {
    const jugColorSwatch = event.target.closest('[data-jug-color]');
    const jugColor = jugColorSwatch.getAttribute('data-jug-color');

    const allJugSwatches = document.querySelectorAll('[data-jug-color]');
    allJugSwatches.forEach(swatch => swatch.classList.remove('active'));
    jugColorSwatch.classList.add('active');

    let match = findMatchingProductAndVariant(
      swatchData.products,
      getCurrentlySelectedOptions(sectionId, productId, event)
    );

    if (!match) {
      match = findMatchingProductAndVariant(swatchData.products, { 'Jug Color': jugColor });
      if (match) {
        const { product, variant } = match;
        const firstAvailable = product.variants.find(v => v.available) || product.variants[0];
        if (firstAvailable) {
          match = { product, variant: firstAvailable };
        }
      }
    }

    if (!match) {
      const firstAvailableProduct = swatchData.products.find(p => p.variants?.some(v => v.available));
      if (firstAvailableProduct) {
        const firstAvailable = firstAvailableProduct.variants.find(v => v.available) ||
          firstAvailableProduct.variants[0];
        if (firstAvailable) {
          match = { product: firstAvailableProduct, variant: firstAvailable };
        }
      }
    }

    if (!match) {
      console.warn('❌ No product/variant found with jug color:', jugColor);
      updateAddToCart(null, sectionId, productId);
      return;
    }

    const { product: matchingProduct, variant: matchingVariant } = match;
    const variantToUse = matchingProduct.variants?.find(v => v.available) ||
      matchingProduct.variants?.[0] ||
      matchingVariant;

    const { product } = match;
    updateDropdownOptionsForProduct(matchingProduct, variantToUse, sectionId, productId);
    syncVariantPickerToVariant(matchingProduct, variantToUse, sectionId, productId);
    updateGallery(matchingProduct, variantToUse, sectionId, productId);
    updatePrice(variantToUse, sectionId, productId);
    updateTitle(matchingProduct, sectionId, productId);
    updateURL(variantToUse.url);
    updateAddToCart(variantToUse, sectionId, productId);
    updateVariantInput(variantToUse.id, sectionId, productId);
    // updateOptionsAvailability(product, sectionId, productId, event);
  }

  // function updateOptionsAvailability(product, sectionId, productId, event) {
  //   const variantPicker = getVariantPicker(sectionId, productId);
  //   if (!variantPicker || !product) return;

  //   const currentOptions = getCurrentlySelectedOptions(sectionId, productId, event);

  //   const fieldsets = Array.from(variantPicker.querySelectorAll('fieldset'));

  //   fieldsets.forEach((fieldset) => {
  //     const optionName = fieldset.querySelector('legend')?.textContent?.trim();
  //     if (!optionName) return;

  //     // --- ADD THIS GUARD CLAUSE ---
  //     // If this is the Jug Color section, skip the disabling logic
  //     if (optionName.toLowerCase() === 'jug color') return;
  //     // -----------------------------

  //     const inputs = Array.from(fieldset.querySelectorAll('input[type="radio"], option'));

  //     inputs.forEach((input) => {
  //       const value = input.value || input.getAttribute('value');
  //       const hypotheticalOptions = { ...currentOptions, [optionName]: value };

  //       const isPossible = product.variants.some((variant) => {
  //         return Object.entries(hypotheticalOptions).every(([name, val]) => {
  //           const optIndex = product.options.findIndex(opt => opt.name === name);
  //           return optIndex === -1 || variant[`option${optIndex + 1}`] === val;
  //         });
  //       });

  //       if (input.tagName === 'INPUT') {
  //         const label = variantPicker.querySelector(`label[for="${input.id}"]`);
  //         if (isPossible) {
  //           input.classList.remove('disabled');
  //           input.disabled = false;
  //           label?.classList.remove('opacity-50', 'pointer-events-none');
  //         } else {
  //           input.classList.add('disabled');
  //           label?.classList.add('opacity-50', 'pointer-events-none');
  //         }
  //       } else if (input.tagName === 'OPTION') {
  //         input.disabled = !isPossible;
  //       }
  //     });
  //   });
  // }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  function initAsyncVariants(sectionId, productId) {
    const dataScript = document.querySelector(`[data-swatch-collection="${sectionId}-${productId}"]`);
    if (!dataScript) {
      console.warn('No swatch collection data found for:', sectionId, productId);
      return;
    }

    const swatchData = JSON.parse(dataScript.textContent);
    const variantPicker = getVariantPicker(sectionId, productId);
    if (!variantPicker) {
      console.warn('Variant picker not found for:', sectionId, productId);
      return;
    }

    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('color-swatch')) {
        handleVariantChange(event, swatchData, sectionId, productId);
      }
    });

    variantPicker.addEventListener('change', (event) => {
      handleVariantChange(event, swatchData, sectionId, productId);
    });
  }

  if (typeof window !== 'undefined') {
    window.initAsyncVariants = initAsyncVariants;
    window.initAsyncSwatch = initAsyncVariants;
  }
})();
