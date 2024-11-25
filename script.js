class ImageViewer {
    constructor() {
        this.setupElements();
        this.setupEventListeners();
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.compareMode = false;
    }

    setupElements() {
        this.image1Input = document.getElementById('image1');
        this.image2Input = document.getElementById('image2');
        this.mainImage = document.getElementById('mainImage');
        this.leftImage = document.getElementById('leftImage');
        this.rightImage = document.getElementById('rightImage');
        this.imageViewer = document.getElementById('imageViewer');
        this.compareViewer = document.getElementById('compareViewer');
        this.slider = document.getElementById('slider');
        this.compareButton = document.getElementById('compareMode');

        // 初始化图片样式
        [this.mainImage, this.leftImage, this.rightImage].forEach(img => {
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
        });
    }

    setupEventListeners() {
        this.image1Input.addEventListener('change', (e) => this.handleImageUpload(e, 1));
        this.image2Input.addEventListener('change', (e) => this.handleImageUpload(e, 2));
        this.compareButton.addEventListener('click', () => this.toggleCompareMode());
        
        // 缩放事件
        this.imageViewer.addEventListener('wheel', (e) => this.handleZoom(e));
        this.compareViewer.addEventListener('wheel', (e) => this.handleZoom(e));
        
        // 拖动事件
        this.imageViewer.addEventListener('mousedown', (e) => this.startDrag(e));
        this.compareViewer.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        // 对比滑块事件
        this.slider.addEventListener('mousedown', (e) => this.startSliderDrag(e));
    }

    handleImageUpload(event, imageNumber) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (imageNumber === 1) {
                    this.mainImage.src = e.target.result;
                    this.leftImage.src = e.target.result;
                } else {
                    this.rightImage.src = e.target.result;
                }
                
                // 重置变换
                this.scale = 1;
                this.translateX = 0;
                this.translateY = 0;
                this.updateTransform();
            };
            reader.readAsDataURL(file);
        }
    }

    handleZoom(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale *= delta;
        this.scale = Math.min(Math.max(0.1, this.scale), 5);
        
        this.updateTransform();
    }

    startDrag(e) {
        if (e.target === this.slider) return;
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }

    drag(e) {
        if (!this.isDragging) return;
        
        const deltaX = e.clientX - this.lastX;
        const deltaY = e.clientY - this.lastY;
        
        this.translateX += deltaX;
        this.translateY += deltaY;
        
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        
        this.updateTransform();
    }

    endDrag() {
        this.isDragging = false;
    }

    updateTransform() {
        const transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
        [this.mainImage, this.leftImage, this.rightImage].forEach(img => {
            img.style.transform = transform;
        });
    }

    startSliderDrag(e) {
        e.stopPropagation();
        const sliderDrag = (e) => {
            const container = this.compareViewer.getBoundingClientRect();
            const percentage = ((e.clientX - container.left) / container.width) * 100;
            const clampedPercentage = Math.min(Math.max(0, percentage), 100);
            
            this.slider.style.left = `${clampedPercentage}%`;
            document.querySelector('.compare-image.right').style.clipPath = 
                `inset(0 0 0 ${clampedPercentage}%)`;
        };
        
        const endSliderDrag = () => {
            document.removeEventListener('mousemove', sliderDrag);
            document.removeEventListener('mouseup', endSliderDrag);
        };
        
        document.addEventListener('mousemove', sliderDrag);
        document.addEventListener('mouseup', endSliderDrag);
    }

    toggleCompareMode() {
        this.compareMode = !this.compareMode;
        if (this.compareMode) {
            this.imageViewer.classList.add('hidden');
            this.compareViewer.classList.remove('hidden');
        } else {
            this.imageViewer.classList.remove('hidden');
            this.compareViewer.classList.add('hidden');
        }
    }
}

// 初始化查看器
new ImageViewer(); 