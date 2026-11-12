import math
from PIL import Image, ImageDraw, ImageFont

BRAND_YELLOW = "#FFC600"
DARK = "#1a1a1a"


def card_canvas(size):
    """Geel vierkant met een donker afgerond 'kaartje' erin (iOS-icoonstijl)."""
    img = Image.new("RGB", (size, size), BRAND_YELLOW)
    d = ImageDraw.Draw(img)
    pad = size * 0.13
    d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=size * 0.13, fill=DARK)
    return img, d, pad, size - pad


def draw_lines(d, left, top, right, bottom, n, color):
    height = bottom - top
    gap = height / n
    line_w = max(2, int((bottom - top) * 0.045))
    for i in range(n):
        y = top + gap * (i + 0.5)
        d.rounded_rectangle([left, y - line_w / 2, right, y + line_w / 2], radius=line_w / 2, fill=color)


def make_bonnetjes_icon(size, path):
    img, d, c0, c1 = card_canvas(size)
    inset = (c1 - c0) * 0.16
    draw_lines(d, c0 + inset, c0 + inset, c1 - inset, c1 - inset, 5, BRAND_YELLOW)
    img.save(path, "PNG")


def make_declaraties_icon(size, path):
    img, d, c0, c1 = card_canvas(size)
    card = c1 - c0
    inset = card * 0.16
    # regels boven-links
    draw_lines(d, c0 + inset, c0 + inset, c1 - inset, c0 + inset + card * 0.40, 3, BRAND_YELLOW)
    # eurosymbool rechtsonder
    euro_size = card * 0.46
    try:
        font = ImageFont.truetype("arialbd.ttf", int(euro_size))
    except Exception:
        font = ImageFont.load_default()
    ex = c1 - inset - euro_size * 0.28
    ey = c1 - inset - euro_size * 0.32
    d.text((ex, ey), "€", fill=BRAND_YELLOW, font=font, anchor="rm")
    img.save(path, "PNG")


def make_kilometers_icon(size, path):
    """Locatiepin-icoon voor de kilometer-declaratie tool."""
    img, d, c0, c1 = card_canvas(size)
    card = c1 - c0
    cx = c0 + card / 2
    r = card * 0.22
    cy = c0 + card * 0.32
    # ronde bovenkant van de pin
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BRAND_YELLOW)
    # spitse onderkant van de pin
    tip_y = c0 + card * 0.82
    point_w = r * 0.95
    d.polygon([(cx - point_w, cy + r * 0.35), (cx + point_w, cy + r * 0.35), (cx, tip_y)], fill=BRAND_YELLOW)
    # gat in het midden (donker) voor het klassieke pin-uiterlijk
    hole_r = r * 0.42
    d.ellipse([cx - hole_r, cy - hole_r, cx + hole_r, cy + hole_r], fill=DARK)
    img.save(path, "PNG")


def make_reglementen_icon(size, path):
    """Document met vergrootglas — voor de doorzoekbare reglementen/CAO-tool."""
    img, d, c0, c1 = card_canvas(size)
    card = c1 - c0
    inset = card * 0.16
    draw_lines(d, c0 + inset, c0 + inset, c1 - inset, c0 + inset + card * 0.36, 3, BRAND_YELLOW)

    r = card * 0.19
    cx = c1 - inset - r - card * 0.03
    cy = c1 - inset - r - card * 0.03
    ring_w = max(2, int(card * 0.045))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=BRAND_YELLOW, width=ring_w)

    angle = math.radians(45)
    hx0 = cx + r * 0.8 * math.cos(angle)
    hy0 = cy + r * 0.8 * math.sin(angle)
    hx1 = cx + r * 1.7 * math.cos(angle)
    hy1 = cy + r * 1.7 * math.sin(angle)
    d.line([hx0, hy0, hx1, hy1], fill=BRAND_YELLOW, width=ring_w + 1)
    img.save(path, "PNG")


def make_stortingen_icon(size, path):
    """Stortingsslip (twee regels) met munt en pijl omlaag — voor de stortingen-tool."""
    img, d, c0, c1 = card_canvas(size)
    card = c1 - c0
    inset = card * 0.16
    draw_lines(d, c0 + inset, c0 + inset, c1 - inset, c0 + inset + card * 0.22, 2, BRAND_YELLOW)

    cx = c0 + card / 2
    cy = c0 + card * 0.64
    r = card * 0.21
    ring_w = max(2, int(card * 0.045))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=BRAND_YELLOW, width=ring_w)
    # pijl omlaag in de munt
    d.line([cx, cy - r * 0.5, cx, cy + r * 0.15], fill=BRAND_YELLOW, width=ring_w)
    d.polygon([(cx - r * 0.42, cy + r * 0.05), (cx + r * 0.42, cy + r * 0.05), (cx, cy + r * 0.55)], fill=BRAND_YELLOW)
    img.save(path, "PNG")


def make_bracket_icon(size, path):
    """Hoofdicoon voor IB Toolbox: vereenvoudigde versie van het Installatiebalie-beeldmerk
    ( [ ] -haakjes ) in geel op de donkere kaart, als één polygoon per haakje (geen naden)."""
    img, d, c0, c1 = card_canvas(size)
    card = c1 - c0
    bar = card * 0.14
    arm = card * 0.20
    h = card * 0.62
    top = c0 + (card - h) / 2
    bottom = top + h
    gap = card * 0.22
    mid_x = c0 + card / 2

    # linkerhaakje "["
    x0 = mid_x - gap / 2 - bar
    left_bracket = [
        (x0, top), (x0 + arm, top), (x0 + arm, top + bar), (x0 + bar, top + bar),
        (x0 + bar, bottom - bar), (x0 + arm, bottom - bar), (x0 + arm, bottom), (x0, bottom),
    ]
    d.polygon(left_bracket, fill=BRAND_YELLOW)

    # rechterhaakje "]" (spiegelbeeld)
    x1 = mid_x + gap / 2 + bar
    right_bracket = [
        (x1, top), (x1 - arm, top), (x1 - arm, top + bar), (x1 - bar, top + bar),
        (x1 - bar, bottom - bar), (x1 - arm, bottom - bar), (x1 - arm, bottom), (x1, bottom),
    ]
    d.polygon(right_bracket, fill=BRAND_YELLOW)
    img.save(path, "PNG")


for size in (192, 512):
    make_bracket_icon(size, f"icon-{size}.png")
    make_bonnetjes_icon(size, f"icon-bonnetjes-{size}.png")
    make_declaraties_icon(size, f"icon-declaraties-{size}.png")
    make_kilometers_icon(size, f"icon-kilometers-{size}.png")
    make_reglementen_icon(size, f"icon-reglementen-{size}.png")
    make_stortingen_icon(size, f"icon-stortingen-{size}.png")

print("done")
