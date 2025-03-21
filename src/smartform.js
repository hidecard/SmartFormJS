class SmartForm {
    constructor(selector, config) {
      this.form = document.querySelector(selector);
      this.fields = config.fields || {};
      this.language = config.language || 'en';
      this.onSubmit = config.onSubmit || (() => {});
      this.data = {};
      this.filledFields = new Set();
      this.isMultiStep = false;
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
      if (rules.minLength && field.value.length < rules.minLength) isValid = false;
      field.setCustomValidity(isValid ? '' : this.getMessage('invalid', fieldName));
      errorSpan.textContent = field.validationMessage;
      this.data[fieldName] = field.value;
    }
  
    addDynamicField(fieldName, options) {
      const container = this.form.querySelector('.dynamic-container') || document.createElement('div');
      container.className = 'dynamic-container';
      let count = 0;
      const addButton = document.createElement('button');
      addButton.textContent = 'Add ' + options.label;
      addButton.className = 'add-dynamic';
      addButton.onclick = () => {
        if (count < (options.maxInstances || Infinity)) {
          const newField = document.createElement('input');
          newField.name = `${fieldName}_${count++}`;
          newField.placeholder = options.label;
          container.appendChild(newField);
          container.appendChild(document.createElement('span'));
        }
      };
      this.form.appendChild(container);
      this.form.appendChild(addButton);
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
  
    enableBehaviorAdaptation(options) {
      Object.keys(this.fields).forEach((fieldName) => {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (field) {
          const errorSpan = field.nextElementSibling;
          let skipCount = 0;
          let typingTimeout;
          field.addEventListener('input', () => {
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
              if (!field.value) errorSpan.textContent = options.hints[fieldName] || 'Please fill this';
            }, options.typingThreshold || 3000);
          });
          field.addEventListener('blur', () => {
            if (!field.value) skipCount++;
            if (skipCount >= (options.skipTolerance || 2)) this.fields[fieldName].required = false;
          });
        }
      });
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
  
    enableStudentIDGenerator(options) {
      this.studentIDOptions = options;
    }
  
    enableDataExport(options) {
      // Export Button ကို Form အပြင်မှာ ထားပြီး အမြဲပြအောင်လုပ်တယ်
      const exportButton = document.createElement('button');
      exportButton.textContent = options.buttonText || 'Export Data';
      exportButton.className = 'export-btn';
      this.form.parentElement.appendChild(exportButton); // Form အပြင်မှာ ထည့်တာ
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
      this.form.insertBefore(container, this.form.querySelector('button[type="submit"]') || this.form.lastChild);
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
  
    async handleSubmit() {
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
        try {
          const response = await fetch(this.apiOptions.url || 'https://example.com/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.data)
          });
          if (!response.ok) throw new Error('Network response was not ok');
          const result = await response.json();
          alert(this.apiOptions.successMessage || 'Successfully submitted to server!');
          console.log('Server Response:', result);
        } catch (error) {
          alert(this.apiOptions.errorMessage || 'Submission failed!');
          console.error(error);
        }
      }
  
      if (this.emailOptions) {
        try {
          const response = await fetch(this.emailOptions.emailApiUrl || 'https://example.com/api/send-email', {
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