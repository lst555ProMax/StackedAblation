# 项目文件结构说明

## 📁 文件夹组织

```
js/
├── core/                   # 核心业务逻辑
│   ├── Config.js          # 配置常量管理
│   └── Shape.js           # 形状基础类
│
├── managers/              # 管理器类
│   ├── EventHandler.js   # 事件处理管理器
│   ├── GameManager.js     # 游戏管理器
│   └── Renderer.js        # 渲染管理器
│
├── utils/                 # 工具类
│   ├── AblationCalculator.js  # 消融算法计算器
│   └── GeometryUtils.js   # 几何计算工具
│
├── ui/                    # 用户界面控制
│   └── UIController.js    # UI控制器
│
├── Game.js               # 游戏主类
└── main.js               # 主入口文件
```

## 📋 文件功能说明

### 🔧 核心层 (core/)
- **Config.js**: 统一管理所有游戏配置常量，包括画布尺寸、形状类型、移动参数等
- **Shape.js**: 定义形状基础类，包含几何属性和碰撞检测逻辑

### 🎮 管理器层 (managers/)
- **EventHandler.js**: 处理所有用户交互事件（鼠标、键盘），负责事件分发和处理
- **GameManager.js**: 管理游戏实例，替代全局变量，提供模式切换功能
- **Renderer.js**: 负责Canvas渲染操作，包括形状绘制、网格显示等

### 🛠️ 工具层 (utils/)
- **AblationCalculator.js**: 实现消融效果的核心算法，包括奇偶规则计算和XOR优化
- **GeometryUtils.js**: 提供几何计算工具方法，如距离计算、边界检测、坐标变换等

### 🎨 界面层 (ui/)
- **UIController.js**: 控制用户界面交互，处理模式切换和按钮操作

### 🎯 主要文件
- **Game.js**: 游戏主控制类，协调各个组件，管理游戏状态
- **main.js**: 应用程序入口，初始化游戏管理器和全局状态

## 🔄 依赖关系

```
main.js
    ↓
GameManager.js → Game.js
                    ↓
                EventHandler.js
                Renderer.js
                AblationCalculator.js
                    ↓
                Shape.js
                GeometryUtils.js
                Config.js
```

## 📦 模块化优势

1. **职责分离**: 每个文件夹负责特定功能领域
2. **易于维护**: 相关代码集中在同一文件夹
3. **扩展性**: 新功能可以按类别添加到对应文件夹
4. **代码复用**: 工具类可以被多个模块共享
5. **清晰架构**: 分层结构便于理解和调试

## 🚀 加载顺序

HTML中的脚本按以下顺序加载：
1. 配置和核心类
2. 工具类
3. 管理器类
4. 游戏主类
5. UI控制器
6. 主入口

这样确保了依赖关系的正确性和初始化顺序。
