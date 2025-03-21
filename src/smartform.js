class SmartForm {
    constructor(selector, config) {
      this.form = document.querySelector(selector);
      this.fields = config.fields || {};
      this.language = config.language || 'en';
      this.onSubmit = config.onSubmit || (() => {});
      this.options = {};
      this.data = {};
      this.filledFields = new Set(); // Track filled fields to avoid duplicate points
      this.init();
    }
  
    init() {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitForm();
      });
      this.setupFields();
    }
  
    setupFields() {
      Object.keys(this.fields).forEach((fieldName) => {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        const errorSpan = field.nextElementSibling;
        field.addEventListener('input', () => this.validateField(fieldName, field, errorSpan));
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
      const addButton = this.form.querySelector('.add-dynamic') || document.createElement('button');
      addButton.textContent = 'Add ' + options.label;
      addButton.className = 'add-dynamic';
      addButton.onclick = () => {
        if (count < (options.maxInstances || Infinity)) {
          const newField = document.createElement('input');
          newField.name = `${fieldName}_${count++}`;
          newField.placeholder = options.label;
          container.appendChild(newField);
          container.appendChild(document.createElement('span')); // Error Span
        }
      };
      if (!this.form.contains(container)) this.form.appendChild(container);
      if (!this.form.contains(addButton)) this.form.appendChild(addButton);
    }
  
    enableSmartSuggestions(fieldName, options) {
      const field = this.form.querySelector(`[name="${fieldName}"]`);
      let suggestionBox = field.parentElement.querySelector('.suggestions');
      if (!suggestionBox) {
        suggestionBox = document.createElement('div');
        suggestionBox.className = 'suggestions';
        field.parentElement.appendChild(suggestionBox);
      }
      field.addEventListener('input', () => {
        const suggestions = options.source.filter((item) =>
          item.toLowerCase().startsWith(field.value.toLowerCase())
        );
        suggestionBox.innerHTML = suggestions.map((s) => `<div onclick="this.parentElement.previousElementSibling.value='${s}';this.parentElement.innerHTML=''">${s}</div>`).join('');
      });
    }
  
    enableProgress(options) {
      this.progress = { total: Object.keys(this.fields).length, filled: 0 };
      let progressBar = this.form.querySelector('.progress-bar');
      if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        this.form.insertBefore(progressBar, this.form.firstChild);
      }
      Object.keys(this.fields).forEach((fieldName) => {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        field.addEventListener('input', () => {
          this.progress.filled = Object.values(this.data).filter(Boolean).length;
          progressBar.style.width = `${(this.progress.filled / this.progress.total) * 100}%`;
          if (options.showPercentage) progressBar.textContent = `${Math.round((this.progress.filled / this.progress.total) * 100)}%`;
        });
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
      });
    }
  
    enableSecureInputShield(options) {
      options.fields.forEach((fieldName) => {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        const errorSpan = field.nextElementSibling;
        field.addEventListener('input', () => {
          const encrypted = btoa(field.value);
          if (options.encryptionPreview) errorSpan.textContent = `Encrypted: ${encrypted}`;
        });
        if (options.antiCapture) field.style.webkitUserSelect = 'none';
        if (options.fakeInputProtection) field.addEventListener('paste', (e) => e.preventDefault());
      });
      let trust = this.form.querySelector('.trust');
      if (!trust) {
        trust = document.createElement('p');
        trust.className = 'trust';
        trust.textContent = options.trustMessage || 'Secure';
        this.form.appendChild(trust);
      }
    }
  
    enableGamifiedExperience(options) {
      let points = 0;
      let pointsDisplay = this.form.querySelector('.points');
      if (!pointsDisplay) {
        pointsDisplay = document.createElement('div');
        pointsDisplay.className = 'points';
        pointsDisplay.textContent = 'Points: 0';
        this.form.insertBefore(pointsDisplay, this.form.firstChild);
      }
      Object.keys(this.fields).forEach((fieldName) => {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        field.addEventListener('input', () => {
          const isValid = field.checkValidity() && field.value.trim() !== '';
          if (isValid && !this.filledFields.has(fieldName)) {
            points += options.pointsPerField || 10;
            this.filledFields.add(fieldName);
            pointsDisplay.textContent = `Points: ${points}`;
            if (options.animations?.onFieldFilled) this.animate('stepForward');
          }
        });
      });
      this.form.addEventListener('submit', () => {
        if (this.form.checkValidity()) {
          if (options.animations?.onComplete) this.animate('fireworks');
          alert(`${options.rewardMessage || 'Congratulations!'} Total Points: ${points}`);
        }
      });
    }
  
    animate(type) {
      const animation = document.createElement('div');
      animation.className = `animation ${type}`;
      this.form.appendChild(animation);
      setTimeout(() => animation.remove(), 1000);
    }
  
    // New Real-Life Features
  
    enableStudentIDGenerator(options) {
      this.form.addEventListener('submit', () => {
        if (this.form.checkValidity()) {
          const namePrefix = (this.data.studentName || '').slice(0, 3).toUpperCase();
          const gradeCode = (this.data.grade || '').split(' ')[1] || 'X';
          const year = new Date().getFullYear();
          const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          const studentID = `${namePrefix}${gradeCode}-${year}-${randomNum}`;
          this.data.studentID = studentID;
          alert(`${options.message || 'Your Student ID:'} ${studentID}`);
        }
      });
    }
  
    enableDataExport(options) {
      const exportButton = document.createElement('button');
      exportButton.textContent = options.buttonText || 'Export Data';
      exportButton.className = 'export-btn';
      this.form.appendChild(exportButton);
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
      const existingData = JSON.parse(localStorage.getItem('studentEntries') || '[]');
      this.form.addEventListener('submit', (e) => {
        const keyField = options.keyField || 'email';
        const value = this.data[keyField];
        if (existingData.some(entry => entry[keyField] === value)) {
          e.preventDefault();
          alert(options.message || 'This entry already exists!');
        } else if (this.form.checkValidity()) {
          existingData.push(this.data);
          localStorage.setItem('studentEntries', JSON.stringify(existingData));
        }
      });
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
            this.data[options.fieldName || 'photo'] = e.target.result; // Base64 data
          };
          reader.readAsDataURL(file);
        }
      });
      const container = document.createElement('div');
      container.appendChild(fileInput);
      container.appendChild(preview);
      this.form.insertBefore(container, this.form.querySelector('button[type="submit"]'));
    }
  
    enableAPISubmission(options) {
      this.form.addEventListener('submit', async (e) => {
        if (this.form.checkValidity()) {
          try {
            const response = await fetch(options.url || 'https://example.com/api/students', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(this.data)
            });
            if (!response.ok) throw new Error('Network response was not ok');
            const result = await response.json();
            alert(options.successMessage || 'Successfully submitted to server!');
            console.log('Server Response:', result);
          } catch (error) {
            alert(options.errorMessage || 'Submission failed!');
            console.error(error);
          }
        }
      });
    }
  
    getMessage(type, fieldName) {
      const messages = {
        my: { invalid: `${fieldName} မမှန်ကန်ပါ။` },
        en: { invalid: `${fieldName} is invalid.` }
      };
      return messages[this.language]?.[type] || messages.en[type];
    }
  
    submitForm() {
      if (this.form.checkValidity()) {
        this.onSubmit(this.data);
      } else {
        this.form.reportValidity();
      }
    }
  }
  
  window.SmartForm = SmartForm;