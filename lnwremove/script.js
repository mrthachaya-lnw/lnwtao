// ============================================
// Gemini Watermark Remover - Main Script
// ============================================

class WatermarkRemover {
    constructor() {
        this.images = [];
        this.processedCount = 0;
        this.successCount = 0;
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.selectBtn = document.getElementById('selectBtn');
        this.processingArea = document.getElementById('processingArea');
        this.imagesGrid = document.getElementById('imagesGrid');
        this.clearBtn = document.getElementById('clearBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.stats = document.getElementById('stats');
        this.processedCountEl = document.getElementById('processedCount');
        this.successCountEl = document.getElementById('successCount');

        // Validate all required elements exist
        const requiredElements = [
            'uploadArea', 'fileInput', 'selectBtn', 'processingArea',
            'imagesGrid', 'clearBtn', 'downloadAllBtn', 'stats',
            'processedCountEl', 'successCountEl'
        ];

        for (const elementName of requiredElements) {
            if (!this[elementName]) {
                console.error(`Required element '${elementName}' not found`);
                throw new Error(`Missing required DOM element: ${elementName}`);
            }
        }
    }

    attachEventListeners() {
        // File selection
        this.selectBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Drag and drop
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Actions
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        this.handleFiles(files);
    }

    async handleFiles(files) {
        if (files.length === 0) return;

        // Show processing area
        this.uploadArea.classList.add('hidden');
        this.processingArea.classList.remove('hidden');
        this.stats.classList.remove('hidden');

        // Process each file
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                await this.processImage(file);
            }
        }
    }

    async processImage(file) {
        const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create image item
        const imageItem = this.createImageItem(imageId, file.name);
        this.imagesGrid.appendChild(imageItem);

        try {
            // Load image
            const img = await this.loadImage(file);

            // Update preview
            const preview = imageItem.querySelector('.image-preview');
            preview.src = img.src;

            // Remove watermark
            const processedCanvas = await this.removeWatermark(img);

            // Update status
            this.updateImageStatus(imageItem, 'success', 'ลบลายน้ำสำเร็จ');

            // Store processed data
            this.images.push({
                id: imageId,
                name: file.name,
                canvas: processedCanvas,
                element: imageItem
            });

            this.successCount++;
            this.updateStats();

            // Enable download button for this image
            const downloadBtn = imageItem.querySelector('.btn-download');
            downloadBtn.addEventListener('click', () => this.downloadImage(imageId));

        } catch (error) {
            console.error('Error processing image:', error);
            this.updateImageStatus(imageItem, 'error', 'เกิดข้อผิดพลาด');
        }

        this.processedCount++;
        this.updateStats();
    }

    createImageItem(id, name) {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.dataset.id = id;
        item.innerHTML = `
            <img class="image-preview" src="" alt="${name}">
            <div class="image-info">
                <div class="image-name" title="${name}">${name}</div>
                <div class="image-status">
                    <span class="status-icon status-processing"></span>
                    <span class="status-text">กำลังประมวลผล...</span>
                </div>
                <div class="image-actions">
                    <button class="btn-primary btn-small btn-download" disabled>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 11L4 7H12L8 11Z" fill="currentColor"/>
                            <path d="M8 2V10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M2 14H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        ดาวน์โหลด
                    </button>
                    <button class="btn-secondary btn-small btn-remove">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Attach remove button listener
        const removeBtn = item.querySelector('.btn-remove');
        removeBtn.addEventListener('click', () => this.removeImage(id));

        return item;
    }

    updateImageStatus(imageItem, status, text) {
        const statusIcon = imageItem.querySelector('.status-icon');
        const statusText = imageItem.querySelector('.status-text');
        const downloadBtn = imageItem.querySelector('.btn-download');

        statusIcon.className = `status-icon status-${status}`;
        statusText.textContent = text;

        if (status === 'success') {
            downloadBtn.disabled = false;
        }
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async removeWatermark(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Check if context is available
        if (!ctx) {
            throw new Error('Canvas context not available');
        }

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image
        ctx.drawImage(img, 0, 0);

        // Define watermark region (bottom right corner)
        // Gemini watermark is typically in the bottom right
        const watermarkHeight = Math.min(100, img.height * 0.15); // 15% of height or 100px
        const watermarkWidth = Math.min(150, img.width * 0.25); // 25% of width or 150px
        const startX = img.width - watermarkWidth;
        const startY = img.height - watermarkHeight;

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Inpainting algorithm: Fill watermark area with surrounding pixels
        // Using a simple approach: sample from area above the watermark
        for (let y = startY; y < img.height; y++) {
            for (let x = startX; x < img.width; x++) {
                const idx = (y * img.width + x) * 4;

                // Sample from the area above (mirror effect)
                const sampleY = Math.max(0, startY - (y - startY) - 1);
                const sampleIdx = (sampleY * img.width + x) * 4;

                // Copy pixel data with slight blur effect
                if (sampleY >= 0) {
                    // Average with neighboring pixels for smoother result
                    let r = 0, g = 0, b = 0, count = 0;

                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const ny = sampleY + dy;
                            const nx = x + dx;
                            if (ny >= 0 && ny < startY && nx >= 0 && nx < img.width) {
                                const nIdx = (ny * img.width + nx) * 4;
                                r += data[nIdx];
                                g += data[nIdx + 1];
                                b += data[nIdx + 2];
                                count++;
                            }
                        }
                    }

                    if (count > 0) {
                        data[idx] = r / count;
                        data[idx + 1] = g / count;
                        data[idx + 2] = b / count;
                        data[idx + 3] = 255; // Full opacity
                    }
                }
            }
        }

        // Put modified image data back
        ctx.putImageData(imageData, 0, 0);

        return canvas;
    }

    downloadImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;

        const link = document.createElement('a');
        const fileName = image.name.replace(/\.[^/.]+$/, '') + '_no_watermark.png';

        image.canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }

    downloadAll() {
        this.images.forEach(image => {
            setTimeout(() => this.downloadImage(image.id), 100);
        });
    }

    removeImage(imageId) {
        const index = this.images.findIndex(img => img.id === imageId);
        if (index > -1) {
            const image = this.images[index];
            image.element.remove();
            this.images.splice(index, 1);

            this.processedCount--;
            this.successCount--;
            this.updateStats();

            // If no images left, show upload area again
            if (this.images.length === 0) {
                this.clearAll();
            }
        }
    }

    clearAll() {
        this.images = [];
        this.processedCount = 0;
        this.successCount = 0;
        this.imagesGrid.innerHTML = '';
        this.uploadArea.classList.remove('hidden');
        this.processingArea.classList.add('hidden');
        this.stats.classList.add('hidden');
        this.fileInput.value = '';
        this.updateStats();
    }

    updateStats() {
        this.processedCountEl.textContent = this.processedCount;
        this.successCountEl.textContent = this.successCount;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new WatermarkRemover();
});
