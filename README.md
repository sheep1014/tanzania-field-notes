# 野外相遇 · Tanzania Field Notes

手机优先的坦桑尼亚动物摄影收集册。纯静态 HTML/CSS/JavaScript，无追踪、无第三方运行时依赖。

## 内容

23 个动物条目、26 张原始照片的优化版本。哺乳类 16、鸟类 6、爬行类 1。重复物种合并；沙鸡具体种待确认，长颈鹿不细分种或亚种。条目数量不等于经专家审核的物种数量。全部辨认来自照片及旅途背景，AI 辅助整理，可能需要后续校正。

## 本地预览

```sh
python3 -m http.server 8767
```

访问 http://localhost:8767 。不需要 npm install 或构建步骤。

## 更新

编辑 animals.json，每个条目包含 id/name/en/family/category/intro/uncertain/images。category 为 mammal、bird 或 reptile。images 包含 src、thumb、alt。图片以 WebP 保存；导出时不保留 EXIF，不包含原始位置元数据。

GitHub Pages 从 main 分支根目录发布。照片和文字是旅行个人作品，公开可浏览不代表授权转载。

## 辨认与简介参考

- https://www.mammaldiversity.org/taxon/1005942 （非洲金狼分类）
- https://animaldiversity.org/accounts/Syncerus_caffer （非洲水牛）
- https://neprimateconservancy.org/olive-baboon （东非狒狒）
- https://panthera.org/blog-post/wild-cats-101-male-lion-coalitions （雄狮联盟）
- https://felidaefund.org/learn/cats/leopard （花豹）
- https://thebdi.org/2024/06/12/kori-bustard-ardeotis-kori （灰颈鸨）
- https://ielc.libguides.com/sdzg/factsheets/plains_zebra （平原斑马）
- https://ielc.libguides.com/sdzg/factsheets/hippopotamus/diet （河马）
- https://www.britannica.com/animal/bovid （牛科）

这些来源支持分类和生活习性，不等于对每张照片身份的专家确认。
