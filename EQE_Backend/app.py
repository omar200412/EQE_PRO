import sys
import os
import io
from flask import Flask, send_from_directory, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

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
    return "Backend Aktif"

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
    
    # Tüketim Analizi
    gunluk_yuk_kwh = 0
    hvac_yuku = 0 
    uretim_yuku = 0
    
    for c in data.get('devices', []):
        try: 
            watt = float(c.get('watt', 0))
            saat = float(c.get('saat', 0))
            adet = float(c.get('count', 1))
            tuketim = (watt * saat * adet) / 1000
            gunluk_yuk_kwh += tuketim
            
            tip = c.get('type')
            if tip in ['Sanayi Tipi Klima (VRF)', 'Chiller Grubu', 'Isıtma Sistemi']:
                hvac_yuku += tuketim   
            elif tip in ['Üretim Bandı', 'CNC Tezgahı', 'Elektrik Motoru']:
                uretim_yuku += tuketim
        except: pass
        
    gunluk_aydinlatma_kwh = 0
    lamba = data.get('lighting', {})
    try: 
        gunluk_aydinlatma_kwh = (float(lamba.get('newW', 0)) * float(lamba.get('count', 0)) * float(lamba.get('hours', 0))) / 1000
    except: pass
    
    toplam_gunluk_tuketim = gunluk_yuk_kwh + gunluk_aydinlatma_kwh

    # Üretim
    ges = data.get('solar', {})
    try:
        guc = float(ges.get('power', 0))
        gunluk_uretim_yaz = guc * bolge_info['yaz'] * bolge_info['verim']
        gunluk_uretim_kis = guc * bolge_info['kis'] * bolge_info['verim']
    except: gunluk_uretim_yaz=0; gunluk_uretim_kis=0

    # Yıllık Hesaplar
    yillik_tuketim = toplam_gunluk_tuketim * 365
    yillik_uretim = ((gunluk_uretim_yaz + gunluk_uretim_kis) / 2) * 365
    net_tuketim_yillik = max(0, yillik_tuketim - yillik_uretim)
    
    eski_maliyet_yillik = yillik_tuketim * fiyat
    yeni_maliyet_yillik = net_tuketim_yillik * fiyat
    yillik_tasarruf = eski_maliyet_yillik - yeni_maliyet_yillik
    
    roi_ay = 0
    if yatirim_maliyeti > 0 and (yillik_tasarruf / 12) > 0:
        roi_ay = yatirim_maliyeti / (yillik_tasarruf / 12)

    # --- ÖNERİ MOTORU (MESAJ GARANTİLİ) ---
    ham_oneriler = []
    
    # 1. Kritik Sorun Kontrolü (Bayrak Sistemi)
    kritik_sorun_var_mi = False

    # HVAC Analizi
    hvac_orani = (hvac_yuku / toplam_gunluk_tuketim * 100) if toplam_gunluk_tuketim > 0 else 0
    if hvac_orani > 45:
        kritik_sorun_var_mi = True
        ham_oneriler.append({"baslik": "İklimlendirme Optimizasyonu", "detay": f"Enerjinin %{int(hvac_orani)}'si soğutmaya gidiyor. Acil izolasyon kontrolü.", "tip": "kritik"})
    
    # ROI Analizi
    if roi_ay > 84: 
        kritik_sorun_var_mi = True
        ham_oneriler.append({"baslik": "Verimsiz Yatırım", "detay": f"ROI Süresi: {int(roi_ay/12)} Yıl. Bu yatırım kârlı değil.", "tip": "kritik"})
    elif roi_ay > 0 and roi_ay < 48:
        ham_oneriler.append({"baslik": "Yüksek Kârlılık", "detay": f"Sistem {int(roi_ay/12)} yıldan kısa sürede kendini ödüyor. Mükemmel proje.", "tip": "basari"})

    # Enerji Karşılama
    karsilama_orani = (yillik_uretim / yillik_tuketim) * 100 if yillik_tuketim > 0 else 0
    if guc > 0:
        if karsilama_orani < 30:
            if not kritik_sorun_var_mi:
                ham_oneriler.append({"baslik": "Kapasite Artırımı", "detay": "Çatı alanınız uygunsa panel ekleyerek verimi artırın.", "tip": "firsat"})
        elif karsilama_orani > 90:
             ham_oneriler.append({"baslik": "Enerji Fazlası", "detay": "Tüketimden fazlasını üretiyorsunuz. Batarya yatırımı düşünebilirsiniz.", "tip": "basari"})
    else:
        ham_oneriler.append({"baslik": "Yeşil Enerji", "detay": "İşletme giderlerini düşürmek için GES kurulumuna başlayın.", "tip": "bilgi"})

    # Bakım (Standart)
    ham_oneriler.append({"baslik": "Periyodik Bakım", "detay": "Panel temizliği verimi %15 artırır. Bakım planı oluşturun.", "tip": "bilgi"})

    # --- ZORLA MESAJ EKLEME (EN ÖNEMLİ KISIM) ---
    # Eğer listede hiç 'Kritik' veya 'Uyarı' yoksa, EN BAŞA başarı mesajı ekle.
    tehlike_var_mi = any(x['tip'] in ['kritik', 'uyari'] for x in ham_oneriler)
    
    if not tehlike_var_mi:
        ham_oneriler.insert(0, {
            "baslik": "✅ SİSTEM MÜKEMMEL ÇALIŞIYOR", 
            "detay": "Tüm parametreler ideal seviyede. Kritik bir enerji kaçağı veya verimsizlik tespit edilmedi.", 
            "tip": "basari"
        })

    # Sıralama ve Temizleme
    nihai_oneriler = []
    eklenen_basliklar = set()
    # Başarı en üste gelsin diye sıralamayı güncelledim
    oncelik_sirasi = {'kritik': 1, 'basari': 2, 'firsat': 3, 'uyari': 4, 'bilgi': 5}
    ham_oneriler.sort(key=lambda x: oncelik_sirasi.get(x['tip'], 6))
    
    for oneri in ham_oneriler:
        if oneri['baslik'] not in eklenen_basliklar:
            nihai_oneriler.append(oneri)
            eklenen_basliklar.add(oneri['baslik'])

    def analiz_yap(gunluk_uret, gun_sayisi):
        toplam_tuketim = toplam_gunluk_tuketim * gun_sayisi
        toplam_uretim = gunluk_uret * gun_sayisi
        sebekeden_cekilen = max(0, toplam_tuketim - toplam_uretim)
        
        eski_maliyet = toplam_tuketim * fiyat
        yeni_maliyet = sebekeden_cekilen * fiyat
        operasyonel_kar = eski_maliyet - yeni_maliyet
        kurtarilan_co2 = toplam_uretim * KARBON_KATSAYISI
        
        return {
            "toplam_tuketim": round(toplam_tuketim, 2),
            "gunes_uretim": round(toplam_uretim, 2),
            "sebekeden_cekilen": round(sebekeden_cekilen, 2),
            "eski_fatura": round(eski_maliyet, 2),
            "yeni_fatura": round(yeni_maliyet, 2),
            "tasarruf_tl": round(operasyonel_kar, 2),
            "roi_ay": round(roi_ay, 1),
            "kurtarilan_karbon": round(kurtarilan_co2, 2),
            "oneriler": nihai_oneriler
        }
    
    yaz_sonuc = analiz_yap(gunluk_uretim_yaz, 30)
    kis_sonuc = analiz_yap(gunluk_uretim_kis, 30)

    return jsonify({
        "gunluk_ozet": {"tuketim": round(toplam_gunluk_tuketim, 2), "uretim": round(gunluk_uretim_yaz, 2)},
        "aylik_rapor": {"yaz": yaz_sonuc, "kis": kis_sonuc},
        "yillik_rapor": {"ozet": analiz_yap((gunluk_uretim_yaz + gunluk_uretim_kis) / 2, 365)}
    })

