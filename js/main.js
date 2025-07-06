/**
 * 主入口文件
 * 初始化游戏管理器和全局状态
 */

// 初始化游戏管理器
window.addEventListener('DOMContentLoaded', () => {
    window.gameManager = new GameManager();
    
    // 为了向后兼容，保留原有的全局变量
    window.exploreGame = window.gameManager.exploreGame;
    window.challengeGame = window.gameManager.challengeGame;
    window.game = window.gameManager.currentGame;
    
    console.log('🎮 Stacked Ablation Game v2.0.0 已初始化');
    console.log('📁 项目结构已重新组织完成');
});