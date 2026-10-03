# 링크 공유용 미리보기 이미지(public/og.png, 1200×630)와 앱 아이콘(public/icon-*.png)을 그립니다.
# 실행: python scripts/make-og-image.py   (Windows 의 맑은 고딕 글꼴 사용)
import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public')
FONT_BOLD = 'C:/Windows/Fonts/malgunbd.ttf'
FONT_REG = 'C:/Windows/Fonts/malgun.ttf'
GREEN = (95, 179, 58)
GREEN_DARK = (64, 130, 40)
BG_TOP = (12, 20, 16)
BG_BOTTOM = (18, 56, 34)
CREAM = (250, 246, 232)


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def gradient(w, h, top, bottom):
    img = Image.new('RGB', (w, h), top)
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return img


def draw_ogre(draw, cx, cy, r):
    """단순한 초록 오우거 마스코트 (원작 캐릭터가 아닌 자체 그림)."""
    # 나팔 모양 귀
    for side in (-1, 1):
        ex = cx + side * r * 1.05
        draw.ellipse([ex - r * 0.42, cy - r * 0.5, ex + r * 0.42, cy - r * 0.05], fill=GREEN, outline=GREEN_DARK, width=max(2, r // 30))
        draw.ellipse([ex - r * 0.2, cy - r * 0.42, ex + r * 0.2, cy - r * 0.13], fill=GREEN_DARK)
    # 얼굴
    draw.ellipse([cx - r, cy - r * 0.95, cx + r, cy + r * 0.95], fill=GREEN, outline=GREEN_DARK, width=max(2, r // 30))
    # 눈
    for side in (-1, 1):
        ex = cx + side * r * 0.36
        ey = cy - r * 0.18
        draw.ellipse([ex - r * 0.2, ey - r * 0.22, ex + r * 0.2, ey + r * 0.22], fill=CREAM)
        draw.ellipse([ex - r * 0.09 + side * r * 0.03, ey - r * 0.1, ex + r * 0.09 + side * r * 0.03, ey + r * 0.1], fill=(20, 20, 20))
        draw.ellipse([ex - r * 0.02 + side * r * 0.03, ey - r * 0.07, ex + r * 0.04 + side * r * 0.03, ey - r * 0.01], fill=CREAM)
    # 눈썹
    for side in (-1, 1):
        ex = cx + side * r * 0.36
        draw.line([ex - r * 0.2, cy - r * 0.48, ex + r * 0.2, cy - r * 0.44 + side * 0], fill=GREEN_DARK, width=max(3, r // 14))
    # 코
    draw.ellipse([cx - r * 0.16, cy + r * 0.02, cx + r * 0.16, cy + r * 0.26], fill=GREEN_DARK)
    # 웃는 입
    draw.arc([cx - r * 0.5, cy + r * 0.05, cx + r * 0.5, cy + r * 0.7], start=15, end=165, fill=(40, 30, 30), width=max(4, r // 12))


def translucent_layer(img, paint):
    """반투명 요소는 별도 레이어에 그려서 합성 (PIL 은 바로 그리면 알파 혼합을 안 함)."""
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    paint(ImageDraw.Draw(layer))
    return Image.alpha_composite(img, layer)


def og_image():
    W, H = 1200, 630
    img = gradient(W, H, BG_TOP, BG_BOTTOM).convert('RGBA')

    # 배경에 흐린 수학 기호
    sym_font = font(FONT_BOLD, 170)

    def symbols(d):
        for sym, x, y in [('∑', 40, -30), ('π', 980, -40), ('∫', 1060, 300), ('√', 60, 400), ('∞', 540, 420), ('Δ', 780, 40)]:
            d.text((x, y), sym, font=sym_font, fill=(255, 255, 255, 22))

    img = translucent_layer(img, symbols)

    # 하단 카테고리 칩 (반투명)
    card_font = font(FONT_BOLD, 26)
    labels = ['교육', '입시', '에듀테크', '연구', '해외', '★ 인기']

    def chips(d):
        for i, label in enumerate(labels):
            cx = 470 + i * 118
            d.rounded_rectangle([cx, 560, cx + 106, 604], radius=22, fill=(255, 255, 255, 36))

    img = translucent_layer(img, chips)

    draw = ImageDraw.Draw(img)
    for i, label in enumerate(labels):
        cx = 470 + i * 118
        tw = draw.textlength(label, font=card_font)
        draw.text((cx + 53 - tw / 2, 567), label, font=card_font, fill=CREAM)

    # 마스코트
    draw_ogre(draw, 250, 330, 150)

    # 제목
    title_font = font(FONT_BOLD, 96)
    x, y = 470, 150
    draw.text((x, y), 'Shrek', font=title_font, fill=GREEN)
    w = draw.textlength('Shrek ', font=title_font)
    draw.text((x + w, y), 'Math', font=title_font, fill=CREAM)
    draw.text((x, y + 105), 'News', font=title_font, fill=CREAM)

    # 부제
    sub_font = font(FONT_BOLD, 40)
    draw.text((x, y + 250), '수학 교사를 위한 수학 뉴스 릴스', font=sub_font, fill=(220, 235, 210))
    small_font = font(FONT_REG, 30)
    draw.text((x, y + 310), '매일 07:00 · 14:00 업데이트  ·  뉴스 · 유튜브 인기 · 주제', font=small_font, fill=(170, 200, 160))

    rgb = img.convert('RGB')
    rgb.save(os.path.join(ROOT, 'og.png'), optimize=True)
    # 카카오톡 등 일부 미리보기 봇은 JPG 를 더 안정적으로 가져옴
    rgb.save(os.path.join(ROOT, 'og.jpg'), quality=90, optimize=True)


def icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 5, fill=(18, 56, 34))
    draw_ogre(draw, size // 2, int(size * 0.5), int(size * 0.3))
    f = font(FONT_BOLD, size // 6)
    tw = draw.textlength('∑ Math', font=f)
    draw.text(((size - tw) / 2, size * 0.8), '∑ Math', font=f, fill=CREAM)
    img.save(os.path.join(ROOT, f'icon-{size}.png'), optimize=True)


og_image()
icon(512)
icon(180)
print('public/og.png, icon-512.png, icon-180.png 생성')
