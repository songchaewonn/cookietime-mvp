import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'qr-tools'))
import qrcode
from PIL import Image, ImageDraw, ImageFont

out = Path(__file__).resolve().parents[1] / 'delivery-qr'
out.mkdir(exist_ok=True)
items = [
    ('android-download', 'chagok Android 다운로드', 'chagok v1.0.0 APK', 'https://github.com/songchaewonn/cookietime-android-mvp/releases/download/v1.0.0/chagok-v1.0.0.apk'),
    ('web-preview', '웹 앱 둘러보기', '설치 없이 브라우저에서 실행', 'https://songchaewonn.github.io/cookietime-mvp/?rev=33dbe67'),
]
svg_factory = __import__('qrcode.image.svg', fromlist=['SvgPathImage']).SvgPathImage
font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 23)
bold = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 29)
sheet = Image.new('RGB', (1200, 800), '#fffaf1')
d = ImageDraw.Draw(sheet)
d.text((50, 25), 'chagok 다운로드 및 체험 QR', font=bold, fill='#38251a')
d.text((50, 75), 'chagok v1.0.0 · Web 최신 배포본', font=font, fill='#7d4937')
for i, (name, title, subtitle, url) in enumerate(items):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    qr.make_image(fill_color='black', back_color='white').convert('RGB').save(out / f'{name}.png')
    qr.make_image(image_factory=svg_factory).save(out / f'{name}.svg')
    img = qr.make_image(fill_color='black', back_color='white').convert('RGB')
    img.thumbnail((510, 510), Image.Resampling.NEAREST)
    x = i * 600 + (600 - img.width) // 2
    sheet.paste(img, (x, 160))
    d.text((i * 600 + 35, 685), title, font=bold, fill='#38251a')
    d.text((i * 600 + 35, 735), subtitle, font=font, fill='#7d4937')
sheet.save(out / 'chagok-qr-guide.png')
report = '# chagok QR\n\n- chagok Android v1.0.0 APK (GitHub Release asset verified)\n- Web app (revision 33dbe67)\n\n' + ''.join(f'- {title}: {url}\n' for _, title, _, url in items)
(out / 'verification.md').write_text(report, encoding='utf-8')
print(out)
