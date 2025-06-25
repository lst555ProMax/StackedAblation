class Shape {
    constructor(type, x, y, size) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.size = size;
        this.scale = 1;
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        const scaledSize = this.size * this.scale;

        switch (this.type) {
            case 'circle':
                return dx * dx + dy * dy <= (scaledSize / 2) * (scaledSize / 2);
            case 'square':
                return Math.abs(dx) <= scaledSize / 2 && Math.abs(dy) <= scaledSize / 2;
            case 'triangle':
                const topY = this.y - scaledSize / 2;
                const bottomY = this.y + scaledSize / 2;

                if (py < topY || py > bottomY) return false;

                const ratio = (py - topY) / (bottomY - topY);
                const currentLeft = this.x - (scaledSize / 2) * ratio;
                const currentRight = this.x + (scaledSize / 2) * ratio;

                return px >= currentLeft && px <= currentRight;
        }
        return false;
    }
}

class Game {
    constructor() {
        this.gameCanvas = document.getElementById('gameCanvas');
        this.gameCtx = this.gameCanvas.getContext('2d');

        this.shapes = [];
        this.selectedShape = null;
        this.selectedShapeObj = null;
        this.draggedShape = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.mouseDownPos = { x: 0, y: 0 };

        this.setupEventListeners();
        // 清除所有按钮的默认选中状态
        document.querySelectorAll('.shape-button').forEach(b => b.classList.remove('selected'));
        this.updateDisplay();
    }



    setupEventListeners() {
        this.gameCanvas.addEventListener('mousedown', (e) => {
            // 右键点击取消选中
            if (e.button === 2) {
                e.preventDefault();
                this.isDragging = false;
                this.draggedShape = null;
                this.selectedShapeObj = null;
                this.updateDisplay();
                return;
            }
            
            const rect = this.gameCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.mouseDownPos.x = x;
            this.mouseDownPos.y = y;

            const clickedShape = this.getShapeAt(x, y);
            if (clickedShape) {
                this.selectedShapeObj = clickedShape;
                this.draggedShape = clickedShape;
                this.dragOffset.x = x - clickedShape.x;
                this.dragOffset.y = y - clickedShape.y;
            } else if (this.selectedShape) {
                this.selectedShapeObj = null;
                this.addShape(x, y);
                this.selectedShape = null;
                document.querySelectorAll('.shape-button').forEach(b => b.classList.remove('selected'));
            } else {
                this.selectedShapeObj = null;
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
                    const halfSize = (this.draggedShape.size * this.draggedShape.scale) / 2;
                    this.draggedShape.x = Math.max(halfSize, Math.min(400 - halfSize, newX));
                    this.draggedShape.y = Math.max(halfSize, Math.min(400 - halfSize, newY));
                    
                    this.updateDisplay();
                }
            }
        });

        this.gameCanvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.draggedShape = null;
        });
        
        this.gameCanvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.draggedShape = null;
            this.selectedShapeObj = null;
            this.updateDisplay();
        });
        
        this.gameCanvas.addEventListener('wheel', (e) => {
            if (this.selectedShapeObj) {
                e.preventDefault();
                const scaleValues = [0.5, 0.75, 1, 1.5, 2];
                const currentIndex = scaleValues.indexOf(this.selectedShapeObj.scale);
                const direction = e.deltaY > 0 ? -1 : 1;
                const newIndex = Math.max(0, Math.min(scaleValues.length - 1, currentIndex + direction));
                this.selectedShapeObj.scale = scaleValues[newIndex];
                this.updateDisplay();
            }
        });

        document.querySelectorAll('.shape-button').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('.shape-button').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedShape = e.target.dataset.shape;
            });
        });
    }

    getShapeAt(x, y) {
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            if (this.shapes[i].containsPoint(x, y)) {
                return this.shapes[i];
            }
        }
        return null;
    }

    addShape(x, y) {
        const halfSize = 30; // size/2 = 60/2
        const boundedX = Math.max(halfSize, Math.min(400 - halfSize, x));
        const boundedY = Math.max(halfSize, Math.min(400 - halfSize, y));
        
        const shape = new Shape(this.selectedShape, boundedX, boundedY, 60);
        this.shapes.push(shape);
        this.selectedShapeObj = shape;
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
            ctx.beginPath();
            switch (shape.type) {
                case 'circle':
                    ctx.arc(shape.x, shape.y, scaledSize / 2, 0, Math.PI * 2);
                    break;
                case 'square':
                    ctx.rect(shape.x - scaledSize / 2, shape.y - scaledSize / 2, scaledSize, scaledSize);
                    break;
                case 'triangle':
                    ctx.moveTo(shape.x, shape.y - scaledSize / 2);
                    ctx.lineTo(shape.x - scaledSize / 2, shape.y + scaledSize / 2);
                    ctx.lineTo(shape.x + scaledSize / 2, shape.y + scaledSize / 2);
                    ctx.closePath();
                    break;
            }
            ctx.fill();
            ctx.stroke();
        });
    }



    updateDisplay() {
        // 绘制游戏区域的形状
        this.drawShapes(this.gameCtx, this.shapes);

        // 绘制高精度消融结果
        const ablationData = this.calculateAblationRegions();
        this.gameCtx.putImageData(ablationData, 0, 0);

        // 重新绘制形状轮廓（在消融结果之上）
        this.shapes.forEach((shape, index) => {
            const shapeColors = {
                'circle': '#4ECDC4',    // 青色
                'square': '#45B7D1',    // 蓝色
                'triangle': '#96CEB4'   // 绿色
            };
            const isSelected = shape === this.selectedShapeObj;

            this.gameCtx.strokeStyle = isSelected ? '#FF0000' : shapeColors[shape.type];
            this.gameCtx.lineWidth = isSelected ? 2.5 : 2;
            this.gameCtx.fillStyle = 'transparent';

            const scaledSize = shape.size * shape.scale;
            this.gameCtx.beginPath();
            switch (shape.type) {
                case 'circle':
                    this.gameCtx.arc(shape.x, shape.y, scaledSize / 2, 0, Math.PI * 2);
                    break;
                case 'square':
                    this.gameCtx.rect(shape.x - scaledSize / 2, shape.y - scaledSize / 2, scaledSize, scaledSize);
                    break;
                case 'triangle':
                    this.gameCtx.moveTo(shape.x, shape.y - scaledSize / 2);
                    this.gameCtx.lineTo(shape.x - scaledSize / 2, shape.y + scaledSize / 2);
                    this.gameCtx.lineTo(shape.x + scaledSize / 2, shape.y + scaledSize / 2);
                    this.gameCtx.closePath();
                    break;
            }
            this.gameCtx.stroke();
        });
    }
}

function clearShapes() {
    game.shapes = [];
    game.updateDisplay();
}

function nextLevel() {
    // 简化后不需要关卡系统
}

// 启动游戏
const game = new Game();