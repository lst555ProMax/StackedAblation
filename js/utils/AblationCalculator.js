class AblationCalculator {
    constructor() {
        this.canvasSize = Config.CANVAS_SIZE;
    }

    calculateAblationRegions(shapes) {
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
                const overlapCount = this.countOverlaps(shapes, x, y);
                const index = (y * this.canvasSize + x) * 4;
                
                if (overlapCount % 2 === 1) {
                    data[index] = 255;     // R
                    data[index + 1] = 255; // G
                    data[index + 2] = 255; // B
                    data[index + 3] = 255; // A
                } else {
                    data[index + 3] = 0;   // Transparent
                }
            }
        }

        return imageData;
    }

    countOverlaps(shapes, x, y) {
        let count = 0;
        for (const shape of shapes) {
            if (shape.containsPoint(x, y)) {
                count++;
            }
        }
        return count;
    }

    calculateBackgroundCache(shapes, activeShape) {
        const backgroundShapes = shapes.filter(shape => shape !== activeShape);
        return this.calculateAblationRegions(backgroundShapes);
    }

    calculateActiveShapeXor(backgroundCache, activeShape) {
        if (!backgroundCache || !activeShape) {
            return null;
        }

        const resultData = this.createImageData();
        const result = resultData.data;
        const background = backgroundCache.data;

        result.set(background);

        const bounds = this.getShapeBounds(activeShape);
        
        for (let y = bounds.minY; y <= bounds.maxY; y++) {
            for (let x = bounds.minX; x <= bounds.maxX; x++) {
                const index = (y * this.canvasSize + x) * 4;
                
                const activeShapeContains = activeShape.containsPoint(x, y);
                const backgroundHasValue = background[index + 3] > 0;
                const shouldShow = activeShapeContains ? !backgroundHasValue : backgroundHasValue;
                
                if (shouldShow) {
                    this.setPixelWhite(result, index);
                } else {
                    this.setPixelTransparent(result, index);
                }
            }
        }

        return resultData;
    }

    createImageData() {
        const canvas = document.createElement('canvas');
        canvas.width = this.canvasSize;
        canvas.height = this.canvasSize;
        const ctx = canvas.getContext('2d');
        return ctx.createImageData(this.canvasSize, this.canvasSize);
    }

    getShapeBounds(shape) {
        const scaledSize = shape.size * shape.scale;
        const radius = shape.type === Config.SHAPE_TYPES.CIRCLE ? scaledSize / 2 : 
                      shape.type === Config.SHAPE_TYPES.SQUARE ? scaledSize / Math.sqrt(2) : 
                      scaledSize / Math.sqrt(3);
        
        return {
            minX: Math.max(0, Math.floor(shape.x - radius)),
            maxX: Math.min(this.canvasSize - 1, Math.ceil(shape.x + radius)),
            minY: Math.max(0, Math.floor(shape.y - radius)),
            maxY: Math.min(this.canvasSize - 1, Math.ceil(shape.y + radius))
        };
    }

    setPixelWhite(data, index) {
        data[index] = 255;     // R
        data[index + 1] = 255; // G
        data[index + 2] = 255; // B
        data[index + 3] = 255; // A
    }

    setPixelTransparent(data, index) {
        data[index] = 0;       // R
        data[index + 1] = 0;   // G
        data[index + 2] = 0;   // B
        data[index + 3] = 0;   // A
    }
}
