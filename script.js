class ImageViewer {
    constructor() {
        this.setupElements();
        this.setupEventListeners();
        this.setupNewFeatures();
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.rotation = 0;
        this.brightness = 100;
        this.isDragging = false;
        this.compareMode = false;

        // 检查 URL 参数并加载图片
        this.loadFromURL();
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
        this.container = document.querySelector('.viewer-container');
        this.brightnessControl = document.querySelector('.brightness-control');

        // 初始化图片样式
        [this.mainImage, this.leftImage, this.rightImage].forEach(img => {
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.classList.remove('visible');
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
        
        // 添加分享按钮事件
        document.getElementById('shareButton').addEventListener('click', () => this.copyShareLink());
    }

    handleImageUpload(event, imageNumber) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (imageNumber === 1) {
                    this.mainImage.src = e.target.result;
                    this.leftImage.src = e.target.result;
                    this.leftImage.classList.add('visible');
                    this.mainImage.classList.add('visible');
                } else {
                    this.rightImage.src = e.target.result;
                    this.rightImage.classList.add('visible');
                    this.toggleCompareMode();
                }
                
                // 预加载图片
                this.preloadImages();
                
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
        requestAnimationFrame(() => {
            const transform = `translate(${this.translateX}px, ${this.translateY}px) 
                              rotate(${this.rotation}deg) 
                              scale(${this.scale})`;
            [this.mainImage, this.leftImage, this.rightImage].forEach(img => {
                img.style.transform = transform;
            });
        });
    }

    startSliderDrag(e) {
        e.stopPropagation();
        const container = this.compareViewer.getBoundingClientRect();
        
        const sliderDrag = (e) => {
            const x = e.clientX - container.left;
            const percentage = (x / container.width) * 100;
            const clampedPercentage = Math.min(Math.max(0, percentage), 100);
            
            // 更新滑块位置
            this.slider.style.left = `${clampedPercentage}%`;
            
            // 更新右侧图片的裁剪区域
            const rightImage = document.querySelector('.compare-image.right');
            rightImage.style.clipPath = `inset(0 0 0 ${clampedPercentage}%)`;
        };
        
        const endSliderDrag = () => {
            document.removeEventListener('mousemove', sliderDrag);
            document.removeEventListener('mouseup', endSliderDrag);
        };
        
        // 添加事件监听器
        document.addEventListener('mousemove', sliderDrag);
        document.addEventListener('mouseup', endSliderDrag);
    }

    toggleCompareMode() {
        this.compareMode = !this.compareMode;
        if (this.compareMode) {
            this.imageViewer.classList.add('hidden');
            this.compareViewer.classList.remove('hidden');
            
            // 添加淡入效果
            this.leftImage.classList.add('visible');
            this.rightImage.classList.add('visible');
            
            // 初始化滑块位置
            this.slider.style.left = '50%'; // 设置滑块初始位置为中间
            document.querySelector('.compare-image.right').style.clipPath = 
                `inset(0 0 0 50%)`; // 设置右侧图片的初始显示
        } else {
            this.imageViewer.classList.remove('hidden');
            this.compareViewer.classList.add('hidden');
            
            // 移除淡入效果
            this.leftImage.classList.remove('visible');
            this.rightImage.classList.remove('visible');
        }
    }

    loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const img1Url = urlParams.get('img1');
        const img2Url = urlParams.get('img2');
        const compare = urlParams.get('compare') === 'true';

        if (img1Url) {
            this.loadImageFromURL(img1Url, 1);
        }
        if (img2Url) {
            this.loadImageFromURL(img2Url, 2);
        }
        if (compare) {
            this.compareMode = true;
            this.toggleCompareMode();
        }
    }

    loadImageFromURL(url, imageNumber) {
        if (imageNumber === 1) {
            this.mainImage.src = url;
            this.leftImage.src = url;
        } else {
            this.rightImage.src = url;
        }
    }

    // 生成分享链接
    generateShareURL() {
        const url = new URL(window.location.href.split('?')[0]);
        if (this.mainImage.src) {
            url.searchParams.set('img1', this.mainImage.src);
        }
        if (this.rightImage.src) {
            url.searchParams.set('img2', this.rightImage.src);
        }
        if (this.compareMode) {
            url.searchParams.set('compare', 'true');
        }
        return url.toString();
    }

    // 复制分享链接到剪贴板
    copyShareLink() {
        const shareURL = this.generateShareURL();
        navigator.clipboard.writeText(shareURL).then(() => {
            alert('分享链接已复制到剪贴板！');
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制链接：' + shareURL);
        });
    }

    setupNewFeatures() {
        // 重置功能
        document.getElementById('resetButton').addEventListener('click', () => {
            this.scale = 1;
            this.translateX = 0;
            this.translateY = 0;
            this.rotation = 0;
            this.brightness = 100;
            this.updateTransform();
            this.updateBrightness();
            document.getElementById('brightnessSlider').value = 100;
        });

        // 旋转功能
        document.getElementById('rotateButton').addEventListener('click', () => {
            this.rotation = (this.rotation + 90) % 360;
            this.updateTransform();
        });

        // 下载功能
        document.getElementById('downloadButton').addEventListener('click', () => {
            const img = this.compareMode ? this.leftImage : this.mainImage;
            if (img.src) {
                const link = document.createElement('a');
                link.download = 'image.png';
                link.href = img.src;
                link.click();
            }
        });

        // 全屏功能
        document.getElementById('fullscreenButton').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                this.container.requestFullscreen().catch(err => {
                    console.error('全屏模式错误:', err);
                });
            } else {
                document.exitFullscreen();
            }
        });

        // 亮度调节按钮
        document.getElementById('brightnessButton').addEventListener('click', () => {
            this.brightnessControl.classList.toggle('hidden');
        });

        // 亮度滑块
        const brightnessSlider = document.getElementById('brightnessSlider');
        brightnessSlider.addEventListener('input', (e) => {
            this.brightness = e.target.value;
            this.updateBrightness();
        });
    }

    updateBrightness() {
        const filter = `brightness(${this.brightness}%)`;
        [this.mainImage, this.leftImage, this.rightImage].forEach(img => {
            img.style.filter = filter;
        });
    }

    preloadImages() {
        // 预加载图片
        const images = [this.mainImage.src, this.leftImage.src, this.rightImage.src];
        images.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }
}

// 初始化查看器
new ImageViewer(); 