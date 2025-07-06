class Shape {
    constructor(type, x, y, size) {
        this.type = type;
        this.x = x;
        this.y = y;
        
        if (type === Config.SHAPE_TYPES.CIRCLE || type === Config.SHAPE_TYPES.SQUARE) {
            this.size = Config.DEFAULT_SIZE;
            this.sizeLevel = Config.DEFAULT_SIZE_LEVEL;
        } else {
            this.size = size || Config.DEFAULT_TRIANGLE_SIZE;
        }
        
        this.scale = 1;
        this.rotation = 0;
    }

    containsPoint(px, py) {
        const scaledSize = this.size * this.scale;
        const cos = Math.cos(-this.rotation * Math.PI / 180);
        const sin = Math.sin(-this.rotation * Math.PI / 180);
        const dx = px - this.x;
        const dy = py - this.y;
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        switch (this.type) {
            case Config.SHAPE_TYPES.CIRCLE:
                return localX * localX + localY * localY <= (scaledSize / 2) * (scaledSize / 2);
            case Config.SHAPE_TYPES.SQUARE:
                return Math.abs(localX) <= scaledSize / 2 && Math.abs(localY) <= scaledSize / 2;
            case Config.SHAPE_TYPES.TRIANGLE:
                const s = scaledSize;
                const topY = -Math.sqrt(3) / 3 * s;
                const bottomY = Math.sqrt(3) / 6 * s;
                const height = bottomY - topY;
                
                if (localY < topY || localY > bottomY) return false;
                
                const distFromTop = localY - topY;
                const ratio = distFromTop / height;
                const currentWidth = ratio * s;
                return Math.abs(localX) <= currentWidth / 2;
        }
        return false;
    }
}