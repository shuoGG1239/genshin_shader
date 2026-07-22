# Genshin-style Toon Shader (Three.js)

浏览器端原神风格卡通渲染预览（Vite + Three.js）。

> `three@0.171.0`（r172 起官方移除了 `MMDLoader`）

## 目录结构

```text
genshin_shader/
├── index.html              # 页面入口
├── package.json
├── vite.config.js
├── public/
│   └── models/             # 本地模型（gitignore，需自行放置）
│       ├── README.md
│       ├── pmx/Nahida/     # PMX + tex
│       └── fbx/Nahida/     # FBX + 官方贴图
├── src/
│   ├── main.js             # 应用入口
│   ├── config.js           # 路径与模式
│   ├── styles.css          # UI 样式
│   ├── materials/          # 着色器材质
│   ├── assets/             # 贴图加载 / 打包
│   └── ui/                 # 部件显隐等 UI
├── scripts/                # 本地调试脚本
└── debug/                  # 调试截图（gitignore）
```

## 准备模型

见 [`public/models/README.md`](public/models/README.md)。

## 运行

```bash
npm install
npm run dev
```

打开 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

| 模式 | 地址 |
|------|------|
| PMX（默认） | `/?model=pmx` |
| FBX（实验） | `/?model=fbx` |

## 操作

左键旋转 · 右键平移 · 滚轮缩放；左侧面板调节参数与部件显隐。
