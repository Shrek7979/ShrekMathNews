# data/social.json 의 인스타그램·페이스북 바로가기 카드용 섬네일(public/social/<id>.jpg)을 그립니다.
# 실행: python scripts/make-social-thumbs.py   (social.json 을 고친 뒤 한 번 실행하고 커밋)
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'social')
FONT_BOLD = 'C:/Windows/Fonts/malgunbd.ttf'
W, H = 1200, 675

# 플랫폼 분위기의 색 (공식 로고는 쓰지 않고 글자만 사용)
PALETTE = {
    'Instagram': [(131, 58, 180), (253, 29, 29), (252, 176, 69)],
    'Facebook': [(24, 119, 242), (11, 61, 145), (8, 30, 80)],
    'Reddit': [(255, 87, 0), (200, 50, 0), (90, 20, 0)],
}


def font(size):
    try:
        return ImageFont.truetype(FONT_BOLD, size)
    except OSError:
        return ImageFont.load_default()


def diagonal_gradient(stops):
    img = Image.new('RGB', (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = (x / W + y / H) / 2 * (len(stops) - 1)
            i = min(int(t), len(stops) - 2)
            f = t - i
            px[x, y] = tuple(round(stops[i][c] + (stops[i + 1][c] - stops[i][c]) * f) for c in range(3))
    return img


def fit(draw, text, max_width, start):
    size = start
    while size > 40 and draw.textlength(text, font=font(size)) > max_width:
        size -= 6
    return font(size)


def make(card):
    img = diagonal_gradient(PALETTE[card['platform']]).convert('RGBA')
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for sym, x, y in [('∑', 40, 360), ('π', 960, -60), ('∞', 760, 380)]:
        d.text((x, y), sym, font=font(300), fill=(255, 255, 255, 30))
    img = Image.alpha_composite(img, layer)

    # 카드에서는 세로로 긴 칸에 맞춰 좌우가 잘리므로, 글자는 가운데 760px 안에만 둠
    draw = ImageDraw.Draw(img)
    SAFE = 760

    def centered(text, y, f):
        draw.text(((W - draw.textlength(text, font=f)) / 2, y), text, font=f, fill=(255, 255, 255))

    centered(card['platform'], 110, font(64))
    label_font = fit(draw, card['label'], SAFE, 170)
    centered(card['label'], 250 + (170 - label_font.size) / 2, label_font)
    centered('인기 수학 콘텐츠', 500, font(46))

    img.convert('RGB').save(os.path.join(OUT, card['id'] + '.jpg'), quality=88, optimize=True)


os.makedirs(OUT, exist_ok=True)
cards = json.load(open(os.path.join(ROOT, 'data', 'social.json'), encoding='utf8'))
# 레딧 글은 대부분 이미지가 없어 공용 섬네일 한 장을 씀 (scripts/thumbs.mjs 참고)
cards.append({'id': 'reddit', 'platform': 'Reddit', 'label': 'r/math'})
for card in cards:
    make(card)
# capture-social.mjs 가 찍어 둔 화면 캡처(PNG)가 있으면 가벼운 JPG(<id>.cap.jpg)로 바꿔 둠
import glob
for png in glob.glob(os.path.join(OUT, '*.png')):
    Image.open(png).convert('RGB').resize((W, H), Image.LANCZOS).save(png[:-4] + '.cap.jpg', quality=85, optimize=True)
    os.remove(png)
print(len(cards), 'thumbnails ->', 'public/social/')
