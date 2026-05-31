import urllib.request
import urllib.parse
import json
import sys

# Windows konsol UTF-8 uyumluluğu için
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

tokens = {
    'Müşteri Botu': '8587001060:AAFERyJdonIX2M0K7zF2R7Yc6swKXdWIiKM',
    'Satıcı Botu': '8668097109:AAEp2DQuBzemUBukYp2W3nMElma3U8eAUjc',
    'Planlayıcı Bot': '8367884891:AAG6FryO4uuIKsvHgK4GboWbKs-5Ee2TveI',
    'CEO Rapor Bot': '8445617696:AAFKxPoP9woJWCQqFEakf-9daNusvt5p1MI',
    'Koç Botu': '8670813204:AAFBFTv3UAwWWg0QFuiXOAoBKhgYx14ksE0'
}

chat_id = '1190118497'

print("BROADCASTING TELEGRAM TEST MESSAGES:")

for name, token in tokens.items():
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': f"[ATLAS CANLI DOGRULAMA] Mimar, ben QA_TEST_AJANI. Bu test mesaji size {name} uzerinden gonderilmistir. Telegram entegrasyonu tamamen operasyoneldir!"
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            ok = res_data.get('ok')
            print(f"[OK] {name} gonderildi: {ok}")
    except Exception as e:
        print(f"[ERROR] {name} HATA: {e}")
