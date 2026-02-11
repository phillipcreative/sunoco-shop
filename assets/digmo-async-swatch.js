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
      if (!target) return;

      const jugColor = target.getAttribute('data-jug-color');
      if (!jugColor) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
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
