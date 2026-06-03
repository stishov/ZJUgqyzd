# 浙江大学国旗仪仗队 - 图片存储与展示平台

## 项目简介

这是浙江大学国旗仪仗队的图片存储与展示平台的 GitHub Pages 静态版本。该平台用于记录和展示国旗仪仗队的发展历程，保存珍贵的影像资料。

## 功能特点

- **三维度分类系统**：按时间、事件、地点三个维度浏览图片
- **响应式设计**：适配桌面端和移动端
- **图片筛选**：支持多条件组合筛选
- **搜索功能**：按标题和描述搜索图片
- **图片详情**：查看图片详细信息、下载和分享

## 文件结构

```
docs/
├── index.html      # 主页面
├── styles.css      # 样式文件
├── app.js          # JavaScript 逻辑
└── README.md       # 说明文档
```

## 部署到 GitHub Pages

### 方法一：直接部署

1. 将 `docs` 文件夹中的所有文件上传到你的 GitHub 仓库
2. 在 GitHub 仓库设置中，找到 "Pages" 选项
3. 在 "Source" 下选择 `main` 分支，文件夹选择 `/docs`
4. 点击 "Save"，等待部署完成
5. 访问 `https://你的用户名.github.io/仓库名/` 查看网站

### 方法二：使用 GitHub Actions 自动部署

1. 在仓库根目录创建 `.github/workflows/deploy.yml` 文件：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

2. 推送代码到 GitHub
3. 在仓库设置中启用 GitHub Pages，选择 `gh-pages` 分支

## 自定义配置

### 修改图片数据

编辑 `app.js` 文件中的 `mockImages` 数组，添加或修改图片数据：

```javascript
const mockImages = [
  {
    id: 1,
    title: '图片标题',
    description: '图片描述',
    year: '2024',
    event: '升旗仪式',
    location: '紫金港校区',
    views: 1234,
    downloads: 56,
    image: '图片URL'
  },
  // 更多图片...
];
```

### 修改样式

编辑 `styles.css` 文件中的 CSS 变量来自定义主题颜色：

```css
:root {
  --primary-color: #c41e3a;    /* 主色调 */
  --primary-dark: #a01830;     /* 深色 */
  --primary-light: #e63950;    /* 浅色 */
  --secondary-color: #1a1a2e;  /* 次要颜色 */
}
```

### 添加真实图片

将图片上传到图床（如 GitHub Issues、Imgur、阿里云 OSS 等），然后在 `mockImages` 中使用图片 URL。

## 技术栈

- **HTML5** - 页面结构
- **CSS3** - 样式和动画
- **JavaScript (ES6+)** - 交互逻辑
- **Font Awesome** - 图标库

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 许可证

本项目仅供浙江大学国旗仪仗队内部使用，未经授权不得用于商业用途。

## 联系方式

- 邮箱：flag-guard@zju.edu.cn
- 地址：浙江省杭州市西湖区余杭塘路866号