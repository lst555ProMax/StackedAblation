/**
 * 几何计算工具类
 */
class GeometryUtils {
    /**
     * 计算形状的边界半径
     * @param {string} shapeType - 形状类型
     * @param {number} size - 形状尺寸
     * @param {number} scale - 缩放比例
     * @returns {number} 边界半径
     */
    static getShapeRadius(shapeType, size, scale = 1) {
        switch (shapeType) {
            case Config.SHAPE_TYPES.CIRCLE:
                return size / 2;
            case Config.SHAPE_TYPES.SQUARE:
                return size / Math.sqrt(2);
            case Config.SHAPE_TYPES.TRIANGLE:
                return size * scale / Math.sqrt(3);
            default:
                return size / 2;
        }
    }

    /**
     * 点到点的距离
     * @param {number} x1 - 点1的x坐标
     * @param {number} y1 - 点1的y坐标
     * @param {number} x2 - 点2的x坐标
     * @param {number} y2 - 点2的y坐标
     * @returns {number} 距离
     */
    static distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    /**
     * 将坐标限制在边界内
     * @param {number} value - 要限制的值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 限制后的值
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 将坐标吸附到网格
     * @param {number} coord - 坐标值
     * @param {number} gridSize - 网格大小
     * @returns {number} 吸附后的坐标
     */
    static snapToGrid(coord, gridSize) {
        return Math.round(coord / gridSize) * gridSize;
    }

    /**
     * 检查两个矩形是否相交
     * @param {Object} rect1 - 矩形1 {x, y, width, height}
     * @param {Object} rect2 - 矩形2 {x, y, width, height}
     * @returns {boolean} 是否相交
     */
    static rectanglesIntersect(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    /**
     * 将角度转换为弧度
     * @param {number} degrees - 角度
     * @returns {number} 弧度
     */
    static degreesToRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * 将弧度转换为角度
     * @param {number} radians - 弧度
     * @returns {number} 角度
     */
    static radiansToDegrees(radians) {
        return radians * 180 / Math.PI;
    }
}
