class Shape {
    constructor(type, x, y, size) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.size = size;
        this.scale = 1;
        this.rotation = 0;
    }

    containsPoint(px, py) {
        const scaledSize = this.size * this.scale;

        // 将点转换到形状的本地坐标系
        const cos = Math.cos(-this.rotation * Math.PI / 180);
        const sin = Math.sin(-this.rotation * Math.PI / 180);
        const dx = px - this.x;
        const dy = py - this.y;
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        switch (this.type) {
            case 'circle':
                return localX * localX + localY * localY <= (scaledSize / 2) * (scaledSize / 2);
            case 'square':
                return Math.abs(localX) <= scaledSize / 2 && Math.abs(localY) <= scaledSize / 2;
            case 'triangle':
                const s = scaledSize;
                const topY = -Math.sqrt(3) / 3 * s;
                const bottomY = Math.sqrt(3) / 6 * s;
                const height = bottomY - topY;
                
                if (localY < topY || localY > bottomY) return false;
                
                // 从顶点到底边，宽度线性增加
                const distFromTop = localY - topY;
                const ratio = distFromTop / height;
                const currentWidth = ratio * s; // 底边宽度为s
                return Math.abs(localX) <= currentWidth / 2;
        }
        return false;
    }
}

class Game {
    constructor() {
        this.gameCanvas = document.getElementById('gameCanvas');
        this.gameCtx = this.gameCanvas.getContext('2d');

        this.shapes = []; // 存储所有已创建的形状对象
        this.selectedShape = null; // 当前选中的形状类型（circle/square/triangle）
        this.activeShape = null; // 当前激活的形状对象实例
        this.draggedShape = null; // 当前正在拖拽的形状对象
        this.isDragging = false; // 是否正在拖拽状态
        this.dragOffset = { x: 0, y: 0 }; // 拖拽时鼠标相对于形状中心的偏移量
        this.mouseDownPos = { x: 0, y: 0 }; // 鼠标按下时的位置坐标

        // 三连击删除功能
        this.clickCount = 0;
        this.lastClickTime = 0;

        // 性能优化：缓存消融区域
        this.ablationCache = null;

        this.setupEventListeners();
        this.updateDisplay();
    }



