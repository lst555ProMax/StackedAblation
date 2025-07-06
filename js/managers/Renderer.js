class Renderer {
    constructor(ctx, isChallengeMode = false) {
        this.ctx = ctx;
        this.isChallengeMode = isChallengeMode;
        this.canvasSize = Config.CANVAS_SIZE;
        this.gridSize = Config.GRID_SIZE;
        
        this.setupContext();
    }

    setupContext() {
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);
    }

    drawGridPoints() {
        if (!this.isChallengeMode) return;
        
        this.ctx.fillStyle = Config.GRID_POINT_COLOR;
        for (let i = 0; i <= Config.GRID_DIVISIONS; i++) {
            for (let j = 0; j <= Config.GRID_DIVISIONS; j++) {
                this.ctx.beginPath();
                this.ctx.arc(i * this.gridSize, j * this.gridSize, Config.GRID_POINT_RADIUS, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    drawShapeOutline(shape) {
        if (!shape) return;
        
        this.ctx.strokeStyle = Config.OUTLINE_COLOR;
        this.ctx.lineWidth = Config.OUTLINE_WIDTH;
        this.ctx.fillStyle = 'transparent';

        const scaledSize = shape.size * shape.scale;

        this.ctx.save();
        this.ctx.translate(Math.round(shape.x), Math.round(shape.y));
        this.ctx.rotate(shape.rotation * Math.PI / 180);
        
        this.setupContext();
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.drawShapePath(shape.type, scaledSize);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawShapePath(type, scaledSize) {
        switch (type) {
            case Config.SHAPE_TYPES.CIRCLE:
                this.ctx.arc(0, 0, scaledSize / 2, 0, Math.PI * 2);
                break;
            case Config.SHAPE_TYPES.SQUARE:
                const halfSize = Math.round(scaledSize / 2);
                this.ctx.rect(-halfSize, -halfSize, scaledSize, scaledSize);
                break;
            case Config.SHAPE_TYPES.TRIANGLE:
                const s = scaledSize;
                this.ctx.moveTo(Math.round(0), Math.round(-Math.sqrt(3) / 3 * s));
                this.ctx.lineTo(Math.round(-0.5 * s), Math.round(Math.sqrt(3) / 6 * s));
                this.ctx.lineTo(Math.round(0.5 * s), Math.round(Math.sqrt(3) / 6 * s));
                this.ctx.closePath();
                break;
        }
    }

    drawImageData(imageData) {
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
        }
    }
}