@app.route('/api/rapor-indir', methods=['POST'])
def rapor_indir():
    data = request.get_json()
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    p.setFont("Helvetica-Bold", 20); p.drawString(50, height-50, "EQE ENTERPRISE | Rapor")
    p.setFont("Helvetica", 10); p.drawString(50, height-70, "Otomatik Enerji Analizi"); p.line(50, height-80, 550, height-80)
    
    ozet = data.get('ozet', {})
    y = height - 120
    p.setFont("Helvetica-Bold", 14); p.drawString(50, y, "Ozet Veriler"); y -= 25; p.setFont("Helvetica", 11)
    items = [f"Gider: {ozet.get('eski_fatura')} TL", f"Kar: {ozet.get('tasarruf_tl')} TL", f"ROI: {ozet.get('roi_ay')} Ay"]
    for i in items: p.drawString(60, y, f"- {i}"); y -= 20
    
    y -= 30; p.setFont("Helvetica-Bold", 14); p.drawString(50, y, "Oneriler"); y -= 25
    for oneri in ozet.get('oneriler', []):
        p.setFont("Helvetica-Bold", 11); p.drawString(60, y, f"[{oneri['tip'].upper()}] {oneri['baslik']}"); y -= 15
        p.setFont("Helvetica", 10); p.drawString(70, y, f"{oneri['detay']}"); y -= 30
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