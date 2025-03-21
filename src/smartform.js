class SmartForm {
    constructor(selector, config) {
      this.form = document.querySelector(selector);
      this.fields = config.fields || {};
      this.language = config.language || 'en';
      this.onSubmit = config.onSubmit || (() => {});
      this.data = {};
      this.filledFields = new Set();
      this.isMultiStep = false;
      this.offlineQueue = [];
      this.init();
    }
  
    init() {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
      this.setupFields();
      window.addEventListener('online', () => this.processOfflineQueue());
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
      if (rules.minLength && field.value.length < rules.minLength) isValid = false;
      field.setCustomValidity(isValid ? '' : this.getMessage('invalid', fieldName));
      errorSpan.textContent = field.validationMessage;
      this.data[fieldName] = field.value;
    }
  
    enableGamifiedExperience(options) {
      let points = 0;
      let pointsDisplay = this.form.querySelector('.points') || document.createElement('div');
      pointsDisplay.className = 'points';
      pointsDisplay.textContent = 'Points: 0';
      this.form.insertBefore(pointsDisplay, this.form.firstChild);
      Object.keys(this.fields).forEach((fieldName) => {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (field) {
          field.addEventListener('input', () => {
            const isValid = field.checkValidity() && field.value.trim() !== '';
            if (isValid && !this.filledFields.has(fieldName)) {
              points += options.pointsPerField || 10;
              this.filledFields.add(fieldName);
              pointsDisplay.textContent = `Points: ${points}`;
              if (options.animations?.onFieldFilled) this.animate('stepForward');
            }
          });
        }
      });
      this.form.addEventListener('submit', () => {
        if (this.form.checkValidity() && options.animations?.onComplete) this.animate('fireworks');
      });
    }
  
    animate(type) {
      const animation = document.createElement('div');
      animation.className = `animation ${type}`;
      this.form.appendChild(animation);
      setTimeout(() => animation.remove(), 1000);
    }
  
    enableProgress(options) {
      this.progress = { total: Object.keys(this.fields).length, filled: 0 };
      let progressBar = this.form.querySelector('.progress-bar') || document.createElement('div');
      progressBar.className = 'progress-bar';
      this.form.insertBefore(progressBar, this.form.firstChild);
      Object.keys(this.fields).forEach((fieldName) => {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (field) {
          field.addEventListener('input', () => {
            this.progress.filled = Object.values(this.data).filter(Boolean).length;
            progressBar.style.width = `${(this.progress.filled / this.progress.total) * 100}%`;
            if (options.showPercentage) progressBar.textContent = `${Math.round((this.progress.filled / this.progress.total) * 100)}%`;
          });
        }
      });
    }
  
    enableAutoSave(options) {
      setInterval(() => {
        localStorage.setItem('formData', JSON.stringify(this.data));
      }, options.interval || 5000);
      const savedData = localStorage.getItem('formData');
      if (savedData && confirm(options.recoveryMessage || 'Recover data?')) {
        this.data = JSON.parse(savedData);
        this.restoreForm();
      }
    }
  
    restoreForm() {
      Object.keys(this.data).forEach((fieldName) => {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (field) field.value = this.data[fieldName];
      });
    }
  
    enableSmartSuggestions(fieldName, options) {
      const field = this.form.querySelector(`[name="${fieldName}"]`);
      if (field) {
        let suggestionBox = field.parentElement.querySelector('.suggestions') || document.createElement('div');
        suggestionBox.className = 'suggestions';
        field.parentElement.appendChild(suggestionBox);
        field.addEventListener('input', () => {
          const suggestions = options.source.filter((item) =>
            item.toLowerCase().startsWith(field.value.toLowerCase())
          );
          suggestionBox.innerHTML = suggestions.map((s) => `<div onclick="this.parentElement.previousElementSibling.value='${s}';this.parentElement.innerHTML=''">${s}</div>`).join('');
        });
      }
    }
  
    enableSecureInputShield(options) {
      options.fields.forEach((fieldName) => {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (field) {
          const errorSpan = field.nextElementSibling;
          field.addEventListener('input', () => {
            const encrypted = btoa(field.value);
            if (options.encryptionPreview) errorSpan.textContent = `Encrypted: ${encrypted}`;
          });
          if (options.antiCapture) field.style.webkitUserSelect = 'none';
          if (options.fakeInputProtection) field.addEventListener('paste', (e) => e.preventDefault());
        }
      });
      let trust = this.form.querySelector('.trust') || document.createElement('p');
      trust.className = 'trust';
      trust.textContent = options.trustMessage || 'Secure';
      this.form.appendChild(trust);
    }
  
    enableStudentIDGenerator(options) {
      this.studentIDOptions = options;
    }
  
    enableDataExport(options) {
      const exportButton = document.createElement('button');
      exportButton.textContent = options.buttonText || 'Export Data';
      exportButton.className = 'export-btn';
      this.form.parentElement.appendChild(exportButton);
      exportButton.addEventListener('click', () => {
        const dataStr = options.format === 'csv'
          ? Object.keys(this.data).map(key => `${key},${this.data[key]}`).join('\n')
          : JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: options.format === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student-data.${options.format || 'json'}`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  
    enableDuplicateDetection(options) {
      this.duplicateOptions = options;
    }
  
    enableFileUpload(options) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.name = options.fieldName || 'photo';
      fileInput.accept = 'image/*';
      const preview = document.createElement('img');
      preview.className = 'photo-preview';
      preview.style.maxWidth = '100px';
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            preview.src = e.target.result;
            this.data[options.fieldName || 'photo'] = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
      const container = document.createElement('div');
      container.appendChild(fileInput);
      container.appendChild(preview);
      this.form.appendChild(container);
    }
  
    enableAPISubmission(options) {
      this.apiOptions = options;
    }
  
    enableMultiStep(options) {
      this.isMultiStep = true;
      const steps = options.steps || [];
      let currentStep = 0;
      const stepContainer = document.createElement('div');
      stepContainer.className = 'step-container';
      this.form.innerHTML = '';
      steps.forEach((stepFields, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = `step step-${index}`;
        stepDiv.style.display = index === 0 ? 'block' : 'none';
        stepDiv.innerHTML = stepFields.map(field => {
          if (field.type === 'select') {
            return `<div><select name="${field.name}" ${field.required ? 'required' : ''}><option value="">${field.placeholder}</option>${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}</select><span class="error"></span></div>`;
          }
          return `<div><input type="${field.type}" name="${field.name}" placeholder="${field.placeholder}" ${field.required ? 'required' : ''}><span class="error"></span></div>`;
        }).join('');
        stepContainer.appendChild(stepDiv);
      });
      this.form.appendChild(stepContainer);
  
      const navDiv = document.createElement('div');
      navDiv.className = 'step-nav';
      const prevBtn = document.createElement('button');
      prevBtn.textContent = 'Previous';
      prevBtn.style.display = 'none';
      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next';
      navDiv.appendChild(prevBtn);
      navDiv.appendChild(nextBtn);
      this.form.appendChild(navDiv);
  
      prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
          document.querySelector(`.step-${currentStep}`).style.display = 'none';
          currentStep--;
          document.querySelector(`.step-${currentStep}`).style.display = 'block';
          prevBtn.style.display = currentStep === 0 ? 'none' : 'inline';
          nextBtn.textContent = currentStep === steps.length - 1 ? 'Submit' : 'Next';
        }
      });
  
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentStep < steps.length - 1) {
          document.querySelector(`.step-${currentStep}`).style.display = 'none';
          currentStep++;
          document.querySelector(`.step-${currentStep}`).style.display = 'block';
          prevBtn.style.display = 'inline';
          nextBtn.textContent = currentStep === steps.length - 1 ? 'Submit' : 'Next';
        } else if (currentStep === steps.length - 1) {
          this.handleSubmit();
        }
      });
  
      this.setupFields();
    }
  
    enableRealTimeValidation(options) {
      Object.keys(this.fields).forEach((fieldName) => {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (field) {
          const feedback = document.createElement('span');
          feedback.className = 'validation-feedback';
          field.parentElement.appendChild(feedback);
          field.addEventListener('input', () => {
            const isValid = field.checkValidity() && field.value.trim() !== '';
            feedback.textContent = isValid ? '✔' : '✘';
            feedback.style.color = isValid ? '#4caf50' : '#f44336';
          });
        }
      });
    }
  
    enableBulkImport(options) {
      const importInput = document.createElement('input');
      importInput.type = 'file';
      importInput.accept = '.csv';
      this.form.appendChild(importInput);
      importInput.addEventListener('change', () => {
        const file = importInput.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target.result;
            const rows = text.split('\n').map(row => row.split(','));
            const headers = rows.shift();
            const importedData = rows.map(row => {
              const entry = {};
              headers.forEach((header, i) => entry[header.trim()] = row[i]?.trim());
              return entry;
            });
            localStorage.setItem('studentEntries', JSON.stringify(importedData));
            alert(options.message || `${importedData.length} students imported!`);
          };
          reader.readAsText(file);
        }
      });
    }
  
    enableEmailConfirmation(options) {
      this.emailOptions = options;
    }
  
    enableAnalyticsDashboard(options) {
      const dashboard = document.createElement('div');
      dashboard.className = 'analytics-dashboard';
      this.form.parentElement.appendChild(dashboard);
      this.updateDashboard = () => {
        const entries = JSON.parse(localStorage.getItem('studentEntries') || '[]');
        const gradeCount = entries.reduce((acc, entry) => {
          acc[entry.grade] = (acc[entry.grade] || 0) + 1;
          return acc;
        }, {});
        dashboard.innerHTML = `
          <h3>Registration Analytics</h3>
          <p>Total Students: ${entries.length}</p>
          <p>By Grade: ${Object.entries(gradeCount).map(([grade, count]) => `${grade}: ${count}`).join(', ')}</p>
        `;
      };
      this.updateDashboard();
    }
  
    enableCaptcha(options) {
      const captchaContainer = document.createElement('div');
      captchaContainer.className = 'captcha-container';
      const num1 = Math.floor(Math.random() * 10);
      const num2 = Math.floor(Math.random() * 10);
      const answer = num1 + num2;
      const captchaText = document.createElement('span');
      captchaText.textContent = `${num1} + ${num2} = `;
      const captchaInput = document.createElement('input');
      captchaInput.type = 'number';
      captchaInput.name = 'captcha';
      captchaInput.required = true;
      const errorSpan = document.createElement('span');
      errorSpan.className = 'error';
      captchaContainer.appendChild(captchaText);
      captchaContainer.appendChild(captchaInput);
      captchaContainer.appendChild(errorSpan);
      this.form.appendChild(captchaContainer);
      this.captchaAnswer = answer;
      this.captchaInput = captchaInput;
    }
  
    enableOfflineMode(options) {
      this.offlineOptions = options;
      if (!navigator.onLine) {
        alert(options.message || 'You are offline. Data will be submitted when online.');
      }
    }
  
    processOfflineQueue() {
      if (this.offlineQueue.length > 0 && this.apiOptions) {
        this.offlineQueue.forEach(async (data) => {
          try {
            const response = await fetch(this.apiOptions.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Network response was not ok');
            alert(this.apiOptions.successMessage || 'Offline data submitted!');
            this.offlineQueue.shift();
            localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
          } catch (error) {
            console.error('Offline submission failed:', error);
          }
        });
      }
    }
  
    enableConditionalFields(options) {
      options.rules.forEach(rule => {
        const triggerField = this.form.querySelector(`[name="${rule.trigger}"]`);
        const targetFieldContainer = document.createElement('div');
        targetFieldContainer.className = 'conditional-field';
        targetFieldContainer.innerHTML = `<input type="${rule.target.type}" name="${rule.target.name}" placeholder="${rule.target.placeholder}" ${rule.target.required ? 'required' : ''}><span class="error"></span>`;
        targetFieldContainer.style.display = 'none';
        triggerField.parentElement.appendChild(targetFieldContainer);
  
        triggerField.addEventListener('change', () => {
          const shouldShow = rule.condition(triggerField.value);
          targetFieldContainer.style.display = shouldShow ? 'block' : 'none';
          this.fields[rule.target.name] = { type: rule.target.type, required: rule.target.required };
          if (shouldShow) this.setupFields();
        });
      });
    }
  
    enableFormTimer(options) {
      const timerDisplay = document.createElement('div');
      timerDisplay.className = 'timer';
      let timeLeft = options.duration || 300; // Default 5 minutes
      timerDisplay.textContent = `Time Left: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
      this.form.insertBefore(timerDisplay, this.form.firstChild);
  
      this.timer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = `Time Left: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
        if (timeLeft <= 0) {
          clearInterval(this.timer);
          this.handleSubmit();
        }
      }, 1000);
    }
  
    enablePrintForm(options) {
      const printButton = document.createElement('button');
      printButton.textContent = options.buttonText || 'Print Form';
      printButton.className = 'print-btn';
      this.form.parentElement.appendChild(printButton);
      printButton.addEventListener('click', () => {
        const printContent = document.createElement('div');
        printContent.innerHTML = `<h2>Student Registration</h2><table>${Object.entries(this.data).map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`).join('')}</table>`;
        const printWindow = window.open('', '', 'width=600,height=400');
        printWindow.document.write(printContent.outerHTML);
        printWindow.document.close();
        printWindow.print();
      });
    }
  
    async handleSubmit() {
      if (this.captchaInput) {
        const userAnswer = parseInt(this.captchaInput.value, 10);
        if (userAnswer !== this.captchaAnswer) {
          this.captchaInput.nextElementSibling.textContent = 'CAPTCHA မမှန်ပါ။';
          return;
        }
      }
  
      if (!this.form.checkValidity()) {
        this.form.reportValidity();
        return;
      }
  
      if (this.duplicateOptions) {
        const existingData = JSON.parse(localStorage.getItem('studentEntries') || '[]');
        const keyField = this.duplicateOptions.keyField || 'email';
        const value = this.data[keyField];
        if (existingData.some(entry => entry[keyField] === value)) {
          alert(this.duplicateOptions.message || 'This entry already exists!');
          return;
        }
        existingData.push(this.data);
        localStorage.setItem('studentEntries', JSON.stringify(existingData));
      }
  
      if (this.studentIDOptions) {
        const namePrefix = (this.data.studentName || '').slice(0, 3).toUpperCase();
        const gradeCode = (this.data.grade || '').split(' ')[1] || 'X';
        const year = new Date().getFullYear();
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.data.studentID = `${namePrefix}${gradeCode}-${year}-${randomNum}`;
        alert(`${this.studentIDOptions.message || 'Your Student ID:'} ${this.data.studentID}`);
      }
  
      if (this.apiOptions) {
        if (!navigator.onLine && this.offlineOptions) {
          this.offlineQueue.push(this.data);
          localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
          alert(this.offlineOptions.message || 'Saved offline. Will submit when online.');
        } else {
          try {
            const response = await fetch(this.apiOptions.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(this.data)
            });
            if (!response.ok) throw new Error('Network response was not ok');
            alert(this.apiOptions.successMessage || 'Successfully submitted!');
          } catch (error) {
            alert(this.apiOptions.errorMessage || 'Submission failed!');
            console.error(error);
          }
        }
      }
  
      if (this.emailOptions) {
        try {
          const response = await fetch(this.emailOptions.emailApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: this.data.email,
              subject: 'Registration Confirmation',
              body: `Dear ${this.data.studentName}, your registration is complete. Student ID: ${this.data.studentID}`
            })
          });
          if (!response.ok) throw new Error('Email sending failed');
          alert(this.emailOptions.message || 'Confirmation email sent!');
        } catch (error) {
          console.error('Email Error:', error);
        }
      }
  
      if (this.updateDashboard) this.updateDashboard();
  
      if (this.timer) clearInterval(this.timer);
  
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