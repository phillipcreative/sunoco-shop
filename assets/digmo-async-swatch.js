(function() {
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
      const target = event.target.closest('a[data-jug-color]');
      const previousSwatch = document.querySelector('a[data-jug-color].active');
      let currentUrl = window.location.href;
      if (!target) return;

      const jugColor = target.getAttribute('data-jug-color');
      if (!jugColor) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();


      // Update the Active State
      if(previousSwatch) {
        previousSwatch.classList.remove('active');
      }

      target.classList.add('active');

      // Grab Swatch Collection Data From The Script
      const swatchCollection = JSON.parse(swatchDataScript.textContent);

      console.log('swatchCollection', swatchCollection);

      // Find the Product That Matches The Jug Color
      const matchingProduct = swatchCollection.products.find(product => {
        const jugColorOption = product.options.find(opt => opt.name.toLowerCase() === 'jug color');
        if (!jugColorOption) return false;
        return jugColorOption.values.some(value => value.toLowerCase() === jugColor.toLowerCase());
      });

      if(matchingProduct) {
        const matchingVariant = matchingProduct.variants.find(variant => variant.option1 === jugColor);
        currentUrl = matchingVariant.url;
        window.history.replaceState({}, '', currentUrl);

        // Get all product media
        const matchingProductMedia = matchingProduct.media;

        // Get the featured media for this variant
        const variantFeaturedMedia = matchingVariant.featuredMediaId
          ? productMedia.find(media => media.id === matchingVariant.featuredMediaId)
          : null;

        console.log('Product Media:', productMedia);
        console.log('Variant Featured Media:', variantFeaturedMedia);

//         // Find the ProductInfo element
//         const productInfo = document.querySelector(`product-info[data-section-id="${sectionId}"]`);

//         if (productInfo && typeof productInfo.renderProductInfo === 'function') {
//           // Use the theme's existing method to fetch and update the gallery
//           productInfo.renderProductInfo({
//             requestUrl: currentUrl,
//             targetId: target.id || `swatch-${jugColor}`,
//             callback: productInfo.handleUpdateProductInfo()
//           });
//         }
// }
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
