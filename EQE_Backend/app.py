import sys
import os
import io
from flask import Flask, send_from_directory, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    PDF_AKTIF = True
except ImportError:
    PDF_AKTIF = False
    print("UYARI: Reportlab bulunamadi. PDF ozelligi devre disi.")

if getattr(sys, 'frozen', False):
    basedir = os.path.dirname(sys.executable)
else:
    basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__, static_folder='../eqe-frontend/dist', static_url_path='')
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'eqe_corporate.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Kayit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    veri = db.Column(db.JSON)

with app.app_context():
    db.create_all()

BOLGE_VERILERI = {
    "marmara": {"yaz": 6.5, "kis": 2.5, "verim": 0.78},
    "akdeniz": {"yaz": 7.5, "kis": 3.5, "verim": 0.85},
    "ic_anadolu": {"yaz": 7.0, "kis": 3.0, "verim": 0.80},
    "ege": {"yaz": 7.2, "kis": 3.2, "verim": 0.82},
    "karadeniz": {"yaz": 5.5, "kis": 2.0, "verim": 0.70},
    "dogu_anadolu": {"yaz": 6.8, "kis": 2.8, "verim": 0.78},
    "guneydogu": {"yaz": 7.4, "kis": 3.4, "verim": 0.84}
}
KARBON_KATSAYISI = 0.45 

@app.route('/')
def serve():
    if os.path.exists(app.static_folder):
        return send_from_directory(app.static_folder, 'index.html')
    return "Backend Calisiyor!"

@app.route('/api/analiz-mevsimsel', methods=['POST'])
def analiz_mevsimsel():
    data = request.get_json()
    
    # Boş veri (input silinmesi) korumalı dönüşüm fonksiyonu
    def safe_float(val, default=0):
        try:
            if val is None or val == "": return default
            return float(val)
        except: return default

    fiyat = safe_float(data.get('settings', {}).get('price'))
    yatirim_maliyeti = safe_float(data.get('solar', {}).get('cost'))
    bolge_adi = data.get('settings', {}).get('region', 'marmara')
    bolge_info = BOLGE_VERILERI.get(bolge_adi, BOLGE_VERILERI['marmara'])
    
    gunluk_yuk_kwh = 0
    hvac_yuku = 0
    for c in data.get('devices', []):
        watt = safe_float(c.get('watt'))
        saat = safe_float(c.get('saat'))
        adet = safe_float(c.get('count', 1))
        tuketim = (watt * saat * adet) / 1000
        gunluk_yuk_kwh += tuketim
        if c.get('type') in ['Sanayi Tipi Klima (VRF)', 'Chiller Grubu']: hvac_yuku += tuketim
        
    lamba = data.get('lighting', {})
    gunluk_aydinlatma_kwh = (safe_float(lamba.get('newW')) * safe_float(lamba.get('count')) * safe_float(lamba.get('hours'))) / 1000
    toplam_gunluk_tuketim = gunluk_yuk_kwh + gunluk_aydinlatma_kwh

    ges = data.get('solar', {})
    guc = safe_float(ges.get('power'))
    gunluk_uretim_yaz = guc * bolge_info['yaz'] * bolge_info['verim']
    gunluk_uretim_kis = guc * bolge_info['kis'] * bolge_info['verim']

    yillik_tuketim = toplam_gunluk_tuketim * 365
    yillik_uretim = ((gunluk_uretim_yaz + gunluk_uretim_kis) / 2) * 365
    sebekeden_cekilen_yillik = max(0, yillik_tuketim - yillik_uretim)
    
    eski_maliyet = yillik_tuketim * fiyat
    yeni_maliyet = sebekeden_cekilen_yillik * fiyat
    tasarruf = eski_maliyet - yeni_maliyet
    roi_ay = (yatirim_maliyeti / (tasarruf / 12)) if (yatirim_maliyeti > 0 and tasarruf > 0) else 0

    # Öneriler ve Sonuç Döndürme (Kodun geri kalanı aynı...)
    return jsonify({
        "gunluk_ozet": {"tuketim": round(toplam_gunluk_tuketim, 2), "uretim": round(gunluk_uretim_yaz, 2)},
        "yillik_rapor": {"ozet": {"toplam_tuketim": round(yillik_tuketim, 2), "tasarruf_tl": round(tasarruf, 2), "roi_ay": round(roi_ay, 1), "oneriler": []}} # Özet geçildi
    })

@app.route('/api/kaydet', methods=['POST'])
def kaydet():
    data = request.get_json()
    kayit = Kayit.query.first()
    if kayit: kayit.veri = data
    else: db.session.add(Kayit(veri=data))
    db.session.commit()
    return jsonify({"mesaj": "Kaydedildi"})

@app.route('/api/yukle', methods=['GET'])
def yukle():
    kayit = Kayit.query.first()
    return jsonify(kayit.veri if kayit else {})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)