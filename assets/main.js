/**
 * Lampery Shopify Theme - Main JavaScript
 * AJAX Cart functionality and UI interactions
 */

document.addEventListener('DOMContentLoaded', function() {
  'use strict';

  // ==========================================
  // Cart Functions
  // ==========================================

  /**
   * Update cart quantity
   */
  function updateCartQuantity(key, quantity) {
    // Show loading state
    const itemElement = document.querySelector(`[data-cart-item="${key}"]`);
    if (itemElement) {
      itemElement.style.opacity = '0.5';
    }

    const cartChangeUrl = window.routes?.cart_change_url || '/cart/change.js';

    fetch(cartChangeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        id: key,
        quantity: quantity
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(cart => {
      if (cart.errors) {
        showToast(window.cartStrings?.error || 'Ein Fehler ist aufgetreten');
        if (itemElement) itemElement.style.opacity = '1';
        return;
      }
      refreshCartDrawer();
    })
    .catch(error => {
      console.error('Error updating cart:', error);
      showToast(window.cartStrings?.error || 'Ein Fehler ist aufgetreten');
      if (itemElement) itemElement.style.opacity = '1';
    });
  }

  /**
   * Remove item from cart
   */
  function removeFromCart(key) {
    updateCartQuantity(key, 0);
  }

  /**
   * Add to cart
   */
  function addToCart(variantId, quantity = 1) {
    const cartAddUrl = window.routes?.cart_add_url || '/cart/add.js';

    fetch(cartAddUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        id: variantId,
        quantity: quantity
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.description || 'Add to cart failed');
        });
      }
      return response.json();
    })
    .then(item => {
      // Show success animation
      showAddToCartSuccess();
      // Refresh cart drawer content
      refreshCartDrawer();
      // Open cart drawer
      openCartDrawer();
    })
    .catch(error => {
      console.error('Error adding to cart:', error);
      showToast(error.message || window.cartStrings?.error || 'Ein Fehler ist aufgetreten');
    });
  }

  /**
   * Open cart drawer - Alpine.js compatible
   */
  function openCartDrawer() {
    // Use Alpine.js v3 $data method
    if (typeof Alpine !== 'undefined') {
      const body = document.body;
      if (body._x_dataStack && body._x_dataStack[0]) {
        body._x_dataStack[0].cartOpen = true;
        return;
      }
    }
    // Fallback: dispatch custom event
    document.body.dispatchEvent(new CustomEvent('open-cart', { bubbles: true }));
  }

  /**
   * Refresh cart drawer content via section rendering API
   * Also refreshes cart page if we're on it
   */
  function refreshCartDrawer() {
    // Check if we're on the cart page
    const isCartPage = window.location.pathname === '/cart' || window.location.pathname.endsWith('/cart');

    if (isCartPage) {
      // On cart page, use section rendering to update content
      refreshCartPage();
      return;
    }

    // Use Shopify Section Rendering API for efficient updates
    fetch(window.location.pathname + '?sections=cart-drawer-content')
      .then(response => response.json())
      .then(sections => {
        if (sections['cart-drawer-content']) {
          updateCartDrawerContent(sections['cart-drawer-content']);
        } else {
          // Fallback: Fetch the full page and extract cart content
          refreshCartFallback();
        }
      })
      .catch(error => {
        console.error('Section fetch failed, using fallback:', error);
        refreshCartFallback();
      });
  }

  /**
   * Refresh cart page content via AJAX
   */
  function refreshCartPage() {
    fetch('/cart?sections=main-cart')
      .then(response => response.json())
      .then(sections => {
        if (sections['main-cart']) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(sections['main-cart'], 'text/html');

          // Find the section content
          const newSection = doc.querySelector('.section-main-cart') || doc.querySelector('section');
          const currentSection = document.querySelector('.section-main-cart') || document.querySelector('section.section');

          if (newSection && currentSection) {
            currentSection.innerHTML = newSection.innerHTML;
            // Re-initialize event listeners for new content
            initCartEventListeners();
          }
        }
        refreshCartCount();
      })
      .catch(error => {
        console.error('Cart page refresh failed:', error);
        // Fallback to page reload
        window.location.reload();
      });
  }

  /**
   * Fallback method to refresh cart
   */
  function refreshCartFallback() {
    fetch(window.location.href)
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Update cart items
        const newContent = doc.getElementById('cart-drawer-content');
        const currentContent = document.getElementById('cart-drawer-content');
        if (newContent && currentContent) {
          currentContent.innerHTML = newContent.innerHTML;
        }

        // Update progress bar
        const newProgress = doc.getElementById('cart-progress-wrapper');
        const currentProgress = document.getElementById('cart-progress-wrapper');
        if (newProgress && currentProgress) {
          currentProgress.innerHTML = newProgress.innerHTML;
        }

        // Update cart footer
        const newFooter = doc.getElementById('cart-footer');
        const currentFooter = document.getElementById('cart-footer');
        if (newFooter && currentFooter) {
          currentFooter.innerHTML = newFooter.innerHTML;
          currentFooter.style.display = newFooter.style.display;
        }

        // Update subtotal
        const newSubtotal = doc.getElementById('cart-subtotal');
        const currentSubtotal = document.getElementById('cart-subtotal');
        if (newSubtotal && currentSubtotal) {
          currentSubtotal.textContent = newSubtotal.textContent;
        }

        // Update cart count in header
        refreshCartCount();

        // Re-initialize event listeners
        initCartEventListeners();
      })
      .catch(error => {
        console.error('Error refreshing cart:', error);
      });
  }

  /**
   * Update cart drawer content from section HTML
   */
  function updateCartDrawerContent(sectionHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sectionHtml, 'text/html');

    const newContent = doc.getElementById('cart-drawer-content');
    const currentContent = document.getElementById('cart-drawer-content');
    if (newContent && currentContent) {
      currentContent.innerHTML = newContent.innerHTML;
    }

    const newProgress = doc.getElementById('cart-progress-wrapper');
    const currentProgress = document.getElementById('cart-progress-wrapper');
    if (newProgress && currentProgress) {
      currentProgress.innerHTML = newProgress.innerHTML;
    }

    const newFooter = doc.getElementById('cart-footer');
    const currentFooter = document.getElementById('cart-footer');
    if (newFooter && currentFooter) {
      currentFooter.innerHTML = newFooter.innerHTML;
      currentFooter.style.display = '';
    }

    refreshCartCount();
    initCartEventListeners();
  }

  /**
   * Refresh cart count in header
   */
  function refreshCartCount() {
    const cartUrl = window.routes?.cart_url ? window.routes.cart_url + '.js' : '/cart.js';

    fetch(cartUrl)
      .then(response => response.json())
      .then(cart => {
        const countElements = document.querySelectorAll('[data-cart-count]');
        countElements.forEach(el => {
          el.textContent = cart.item_count;
          if (el.classList.contains('hidden') && cart.item_count > 0) {
            el.classList.remove('hidden');
          } else if (!el.classList.contains('hidden') && cart.item_count === 0) {
            el.classList.add('hidden');
          }
        });

        // Show/hide cart footer based on item count
        const cartFooter = document.getElementById('cart-footer');
        if (cartFooter) {
          cartFooter.style.display = cart.item_count > 0 ? '' : 'none';
        }
      })
      .catch(error => {
        console.error('Error refreshing cart count:', error);
      });
  }

  /**
   * Show add to cart success animation
   */
  function showAddToCartSuccess() {
    const cartButton = document.querySelector('[data-cart-button]');
    if (cartButton) {
      cartButton.classList.add('animate-bounce');
      setTimeout(() => {
        cartButton.classList.remove('animate-bounce');
      }, 1000);
    }
  }

  // ==========================================
  // Event Listeners
  // ==========================================

  /**
   * Initialize cart event listeners using event delegation
   * Works for both cart drawer and main cart page
   */
  function initCartEventListeners() {
    // Use document-level event delegation for cart buttons
    // This works for both cart drawer and cart page
    if (document._cartClickHandler) {
      document.removeEventListener('click', document._cartClickHandler);
    }

    document._cartClickHandler = function(e) {
      const target = e.target.closest('button');
      if (!target) return;

      // Quantity minus button
      if (target.hasAttribute('data-quantity-minus')) {
        e.preventDefault();
        const key = target.getAttribute('data-quantity-minus');
        if (!key) return;

        // Try to find value display (drawer) or input (cart page)
        const valueEl = document.querySelector(`[data-quantity-value="${key}"]`);
        const inputEl = document.querySelector(`[data-quantity-input="${key}"]`);

        let currentQty = 1;
        if (valueEl) {
          currentQty = parseInt(valueEl.textContent) || 1;
        } else if (inputEl) {
          currentQty = parseInt(inputEl.value) || 1;
        }

        const newQty = Math.max(0, currentQty - 1);

        if (newQty === 0) {
          removeFromCart(key);
        } else {
          if (valueEl) valueEl.textContent = newQty;
          if (inputEl) inputEl.value = newQty;
          updateCartQuantity(key, newQty);
        }
      }

      // Quantity plus button
      if (target.hasAttribute('data-quantity-plus')) {
        e.preventDefault();
        const key = target.getAttribute('data-quantity-plus');
        if (!key) return;

        const valueEl = document.querySelector(`[data-quantity-value="${key}"]`);
        const inputEl = document.querySelector(`[data-quantity-input="${key}"]`);

        let currentQty = 0;
        if (valueEl) {
          currentQty = parseInt(valueEl.textContent) || 0;
        } else if (inputEl) {
          currentQty = parseInt(inputEl.value) || 0;
        }

        const newQty = currentQty + 1;

        if (valueEl) valueEl.textContent = newQty;
        if (inputEl) inputEl.value = newQty;
        updateCartQuantity(key, newQty);
      }

      // Remove button
      if (target.hasAttribute('data-cart-remove')) {
        e.preventDefault();
        const key = target.getAttribute('data-cart-remove');
        if (key) {
          removeFromCart(key);
        }
      }
    };

    document.addEventListener('click', document._cartClickHandler);

    // Also handle input change on cart page
    document.querySelectorAll('[data-quantity-input]').forEach(input => {
      if (input._changeHandler) {
        input.removeEventListener('change', input._changeHandler);
      }

      input._changeHandler = function() {
        const key = this.getAttribute('data-quantity-input');
        const newQty = parseInt(this.value) || 1;
        if (key && newQty >= 0) {
          if (newQty === 0) {
            removeFromCart(key);
          } else {
            updateCartQuantity(key, newQty);
          }
        }
      };

      input.addEventListener('change', input._changeHandler);
    });
  }

  /**
   * Initialize product form
   */
  function initProductForm() {
    const productForm = document.getElementById('product-form');
    const quantityInput = document.getElementById('product-quantity');
    const formQuantity = document.getElementById('form-quantity');

    if (quantityInput && formQuantity) {
      quantityInput.addEventListener('change', function() {
        formQuantity.value = this.value;
      });

      // Quantity buttons on product page (without key)
      const minusBtns = document.querySelectorAll('[data-quantity-minus=""]');
      const plusBtns = document.querySelectorAll('[data-quantity-plus=""]');

      minusBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          const newValue = Math.max(1, parseInt(quantityInput.value) - 1);
          quantityInput.value = newValue;
          formQuantity.value = newValue;
        });
      });

      plusBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          const newValue = parseInt(quantityInput.value) + 1;
          quantityInput.value = newValue;
          formQuantity.value = newValue;
        });
      });
    }

    // AJAX add to cart
    if (productForm) {
      productForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const variantId = formData.get('id');
        const quantity = parseInt(formData.get('quantity')) || 1;
        addToCart(variantId, quantity);
      });
    }
  }

  /**
   * Initialize variant picker
   */
  function initVariantPicker() {
    const productSelect = document.getElementById('product-select');
    const variantIdInput = document.getElementById('product-variant-id');
    const optionSelects = document.querySelectorAll('[data-option-position]');
    const colorButtons = document.querySelectorAll('[data-option-value]');

    if (!productSelect) return;

    optionSelects.forEach(select => {
      select.addEventListener('change', updateVariant);
    });

    colorButtons.forEach(button => {
      button.addEventListener('click', function() {
        const value = this.dataset.optionValue;
        const position = this.dataset.optionPosition;

        const siblings = document.querySelectorAll(`[data-option-position="${position}"]`);
        siblings.forEach(sib => {
          sib.classList.remove('border-primary');
          sib.classList.add('border-border');
        });
        this.classList.remove('border-border');
        this.classList.add('border-primary');

        updateVariant();
      });
    });

    function updateVariant() {
      const selectedOptions = [];

      optionSelects.forEach(select => {
        if (select.tagName === 'SELECT') {
          selectedOptions.push(select.value);
        }
      });

      const activeButtons = document.querySelectorAll('[data-option-value].border-primary');
      activeButtons.forEach(button => {
        selectedOptions.push(button.dataset.optionValue);
      });

      const options = productSelect.querySelectorAll('option');
      for (const option of options) {
        const variantTitle = option.textContent.trim();
        const matches = selectedOptions.every(opt => variantTitle.includes(opt));
        if (matches) {
          productSelect.value = option.value;
          if (variantIdInput) {
            variantIdInput.value = option.value;
          }
          updateProductInfo(option);
          break;
        }
      }
    }

    function updateProductInfo(option) {
      const isAvailable = !option.disabled;
      const addButton = document.querySelector('#product-form [type="submit"]');
      if (addButton) {
        addButton.disabled = !isAvailable;
        addButton.classList.toggle('opacity-50', !isAvailable);
        addButton.classList.toggle('cursor-not-allowed', !isAvailable);
      }
    }
  }

  /**
   * Initialize product gallery
   */
  function initProductGallery() {
    const thumbnails = document.querySelectorAll('[data-media-id]');
    const mainImage = document.getElementById('product-main-image');

    if (!thumbnails.length || !mainImage) return;

    thumbnails.forEach(thumb => {
      thumb.addEventListener('click', function() {
        const img = this.querySelector('img');
        if (img) {
          mainImage.src = img.src.replace('/150/', '/800/');
          mainImage.srcset = img.src.replace('/150/', '/400/') + ' 400w, ' +
                            img.src.replace('/150/', '/600/') + ' 600w, ' +
                            img.src.replace('/150/', '/800/') + ' 800w';

          thumbnails.forEach(t => {
            t.classList.remove('border-primary');
            t.classList.add('border-transparent');
          });
          this.classList.remove('border-transparent');
          this.classList.add('border-primary');
        }
      });
    });
  }

  /**
   * Smooth scroll for anchor links
   */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // ==========================================
  // Initialize
  // ==========================================

  initCartEventListeners();
  initProductForm();
  initVariantPicker();
  initProductGallery();
  initSmoothScroll();

  // Listen for custom open-cart event
  document.body.addEventListener('open-cart', function() {
    if (typeof Alpine !== 'undefined') {
      const body = document.body;
      if (body._x_dataStack && body._x_dataStack[0]) {
        body._x_dataStack[0].cartOpen = true;
      }
    }
  });

});

// ==========================================
// Toast Notifications
// ==========================================

function showToast(message, duration = 3000) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification fixed bottom-6 left-1/2 z-50 px-6 py-3 bg-text text-white rounded-lg shadow-lg';
  toast.style.transform = 'translateX(-50%) translateY(1rem)';
  toast.style.opacity = '0';
  toast.style.transition = 'all 0.3s ease';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(1rem)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
