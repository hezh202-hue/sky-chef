"""构建游戏用的 3D 图标（来自微软 Fluent Emoji，MIT 许可）。

用法（需要联网，Python 3.9+ 和 Pillow）：
    py -3.13 tools/build_emoji.py

流程：
1. 读取 tools/emoji-sources.json（emoji → Fluent 仓库里的 3D 图片路径）
2. 从 GitHub 下载 256px 原图，缩到 128px，存成 WebP 放到 assets/emoji/<码点>.webp
3. 生成 js/emoji-assets.js，登记有哪些 emoji 有图（游戏里查不到的会退回系统 emoji）

新增 emoji 时：在 emoji-sources.json 里加一行，再运行本脚本。
"""
import concurrent.futures
import io
import json
import os
import urllib.parse
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_RAW = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/'
SIZE = 128  # 设备格最大约 40px，3 倍屏下 120px 足够清晰
OUT_DIR = os.path.join(ROOT, 'assets', 'emoji')


def key_of(emoji):
    """文件名：去掉变体选择符 FE0F 后的码点，用 - 连接（与 js/ui.js 里的 emojiKey 保持一致）"""
    return '-'.join(f'{ord(c):x}' for c in emoji if c != '️')


def build_one(item):
    emoji, path = item
    url = REPO_RAW + urllib.parse.quote(path)
    with urllib.request.urlopen(url, timeout=30) as r:
        data = r.read()
    img = Image.open(io.BytesIO(data)).convert('RGBA')
    img.thumbnail((SIZE, SIZE), Image.LANCZOS)
    dest = os.path.join(OUT_DIR, key_of(emoji) + '.webp')
    img.save(dest, 'WEBP', quality=86, method=6)
    return key_of(emoji), os.path.getsize(dest)


def main():
    sources = json.load(open(os.path.join(ROOT, 'tools', 'emoji-sources.json'), encoding='utf-8'))
    os.makedirs(OUT_DIR, exist_ok=True)
    keys, total = [], 0
    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        for key, size in pool.map(build_one, sources.items()):
            keys.append(key)
            total += size
    keys.sort()
    with open(os.path.join(ROOT, 'js', 'emoji-assets.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('// 由 tools/build_emoji.py 生成，请勿手改：有 3D 图标的 emoji（码点，去掉 FE0F）\n')
        f.write('(function (root) {\n  const SC = (root.SC = root.SC || {});\n')
        f.write('  SC.EMOJI_ASSETS = new Set(' + json.dumps(keys) + ');\n')
        f.write("})(typeof window !== 'undefined' ? window : globalThis);\n")
    print(f'{len(keys)} 个图标，共 {total / 1024:.0f} KB')


if __name__ == '__main__':
    main()