    setupEventListeners() {
        this.gameCanvas.addEventListener('mousedown', (e) => {
            // 右键点击旋转当前选中的形状
            if (e.button === 2) {
                e.preventDefault();
                if (this.activeShape) {
                    this.rotateShape(this.activeShape);
                    this.ablationCache = null;
                    this.updateDisplay();
                }
                return;
            }

            const rect = this.gameCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;  // 相对位置
            const y = e.clientY - rect.top;

            this.mouseDownPos.x = x;
            this.mouseDownPos.y = y;

            // 如果已选中形状类型，创建新形状
            if (this.selectedShape) {
                this.activeShape = null;
                this.addShape(x, y);
                this.selectedShape = null;
                document.querySelectorAll('.shape-button').forEach(b => b.classList.remove('selected'));
            } else {
                // 否则尝试选中已有形状
                const clickedShape = this.getShapeAt(x, y);
                if (clickedShape) {
                    // 三连击删除检测
                    const currentTime = Date.now();
                    if (clickedShape === this.activeShape && currentTime - this.lastClickTime < 200) {
                        this.clickCount++;
                        if (this.clickCount >= 3) {
                            // 删除形状
                            const index = this.shapes.indexOf(clickedShape);
                            if (index > -1) {
                                this.shapes.splice(index, 1);
                                this.activeShape = null;
                                this.ablationCache = null;
                            }
                            this.clickCount = 0;
                            this.updateDisplay();
                            return;
                        }
                    } else {
                        this.clickCount = 1;
                    }
                    this.lastClickTime = currentTime;
                    
                    this.activeShape = clickedShape;
                    this.draggedShape = clickedShape;
                    this.dragOffset.x = x - clickedShape.x;
                    this.dragOffset.y = y - clickedShape.y;
                } else {
                    this.activeShape = null;
                    this.clickCount = 0;
                }
            }
            this.updateDisplay();
        });

        // 禁用右键菜单
        this.gameCanvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        this.gameCanvas.addEventListener('mousemove', (e) => {
            if (this.draggedShape) {
                const rect = this.gameCanvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const dx = x - this.mouseDownPos.x;
                const dy = y - this.mouseDownPos.y;

                // 只有移动距离超过5像素才开始拖拽
                if (!this.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                    this.isDragging = true;
                }

                if (this.isDragging) {
                    const newX = x - this.dragOffset.x;
                    const newY = y - this.dragOffset.y;

                    // 边界检测
                    const size = this.draggedShape.size * this.draggedShape.scale;
                    let radius;
                    if (this.draggedShape.type === 'triangle') {
                        radius = size / Math.sqrt(3);
                    } else if (this.draggedShape.type === 'square') {
                        radius = size / Math.sqrt(2);
                    } else {
                        radius = size / 2;
                    }
                    this.draggedShape.x = Math.max(radius, Math.min(400 - radius, newX));
                    this.draggedShape.y = Math.max(radius, Math.min(400 - radius, newY));

                    // 拖拽时只更新形状位置，不重新计算消融区域
                    this.updateShapesOnly();
                }
            }
        });

        this.gameCanvas.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.ablationCache = null;
                this.updateDisplay(); // 拖拽结束后才重新计算消融区域
            }
            this.isDragging = false;
            this.draggedShape = null;
        });

        this.gameCanvas.addEventListener('mouseleave', () => {
            // 只有在拖动状态下才取消选中
            if (this.isDragging) {
                this.isDragging = false;
                this.draggedShape = null;
                this.ablationCache = null;
                this.updateDisplay();
            } else {
                // 非拖动状态下只重置拖动相关状态
                this.isDragging = false;
                this.draggedShape = null;
            }
        });

        this.gameCanvas.addEventListener('wheel', (e) => {
            if (this.activeShape) {
                e.preventDefault();
                const scaleValues = [0.5, 0.75, 1, 1.5, 2];
                const currentIndex = scaleValues.indexOf(this.activeShape.scale);
                const direction = e.deltaY > 0 ? -1 : 1;
                const newIndex = Math.max(0, Math.min(scaleValues.length - 1, currentIndex + direction));
                const newScale = scaleValues[newIndex];
                
                // 检查新缩放是否会导致形状溢出边界
                const newSize = this.activeShape.size * newScale;
                let canScale = false;
                
                let radius;
                if (this.activeShape.type === 'triangle') {
                    radius = newSize / Math.sqrt(3);
                } else if (this.activeShape.type === 'square') {
                    radius = newSize / Math.sqrt(2);
                } else {
                    radius = newSize / 2;
                }
                canScale = this.activeShape.x - radius >= 0 && 
                          this.activeShape.x + radius <= 400 && 
                          this.activeShape.y - radius >= 0 && 
                          this.activeShape.y + radius <= 400;
                
                if (canScale) {
                    this.activeShape.scale = newScale;
                    this.ablationCache = null;
                    this.updateDisplay();
                }
            }
        });

        document.querySelectorAll('.shape-button').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('.shape-button').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedShape = e.target.dataset.shape;
                this.activeShape = null; // 取消当前激活的形状

                this.updateDisplay();
            });
        });
    }

    getShapeAt(x, y) {
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            if (this.shapes[i].containsPoint(x, y)) {
                // 找到形状后，将其从数组中移除并添加到末尾，使其优先级最高
                const shape = this.shapes[i];
                this.shapes.splice(i, 1);
                this.shapes.push(shape);
                return shape;
            }
        }
        return null;
    }

    rotateShape(shape) {
        switch (shape.type) {
            case 'circle':
                break;
            case 'square':
                shape.rotation = (shape.rotation + 45) % 360;
                break;
            case 'triangle':
                shape.rotation = (shape.rotation + 60) % 360;
                break;
        }
    }

    addShape(x, y) {
        let boundedX, boundedY;
        
        let radius;
        if (this.selectedShape === 'triangle') {
            radius = 60 / Math.sqrt(3);
        } else if (this.selectedShape === 'square') {
            radius = 60 / Math.sqrt(2);
        } else {
            radius = 30;
        }
        boundedX = Math.max(radius, Math.min(400 - radius, x));
        boundedY = Math.max(radius, Math.min(400 - radius, y));
        
        const shape = new Shape(this.selectedShape, boundedX, boundedY, 60);
        this.shapes.push(shape);
        this.activeShape = shape;
        this.ablationCache = null;
        this.updateDisplay();
    }

    calculateAblationRegions() {
        // 使用更高精度计算消融区域
        const regions = [];
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');

        // 为每个像素点计算重叠次数
        const imageData = ctx.createImageData(400, 400);
        const data = imageData.data;

        for (let y = 0; y < 400; y++) {
            for (let x = 0; x < 400; x++) {
                let overlapCount = 0;
                for (const shape of this.shapes) {
                    if (shape.containsPoint(x, y)) {
                        overlapCount++;
                    }
                }

                const index = (y * 400 + x) * 4;
                if (overlapCount % 2 === 1) {
                    data[index] = 255;     // R
                    data[index + 1] = 255; // G
                    data[index + 2] = 255; // B
                    data[index + 3] = 255; // A
                } else {
                    data[index + 3] = 0;   // 透明
                }
            }
        }

        return imageData;
    }



    drawShapes(ctx, shapes) {
        ctx.clearRect(0, 0, 400, 400);

        // 绘制形状
        shapes.forEach((shape, index) => {
            const shapeColors = {
                'circle': '#4ECDC4',    // 青色
                'square': '#45B7D1',    // 蓝色
                'triangle': '#96CEB4'   // 绿色
            };
            const color = shapeColors[shape.type];
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.fillStyle = color + '30';

            const scaledSize = shape.size * shape.scale;

            ctx.save();
            ctx.translate(shape.x, shape.y);
            ctx.rotate(shape.rotation * Math.PI / 180);

            ctx.beginPath();
            switch (shape.type) {
                case 'circle':
                    ctx.arc(0, 0, scaledSize / 2, 0, Math.PI * 2);
                    break;
                case 'square':
                    ctx.rect(-scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize);
                    break;
                case 'triangle':
                    const s = scaledSize;
                    ctx.moveTo(0, -Math.sqrt(3) / 3 * s);
                    ctx.lineTo(-0.5 * s, Math.sqrt(3) / 6 * s);
                    ctx.lineTo(0.5 * s, Math.sqrt(3) / 6 * s);
                    ctx.closePath();
                    break;
            }
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });
    }



    updateDisplay() {
        // 只有在需要时才重新计算消融区域
        if (!this.ablationCache) {
            this.ablationCache = this.calculateAblationRegions();
        }

        // 清空画布
        this.gameCtx.clearRect(0, 0, 400, 400);

        // 绘制缓存的消融结果
        if (this.ablationCache) {
            this.gameCtx.putImageData(this.ablationCache, 0, 0);
        }

        // 绘制形状轮廓
        this.drawShapeOutlines();
    }

    updateShapesOnly() {
        // 快速更新：只重绘形状，不重新计算消融区域
        this.gameCtx.clearRect(0, 0, 400, 400);

        // 绘制缓存的消融结果
        if (this.ablationCache) {
            this.gameCtx.putImageData(this.ablationCache, 0, 0);
        }

        // 绘制形状轮廓
        this.drawShapeOutlines();
    }

    drawShapeOutlines() {
        this.shapes.forEach((shape, index) => {
            const shapeColors = {
                'circle': '#4ECDC4',    // 青色
                'square': '#45B7D1',    // 蓝色
                'triangle': '#96CEB4'   // 绿色
            };
            const isSelected = shape === this.activeShape;

            this.gameCtx.strokeStyle = isSelected ? '#FF0000' : shapeColors[shape.type];
            this.gameCtx.lineWidth = isSelected ? 2.5 : 2;
            this.gameCtx.fillStyle = 'transparent';

            const scaledSize = shape.size * shape.scale;

            this.gameCtx.save();
            this.gameCtx.translate(shape.x, shape.y);
            this.gameCtx.rotate(shape.rotation * Math.PI / 180);

            this.gameCtx.beginPath();
            switch (shape.type) {
                case 'circle':
                    this.gameCtx.arc(0, 0, scaledSize / 2, 0, Math.PI * 2);
                    break;
                case 'square':
                    this.gameCtx.rect(-scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize);
                    break;
                case 'triangle':
                    const s = scaledSize;
                    this.gameCtx.moveTo(0, -Math.sqrt(3) / 3 * s);
                    this.gameCtx.lineTo(-0.5 * s, Math.sqrt(3) / 6 * s);
                    this.gameCtx.lineTo(0.5 * s, Math.sqrt(3) / 6 * s);
                    this.gameCtx.closePath();
                    break;
            }
            this.gameCtx.stroke();
            this.gameCtx.restore();
        });
    }
}

function clearShapes() {
    game.shapes = [];
    game.ablationCache = null;
    game.updateDisplay();
}

function nextLevel() {
    // 简化后不需要关卡系统
}

// 启动游戏
const game = new Game();