class Game {
    constructor(canvasId = Config.CANVAS_IDS.EXPLORE) {
        this.gameCanvas = document.getElementById(canvasId);
        this.gameCtx = this.gameCanvas.getContext('2d');
        this.canvasId = canvasId;
        this.isChallengeMode = canvasId === Config.CANVAS_IDS.CHALLENGE;
        
        this.initializeComponents();
        this.initializeState();
        this.initializeEventHandlers();
        this.smartUpdate();
    }

    initializeComponents() {
        this.renderer = new Renderer(this.gameCtx, this.isChallengeMode);
        this.ablationCalculator = new AblationCalculator();
    }

    initializeState() {
        this.backgroundCache = null;
        this.lastActiveShape = null;
        this.shapes = [];
        this.selectedShape = null;
        this.activeShape = null;
        this.draggedShape = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.mouseDownPos = { x: 0, y: 0 };
        this.clickCount = 0;
        this.lastClickTime = 0;
        this.ablationCache = null;
    }

    initializeEventHandlers() {
        this.eventHandler = new EventHandler(this);
    }

    getShapeAt(x, y) {
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            if (this.shapes[i].containsPoint(x, y)) {
                const shape = this.shapes[i];
                this.shapes.splice(i, 1);
                this.shapes.push(shape);
                return shape;
            }
        }
        return null;
    }

    rotateShape(shape) {
        const rotation = Config.ROTATION_ANGLES[shape.type];
        if (rotation) {
            shape.rotation = (shape.rotation + rotation) % 360;
        }
    }

    adjustShapeSize(direction) {
        const shape = this.activeShape;
        if (!shape) return;

        let changed = false;
        
        if (this.isCircleOrSquare(shape)) {
            changed = this.adjustDiscreteSizeLevel(shape, direction);
        } else {
            changed = this.adjustContinuousScale(shape, direction);
        }
        
        if (changed) {
            this.invalidateCache();
            this.smartUpdate();
        }
    }

    isCircleOrSquare(shape) {
        return shape.type === Config.SHAPE_TYPES.CIRCLE || 
               shape.type === Config.SHAPE_TYPES.SQUARE;
    }

    adjustDiscreteSizeLevel(shape, direction) {
        const currentIndex = Config.SIZE_LEVELS.indexOf(shape.sizeLevel);
        const newIndex = Math.max(0, Math.min(Config.SIZE_LEVELS.length - 1, currentIndex + direction));
        
        if (newIndex !== currentIndex) {
            shape.sizeLevel = Config.SIZE_LEVELS[newIndex];
            shape.size = shape.sizeLevel * 20;
            return true;
        }
        return false;
    }

    adjustContinuousScale(shape, direction) {
        const currentIndex = Config.SCALE_VALUES.indexOf(shape.scale);
        const newIndex = Math.max(0, Math.min(Config.SCALE_VALUES.length - 1, currentIndex + direction));
        const newScale = Config.SCALE_VALUES[newIndex];
        
        if (this.isScaleValidForTriangle(shape, newScale)) {
            shape.scale = newScale;
            return true;
        }
        return false;
    }

    isScaleValidForTriangle(shape, newScale) {
        const newSize = shape.size * newScale;
        const radius = newSize / Math.sqrt(3);
        
        return shape.x - radius >= 0 && shape.x + radius <= Config.CANVAS_SIZE && 
               shape.y - radius >= 0 && shape.y + radius <= Config.CANVAS_SIZE;
    }

    invalidateCache() {
        this.ablationCache = null;
    }

    addShape(x, y) {
        const position = this.isChallengeMode ? 
            this.getGridPosition(x, y) : 
            this.getBoundedPosition(x, y);
        
        const shape = new Shape(this.selectedShape, position.x, position.y, Config.DEFAULT_TRIANGLE_SIZE);
        this.shapes.push(shape);
        this.activeShape = shape;
        this.invalidateAllCaches();
        this.smartUpdate();
    }

    getGridPosition(x, y) {
        return {
            x: this.snapToGrid(x),
            y: this.snapToGrid(y)
        };
    }

    getBoundedPosition(x, y) {
        const radius = this.getShapeRadius(this.selectedShape);
        return {
            x: Math.max(radius, Math.min(Config.CANVAS_SIZE - radius, x)),
            y: Math.max(radius, Math.min(Config.CANVAS_SIZE - radius, y))
        };
    }

    getShapeRadius(shapeType) {
        switch (shapeType) {
            case Config.SHAPE_TYPES.TRIANGLE:
                return Config.DEFAULT_TRIANGLE_SIZE / Math.sqrt(3);
            case Config.SHAPE_TYPES.SQUARE:
                return Config.DEFAULT_SIZE / Math.sqrt(2);
            default:
                return Config.DEFAULT_SIZE / 2;
        }
    }

    invalidateAllCaches() {
        this.ablationCache = null;
        this.backgroundCache = null;
        this.lastActiveShape = null;
    }

    updateDisplay() {
        this.renderer.clear();
        
        if (!this.ablationCache) {
            this.ablationCache = this.ablationCalculator.calculateAblationRegions(this.shapes);
        }
        
        this.renderer.drawImageData(this.ablationCache);
        this.renderer.drawShapeOutline(this.activeShape);
        this.renderer.drawGridPoints();
    }

    snapToGrid(coord) {
        return GeometryUtils.snapToGrid(coord, Config.GRID_SIZE);
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
        if (!this.backgroundCache || this.lastActiveShape !== this.activeShape) {
            this.backgroundCache = this.ablationCalculator.calculateBackgroundCache(this.shapes, this.activeShape);
            this.lastActiveShape = this.activeShape;
        }
        
        const xorResult = this.ablationCalculator.calculateActiveShapeXor(this.backgroundCache, this.activeShape) || 
                         this.ablationCalculator.calculateAblationRegions(this.shapes);
        
        this.renderer.clear();
        this.renderer.drawImageData(xorResult);
        this.renderer.drawShapeOutline(this.activeShape);
        this.renderer.drawGridPoints();
    }

    moveShape(shape, deltaX, deltaY) {
        const newX = shape.x + deltaX;
        const newY = shape.y + deltaY;
        
        if (this.isChallengeMode) {
            shape.x = this.snapToGrid(newX);
            shape.y = this.snapToGrid(newY);
        } else {
            const position = this.getBoundedShapePosition(shape, newX, newY);
            shape.x = position.x;
            shape.y = position.y;
        }
    }

    getBoundedShapePosition(shape, newX, newY) {
        const radius = GeometryUtils.getShapeRadius(shape.type, shape.size, shape.scale);
        return {
            x: GeometryUtils.clamp(newX, radius, Config.CANVAS_SIZE - radius),
            y: GeometryUtils.clamp(newY, radius, Config.CANVAS_SIZE - radius)
        };
    }

    getShapeCurrentRadius(shape) {
        return GeometryUtils.getShapeRadius(shape.type, shape.size, shape.scale);
    }

    clearShapes() {
        this.shapes = [];
        this.activeShape = null;
        this.invalidateAllCaches();
        this.smartUpdate();
    }
}