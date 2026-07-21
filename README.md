# Genshin-style Toon Shader (Three.js)

浏览器端原神风格卡通渲染预览（Three.js + Vite）。

> 使用 `three@0.171.0`（r172 起官方移除了 `MMDLoader`）。

## 功能

- PMX：双层软阴影、冷色阴影、边缘光、高光、描边
- FBX（实验）：官方 Diffuse / ILM / Ramp 贴图管线（需本地资源）
- 部件显隐、参数调节

## 准备本地模型（不入库）

模型体积大且涉及版权，已加入 `.gitignore`，请自行放到项目根目录：

```text
genshin_shader/
  Nahida_R18_MDJSN_edit_v1.1/   # PMX + tex/
  Nahida_unity/Nahida/          # Nahida.fbx + 官方贴图
```

## 运行

```bash
npm install
npm run dev
```

打开 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

- 默认 PMX：`?model=pmx`
- 实验 FBX：`?model=fbx` 或面板切换

## 操作

- 左键旋转 · 右键平移 · 滚轮缩放
- 左侧面板调节阴影 / 边缘光 / 高光 / 描边 / 部件显示

## 说明

仅供个人学习研究，请勿商用。模型资源请自行合法获取，勿上传至公开仓库。
