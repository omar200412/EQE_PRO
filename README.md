Proje Adı: EQE PRO (Energy Quality & Efficiency Professional)
Geliştirici: Ömer Kaya
Versiyon: 1.0.0Tarih: 12 Aralık 2025


1. Proje Özeti
EQE PRO, konut ve küçük işletmeler için geliştirilmiş hibrit bir enerji simülasyon yazılımıdır. Kullanıcıların elektrikli cihazlarını, aydınlatma sistemlerini ve güneş enerjisi (GES) potansiyellerini analiz ederek; fatura tahmini, karbon ayak izi hesabı ve yatırım geri dönüş sürelerini hesaplar. Sistem, hem masaüstü (Windows/Electron) hem de web (Render/React) ortamında çalışabilen çapraz platform (cross-platform) bir mimariye sahiptir.

2. Teknolojik Altyapı
Proje, modern yazılım geliştirme standartlarına uygun olarak aşağıdaki teknolojilerle geliştirilmiştir:

2.1. Frontend (Ön Yüz)
React.js (Vite): Hızlı ve modüler kullanıcı arayüzü oluşturmak için kullanıldı.

Recharts: Verilerin görselleştirilmesi (Pasta ve Sütun grafikleri) için kullanıldı.

Electron.js: Web uygulamasının Windows masaüstü uygulamasına (.exe) dönüştürülmesi için kullanıldı.

CSS3 & Responsive Design: Tüm ekran boyutlarına (Mobil/Tablet/PC) uyumlu tasarım.

2.2. Backend (Arka Yüz)
Python (Flask): RESTful API servislerinin oluşturulması ve matematiksel hesaplamalar için kullanıldı.

SQLAlchemy (SQLite): Kullanıcı verilerinin (cihazlar, ayarlar) yerel veritabanında saklanması için kullanıldı.

Gunicorn: Web sunucusunda (Production) uygulamanın stabil çalışması için kullanıldı.

BÖLÜM 2: KULLANIM KILAVUZU (User Manual)
Hoşgeldiniz! EQE PRO ile enerji tüketiminizi kontrol altına almak ve tasarruf etmek artık çok kolay. Bu kılavuz, programı en verimli şekilde kullanmanız için hazırlanmıştır.

1. Kurulum ve Başlangıç
Masaüstü Sürümü (Windows)
EQE PRO Setup.exe dosyasını çalıştırın ve kurulumu tamamlayın.

Masaüstünde oluşan EQE PRO kısayoluna tıklayın.

(Önemli) Programın hesap yapabilmesi için arka planda Python motorunun çalıştığından emin olun (Web sürümünde buna gerek yoktur).

Web Sürümü
Tarayıcınızdan https://eqe-pro.onrender.com adresine gidin.

Herhangi bir kurulum yapmadan sistemi kullanmaya başlayabilirsiniz.

2. Menü ve Özellikler
🏠 Yönetim Paneli (Dashboard)
Uygulamanın ana ekranıdır.

Mevsim Modu: Sağ üst köşeden "YAZ" veya "KIŞ" modunu seçebilirsiniz.

Özet Kartları: Toplam cihaz sayısı, günlük tüketim ve güneş üretim potansiyeli anlık olarak burada görünür.

⚡ Cihazlar (Devices)
Evinizdeki elektrikli aletleri buraya ekleyin.

Listeden cihaz tipini seçin (Örn: Klima).

Cihazın gücünü (Watt) ve günlük çalışma saatini girin.

"LİSTEYE EKLE +" butonuna basın.

💡 Aydınlatma (Lighting)
Eski ampullerinizi LED ile değiştirirseniz ne kadar tasarruf edeceğinizi hesaplar.

Eski Ampul: Klasik sarı ampulün gücünü girin (Örn: 60W).

Yeni LED: Almayı düşündüğünüz LED ampulü girin (Örn: 9W).

☀️ Güneş Enerjisi (Solar)
Çatınıza kurmak istediğiniz güneş paneli sistemini simüle eder.

Kurulu Güç (kWp): Toplam panel gücünü girin (Örn: 5 kW).

⚙️ Tarife Ayarları (Settings)
Hesaplamaların doğru olması için bölgenizi seçin.

Bölge: Yaşadığınız coğrafi bölgeyi seçin (Güneş verileri buna göre değişir).

Birim Fiyat: Elektrik faturanızdaki birim fiyatı (TL/kWh) girin.

📊 Analiz Raporu (Report)
Tüm verilerin işlendiği sonuç ekranıdır.

Pasta Grafik: Enerjinizin ne kadarını güneşten, ne kadarını şebekeden aldığınızı gösterir.

Fatura Analizi: Güneş enerjisi öncesi ve sonrası faturanızı karşılaştırır.

Karbon İzi: Doğaya salınımını engellediğiniz CO2 miktarını gösterir.

3. Sıkça Sorulan Sorular (SSS)
S: Verilerim kaybolur mu? C: Sol menüdeki "💾 Profili Kaydet" butonuna basarsanız verileriniz veritabanına kaydedilir ve programı kapatsanız bile silinmez.

S: Yaz ve Kış modu neden var? C: Güneş panelleri yazın ve kışın farklı miktarda elektrik üretir. Ayrıca klima/ısıtıcı kullanımı mevsime göre değişir. EQE PRO bu değişkenliği hesaba katar.