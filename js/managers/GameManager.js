/**
 * 游戏管理器 - 替代全局变量管理
 */
class GameManager {
    constructor() {
        this.exploreGame = null;
        this.challengeGame = null;
        this.currentGame = null;
        this.init();
    }

    init() {
        this.exploreGame = new Game(Config.CANVAS_IDS.EXPLORE);
        this.challengeGame = new Game(Config.CANVAS_IDS.CHALLENGE);
        this.currentGame = this.exploreGame;
    }

    switchMode(mode) {
        this.currentGame = mode === 'explore' ? this.exploreGame : this.challengeGame;
    }

    clearShapes() {
        this.currentGame?.clearShapes();
    }

    clearExploreShapes() {
        this.exploreGame?.clearShapes();
    }

    clearChallengeShapes() {
        this.challengeGame?.clearShapes();
    }
}
