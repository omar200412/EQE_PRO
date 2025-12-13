import { useState, useEffect } from 'react';
import AnalysisResults from './AnalysisResults';

function App() {
  const [theme, setTheme] = useState('dark');
  const [region, setRegion] = useState('marmara');
  const [price, setPrice] = useState(3.50); 
  
  // Envanter
  const [devices, setDevices] = useState([]);
  const [newDevice, setNewDevice] = useState({ type: 'Sanayi Tipi Klima (VRF)', watt: 4500, saat: 10, count: 1 });
  
  const [solar, setSolar] = useState({ power: 0, cost: 0 }); 
  const [lighting, setLighting] = useState({ oldW: 40, newW: 18, count: 100, hours: 10 }); 
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('eqe-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('eqe-theme', newTheme);
  };

  const addDevice = () => {
    setDevices([...devices, { ...newDevice, id: Date.now() }]);
  };

  const removeDevice = (id) => {
    setDevices(devices.filter(d => d.id !== id));
  };

  // --- KAYDETME VE YÜKLEME FONKSİYONLARI (YENİ) ---
  const saveProfile = async () => {
    try {
      let host = window.location.hostname || '127.0.0.1';
      const payload = { settings: { region, price }, devices, solar, lighting };
      
      const res = await fetch(`http://${host}:5000/api/kaydet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) alert("✅ Proje Başarıyla Kaydedildi!");
    } catch (e) { alert("Kaydetme Hatası!"); }
  };

  const loadProfile = async () => {
    try {
      let host = window.location.hostname || '127.0.0.1';
      const res = await fetch(`http://${host}:5000/api/yukle`);
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
            setRegion(data.settings.region);
            setPrice(data.settings.price);
        }
        if (data.devices) setDevices(data.devices);
        if (data.solar) setSolar(data.solar);
        if (data.lighting) setLighting(data.lighting);
        alert("📂 Proje Yüklendi!");
      }
    } catch (e) { alert("Yükleme Hatası!"); }
  };

  const calculate = async () => {
    setLoading(true);
    try {
      let host = window.location.hostname || '127.0.0.1';
      const apiUrl = `http://${host}:5000/api/analiz-mevsimsel`;
      const payload = { settings: { region, price }, devices, solar, lighting };

      const res = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("API Hatası");
      const data = await res.json();
      setResults(data);
    } catch (err) { alert("Sunucu Bağlantı Hatası"); } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      
      {/* HEADER */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '30px', paddingBottom: '20px', 
        borderBottom: '1px solid var(--header-border)'
      }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
           <div style={{
             background: 'linear-gradient(135deg, #0f172a, #334155)', 
             width:'60px', height:'60px', borderRadius:'8px', 
             display:'flex', alignItems:'center', justifyContent:'center', fontSize:'30px', color:'white', border:'1px solid #475569'
           }}>🏢</div>
           <div>
             <h1 style={{margin:0, fontSize:'1.8rem', color:'var(--text-color)', letterSpacing:'-1px'}}>EQE ENTERPRISE</h1>
             <span style={{fontSize:'0.9rem', color:'var(--secondary-text)', textTransform:'uppercase', letterSpacing:'1px'}}>Kurumsal Enerji Yönetim Platformu</span>
           </div>
        </div>

        <div style={{display:'flex', gap:'10px'}}>
            {/* KAYDET / YÜKLE BUTONLARI */}
            <button onClick={saveProfile} className="card" style={{padding:'8px 16px', cursor:'pointer', marginBottom:0, background:'var(--accent-color)', color:'white', border:'none'}}>💾 Kaydet</button>
            <button onClick={loadProfile} className="card" style={{padding:'8px 16px', cursor:'pointer', marginBottom:0}}>📂 Yükle</button>
            <button onClick={toggleTheme} className="card" style={{padding: '8px 16px', cursor: 'pointer', marginBottom: 0}}>
            {theme === 'dark' ? '☀️' : '🌙'}
            </button>
        </div>
      </header>

      {/* INPUT ALANLARI */}
      <div className="grid-2">
        <div>
          {/* TESİS */}
          <div className="card">
            <h3>🏭 Tesis Ayarları</h3>
            <div className="grid-2">
              <div>
                <label>Bölge / Lokasyon</label>
                <select value={region} onChange={e => setRegion(e.target.value)}>
                  <option value="marmara">Marmara Bölgesi</option>
                  <option value="ege">Ege Bölgesi</option>
                  <option value="akdeniz">Akdeniz Bölgesi</option>
                  <option value="ic_anadolu">İç Anadolu Bölgesi</option>
                  <option value="karadeniz">Karadeniz Bölgesi</option>
                  <option value="dogu_anadolu">Doğu Anadolu Bölgesi</option>
                  <option value="guneydogu">Güneydoğu Anadolu</option>
                </select>
              </div>
              <div>
                <label>Birim Fiyat (TL/kWh)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ENVANTER */}
          <div className="card">
            <h3>⚙️ Ekipman Envanteri</h3>
            <div className="grid-2">
              <div>
                <label>Ekipman Tipi</label>
                <select value={newDevice.type} onChange={e => setNewDevice({...newDevice, type: e.target.value})}>
                  <option>Sanayi Tipi Klima (VRF)</option>
                  <option>Chiller Grubu</option>
                  <option>Sunucu Kabini (Rack)</option>
                  <option>Üretim Bandı</option>
                  <option>CNC Tezgahı</option>
                  <option>Elektrik Motoru</option>
                  <option>Ofis PC</option>
                  <option>Diğer Endüstriyel Yük</option>
                </select>
              </div>
              <div>
                <label>Güç (Watt)</label>
                <input type="number" value={newDevice.watt} onChange={e => setNewDevice({...newDevice, watt: Number(e.target.value)})} />
              </div>
            </div>
            <div className="grid-2">
                <div><label>Saat/Gün</label><input type="number" value={newDevice.saat} onChange={e => setNewDevice({...newDevice, saat: Number(e.target.value)})} /></div>
                <div><label>Adet</label><input type="number" value={newDevice.count} onChange={e => setNewDevice({...newDevice, count: Number(e.target.value)})} /></div>
            </div>
            <button className="btn-primary" onClick={addDevice} style={{background:'#334155'}}>+ ENVANTERE EKLE</button>

            {devices.length > 0 && (
              <div style={{marginTop: '20px', borderTop: '1px solid var(--card-border)', paddingTop: '10px'}}>
                <h4 style={{color: 'var(--secondary-text)', fontSize:'0.9rem'}}>EKLENENLER</h4>
                {devices.map(d => (
                  <div key={d.id} style={{display:'flex', justifyContent:'space-between', padding:'12px', background:'var(--input-bg)', marginBottom:'5px', borderRadius:'4px', alignItems:'center', borderLeft:'3px solid var(--accent-color)'}}>
                    <span><b>{d.count}x {d.type}</b> <br/><small style={{opacity:0.7}}>{d.watt}W / {d.saat} Saat</small></span>
                    <button onClick={() => removeDevice(d.id)} style={{color:'var(--danger-color)', background:'none', border:'none', cursor:'pointer'}}>Sil</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {/* AYDINLATMA */}
          <div className="card">
            <h3>💡 Aydınlatma Altyapısı</h3>
            <div className="grid-2">
              <div><label>Mevcut Armatür (W)</label><input type="number" value={lighting.oldW} onChange={e => setLighting({...lighting, oldW: Number(e.target.value)})} /></div>
              <div><label>LED Panel (W)</label><input type="number" value={lighting.newW} onChange={e => setLighting({...lighting, newW: Number(e.target.value)})} /></div>
            </div>
            <div className="grid-2">
              <div><label>Toplam Adet</label><input type="number" value={lighting.count} onChange={e => setLighting({...lighting, count: Number(e.target.value)})} /></div>
              <div><label>Saat/Gün</label><input type="number" value={lighting.hours} onChange={e => setLighting({...lighting, hours: Number(e.target.value)})} /></div>
            </div>
          </div>

          {/* GES */}
          <div className="card">
            <h3>☀️ Yenilenebilir Enerji (GES)</h3>
            <label>Planlanan Kurulu Güç (kWp)</label>
            <input type="number" placeholder="Örn: 50" value={solar.power} onChange={e => setSolar({...solar, power: Number(e.target.value)})} />
            <label>Yatırım Bütçesi / CAPEX (TL)</label>
            <input type="number" placeholder="Örn: 1000000" value={solar.cost} onChange={e => setSolar({...solar, cost: Number(e.target.value)})} />
          </div>

          {/* ANALİZ BUTONU */}
          <button 
            className="btn-primary pulse-btn" 
            style={{marginTop:'20px', fontSize:'1.2rem', padding:'20px', background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)', letterSpacing: '1px'}} 
            onClick={calculate}
          >
            {loading ? 'ANALİZ EDİLİYOR...' : '🚀 SİMÜLASYONU BAŞLAT'}
          </button>
        </div>
      </div>

      {results && (
        <div style={{marginTop: '40px'}}>
          <AnalysisResults data={results} />
        </div>
      )}

    </div>
  );
}

export default App;