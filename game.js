class Shape {
    constructor(type, x, y, size) {
        this.type = type;
        this.x = x;
        this.y = y;
        
        // 根据形状类型设置默认大小
        if (type === 'circle') {
            this.size = 80; // 默认直径为4个网格单位，80px
            this.sizeLevel = 4; // 默认尺寸级别，范围2,4,6,8
        } else if (type === 'square') {
            this.size = 80; // 默认边长为4个网格单位，80px
            this.sizeLevel = 4; // 默认尺寸级别，范围2,4,6,8
        } else {
            this.size = size;
        }
        
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
    constructor(canvasId = 'gameCanvas') {
        this.gameCanvas = document.getElementById(canvasId);
        this.gameCtx = this.gameCanvas.getContext('2d');
        this.canvasId = canvasId;
        this.isChallengeMode = canvasId === 'challengeCanvas';
        this.canvasSize = 600;
        this.gridSize = this.isChallengeMode ? this.canvasSize / 30 : 0; // 30x30网格
        
        // 性能优化相关
        
        // 启用抽锤平滑
        this.gameCtx.imageSmoothingEnabled = true;
        this.gameCtx.imageSmoothingQuality = 'high';
        
        // 背景缓存优化
        this.backgroundCache = null; // 缓存除当前操作形状外的所有形状
        this.lastActiveShape = null; // 记录上次的活动形状

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
        this.setupKeyboardListeners();
        this.smartUpdate();
    }



    setupEventListeners() {
        this.gameCanvas.addEventListener('mousedown', (e) => {
            // 右键点击旋转当前选中的形状
            if (e.button === 2) {
                e.preventDefault();
                if (this.activeShape) {
                    this.rotateShape(this.activeShape);
                    if (this.isChallengeMode) {
                        this.updateWithXor();
                    } else {
                        this.ablationCache = null;
                        this.updateDisplay();
                    }
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
                            this.smartUpdate();
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
                    // 重置背景缓存以触发重新计算
                    this.backgroundCache = null;
                    this.lastActiveShape = null;
                } else {
                    this.activeShape = null;
                    this.clickCount = 0;
                }
            }
            this.smartUpdate();
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

                    if (this.isChallengeMode) {
                        // 闯关模式：吸附到网格点
                        this.draggedShape.x = this.snapToGrid(newX);
                        this.draggedShape.y = this.snapToGrid(newY);
                        // 闯关模式使用异或优化
                        this.updateWithXor();
                    } else {
                        // 探索模式：原有边界检测
                        const size = this.draggedShape.size * this.draggedShape.scale;
                        let radius;
                        if (this.draggedShape.type === 'triangle') {
                            radius = size / Math.sqrt(3);
                        } else if (this.draggedShape.type === 'square') {
                            radius = size / Math.sqrt(2);
                        } else {
                            radius = size / 2;
                        }
                        this.draggedShape.x = Math.max(radius, Math.min(this.canvasSize - radius, newX));
                        this.draggedShape.y = Math.max(radius, Math.min(this.canvasSize - radius, newY));
                        // 探索模式拖拽时只更新形状位置，不重新计算消融区域
                        this.updateShapesOnly();
                    }
                }
            }
        });

        this.gameCanvas.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.ablationCache = null;
                this.smartUpdate();
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
                this.smartUpdate();
            } else {
                // 非拖动状态下只重置拖动相关状态
                this.isDragging = false;
                this.draggedShape = null;
            }
        });

        this.gameCanvas.addEventListener('wheel', (e) => {
            if (this.activeShape) {
                e.preventDefault();
                const direction = e.deltaY > 0 ? -1 : 1;
                
                if (this.activeShape.type === 'circle') {
                    // 圆形：直径为2,4,6,8个单位
                    const circleSizes = [2, 4, 6, 8];
                    const currentIndex = circleSizes.indexOf(this.activeShape.sizeLevel);
                    const newIndex = Math.max(0, Math.min(circleSizes.length - 1, currentIndex + direction));
                    if (newIndex !== currentIndex) {
                        this.activeShape.sizeLevel = circleSizes[newIndex];
                        this.activeShape.size = this.activeShape.sizeLevel * 20; // 每个单位为20px
                        if (this.isChallengeMode) {
                            this.updateWithXor();
                        } else {
                            this.ablationCache = null;
                            this.updateDisplay();
                        }
                    }
                } else if (this.activeShape.type === 'square') {
                    // 正方形：边长为2,4,6,8个单位
                    const squareSizes = [2, 4, 6, 8];
                    const currentIndex = squareSizes.indexOf(this.activeShape.sizeLevel);
                    const newIndex = Math.max(0, Math.min(squareSizes.length - 1, currentIndex + direction));
                    
                    if (newIndex !== currentIndex) {
                        this.activeShape.sizeLevel = squareSizes[newIndex];
                        this.activeShape.size = this.activeShape.sizeLevel * 20; // 每个单位为20px
                        if (this.isChallengeMode) {
                            this.updateWithXor();
                        } else {
                            this.ablationCache = null;
                            this.updateDisplay();
                        }
                    }
                } else {
                    // 三角形保持原有缩放逻辑
                    const scaleValues = [0.5, 0.75, 1, 1.5, 2];
                    const currentIndex = scaleValues.indexOf(this.activeShape.scale);
                    const newIndex = Math.max(0, Math.min(scaleValues.length - 1, currentIndex + direction));
                    const newScale = scaleValues[newIndex];
                    
                    // 检查新缩放是否会导致形状溢出边界
                    const newSize = this.activeShape.size * newScale;
                    const radius = newSize / Math.sqrt(3);
                    
                    const canScale = this.activeShape.x - radius >= 0 && 
                              this.activeShape.x + radius <= this.canvasSize && 
                              this.activeShape.y - radius >= 0 && 
                              this.activeShape.y + radius <= this.canvasSize;
                    
                    if (canScale) {
                        this.activeShape.scale = newScale;
                        if (this.isChallengeMode) {
                            this.updateWithXor();
                        } else {
                            this.ablationCache = null;
                            this.updateDisplay();
                        }
                    }
                }
            }
        });

        // 根据canvas ID确定按钮容器
        const container = this.canvasId === 'gameCanvas' ? 
            document.getElementById('explore-mode') : 
            document.getElementById('challenge-mode');
        
        container.querySelectorAll('.shape-button').forEach(button => {
            button.addEventListener('click', (e) => {
                container.querySelectorAll('.shape-button').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedShape = e.target.dataset.shape;
                this.activeShape = null; // 取消当前激活的形状

                this.smartUpdate();
            });
        });
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.activeShape && (this.canvasId === 'gameCanvas' || this.canvasId === 'challengeCanvas')) {
                let moved = false;
                const step = this.isChallengeMode ? this.gridSize : 20;
                
                switch(e.key) {
                    case 'ArrowUp':
                        this.moveShape(this.activeShape, 0, -step);
                        moved = true;
                        break;
                    case 'ArrowDown':
                        this.moveShape(this.activeShape, 0, step);
                        moved = true;
                        break;
                    case 'ArrowLeft':
                        this.moveShape(this.activeShape, -step, 0);
                        moved = true;
                        break;
                    case 'ArrowRight':
                        this.moveShape(this.activeShape, step, 0);
                        moved = true;
                        break;
                }
                
                if (moved) {
                    e.preventDefault();
                    if (this.isChallengeMode) {
                        this.updateWithXor();
                    } else {
                        this.ablationCache = null;
                        this.updateDisplay();
                    }
                }
            }
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
        
        if (this.isChallengeMode) {
            // 闯关模式：吸附到网格点
            boundedX = this.snapToGrid(x);
            boundedY = this.snapToGrid(y);
        } else {
            // 探索模式：原有边界检测
            let radius;
            if (this.selectedShape === 'triangle') {
                radius = 60 / Math.sqrt(3);
            } else if (this.selectedShape === 'square') {
                radius = 80 / Math.sqrt(2); // 默认边长80px
            } else {
                radius = 40; // 默认直径80px的一半
            }
            boundedX = Math.max(radius, Math.min(this.canvasSize - radius, x));
            boundedY = Math.max(radius, Math.min(this.canvasSize - radius, y));
        }
        
        const shape = new Shape(this.selectedShape, boundedX, boundedY, 60);
        this.shapes.push(shape);
        this.activeShape = shape;
        this.ablationCache = null;
        this.backgroundCache = null; // 清空背景缓存
        this.lastActiveShape = null; // 重置活动形状记录
        this.smartUpdate();
    }

    calculateAblationRegions() {
        // 使用更高精度计算消融区域
        const canvas = document.createElement('canvas');
        canvas.width = this.canvasSize;
        canvas.height = this.canvasSize;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 为每个像素点计算重叠次数
        const imageData = ctx.createImageData(this.canvasSize, this.canvasSize);
        const data = imageData.data;

        for (let y = 0; y < this.canvasSize; y++) {
            for (let x = 0; x < this.canvasSize; x++) {
                let overlapCount = 0;
                for (const shape of this.shapes) {
                    if (shape.containsPoint(x, y)) {
                        overlapCount++;
                    }
                }

                const index = (y * this.canvasSize + x) * 4;
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



    updateDisplay() {
        // 清空画布
        this.gameCtx.clearRect(0, 0, this.canvasSize, this.canvasSize);

        // 绘制网格（仅闯关模式）
        if (this.isChallengeMode) {
            this.drawGrid();
        }

        // 只有在需要时才重新计算消融区域
        if (!this.ablationCache) {
            this.ablationCache = this.calculateAblationRegions();
        }

        // 绘制缓存的消融结果
        if (this.ablationCache) {
            this.gameCtx.putImageData(this.ablationCache, 0, 0);
        }

        // 绘制形状轮廓
        this.drawShapeOutlines();

        // 再次绘制网格点（确保在最上层）
        if (this.isChallengeMode) {
            this.drawGridPoints();
        }
    }

    updateShapesOnly() {
        // 快速更新：只重绘形状，不重新计算消融区域
        this.gameCtx.clearRect(0, 0, this.canvasSize, this.canvasSize);

        // 绘制网格（仅闯关模式）
        if (this.isChallengeMode) {
            this.drawGrid();
        }

        // 绘制缓存的消融结果
        if (this.ablationCache) {
            this.gameCtx.putImageData(this.ablationCache, 0, 0);
        }

        // 绘制形状轮廓
        this.drawShapeOutlines();

        // 再次绘制网格点（确保在最上层）
        if (this.isChallengeMode) {
            this.drawGridPoints();
        }
    }

    snapToGrid(coord) {
        return Math.round(coord / this.gridSize) * this.gridSize;
    }

    drawGrid() {
        this.gameCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.gameCtx.lineWidth = 0.5;
        
        for (let i = 0; i <= 30; i++) {
            const pos = i * this.gridSize;
            // 垂直线
            this.gameCtx.beginPath();
            this.gameCtx.moveTo(pos, 0);
            this.gameCtx.lineTo(pos, this.canvasSize);
            this.gameCtx.stroke();
            // 水平线
            this.gameCtx.beginPath();
            this.gameCtx.moveTo(0, pos);
            this.gameCtx.lineTo(this.canvasSize, pos);
            this.gameCtx.stroke();
        }
    }

    drawGridPoints() {
        // 绘制网格点
        this.gameCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i <= 30; i++) {
            for (let j = 0; j <= 30; j++) {
                const x = i * this.gridSize;
                const y = j * this.gridSize;
                this.gameCtx.beginPath();
                this.gameCtx.arc(x, y, 2.5, 0, Math.PI * 2);
                this.gameCtx.fill();
            }
        }
    }

    calculateBackgroundCache() {
        // 计算除当前活动形状外的所有形状的消融区域
        const backgroundShapes = this.shapes.filter(shape => shape !== this.activeShape);
        
        const canvas = document.createElement('canvas');
        canvas.width = this.canvasSize;
        canvas.height = this.canvasSize;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const imageData = ctx.createImageData(this.canvasSize, this.canvasSize);
        const data = imageData.data;

        for (let y = 0; y < this.canvasSize; y++) {
            for (let x = 0; x < this.canvasSize; x++) {
                let overlapCount = 0;
                for (const shape of backgroundShapes) {
                    if (shape.containsPoint(x, y)) {
                        overlapCount++;
                    }
                }

                const index = (y * this.canvasSize + x) * 4;
                if (overlapCount % 2 === 1) {
                    data[index] = 255;
                    data[index + 1] = 255;
                    data[index + 2] = 255;
                    data[index + 3] = 255;
                } else {
                    data[index + 3] = 0;
                }
            }
        }

        return imageData;
    }

    smartUpdate() {
        if (this.isChallengeMode && this.activeShape) {
            this.updateWithXor();
        } else {
            this.ablationCache = null;
            this.updateDisplay();
        }
    }

    updateWithXor() {
        // 检查是否需要重新计算背景缓存
        if (!this.backgroundCache || this.lastActiveShape !== this.activeShape) {
            this.backgroundCache = this.calculateBackgroundCache();
            this.lastActiveShape = this.activeShape;
        }
        
        // 使用异或操作计算结果
        const xorResult = this.calculateActiveShapeXor();
        
        // 直接更新显示
        this.gameCtx.clearRect(0, 0, this.canvasSize, this.canvasSize);
        
        if (this.isChallengeMode) {
            this.drawGrid();
        }
        
        if (xorResult) {
            this.gameCtx.putImageData(xorResult, 0, 0);
        }
        
        this.drawShapeOutlines();
        
        if (this.isChallengeMode) {
            this.drawGridPoints();
        }
    }

    calculateActiveShapeXor() {
        // 计算当前活动形状与背景的异或结果
        if (!this.backgroundCache || !this.activeShape) {
            return this.calculateAblationRegions();
        }

        const canvas = document.createElement('canvas');
        canvas.width = this.canvasSize;
        canvas.height = this.canvasSize;
        const ctx = canvas.getContext('2d');
        
        const resultData = ctx.createImageData(this.canvasSize, this.canvasSize);
        const result = resultData.data;
        const background = this.backgroundCache.data;

        for (let y = 0; y < this.canvasSize; y++) {
            for (let x = 0; x < this.canvasSize; x++) {
                const index = (y * this.canvasSize + x) * 4;
                
                // 检查当前形状是否包含该点
                const activeShapeContains = this.activeShape.containsPoint(x, y);
                
                // 背景是否在该点有值
                const backgroundHasValue = background[index + 3] > 0;
                
                // 异或操作
                const shouldShow = activeShapeContains ? !backgroundHasValue : backgroundHasValue;
                
                if (shouldShow) {
                    result[index] = 255;
                    result[index + 1] = 255;
                    result[index + 2] = 255;
                    result[index + 3] = 255;
                } else {
                    result[index + 3] = 0;
                }
            }
        }

        return resultData;
    }

    moveShape(shape, deltaX, deltaY) {
        const newX = shape.x + deltaX;
        const newY = shape.y + deltaY;
        
        if (this.isChallengeMode) {
            // 闯关模式：吸附到网格点
            shape.x = this.snapToGrid(newX);
            shape.y = this.snapToGrid(newY);
        } else {
            // 探索模式：边界检测
            let radius;
            if (shape.type === 'triangle') {
                radius = shape.size * shape.scale / Math.sqrt(3);
            } else if (shape.type === 'square') {
                radius = shape.size / Math.sqrt(2);
            } else {
                radius = shape.size / 2;
            }
            shape.x = Math.max(radius, Math.min(this.canvasSize - radius, newX));
            shape.y = Math.max(radius, Math.min(this.canvasSize - radius, newY));
        }
    }

    drawShapeOutlines() {
        // 只为选中的形状绘制边框
        if (this.activeShape) {
            this.gameCtx.strokeStyle = '#FF0000';
            this.gameCtx.lineWidth = 2.5;
            this.gameCtx.fillStyle = 'transparent';

            const scaledSize = this.activeShape.size * this.activeShape.scale;

            this.gameCtx.save();
            // 使用整数坐标减少锯齿
            this.gameCtx.translate(Math.round(this.activeShape.x), Math.round(this.activeShape.y));
            this.gameCtx.rotate(this.activeShape.rotation * Math.PI / 180);
            
            // 启用抽锤平滑
            this.gameCtx.imageSmoothingEnabled = true;
            this.gameCtx.imageSmoothingQuality = 'high';
            this.gameCtx.lineJoin = 'round';

            this.gameCtx.beginPath();
            switch (this.activeShape.type) {
                case 'circle':
                    this.gameCtx.arc(0, 0, scaledSize / 2, 0, Math.PI * 2);
                    break;
                case 'square':
                    // 使用整数尺寸减少锯齿
                    const halfSize = Math.round(scaledSize / 2);
                    this.gameCtx.rect(-halfSize, -halfSize, scaledSize, scaledSize);
                    break;
                case 'triangle':
                    const s = scaledSize;
                    this.gameCtx.moveTo(Math.round(0), Math.round(-Math.sqrt(3) / 3 * s));
                    this.gameCtx.lineTo(Math.round(-0.5 * s), Math.round(Math.sqrt(3) / 6 * s));
                    this.gameCtx.lineTo(Math.round(0.5 * s), Math.round(Math.sqrt(3) / 6 * s));
                    this.gameCtx.closePath();
                    break;
            }
            this.gameCtx.stroke();
            this.gameCtx.restore();
        }
    }
}

// 清除形状的方法
function clearShapes() {
    if (window.exploreGame) {
        window.exploreGame.shapes = [];
        window.exploreGame.ablationCache = null;
        window.exploreGame.smartUpdate();
    }
}

function clearChallengeShapes() {
    if (window.challengeGame) {
        window.challengeGame.shapes = [];
        window.challengeGame.ablationCache = null;
        window.challengeGame.smartUpdate();
    }
}

// 添加清除形状的方法到Game类
Game.prototype.clearShapes = function() {
    this.shapes = [];
    this.ablationCache = null;
    this.backgroundCache = null;
    this.smartUpdate();
};

// 启动游戏实例
window.addEventListener('DOMContentLoaded', () => {
    // 探索模式游戏实例
    window.exploreGame = new Game('gameCanvas');
    
    // 闯关模式游戏实例
    window.challengeGame = new Game('challengeCanvas');
    
    // 保持向后兼容
    window.game = window.exploreGame;
});