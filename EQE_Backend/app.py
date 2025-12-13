import sys
import os
import io
from flask import Flask, send_from_directory, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

# --- ÇÖKME KORUMASI (CRASH PROTECTION) ---
# Reportlab varsa yükle, yoksa hata verme, sadece not et.
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    PDF_AKTIF = True
except ImportError:
    PDF_AKTIF = False
    print("UYARI: Reportlab bulunamadi. PDF ozelligi devre disi, ama site calisacak.")

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

# --- VERİLER ---
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
    return f"Backend Calisiyor! PDF Durumu: {'AKTIF' if PDF_AKTIF else 'PASIF'}"

@app.errorhandler(404)
def not_found(e):
    if os.path.exists(app.static_folder):
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify({"error": "Bulunamadi"}), 404

@app.route('/api/analiz-mevsimsel', methods=['POST'])
def analiz_mevsimsel():
    data = request.get_json()
    
    try: fiyat = float(data.get('settings', {}).get('price', 0))
    except: fiyat = 0
    try: yatirim_maliyeti = float(data.get('solar', {}).get('cost', 0))
    except: yatirim_maliyeti = 0

    bolge_adi = data.get('settings', {}).get('region', 'marmara')
    bolge_info = BOLGE_VERILERI.get(bolge_adi, BOLGE_VERILERI['marmara'])
    
    # Hesaplamalar
    gunluk_yuk_kwh = 0
    hvac_yuku = 0
    for c in data.get('devices', []):
        try: 
            watt = float(c.get('watt', 0))
            saat = float(c.get('saat', 0))
            adet = float(c.get('count', 1))
            tuketim = (watt * saat * adet) / 1000
            gunluk_yuk_kwh += tuketim
            if c.get('type') in ['Sanayi Tipi Klima (VRF)', 'Chiller Grubu']: hvac_yuku += tuketim
        except: pass
        
    gunluk_aydinlatma_kwh = 0
    lamba = data.get('lighting', {})
    try: gunluk_aydinlatma_kwh = (float(lamba.get('newW', 0)) * float(lamba.get('count', 0)) * float(lamba.get('hours', 0))) / 1000
    except: pass
    
    toplam_gunluk_tuketim = gunluk_yuk_kwh + gunluk_aydinlatma_kwh

    ges = data.get('solar', {})
    try:
        guc = float(ges.get('power', 0))
        gunluk_uretim_yaz = guc * bolge_info['yaz'] * bolge_info['verim']
        gunluk_uretim_kis = guc * bolge_info['kis'] * bolge_info['verim']
    except: gunluk_uretim_yaz=0; gunluk_uretim_kis=0

    yillik_tuketim = toplam_gunluk_tuketim * 365
    yillik_uretim = ((gunluk_uretim_yaz + gunluk_uretim_kis) / 2) * 365
    sebekeden_cekilen_yillik = max(0, yillik_tuketim - yillik_uretim)
    
    eski_maliyet = yillik_tuketim * fiyat
    yeni_maliyet = sebekeden_cekilen_yillik * fiyat
    tasarruf = eski_maliyet - yeni_maliyet
    
    roi_ay = 0
    if yatirim_maliyeti > 0 and (tasarruf / 12) > 0: roi_ay = yatirim_maliyeti / (tasarruf / 12)

    # Öneriler
    ham_oneriler = []
    
    hvac_orani = (hvac_yuku / toplam_gunluk_tuketim * 100) if toplam_gunluk_tuketim > 0 else 0
    if hvac_orani > 45: ham_oneriler.append({"baslik": "İklimlendirme Uyarısı", "detay": "Soğutma gideri yüksek.", "tip": "kritik"})
    
    if roi_ay > 84: ham_oneriler.append({"baslik": "Verimsiz Yatırım", "detay": "ROI süresi uzun.", "tip": "uyari"})
    elif roi_ay > 0 and roi_ay < 60: ham_oneriler.append({"baslik": "Yüksek Kârlılık", "detay": "Hızlı amortisman.", "tip": "basari"})

    karsilama = (yillik_uretim / yillik_tuketim) * 100 if yillik_tuketim > 0 else 0
    if guc > 0:
        if karsilama < 30: ham_oneriler.append({"baslik": "Kapasite Artırımı", "detay": "Panel ekleyin.", "tip": "firsat"})
        elif karsilama > 90: ham_oneriler.append({"baslik": "Enerji Fazlası", "detay": "Batarya düşünün.", "tip": "basari"})
    else: ham_oneriler.append({"baslik": "Yeşil Enerji", "detay": "GES kurun.", "tip": "bilgi"})

    ham_oneriler.append({"baslik": "Bakım", "detay": "Panelleri temizleyin.", "tip": "bilgi"})

    # GARANTİ MESAJ
    if not any(x['tip'] in ['kritik', 'uyari'] for x in ham_oneriler):
        ham_oneriler.insert(0, {"baslik": "SİSTEM MÜKEMMEL ÇALIŞIYOR", "detay": "Her şey yolunda.", "tip": "basari"})

    oncelik = {'kritik': 1, 'basari': 2, 'firsat': 3, 'uyari': 4, 'bilgi': 5}
    ham_oneriler.sort(key=lambda x: oncelik.get(x['tip'], 6))
    
    nihai = []
    seen = set()
    for o in ham_oneriler:
        if o['baslik'] not in seen: nihai.append(o); seen.add(o['baslik'])

    def analiz_yap(gunluk_uret, gun_sayisi):
        toplam_t = toplam_gunluk_tuketim * gun_sayisi
        toplam_u = gunluk_uret * gun_sayisi
        sebeke = max(0, toplam_t - toplam_u)
        eski = toplam_t * fiyat
        yeni = sebeke * fiyat
        kar = eski - yeni
        co2 = toplam_u * KARBON_KATSAYISI
        
        return {
            "toplam_tuketim": round(toplam_t, 2), "gunes_uretim": round(toplam_u, 2), "sebekeden_cekilen": round(sebeke, 2),
            "eski_fatura": round(eski, 2), "yeni_fatura": round(yeni, 2), "tasarruf_tl": round(kar, 2),
            "roi_ay": round(roi_ay, 1), "kurtarilan_karbon": round(co2, 2), "oneriler": nihai
        }
    
    return jsonify({
        "gunluk_ozet": {"tuketim": round(toplam_gunluk_tuketim, 2), "uretim": round(gunluk_uretim_yaz, 2)},
        "aylik_rapor": {"yaz": analiz_yap(gunluk_uretim_yaz, 30), "kis": analiz_yap(gunluk_uretim_kis, 30)},
        "yillik_rapor": {"ozet": analiz_yap((gunluk_uretim_yaz+gunluk_uretim_kis)/2, 365)}
    })

