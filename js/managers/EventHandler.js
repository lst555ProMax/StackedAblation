class EventHandler {
    constructor(game) {
        this.game = game;
        this.setupEventListeners();
        this.setupKeyboardListeners();
    }

    setupEventListeners() {
        this.addCanvasEventListeners();
        this.addShapeButtonEventListeners();
    }

    addCanvasEventListeners() {
        const canvas = this.game.gameCanvas;
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', () => this.handleMouseUp());
        canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    }

    addShapeButtonEventListeners() {
        const containerId = this.game.isChallengeMode ? 
            Config.CONTAINER_IDS.CHALLENGE : Config.CONTAINER_IDS.EXPLORE;
        const container = document.getElementById(containerId);
        
        container.querySelectorAll('.shape-button').forEach(button => {
            button.addEventListener('click', (e) => this.handleShapeButtonClick(e, container));
        });
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.shouldHandleKeyboard()) return;
            
            const step = this.game.isChallengeMode ? Config.GRID_SIZE : Config.MOVE_STEP;
            const movement = this.getMovementFromKey(e.key, step);
            
            if (movement) {
                this.game.moveShape(this.game.activeShape, movement.x, movement.y);
                this.preventDefaultAndUpdate(e);
            }
        });
    }

    shouldHandleKeyboard() {
        return this.game.activeShape && 
               (this.game.canvasId === Config.CANVAS_IDS.EXPLORE || 
                this.game.canvasId === Config.CANVAS_IDS.CHALLENGE);
    }

    getMovementFromKey(key, step) {
        const movements = {
            'ArrowUp': { x: 0, y: -step },
            'ArrowDown': { x: 0, y: step },
            'ArrowLeft': { x: -step, y: 0 },
            'ArrowRight': { x: step, y: 0 }
        };
        return movements[key] || null;
    }

    preventDefaultAndUpdate(e) {
        e.preventDefault();
        this.game.ablationCache = null;
        this.game.smartUpdate();
    }

    handleMouseDown(e) {
        if (this.handleRightClick(e)) return;
        
        const coords = this.getCanvasCoordinates(e);
        this.game.mouseDownPos = coords;

        if (this.game.selectedShape) {
            this.createNewShape(coords);
        } else {
            this.handleShapeSelection(coords);
        }
        
        this.game.smartUpdate();
    }

    handleRightClick(e) {
        if (e.button === 2) {
            e.preventDefault();
            if (this.game.activeShape) {
                this.game.rotateShape(this.game.activeShape);
                this.game.ablationCache = null;
                this.game.smartUpdate();
            }
            return true;
        }
        return false;
    }

    getCanvasCoordinates(e) {
        const rect = this.game.gameCanvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    createNewShape(coords) {
        this.game.activeShape = null;
        this.game.addShape(coords.x, coords.y);
        this.game.selectedShape = null;
        document.querySelectorAll('.shape-button').forEach(b => b.classList.remove('selected'));
    }

    handleShapeSelection(coords) {
        const clickedShape = this.game.getShapeAt(coords.x, coords.y);
        if (clickedShape) {
            this.handleShapeClick(clickedShape, coords.x, coords.y);
        } else {
            this.game.activeShape = null;
            this.game.clickCount = 0;
        }
    }

    handleShapeClick(clickedShape, x, y) {
        if (this.checkTripleClick(clickedShape)) {
            this.deleteShape(clickedShape);
            return;
        }
        
        this.setupShapeForDragging(clickedShape, x, y);
    }

    checkTripleClick(clickedShape) {
        const currentTime = Date.now();
        const isQuickClick = clickedShape === this.game.activeShape && 
                           currentTime - this.game.lastClickTime < Config.TRIPLE_CLICK_THRESHOLD;
        
        if (isQuickClick) {
            this.game.clickCount++;
            if (this.game.clickCount >= 3) {
                return true;
            }
        } else {
            this.game.clickCount = 1;
        }
        
        this.game.lastClickTime = currentTime;
        return false;
    }

    deleteShape(shape) {
        const index = this.game.shapes.indexOf(shape);
        if (index > -1) {
            this.game.shapes.splice(index, 1);
            this.game.activeShape = null;
            this.game.ablationCache = null;
        }
        this.game.clickCount = 0;
        this.game.smartUpdate();
    }

    setupShapeForDragging(shape, x, y) {
        this.game.activeShape = shape;
        this.game.draggedShape = shape;
        this.game.dragOffset = {
            x: x - shape.x,
            y: y - shape.y
        };
        this.game.backgroundCache = null;
        this.game.lastActiveShape = null;
    }

    handleMouseMove(e) {
        if (!this.game.draggedShape) return;
        
        const coords = this.getCanvasCoordinates(e);
        const dx = coords.x - this.game.mouseDownPos.x;
        const dy = coords.y - this.game.mouseDownPos.y;

        if (!this.game.isDragging && this.exceedsDragThreshold(dx, dy)) {
            this.game.isDragging = true;
        }

        if (this.game.isDragging) {
            this.performDragMove(coords);
        }
    }

    exceedsDragThreshold(dx, dy) {
        return Math.abs(dx) > Config.DRAG_THRESHOLD || Math.abs(dy) > Config.DRAG_THRESHOLD;
    }

    performDragMove(coords) {
        this.game.moveShape(
            this.game.draggedShape, 
            coords.x - this.game.dragOffset.x - this.game.draggedShape.x,
            coords.y - this.game.dragOffset.y - this.game.draggedShape.y
        );
        this.game.smartUpdate();
    }

    handleMouseUp() {
        if (this.game.isDragging) {
            this.game.ablationCache = null;
            this.game.smartUpdate();
        }
        this.resetDragState();
    }

    handleMouseLeave() {
        if (this.game.isDragging) {
            this.game.ablationCache = null;
            this.game.smartUpdate();
        }
        this.resetDragState();
    }

    resetDragState() {
        this.game.isDragging = false;
        this.game.draggedShape = null;
    }

    handleWheel(e) {
        if (this.game.activeShape) {
            e.preventDefault();
            const direction = e.deltaY > 0 ? -1 : 1;
            this.game.adjustShapeSize(direction);
        }
    }

    handleShapeButtonClick(e, container) {
        container.querySelectorAll('.shape-button').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        this.game.selectedShape = e.target.dataset.shape;
        this.game.activeShape = null;
        this.game.smartUpdate();
    }
}
