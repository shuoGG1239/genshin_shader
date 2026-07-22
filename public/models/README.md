# 本地模型资源

将模型放到本目录后，Vite 会通过 `/models/...` 提供静态访问。

```text
public/models/
  pmx/
    Nahida/                 # PMX + tex
      Nahida_R18_v1.1.pmx
      tex/
      ...
  fbx/
    Nahida/                 # FBX + 官方贴图
      Nahida.fbx
      Avatar_*.png
      ...
```

对应 URL：

- PMX：`/models/pmx/Nahida/Nahida_R18_v1.1.pmx`
- FBX：`/models/fbx/Nahida/Nahida.fbx`