@app.route('/api/rapor-indir', methods=['POST'])
def rapor_indir():
    # BURAYA DİKKAT: Eğer PDF kütüphanesi yoksa hata verme, uyarı dön.
    if not PDF_AKTIF:
        return jsonify({"error": "Sunucuda PDF modulu eksik oldugu icin rapor olusturulamadi."}), 500

    data = request.get_json()
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    p.setFont("Helvetica-Bold", 20); p.drawString(50, height-50, "EQE ENTERPRISE"); p.line(50, height-60, 550, height-60)
    
    ozet = data.get('ozet', {})
    y = height - 100
    p.setFont("Helvetica", 12)
    items = [f"Gider: {ozet.get('eski_fatura')} TL", f"Kar: {ozet.get('tasarruf_tl')} TL", f"ROI: {ozet.get('roi_ay')} Ay"]
    for i in items: p.drawString(50, y, f"- {i}"); y -= 20
    
    y -= 20
    for oneri in ozet.get('oneriler', []):
        p.drawString(50, y, f"[{oneri['tip'].upper()}] {oneri['baslik']}"); y -= 20
        if y < 50: p.showPage(); y = height - 50

    p.save(); buffer.seek(0); return send_file(buffer, as_attachment=True, download_name='Rapor.pdf', mimetype='application/pdf')

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