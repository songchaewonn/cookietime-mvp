import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'qr-tools'))
import qrcode
from PIL import Image, ImageDraw, ImageFont

out = Path('delivery-qr')
out.mkdir(exist_ok=True)
items = [
    ('android-download', '안드로이드 APK 다운로드', 'Latest Android v0.3.2', 'https://github.com/songchaewonn/cookietime-android-mvp/releases/download/v0.3.2/CookieTime-v0.3.2.apk'),
    ('web-download', '웹 버전 소스 다운로드', '최신 main 브랜치 · ZIP 파일', 'https://github.com/songchaewonn/cookietime-mvp/archive/refs/heads/main.zip'),
    ('web-preview', '웹 앱 둘러보기', '설치 없이 브라우저에서 실행', 'https://songchaewonn.github.io/cookietime-mvp/'),
]
font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 23)
bold = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 29)
sheet = Image.new('RGB', (1800, 800), '#fffaf1')
d = ImageDraw.Draw(sheet)
d.text((50, 25), 'CookieTime 다운로드 및 체험 QR', font=bold, fill='#38251a')
d.text((50, 75), '2026-11-18 | Android v0.3.2 - latest changes published', font=font, fill='#7d4937')
for i, (name, title, subtitle, url) in enumerate(items):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white').convert('RGB')
    img.save(out / f'{name}.png')
    qr.make_image(image_factory=__import__('qrcode.image.svg', fromlist=['SvgPathImage']).SvgPathImage).save(out / f'{name}.svg')
    img.thumbnail((510, 510), Image.Resampling.NEAREST)
    x = i * 600 + (600 - img.width) // 2
    sheet.paste(img, (x, 160))
    d.text((i * 600 + 35, 685), title, font=bold, fill='#38251a')
    d.text((i * 600 + 35, 735), subtitle, font=font, fill='#7d4937')
sheet.save(out / 'cookietime-qr-guide.png')
report = '''# CookieTime v0.3.2 deployment verified

Android main/tag: 06a3c175befaf1e0592ffea020121c462359e9a4
Web source: 90d1cd77315d94c0d85d3a7fe13f7332b006fdee
GitHub release build: success (44113548084)
26 tests passed. Downloaded public APK SHA256 verified; all bundled web assets matched after line-ending normalization.
APK SHA256: 84d1259b41da4887b9b9eeb358d99e401d734ddb67804829b7d941a2f1ce9546
Direct-install debug build. Physical Android/Bluetooth testing not performed.

'''
for name, title, subtitle, url in items:
    report += f'- {title}: {url}\n'
(out / 'verification.md').write_text(report, encoding='utf-8')
print(str(out.resolve()))
