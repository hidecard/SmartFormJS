class SmartForm {
    constructor(selector, config) {
      this.form = document.querySelector(selector);
      this.fields = config.fields || {};
      this.language = config.language || 'en';
      this.onSubmit = config.onSubmit || (() => {});
      this.data = {};
      this.init();
    }
  
    init() {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
      this.setupFields();
    }
  
    setupFields() {
      Object.keys(this.fields).forEach((fieldName) => {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (field) {
          const errorSpan = field.nextElementSibling || document.createElement('span');
          errorSpan.className = 'error';
          field.parentElement.appendChild(errorSpan);
          field.addEventListener('input', () => this.validateField(fieldName, field, errorSpan));
        }
      });
    }
  
    validateField(fieldName, field, errorSpan) {
      const rules = this.fields[fieldName];
      let isValid = true;
      if (rules.required && !field.value) isValid = false;
      if (rules.pattern && !rules.pattern.test(field.value)) isValid = false;
      field.setCustomValidity(isValid ? '' : this.getMessage('invalid', fieldName));
      errorSpan.textContent = field.validationMessage;
      this.data[fieldName] = field.value;
    }
  
    // 1. Payment Gateway Integration (Simulated)
    enablePaymentGateway(options) {
      this.paymentOptions = options;
      if (typeof Stripe !== 'undefined') {
        this.stripe = Stripe(options.publishableKey);
        const elements = this.stripe.elements();
        const cardElement = elements.create('card');
        const cardContainer = document.createElement('div');
        cardContainer.id = 'card-element';
        cardContainer.className = 'card-element';
        this.form.appendChild(cardContainer);
        cardElement.mount('#card-element');
        const paymentError = document.createElement('span');
        paymentError.className = 'payment-error';
        this.form.appendChild(paymentError);
        this.cardElement = cardElement;
        this.paymentError = paymentError;
      } else {
        console.warn('Stripe.js not loaded. Running in simulation mode.');
      }
    }
  
    // 2. Order Tracking
    enableOrderTracking(options) {
      this.orderTrackingOptions = options;
    }
  
    generateOrderNumber() {
      return 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  
    // 3. Inventory Check (Simulated)
    enableInventoryCheck(options) {
      const productField = this.form.querySelector(`[name="${options.productField}"]`);
      const stockDisplay = document.createElement('span');
      stockDisplay.className = 'stock-status';
      productField.parentElement.appendChild(stockDisplay);
      this.inventoryOptions = options;
  
      productField.addEventListener('change', async () => {
        try {
          const response = await fetch(`${options.apiUrl}/${productField.value}`);
          const data = await response.json();
          stockDisplay.textContent = data.inStock ? 'In Stock' : 'Out of Stock';
          this.data.inStock = data.inStock;
        } catch (error) {
          console.warn('Inventory API failed. Using simulation:', error);
          stockDisplay.textContent = 'In Stock (Simulated)';
          this.data.inStock = true; // Fallback
        }
      });
    }
  
    // 4. Dynamic Pricing
    enableDynamicPricing(options) {
      this.pricingOptions = options;
      const priceDisplay = document.createElement('div');
      priceDisplay.className = 'price-display';
      this.form.appendChild(priceDisplay);
      this.updatePrice = () => {
        let total = 0;
        options.items.forEach(item => {
          const quantity = this.form.querySelector(`[name="${item.quantityField}"]`)?.value || 0;
          total += quantity * item.price;
        });
        if (this.data.customOptions) total += this.data.customOptions;
        if (this.data.planPrice) total = this.data.planPrice;
        if (this.data.couponDiscount) total -= this.data.couponDiscount;
        if (this.data.tax) total += this.data.tax;
        if (this.currencyOptions) {
          total *= this.data.exchangeRate || 1;
          priceDisplay.textContent = `Total: ${this.data.currency || 'USD'} ${total.toFixed(2)}`;
        } else {
          priceDisplay.textContent = `Total: $${total.toFixed(2)}`;
        }
        this.data.totalPrice = total;
      };
      options.items.forEach(item => {
        const field = this.form.querySelector(`[name="${item.quantityField}"]`);
        if (field) field.addEventListener('input', this.updatePrice);
      });
    }
  
    // 5. Customer Feedback Form
    enableCustomerFeedback(options) {
      this.feedbackOptions = options;
    }
  
    showFeedbackForm() {
      const feedbackContainer = document.createElement('div');
      feedbackContainer.className = 'feedback-container';
      feedbackContainer.innerHTML = `
        <h3>Rate Your Experience</h3>
        <div class="star-rating">
          ${[1, 2, 3, 4, 5].map(star => `<span class="star" data-value="${star}">★</span>`).join('')}
        </div>
        <textarea name="comment" placeholder="Your feedback..."></textarea>
        <button class="submit-feedback">Submit Feedback</button>
      `;
      document.body.appendChild(feedbackContainer);
  
      const stars = feedbackContainer.querySelectorAll('.star');
      stars.forEach(star => {
        star.addEventListener('click', () => {
          this.data.rating = star.dataset.value;
          stars.forEach(s => s.classList.toggle('selected', s.dataset.value <= star.dataset.value));
        });
      });
  
      feedbackContainer.querySelector('.submit-feedback').addEventListener('click', () => {
        this.data.comment = feedbackContainer.querySelector('textarea').value;
        document.body.removeChild(feedbackContainer);
        if (this.feedbackOptions.apiUrl) {
          fetch(this.feedbackOptions.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: this.data.rating, comment: this.data.comment })
          }).catch(() => console.warn('Feedback API failed.'));
        }
      });
    }
  
    // 6. File Attachment with Size Limit
    enableFileAttachment(options) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.name = options.fieldName || 'attachment';
      fileInput.accept = options.accept || '*/*';
      const fileError = document.createElement('span');
      fileError.className = 'file-error';
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file && file.size > (options.maxSize || 5 * 1024 * 1024)) {
          fileError.textContent = `File size exceeds ${options.maxSize / 1024 / 1024}MB limit`;
          fileInput.value = '';
        } else {
          fileError.textContent = '';
          const reader = new FileReader();
          reader.onload = (e) => this.data[options.fieldName || 'attachment'] = e.target.result;
          reader.readAsDataURL(file);
        }
      });
      const container = document.createElement('div');
      container.appendChild(fileInput);
      container.appendChild(fileError);
      this.form.appendChild(container);
    }
  
    // 7. Geo-Location Capture
    enableGeoLocation(options) {
      const geoButton = document.createElement('button');
      geoButton.textContent = 'Use Current Location';
      geoButton.type = 'button';
      geoButton.className = 'geo-button';
      this.form.appendChild(geoButton);
  
      geoButton.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.data.location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              country: 'US' // Simulated
            };
            geoButton.textContent = `Location Captured (${position.coords.latitude}, ${position.coords.longitude})`;
            if (this.calculateTax) this.calculateTax();
          },
          (error) => alert('Location access denied.')
        );
      });
    }
  
    // 8. Coupon Code Validation
    enableCouponCode(options) {
      const couponInput = document.createElement('input');
      couponInput.type = 'text';
      couponInput.name = 'coupon';
      couponInput.placeholder = 'Enter Coupon Code';
      const couponStatus = document.createElement('span');
      couponStatus.className = 'coupon-status';
      const container = document.createElement('div');
      container.appendChild(couponInput);
      container.appendChild(couponStatus);
      this.form.appendChild(container);
  
      couponInput.addEventListener('change', () => {
        const code = couponInput.value;
        if (options.validCodes.includes(code)) {
          this.data.couponDiscount = options.discounts[code] || 10;
          couponStatus.textContent = `Coupon Applied! $${this.data.couponDiscount} off`;
          if (this.updatePrice) this.updatePrice();
        } else {
          couponStatus.textContent = 'Invalid Coupon Code';
          this.data.couponDiscount = 0;
        }
      });
    }
  
    // 9. Appointment Scheduling (Simulated)
    enableAppointmentScheduling(options) {
      const dateInput = document.createElement('input');
      dateInput.type = 'datetime-local';
      dateInput.name = 'appointment';
      dateInput.required = true;
      const slotStatus = document.createElement('span');
      slotStatus.className = 'slot-status';
      const container = document.createElement('div');
      container.appendChild(dateInput);
      container.appendChild(slotStatus);
      this.form.appendChild(container);
  
      dateInput.addEventListener('change', async () => {
        const selectedTime = new Date(dateInput.value).getTime();
        try {
          const response = await fetch(`${options.apiUrl}?time=${selectedTime}`);
          const data = await response.json();
          if (data.available) {
            this.data.appointment = dateInput.value;
            slotStatus.textContent = 'Slot Available';
          } else {
            slotStatus.textContent = 'Slot Not Available';
            dateInput.value = '';
          }
        } catch (error) {
          console.warn('Slots API failed. Using simulation:', error);
          this.data.appointment = dateInput.value;
          slotStatus.textContent = 'Slot Available (Simulated)';
        }
      });
    }
  
    // 10. Live Chat Integration
    enableLiveChat(options) {
      const chatButton = document.createElement('button');
      chatButton.textContent = 'Chat with Us';
      chatButton.type = 'button';
      chatButton.className = 'chat-button';
      this.form.parentElement.appendChild(chatButton);
  
      chatButton.addEventListener('click', () => {
        const chatWindow = document.createElement('div');
        chatWindow.className = 'chat-window';
        chatWindow.innerHTML = `
          <div class="chat-header">Live Chat</div>
          <div class="chat-messages"></div>
          <input type="text" class="chat-input" placeholder="Type a message...">
          <button class="send-message">Send</button>
        `;
        document.body.appendChild(chatWindow);
  
        const sendButton = chatWindow.querySelector('.send-message');
        const chatInput = chatWindow.querySelector('.chat-input');
        const messages = chatWindow.querySelector('.chat-messages');
  
        sendButton.addEventListener('click', () => {
          const message = chatInput.value;
          if (message) {
            messages.innerHTML += `<p>You: ${message}</p>`;
            chatInput.value = '';
            setTimeout(() => messages.innerHTML += `<p>Support: Thanks for your message!</p>`, 1000);
          }
        });
      });
    }
  
    // 11. Multi-Currency Support (Simulated)
    enableMultiCurrency(options) {
      this.currencyOptions = options;
      const currencySelect = document.createElement('select');
      currencySelect.name = 'currency';
      currencySelect.innerHTML = options.currencies.map(c => `<option value="${c}">${c}</option>`).join('');
      this.form.appendChild(currencySelect);
  
      currencySelect.addEventListener('change', async () => {
        this.data.currency = currencySelect.value;
        try {
          const response = await fetch(`${options.apiUrl}?base=USD&symbols=${this.data.currency}`);
          const data = await response.json();
          this.data.exchangeRate = data.rates[this.data.currency] || 1;
        } catch (error) {
          console.warn('Currency API failed. Using simulation:', error);
          this.data.exchangeRate = { USD: 1, EUR: 0.85, MMK: 2000 }[this.data.currency] || 1; // Simulated rates
        }
        if (this.updatePrice) this.updatePrice();
      });
  
      this.data.currency = currencySelect.value;
      this.data.exchangeRate = 1;
      if (this.updatePrice) this.updatePrice();
    }
  
    // 12. Subscription Plan Selector
    enableSubscriptionPlan(options) {
      const planContainer = document.createElement('div');
      planContainer.className = 'plan-container';
      planContainer.innerHTML = options.plans.map(plan => `
        <label>
          <input type="radio" name="plan" value="${plan.name}" data-price="${plan.price}">
          ${plan.name} - $${plan.price}/${plan.interval}
        </label>
      `).join('');
      this.form.appendChild(planContainer);
  
      const radios = planContainer.querySelectorAll('input[type="radio"]');
      radios.forEach(radio => {
        radio.addEventListener('change', () => {
          if (radio.checked) {
            this.data.plan = radio.value;
            this.data.planPrice = parseFloat(radio.dataset.price);
            if (this.updatePrice) this.updatePrice();
          }
        });
      });
    }
  
    // 13. Product Customization Options
    enableProductCustomization(options) {
      const customContainer = document.createElement('div');
      customContainer.className = 'custom-container';
      customContainer.innerHTML = options.options.map(opt => `
        <label>
          <input type="checkbox" name="${opt.name}" data-price="${opt.price}">
          ${opt.name} (+$${opt.price})
        </label>
      `).join('');
      this.form.appendChild(customContainer);
  
      const checkboxes = customContainer.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          let customCost = 0;
          checkboxes.forEach(cb => {
            if (cb.checked) customCost += parseFloat(cb.dataset.price);
          });
          this.data.customOptions = customCost;
          if (this.updatePrice) this.updatePrice();
        });
      });
    }
  
    // 14. Tax Calculator
    enableTaxCalculator(options) {
      const taxDisplay = document.createElement('span');
      taxDisplay.className = 'tax-display';
      this.form.appendChild(taxDisplay);
  
      this.calculateTax = () => {
        const subtotal = this.data.totalPrice || 0;
        const taxRate = options.taxRates[this.data.location?.country] || options.defaultRate || 0.1;
        this.data.tax = subtotal * taxRate;
        taxDisplay.textContent = `Tax: ${this.data.currency || 'USD'} ${this.data.tax.toFixed(2)}`;
        if (this.updatePrice) this.updatePrice();
      };
  
      this.form.addEventListener('change', this.calculateTax);
    }
  
    // 15. Social Media Login
    enableSocialLogin(options) {
      const socialContainer = document.createElement('div');
      socialContainer.className = 'social-container';
      socialContainer.innerHTML = `
        <button type="button" class="google-login">Login with Google</button>
        <button type="button" class="facebook-login">Login with Facebook</button>
      `;
      this.form.insertBefore(socialContainer, this.form.firstChild);
  
      const googleButton = socialContainer.querySelector('.google-login');
      googleButton.addEventListener('click', () => {
        this.data.customerName = 'Google User';
        this.data.email = 'googleuser@example.com';
        this.restoreForm();
        alert('Logged in with Google (Simulated)');
      });
  
      const facebookButton = socialContainer.querySelector('.facebook-login');
      facebookButton.addEventListener('click', () => {
        this.data.customerName = 'Facebook User';
        this.data.email = 'fbuser@example.com';
        this.restoreForm();
        alert('Logged in with Facebook (Simulated)');
      });
    }
  
    restoreForm() {
      Object.keys(this.data).forEach(fieldName => {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (field) field.value = this.data[fieldName];
      });
    }
  
    async handleSubmit() {
      if (!this.form.checkValidity()) {
        this.form.reportValidity();
        return;
      }
  
      // 1. Payment Gateway (Simulated)
      if (this.paymentOptions) {
        if (this.stripe && this.cardElement) {
          try {
            const { paymentIntent, error } = await this.stripe.confirmCardPayment(
              this.paymentOptions.clientSecret,
              {
                payment_method: {
                  card: this.cardElement,
                  billing_details: { name: this.data.customerName, email: this.data.email }
                }
              }
            );
            if (error) {
              this.paymentError.textContent = error.message;
              return;
            } else {
              this.data.paymentIntentId = paymentIntent.id;
            }
          } catch (err) {
            this.paymentError.textContent = 'Payment processing failed.';
            return;
          }
        } else {
          alert('Payment successful (Simulated)');
          this.data.paymentIntentId = 'pi_simulated_' + Date.now();
        }
      }
  
      // 2. Order Tracking
      if (this.orderTrackingOptions) {
        this.data.orderNumber = this.generateOrderNumber();
        alert(`Order placed! Track it with: ${this.data.orderNumber}`);
      }
  
      // 3. Inventory Check
      if (this.inventoryOptions && !this.data.inStock) {
        alert('Selected product is out of stock.');
        return;
      }
  
      // 5. Customer Feedback
      if (this.feedbackOptions) this.showFeedbackForm();
  
      this.onSubmit(this.data);
    }
  
    getMessage(type, fieldName) {
      const messages = {
        my: { invalid: `${fieldName} မမှန်ကန်ပါ။` },
        en: { invalid: `${fieldName} is invalid.` }
      };
      return messages[this.language]?.[type] || messages.en[type];
    }
  }
  
  window.SmartForm = SmartForm;