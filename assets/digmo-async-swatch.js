(function() {
  function buildGalleryHTML(matchingProduct, matchingVariant, sectionId, productId, imageZoom) {
    const featuredMediaId = matchingVariant.featuredMediaId || matchingProduct.featuredMediaId;

    // Build media items HTML
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

    // Build complete slider structure
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

    // First, render the featured media thumbnail (matching Liquid pattern)
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



    // Then render all other media (excluding featured, matching Liquid pattern)
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

  function initAsyncSwatch(sectionId, productId) {
    const variantPickerId = `VariantPicker-${sectionId}-${productId}`;
    const variantPickerSwatchId = variantPickerId + '-swatch';
    const variantPickerVariantId = variantPickerId + '-variant';

    const variantPicker = document.getElementById(variantPickerId) ||
                         document.getElementById(variantPickerSwatchId) ||
                         document.getElementById(variantPickerVariantId);
    const swatchDataScript = document.querySelector(`[data-swatch-collection="${sectionId}-${productId}"]`);

    if (!variantPicker || !swatchDataScript) return;

    const handleSwatchClick = (event) => {
      // Prevent default for all variant clicks when async mode is enabled
      const clickedLink = event.target.closest('a[href]');
      if (clickedLink) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }

      // Check if this is a jug color swatch
      const target = event.target.closest('a[data-jug-color]');
      if (!target) return; // Not a jug color, but we already prevented default above

      const previousSwatch = document.querySelector('a[data-jug-color].active');
      let currentUrl = window.location.href;

      const jugColor = target.getAttribute('data-jug-color');
      if (!jugColor) return;


      // Update the Active State
      if(previousSwatch) {
        previousSwatch.classList.remove('active');
      }

      target.classList.add('active');

      // Grab Swatch Collection Data From The Script
      const swatchCollection = JSON.parse(swatchDataScript.textContent);

      // Find the Product That Matches The Jug Color
      const matchingProduct = swatchCollection.products.find(product => {
        const jugColorOption = product.options.find(opt => opt.name.toLowerCase() === 'jug color');
        if (!jugColorOption) return false;
        return jugColorOption.values.some(value => value.toLowerCase() === jugColor.toLowerCase());
      });

      if(matchingProduct) {
        const matchingVariant = matchingProduct.variants.find(variant => variant.option1 === jugColor);

        if (!matchingVariant) {
          console.error('No matching variant found for jug color:', jugColor);
          return;
        }

        // Check for media
        if (!matchingProduct.media || matchingProduct.media.length === 0) {
          console.warn('No media found for product:', matchingProduct.handle);
          return;
        }

        currentUrl = matchingVariant.url;
        window.history.replaceState({}, '', currentUrl);

        // Find the gallery container
        const galleryContainer = document.getElementById(`ProductGallery-${sectionId}-${productId}`);

        if (galleryContainer) {
          // Detect the current zoom type from existing media buttons
          const existingZoomButton = galleryContainer.querySelector('[is^="media-"]');
          let imageZoom = 'click'; // default
          if (existingZoomButton) {
            const isAttr = existingZoomButton.getAttribute('is');
            if (isAttr) {
              imageZoom = isAttr.replace('media-', '').replace('-button', '');
            }
          }

          // Build new gallery HTML
          const newGalleryHTML = buildGalleryHTML(matchingProduct, matchingVariant, sectionId, productId, imageZoom);

          // Find and update thumbnails FIRST (before replacing gallery HTML)
          const scrollShadow = galleryContainer.querySelector('scroll-shadow');

          if (scrollShadow && matchingProduct.media.length > 1) {
            const thumbnailsList = scrollShadow.querySelector('media-dots.product__thumbnails-list');

            if (thumbnailsList) {
              const newThumbnailsHTML = buildThumbnailsHTML(matchingProduct, matchingVariant, sectionId, productId);
              thumbnailsList.innerHTML = newThumbnailsHTML;

              // Re-initialize media-dots to attach event listeners
              thumbnailsList.initialized = false;
              if (thumbnailsList.reset && typeof thumbnailsList.reset === 'function') {
                thumbnailsList.reset();
              }
              if (thumbnailsList.init && typeof thumbnailsList.init === 'function') {
                thumbnailsList.init();
              }
            }
          }

          // Now replace the slider part (keep the media-gallery wrapper)
          const sliderContainer = galleryContainer.querySelector('.relative.w-full.h-full');
          if (sliderContainer) {
            sliderContainer.outerHTML = newGalleryHTML;

            // Get the new slider element
            const sliderElement = galleryContainer.querySelector('slider-element');
            if (sliderElement) {
              // Trigger initialization if needed
              sliderElement.init?.();

              // Select the featured media
              const featuredMediaId = matchingVariant.featuredMediaId || matchingProduct.featuredMediaId;
              if (featuredMediaId) {
                const mediaIndex = matchingProduct.media.findIndex(m => m.id === featuredMediaId);
                if (mediaIndex >= 0) {
                  // Use a small delay to ensure DOM is ready
                  setTimeout(() => {
                    sliderElement.select(mediaIndex + 1, true);
                  }, 100);
                }
              }
            }
          }
        }

        console.log('Gallery updated:', {
          jugColor: jugColor,
          product: matchingProduct,
          variant: matchingVariant
        });
      }
    };

    variantPicker.addEventListener('click', handleSwatchClick, true);

    const swatchLinks = variantPicker.querySelectorAll('a[data-jug-color]');
    swatchLinks.forEach(link => {
      link.addEventListener('click', handleSwatchClick, true);
    });
  }

  if (typeof window !== 'undefined') {
    window.initAsyncSwatch = initAsyncSwatch;
  }
})();
