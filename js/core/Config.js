/**
 * 游戏配置常量
 */
class Config {
    // 画布配置
    static CANVAS_SIZE = 600;
    static GRID_DIVISIONS = 30;
    static get GRID_SIZE() {
        return this.CANVAS_SIZE / this.GRID_DIVISIONS;
    }

    // 形状配置
    static SHAPE_TYPES = {
        CIRCLE: 'circle',
        SQUARE: 'square',
        TRIANGLE: 'triangle'
    };

    // 大小配置
    static SIZE_LEVELS = [2, 4, 6, 8];
    static SCALE_VALUES = [0.5, 0.75, 1, 1.5, 2];
    static DEFAULT_SIZE = 80;
    static DEFAULT_SIZE_LEVEL = 4;
    static DEFAULT_TRIANGLE_SIZE = 60;

    // 移动配置
    static DRAG_THRESHOLD = 5;
    static MOVE_STEP = 20;
    static TRIPLE_CLICK_THRESHOLD = 200;

    // 旋转配置
    static ROTATION_ANGLES = {
        [this.SHAPE_TYPES.SQUARE]: 45,
        [this.SHAPE_TYPES.TRIANGLE]: 60
    };

    // 渲染配置
    static OUTLINE_COLOR = '#FF0000';
    static OUTLINE_WIDTH = 2.5;
    static GRID_POINT_COLOR = 'rgba(255, 255, 255, 0.6)';
    static GRID_POINT_RADIUS = 2.5;

    // 画布ID
    static CANVAS_IDS = {
        EXPLORE: 'gameCanvas',
        CHALLENGE: 'challengeCanvas'
    };

    // 容器ID
    static CONTAINER_IDS = {
        EXPLORE: 'explore-mode',
        CHALLENGE: 'challenge-mode'
    };
}
