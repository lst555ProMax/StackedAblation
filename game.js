class Shape {
    constructor(type, x, y, size) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.size = size;
    }
    
    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        
        switch(this.type) {
            case 'circle':
                return dx*dx + dy*dy <= (this.size/2)*(this.size/2);
            case 'square':
                return Math.abs(dx) <= this.size/2 && Math.abs(dy) <= this.size/2;
            case 'triangle':
                // 三角形顶点：(x, y - size/2), 底边两点：(x - size/2, y + size/2), (x + size/2, y + size/2)
                const topY = this.y - this.size/2;
                const bottomY = this.y + this.size/2;
                const leftX = this.x - this.size/2;
                const rightX = this.x + this.size/2;
                
                // 检查点是否在三角形内部
                if (py < topY || py > bottomY) return false;
                
                // 计算在当前y坐标处三角形的左右边界
                const ratio = (py - topY) / (bottomY - topY);
                const currentLeft = this.x - (this.size/2) * ratio;
                const currentRight = this.x + (this.size/2) * ratio;
                
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
        this.selectedShape = 'circle';
        
        this.setupEventListeners();
        this.updateDisplay();
    }
    

    
    setupEventListeners() {
        this.gameCanvas.addEventListener('click', (e) => {
            const rect = this.gameCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.addShape(x, y);
        });
        
        document.querySelectorAll('.shape-button').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('.shape-button').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedShape = e.target.dataset.shape;
            });
        });
    }
    
    addShape(x, y) {
        const shape = new Shape(this.selectedShape, x, y, 60);
        this.shapes.push(shape);
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
        
        for(let y = 0; y < 400; y++) {
            for(let x = 0; x < 400; x++) {
                let overlapCount = 0;
                for(const shape of this.shapes) {
                    if(shape.containsPoint(x, y)) {
                        overlapCount++;
                    }
                }
                
                const index = (y * 400 + x) * 4;
                if(overlapCount % 2 === 1) {
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
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
            ctx.strokeStyle = colors[index % colors.length];
            ctx.lineWidth = 2;
            ctx.fillStyle = colors[index % colors.length] + '30';
            
            ctx.beginPath();
            switch(shape.type) {
                case 'circle':
                    ctx.arc(shape.x, shape.y, shape.size/2, 0, Math.PI * 2);
                    break;
                case 'square':
                    ctx.rect(shape.x - shape.size/2, shape.y - shape.size/2, shape.size, shape.size);
                    break;
                case 'triangle':
                    ctx.moveTo(shape.x, shape.y - shape.size/2);
                    ctx.lineTo(shape.x - shape.size/2, shape.y + shape.size/2);
                    ctx.lineTo(shape.x + shape.size/2, shape.y + shape.size/2);
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
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
            this.gameCtx.strokeStyle = colors[index % colors.length];
            this.gameCtx.lineWidth = 2;
            this.gameCtx.fillStyle = 'transparent';
            
            this.gameCtx.beginPath();
            switch(shape.type) {
                case 'circle':
                    this.gameCtx.arc(shape.x, shape.y, shape.size/2, 0, Math.PI * 2);
                    break;
                case 'square':
                    this.gameCtx.rect(shape.x - shape.size/2, shape.y - shape.size/2, shape.size, shape.size);
                    break;
                case 'triangle':
                    this.gameCtx.moveTo(shape.x, shape.y - shape.size/2);
                    this.gameCtx.lineTo(shape.x - shape.size/2, shape.y + shape.size/2);
                    this.gameCtx.lineTo(shape.x + shape.size/2, shape.y + shape.size/2);
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