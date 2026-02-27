/**
 * 3D Schriftzug Konfigurator
 * Canvas-based text preview with dynamic pricing
 */

function configurator() {
  return {
    text: '',
    font: 'Bangers',
    sizeIndex: 0,
    color: '',
    colorName: '',
    logoFile: null,
    logoPreview: null,
    logoFileName: '',
    sizes: [],
    colors: [],
    fonts: ['Bangers', 'Arial', 'Chicle', 'Lobster', 'PT Sans'],
    variantIds: {},
    productUrl: '',
    canvasReady: false,

    get letterCount() {
      return this.text.replace(/\s/g, '').length;
    },

    get previewText() {
      const words = this.text.trim().split(/\s+/).filter(w => w.length > 0);
      return words.slice(0, 3).join(' ');
    },

    get wordCount() {
      return this.text.trim().split(/\s+/).filter(w => w.length > 0).length;
    },

    get currentSize() {
      return this.sizes[this.sizeIndex] || null;
    },

    get pricePerLetter() {
      return this.currentSize ? this.currentSize.price : 0;
    },

    get totalPrice() {
      return this.letterCount * this.pricePerLetter;
    },

    get formattedPricePerLetter() {
      return (this.pricePerLetter / 100).toFixed(2).replace('.', ',') + ' \u20AC';
    },

    get formattedTotal() {
      return (this.totalPrice / 100).toFixed(2).replace('.', ',') + ' \u20AC';
    },

    get isValid() {
      return this.letterCount > 0 && this.currentSize && this.color;
    },

    get currentVariantId() {
      if (!this.currentSize) return null;
      return this.variantIds[this.currentSize.label] || null;
    },

    init() {
      // Set defaults from first available
      if (this.colors.length > 0) {
        this.color = this.colors[0].hex;
        this.colorName = this.colors[0].name;
      }

      // Wait for fonts to load, then render
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          this.canvasReady = true;
          this.renderCanvas();
        });
      } else {
        setTimeout(() => {
          this.canvasReady = true;
          this.renderCanvas();
        }, 500);
      }

      this.$watch('text', () => this.renderCanvas());
      this.$watch('font', () => this.renderCanvas());
      this.$watch('color', () => this.renderCanvas());
      this.$watch('logoPreview', () => this.renderCanvas());
    },

    selectFont(f) {
      this.font = f;
    },

    selectSize(index) {
      this.sizeIndex = index;
    },

    selectColor(hex, name) {
      this.color = hex;
      this.colorName = name;
    },

    handleLogoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return;
      }

      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        return;
      }

      this.logoFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    removeLogo() {
      this.logoFile = null;
      this.logoPreview = null;
      this.logoFileName = '';
      // Reset the file input
      const input = this.$refs.logoInput;
      if (input) input.value = '';
    },

    renderCanvas() {
      const canvas = this.$refs.canvas;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.parentElement.clientWidth;
      const displayHeight = Math.max(200, displayWidth * 0.45);

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = displayWidth + 'px';
      canvas.style.height = displayHeight + 'px';
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      const text = this.previewText || '';
      if (!text) {
        // Placeholder
        ctx.fillStyle = '#ccc';
        ctx.font = '16px Manrope, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Dein Text erscheint hier...', displayWidth / 2, displayHeight / 2);
        return;
      }

      // Calculate font size to fit canvas width
      const padding = 30;
      const maxWidth = displayWidth - padding * 2;
      let fontSize = 80;

      ctx.font = fontSize + 'px ' + this.getFontFamily();
      while (ctx.measureText(text).width > maxWidth && fontSize > 16) {
        fontSize -= 2;
        ctx.font = fontSize + 'px ' + this.getFontFamily();
      }

      const textX = displayWidth / 2;
      let textY = displayHeight / 2;

      // If logo, shift text up
      if (this.logoPreview) {
        textY = displayHeight * 0.35;
      }

      // 3D extrusion effect
      const depth = Math.max(3, Math.floor(fontSize / 12));
      const baseColor = this.color || '#000000';
      const shadowColor = this.darkenColor(baseColor, 40);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw extrusion layers (back to front)
      for (let i = depth; i > 0; i--) {
        ctx.fillStyle = this.darkenColor(baseColor, 20 + (i * 3));
        ctx.font = fontSize + 'px ' + this.getFontFamily();
        ctx.fillText(text, textX + i * 0.8, textY + i * 0.8);
      }

      // Drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      // Main text
      ctx.fillStyle = baseColor;
      ctx.font = fontSize + 'px ' + this.getFontFamily();
      ctx.fillText(text, textX, textY);

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw logo if uploaded
      if (this.logoPreview) {
        this.drawLogo(ctx, displayWidth, displayHeight, textY + fontSize / 2 + 10);
      }
    },

    drawLogo(ctx, canvasW, canvasH, startY) {
      const img = new Image();
      img.onload = () => {
        const maxLogoH = canvasH - startY - 15;
        const maxLogoW = canvasW * 0.3;
        const scale = Math.min(maxLogoW / img.width, maxLogoH / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvasW - w) / 2;
        const y = startY + 5;

        const canvas = this.$refs.canvas;
        const dpr = window.devicePixelRatio || 1;
        const tempCtx = canvas.getContext('2d');
        tempCtx.save();
        tempCtx.scale(1/dpr, 1/dpr);
        tempCtx.scale(dpr, dpr);
        tempCtx.drawImage(img, x, y, w, h);
        tempCtx.restore();
      };
      img.src = this.logoPreview;
    },

    getFontFamily() {
      const map = {
        'Bangers': "'Bangers', cursive",
        'Arial': "Arial, sans-serif",
        'Chicle': "'Chicle', cursive",
        'Lobster': "'Lobster', cursive",
        'PT Sans': "'PT Sans', sans-serif"
      };
      return map[this.font] || 'sans-serif';
    },

    darkenColor(hex, amount) {
      hex = hex.replace('#', '');
      const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - amount);
      const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - amount);
      const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - amount);
      return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
    },

    addToCart() {
      if (!this.isValid || !this.currentVariantId) return;

      const properties = {
        'Text': this.text,
        'Schriftart': this.font,
        'Gr\u00f6\u00dfe': this.currentSize.label,
        'Farbe': this.colorName,
        'Buchstaben': this.letterCount,
        'Einzelpreis': this.formattedPricePerLetter,
        'Gesamtpreis': this.formattedTotal
      };

      if (this.logoPreview) {
        properties['Logo'] = 'Ja';
        properties['_Logo_Data'] = this.logoPreview;
      }

      const cartAddUrl = window.routes?.cart_add_url || '/cart/add.js';

      fetch(cartAddUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: this.currentVariantId,
          quantity: this.letterCount,
          properties: properties
        })
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.description || 'Fehler beim Hinzuf\u00fcgen');
          });
        }
        return response.json();
      })
      .then(() => {
        // Use existing cart functions
        if (typeof showAddToCartSuccess === 'function') showAddToCartSuccess();
        if (typeof refreshCartDrawer === 'function') refreshCartDrawer();
        if (typeof openCartDrawer === 'function') openCartDrawer();

        // Dispatch event for Alpine.js cart drawer
        window.dispatchEvent(new CustomEvent('cart:updated'));
        const alpineRoot = document.querySelector('[x-data]');
        if (alpineRoot && alpineRoot.__x) {
          alpineRoot.__x.$data.cartOpen = true;
        } else if (typeof Alpine !== 'undefined') {
          document.querySelectorAll('[x-data]').forEach(el => {
            if (el._x_dataStack) {
              const data = el._x_dataStack[0];
              if ('cartOpen' in data) {
                data.cartOpen = true;
              }
            }
          });
        }
      })
      .catch(error => {
        console.error('Configurator add to cart error:', error);
        if (typeof showToast === 'function') {
          showToast(error.message || 'Ein Fehler ist aufgetreten');
        }
      });
    }
  };
}
