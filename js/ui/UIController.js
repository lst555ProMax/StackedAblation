/**
 * UI 控制器
 */
class UIController {
    static switchMode(mode) {
        const exploreMode = document.getElementById(Config.CONTAINER_IDS.EXPLORE);
        const challengeMode = document.getElementById(Config.CONTAINER_IDS.CHALLENGE);
        const buttons = document.querySelectorAll('.mode-button');
        
        this.clearActiveStates(buttons);
        
        if (mode === 'explore') {
            this.showExploreMode(exploreMode, challengeMode, buttons);
        } else {
            this.showChallengeMode(exploreMode, challengeMode, buttons);
        }
        
        // 通知游戏管理器切换模式
        window.gameManager?.switchMode(mode);
    }

    static clearActiveStates(buttons) {
        buttons.forEach(btn => btn.classList.remove('active'));
    }

    static showExploreMode(exploreMode, challengeMode, buttons) {
        exploreMode.classList.remove('hidden');
        challengeMode.classList.add('hidden');
        buttons[0].classList.add('active');
    }

    static showChallengeMode(exploreMode, challengeMode, buttons) {
        exploreMode.classList.add('hidden');
        challengeMode.classList.remove('hidden');
        buttons[1].classList.add('active');
    }

    static clearShapes() {
        window.gameManager?.clearExploreShapes();
    }

    static clearChallengeShapes() {
        window.gameManager?.clearChallengeShapes();
    }
}

// 全局函数，保持向后兼容
function switchMode(mode) {
    UIController.switchMode(mode);
}

function clearShapes() {
    UIController.clearShapes();
}

function clearChallengeShapes() {
    UIController.clearChallengeShapes();
}
