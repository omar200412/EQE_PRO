import os
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

# --- FLASK AYARLARI ---
app = Flask(__name__, static_folder='../eqe-frontend/dist', static_url_path='')
CORS(app)

# --- VERİTABANI ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'eqe.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Kayit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    veri = db.Column(db.JSON)

with app.app_context():
    db.create_all()

# --- ANA SAYFA ROTASI ---
@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

# --- DİĞER HER ŞEY ---
@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')

# --- API ENDPOINTLERİ ---
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

@app.route('/api/analiz-mevsimsel', methods=['POST'])
def analiz_mevsimsel():
    data = request.get_json()
    try: fiyat = float(data.get('settings', {}).get('price', 0))
    except: fiyat = 0
    bolge_adi = data.get('settings', {}).get('region', 'marmara')
    bolge_info = BOLGE_VERILERI.get(bolge_adi, BOLGE_VERILERI['marmara'])
    
    gunluk_tuketim_kwh = 0
    for c in data.get('devices', []):
        try: gunluk_tuketim_kwh += (float(c.get('watt', 0)) * float(c.get('saat', 0))) / 1000
        except: pass
    lamba = data.get('lighting', {})
    try: gunluk_tuketim_kwh += (float(lamba.get('newW', 0)) * float(lamba.get('count', 0)) * float(lamba.get('hours', 0))) / 1000
    except: pass
    
    ges = data.get('solar', {})
    try:
        guc = float(ges.get('power', 0))
        gunluk_uretim_yaz = guc * bolge_info['yaz'] * bolge_info['verim']
        gunluk_uretim_kis = guc * bolge_info['kis'] * bolge_info['verim']
    except: gunluk_uretim_yaz=0; gunluk_uretim_kis=0

    def analiz_yap(gunluk_uret, gun_sayisi):
        toplam_tuketim = gunluk_tuketim_kwh * gun_sayisi
        toplam_uretim = gunluk_uret * gun_sayisi
        net_tuketim = toplam_tuketim - toplam_uretim
        sebekeden_cekilen = net_tuketim if net_tuketim > 0 else 0
        return {
            "toplam_tuketim": round(toplam_tuketim, 2),
            "gunes_uretim": round(toplam_uretim, 2),
            "sebekeden_cekilen": round(sebekeden_cekilen, 2),
            "eski_fatura": round(toplam_tuketim * fiyat, 2),
            "yeni_fatura": round(sebekeden_cekilen * fiyat, 2),
            "tasarruf_tl": round((toplam_tuketim * fiyat) - (sebekeden_cekilen * fiyat), 2),
            "karbon": round(sebekeden_cekilen * KARBON_KATSAYISI, 2),
            "kurtarilan_karbon": round(toplam_uretim * KARBON_KATSAYISI, 2)
        }

    return jsonify({
        "gunluk_ozet": {"tuketim": round(gunluk_tuketim_kwh, 2), "uretim_yaz": round(gunluk_uretim_yaz, 2), "uretim_kis": round(gunluk_uretim_kis, 2)},
        "aylik_rapor": {"yaz": analiz_yap(gunluk_uretim_yaz, 30), "kis": analiz_yap(gunluk_uretim_kis, 30)},
        "yillik_rapor": {"ozet": analiz_yap((gunluk_uretim_yaz + gunluk_uretim_kis) / 2, 365)}
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
    
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)