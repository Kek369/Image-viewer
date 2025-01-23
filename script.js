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
        this.isDrawing = false;
        this.drawingMode = 'none'; // 'none', 'rect', 'free'
        this.startX = 0;
        this.startY = 0;
        this.currentPath = [];
        this.annotations1 = []; // 第一张图片的标注
        this.annotations2 = []; // 第二张图片的标注
        this.currentAnnotations = this.annotations1; // 当前活动的标注数组
        this.annotationColor = '#ff0000'; // 添加默认标注颜色

        // 检查是否在飞书环境中
        this.isInFeishu = typeof tt !== 'undefined';
        
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

        // 为每个视图创建单独的画布
        this.mainCanvas = document.createElement('canvas');
        this.mainCanvas.className = 'annotation-canvas';
        this.imageViewer.appendChild(this.mainCanvas);
        this.mainCtx = this.mainCanvas.getContext('2d');

        this.compareCanvas1 = document.createElement('canvas');
        this.compareCanvas1.className = 'annotation-canvas compare-left';
        this.compareViewer.querySelector('.compare-image.left').appendChild(this.compareCanvas1);
        this.compareCtx1 = this.compareCanvas1.getContext('2d');

        this.compareCanvas2 = document.createElement('canvas');
        this.compareCanvas2.className = 'annotation-canvas compare-right';
        this.compareViewer.querySelector('.compare-image.right').appendChild(this.compareCanvas2);
        this.compareCtx2 = this.compareCanvas2.getContext('2d');

        this.currentCanvas = this.mainCanvas;
        this.currentCtx = this.mainCtx;
    }

    resizeCanvas() {
        // 使用图片的实际显示尺寸
        const imgRect = this.mainImage.getBoundingClientRect();
        this.annotationCanvas.width = imgRect.width;
        this.annotationCanvas.height = imgRect.height;
        this.annotationCanvas.style.width = `${imgRect.width}px`;
        this.annotationCanvas.style.height = `${imgRect.height}px`;
        
        // 重新绘制现有的标注
        this.drawExistingAnnotations();
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

        // 修改画布事件监听
        [this.mainCanvas, this.compareCanvas1, this.compareCanvas2].forEach(canvas => {
            canvas.addEventListener('mousedown', (e) => {
                if (this.drawingMode !== 'none') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.startDrawing(e);
                }
            });

            canvas.addEventListener('mousemove', (e) => {
                if (this.isDrawing) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.draw(e);
                }
            });

            canvas.addEventListener('mouseup', (e) => {
                if (this.isDrawing) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.stopDrawing(e);
                }
            });
        });
    }

    handleImageUpload(event, imageNumber) {
        if (this.isInFeishu) {
            // 使用飞书的图片选择器
            tt.chooseImage({
                count: 1,
                sourceType: ['album', 'camera'],
                success: (res) => {
                    const tempFilePath = res.tempFilePaths[0];
                    if (imageNumber === 1) {
                        this.mainImage.src = tempFilePath;
                        this.leftImage.src = tempFilePath;
                        this.leftImage.classList.add('visible');
                        this.mainImage.classList.add('visible');
                        this.currentAnnotations = this.annotations1;
                        this.currentCanvas = this.compareMode ? this.compareCanvas1 : this.mainCanvas;
                        this.currentCtx = this.currentCanvas.getContext('2d');
                    } else {
                        this.rightImage.src = tempFilePath;
                        this.rightImage.classList.add('visible');
                        this.currentAnnotations = this.annotations2;
                        this.currentCanvas = this.compareCanvas2;
                        this.currentCtx = this.currentCanvas.getContext('2d');
                        if (!this.compareMode) {
                            this.toggleCompareMode();
                        }
                    }
                },
                fail: (err) => {
                    console.error('选择图片失败:', err);
                }
            });
        } else {
            // 原有的文件上传逻辑
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (imageNumber === 1) {
                        this.mainImage.src = e.target.result;
                        this.leftImage.src = e.target.result;
                        this.leftImage.classList.add('visible');
                        this.mainImage.classList.add('visible');
                        this.currentAnnotations = this.annotations1;
                        this.currentCanvas = this.compareMode ? this.compareCanvas1 : this.mainCanvas;
                        this.currentCtx = this.currentCanvas.getContext('2d');
                    } else {
                        this.rightImage.src = e.target.result;
                        this.rightImage.classList.add('visible');
                        this.currentAnnotations = this.annotations2;
                        this.currentCanvas = this.compareCanvas2;
                        this.currentCtx = this.currentCanvas.getContext('2d');
                        if (!this.compareMode) {
                            this.toggleCompareMode();
                        }
                    }

                    const img = imageNumber === 1 ? this.mainImage : this.rightImage;
                    img.onload = () => {
                        setTimeout(() => {
                            this.resizeCanvases();
                        }, 100);
                    };
                };
                reader.readAsDataURL(file);
            }
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
        if (this.drawingMode !== 'none' || e.target === this.slider || e.target === this.annotationCanvas) {
            return;
        }
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }

    drag(e) {
        if (this.drawingMode !== 'none') {
            return;
        }
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
            this.annotationCanvas.style.transform = transform;
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
            
            // 更新右侧图片的剪区域
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
            
            this.leftImage.classList.add('visible');
            this.rightImage.classList.add('visible');
            
            this.slider.style.left = '50%';
            document.querySelector('.compare-image.right').style.clipPath = `inset(0 0 0 50%)`;

            // 更新当前画布
            this.currentCanvas = this.compareCanvas1;
            this.currentCtx = this.currentCanvas.getContext('2d');
            this.currentAnnotations = this.annotations1;
        } else {
            this.imageViewer.classList.remove('hidden');
            this.compareViewer.classList.add('hidden');
            
            this.leftImage.classList.remove('visible');
            this.rightImage.classList.remove('visible');

            // 更新当前画布
            this.currentCanvas = this.mainCanvas;
            this.currentCtx = this.currentCanvas.getContext('2d');
            this.currentAnnotations = this.annotations1;
        }
        this.resizeCanvases();
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

    async loadImageFromURL(url, imageNumber) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const objectURL = URL.createObjectURL(blob);
            
            if (imageNumber === 1) {
                this.mainImage.src = objectURL;
                this.leftImage.src = objectURL;
                this.leftImage.classList.add('visible');
                this.mainImage.classList.add('visible');
            } else {
                this.rightImage.src = objectURL;
                this.rightImage.classList.add('visible');
                if (!this.compareMode) {
                    this.toggleCompareMode();
                }
            }
        } catch (error) {
            console.error('加载图片失败:', error);
            // 添加错误提示
            alert('图片加载失败，请检查链接是否有效');
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
        if (this.isInFeishu) {
            // 使用飞书的分享功能
            tt.shareAppMessage({
                title: '图片对比查看',
                desc: '查看并对比两张图片',
                path: window.location.href,
                success: () => {
                    tt.showToast({
                        title: '分享成功',
                        icon: 'success'
                    });
                },
                fail: (err) => {
                    console.error('分享失败:', err);
                }
            });
        } else {
            // 原有的分享逻辑
            const url = this.generateShareURL();
            navigator.clipboard.writeText(url).then(() => {
                alert('链接已复制到剪贴板！');
            });
        }
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

        // 在工具栏中添加标注按钮
        const annotationButtons = `
            <button id="rectAnnotation" class="tool-button" title="矩形标注">
                <i class="fas fa-vector-square"></i>
            </button>
            <button id="freeAnnotation" class="tool-button" title="自由标注">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <button id="clearAnnotations" class="tool-button" title="清除标注">
                <i class="fas fa-eraser"></i>
            </button>
            <input type="color" id="annotationColor" class="tool-button color-picker" 
                   value="${this.annotationColor}" title="标注颜色">
        `;
        
        const toolbar = document.querySelector('.toolbar');
        toolbar.insertAdjacentHTML('beforeend', annotationButtons);

        // 添加标注按钮事件监听
        document.getElementById('rectAnnotation').addEventListener('click', () => {
            this.drawingMode = this.drawingMode === 'rect' ? 'none' : 'rect';
            this.updateToolbarState();
        });

        document.getElementById('freeAnnotation').addEventListener('click', () => {
            this.drawingMode = this.drawingMode === 'free' ? 'none' : 'free';
            this.updateToolbarState();
        });

        document.getElementById('clearAnnotations').addEventListener('click', () => {
            this.clearAnnotations();
            this.drawingMode = 'none';
            this.updateToolbarState();
        });

        document.getElementById('annotationColor').addEventListener('input', (e) => {
            this.annotationColor = e.target.value;
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

    startDrawing(e) {
        if (this.drawingMode === 'none') return;
        
        this.isDrawing = true;
        const rect = e.target.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;
        
        if (this.drawingMode === 'free') {
            this.currentPath = [[this.startX, this.startY]];
        }

        // 开始绘制时先清除当前画布
        this.currentCtx.clearRect(0, 0, this.currentCanvas.width, this.currentCanvas.height);
        this.drawAnnotationsOnCanvas(this.currentCtx, this.currentAnnotations);
    }

    draw(e) {
        if (!this.isDrawing || this.drawingMode === 'none') return;

        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 清除画布并重绘所有标注
        this.currentCtx.clearRect(0, 0, this.currentCanvas.width, this.currentCanvas.height);
        this.drawAnnotationsOnCanvas(this.currentCtx, this.currentAnnotations);

        // 绘制当前标注
        this.currentCtx.beginPath();
        this.currentCtx.strokeStyle = this.annotationColor;
        this.currentCtx.lineWidth = 2;

        if (this.drawingMode === 'rect') {
            this.currentCtx.rect(this.startX, this.startY, x - this.startX, y - this.startY);
        } else if (this.drawingMode === 'free') {
            this.currentPath.push([x, y]);
            this.currentCtx.moveTo(this.currentPath[0][0], this.currentPath[0][1]);
            for (let i = 1; i < this.currentPath.length; i++) {
                this.currentCtx.lineTo(this.currentPath[i][0], this.currentPath[i][1]);
            }
        }
        this.currentCtx.stroke();
    }

    stopDrawing(e) {
        if (!this.isDrawing) return;
        
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.drawingMode === 'rect') {
            this.currentAnnotations.push({
                type: 'rect',
                x: this.startX,
                y: this.startY,
                width: x - this.startX,
                height: y - this.startY,
                color: this.annotationColor
            });
        } else if (this.drawingMode === 'free') {
            this.currentAnnotations.push({
                type: 'free',
                points: this.currentPath,
                color: this.annotationColor
            });
        }

        this.isDrawing = false;
        this.currentPath = [];
        this.drawAnnotationsOnCanvas(this.currentCtx, this.currentAnnotations);
    }

    drawExistingAnnotations() {
        // 如果在对比模式下，不绘制标注
        if (this.compareMode) return;

        this.ctx.clearRect(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);
        
        // 绘制所有保存的标注
        this.annotations.forEach(annotation => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = annotation.color;
            this.ctx.lineWidth = 2;

            if (annotation.type === 'rect') {
                this.ctx.rect(annotation.x, annotation.y, annotation.width, annotation.height);
            } else if (annotation.type === 'free') {
                const points = annotation.points;
                this.ctx.moveTo(points[0][0], points[0][1]);
                for (let i = 1; i < points.length; i++) {
                    this.ctx.lineTo(points[i][0], points[i][1]);
                }
            }
            this.ctx.stroke();
        });
    }

    updateToolbarState() {
        const rectButton = document.getElementById('rectAnnotation');
        const freeButton = document.getElementById('freeAnnotation');
        
        rectButton.classList.toggle('active', this.drawingMode === 'rect');
        freeButton.classList.toggle('active', this.drawingMode === 'free');

        // 更新鼠标样式
        if (this.drawingMode === 'none') {
            this.annotationCanvas.style.cursor = 'default';
        } else if (this.drawingMode === 'rect') {
            this.annotationCanvas.style.cursor = 'crosshair';
        } else if (this.drawingMode === 'free') {
            this.annotationCanvas.style.cursor = 'pointer';
        }

        console.log('当前绘制模式:', this.drawingMode); // 添加调试日志
    }

    resizeCanvases() {
        const container = this.imageViewer.getBoundingClientRect();
        [this.mainCanvas, this.compareCanvas1, this.compareCanvas2].forEach(canvas => {
            canvas.width = container.width;
            canvas.height = container.height;
        });
        this.drawAllAnnotations();
    }

    drawAllAnnotations() {
        if (this.compareMode) {
            this.drawAnnotationsOnCanvas(this.compareCtx1, this.annotations1);
            this.drawAnnotationsOnCanvas(this.compareCtx2, this.annotations2);
        } else {
            this.drawAnnotationsOnCanvas(this.mainCtx, this.annotations1);
        }
    }

    drawAnnotationsOnCanvas(ctx, annotations) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        annotations.forEach(annotation => {
            ctx.beginPath();
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = 2;

            if (annotation.type === 'rect') {
                ctx.rect(annotation.x, annotation.y, annotation.width, annotation.height);
            } else if (annotation.type === 'free') {
                const points = annotation.points;
                ctx.moveTo(points[0][0], points[0][1]);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i][0], points[i][1]);
                }
            }
            ctx.stroke();
        });
    }

    // 修改清除标注功能
    clearAnnotations() {
        if (this.compareMode) {
            // 在对比模式下，根据当前活动的画布清除相应的标注
            if (this.currentCanvas === this.compareCanvas1) {
                this.annotations1 = [];
                this.compareCtx1.clearRect(0, 0, this.compareCanvas1.width, this.compareCanvas1.height);
            } else {
                this.annotations2 = [];
                this.compareCtx2.clearRect(0, 0, this.compareCanvas2.width, this.compareCanvas2.height);
            }
        } else {
            this.annotations1 = [];
            this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        }
    }
}

// 初始化查看器
new ImageViewer(); 