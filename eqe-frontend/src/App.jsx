import { useState, useEffect } from 'react'
import AnalysisResults from './AnalysisResults'
import './App.css'

function App() {
  const [tab, setTab] = useState("dashboard")
  const [menuOpen, setMenuOpen] = useState(false)
  
  // STATE
  const [devices, setDevices] = useState([])
  const [newDev, setNewDev] = useState({ tip: 'TV', watt: '', saat: '' })
  const [lighting, setLighting] = useState({ count: '', oldW: '', newW: '', hours: '' })
  const [solar, setSolar] = useState({ power: '', cost: '' })
  const [settings, setSettings] = useState({ region: 'marmara', price: '' })
  const [result, setResult] = useState(null)
  
  const [season, setSeason] = useState(() => {
      const month = new Date().getMonth(); 
      if (month >= 9 || month <= 2) return "kis";
      return "yaz";
  })

  // --- AKILLI API ADRESİ ---
  const getApiUrl = (endpoint) => {
      let host = window.location.hostname;
      if (!host || host === '') {
          host = '127.0.0.1';
      }
      
      return `http://${host}:5000/api/${endpoint}`;
  }

  // --- API FONKSİYONLARI ---
  const veriKaydet = async () => {
      const tumVeriler = { devices, lighting, solar, settings };
      try {
          await fetch(getApiUrl('kaydet'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tumVeriler)
          });
          alert("✅ Veriler Başarıyla Kaydedildi!");
      } catch (err) { alert("Hata! Backend çalışıyor mu?"); }
  }

  const veriYukle = async () => {
      try {
          const res = await fetch(getApiUrl('yukle'));
          const data = await res.json();
          if(data && Object.keys(data).length > 0) {
              if(data.devices) setDevices(data.devices);
              if(data.lighting) setLighting(data.lighting);
              if(data.solar) setSolar(data.solar);
              if(data.settings) setSettings(data.settings);
          }
      } catch (err) { console.log(err); }
  }

  const calculate = async () => {
    const fix = (v) => v ? parseFloat(v.toString().replace(',', '.')) : 0;
    const payload = {
        devices: devices.map(d => ({ ...d, watt: fix(d.watt), saat: fix(d.saat) })),
        lighting: { ...lighting, newW: fix(lighting.newW), count: fix(lighting.count), hours: fix(lighting.hours) },
        solar: { ...solar, power: fix(solar.power) },
        settings: { ...settings, price: fix(settings.price) }
    };

    try {
      const res = await fetch(getApiUrl('analiz-mevsimsel'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      setResult(data)
    } catch (err) { console.error(err) }
  }

  useEffect(() => { veriYukle(); }, [])
  useEffect(() => { calculate(); }, [devices, lighting, solar, settings])

  const addDevice = () => {
    if(!newDev.watt || !newDev.saat) return alert("Bilgileri giriniz.");
    setDevices([...devices, { ...newDev, id: Date.now() }]);
    setNewDev({...newDev, watt: '', saat: ''});
  }
  const deleteDevice = (id) => setDevices(devices.filter(d => d.id !== id));
  const today = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleMenuClick = (targetTab) => {
      setTab(targetTab);
      setMenuOpen(false); 
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: #09090b; font-family: 'Outfit', sans-serif; color: #e4e4e7; max-width: none !important; display: block !important; }
        
        .bg-orb { position: fixed; top: -20%; left: -10%; width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(0,0,0,0) 70%); z-index: 0; pointer-events: none; animation: float 20s infinite ease-in-out; }
        .bg-orb-2 { position: fixed; bottom: -20%; right: -10%; width: 60vw; height: 60vw; background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(0,0,0,0) 70%); z-index: 0; pointer-events: none; animation: float 25s infinite ease-in-out reverse; }
        @keyframes float { 0% { transform: translate(0, 0); } 50% { transform: translate(50px, 50px); } 100% { transform: translate(0, 0); } }

        .app-container { display: flex; width: 100vw; height: 100vh; position: relative; z-index: 1; }
        
        .sidebar { 
            width: 280px; height: 100vh; 
            background: rgba(9, 9, 11, 0.95);
            backdrop-filter: blur(12px); border-right: 1px solid rgba(255,255,255,0.05); 
            display: flex; flex-direction: column; padding: 25px; flex-shrink: 0; 
            overflow-y: auto;
            transition: transform 0.3s ease-in-out;
            z-index: 1000;
        }

        .main { flex: 1; width: 100%; height: 100vh; padding: 40px; overflow-y: auto; position: relative; }

        .mobile-menu-btn {
            display: none; position: fixed; top: 15px; left: 15px; z-index: 2000;
            background: #7c3aed; color: white; border: none; padding: 10px 15px; border-radius: 8px;
            font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }

        @media (max-width: 768px) {
            .app-container { flex-direction: column; }
            .sidebar {
                position: fixed; top: 0; left: 0; width: 85%; max-width: 300px; height: 100%;
                transform: translateX(-100%);
                box-shadow: 10px 0 30px rgba(0,0,0,0.5);
            }
            .sidebar.open { transform: translateX(0); }
            .main { width: 100%; padding: 20px; padding-top: 70px; }
            .mobile-menu-btn { display: block; }
            .grid-3, .grid-2 { grid-template-columns: 1fr; }
            .overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 900; }
            .overlay.active { display: block; }
        }

        .brand { font-size: 1.8rem; font-weight: 800; text-align: center; margin-bottom: 30px; background: linear-gradient(90deg, #fff, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .menu-cat { color: #52525b; font-size: 0.7rem; font-weight: 700; margin: 20px 0 10px 10px; letter-spacing: 1.5px; text-transform: uppercase; }
        .menu-item { padding: 12px 15px; margin-bottom: 5px; cursor: pointer; border-radius: 12px; color: #a1a1aa; transition: 0.3s; font-weight: 500; display: flex; align-items: center; gap: 12px; font-size: 0.95rem; border: 1px solid transparent; }
        .menu-item:hover { background: rgba(255,255,255,0.03); color: #fff; transform: translateX(5px); }
        .menu-item.active { background: rgba(139, 92, 246, 0.15); color: #c4b5fd; border-color: rgba(139, 92, 246, 0.2); box-shadow: 0 0 20px rgba(139, 92, 246, 0.1); }
        .card { background: rgba(24, 24, 27, 0.6); backdrop-filter: blur(10px); padding: 30px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5); transition: 0.4s ease; margin-bottom: 25px; }
        .hover-glow:hover { transform: translateY(-5px); border-color: rgba(139, 92, 246, 0.3); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.6), 0 0 20px rgba(139, 92, 246, 0.1); }
        .inp-group { margin-bottom: 15px; } label { display: block; margin-bottom: 8px; font-size: 0.85rem; color: #a1a1aa; font-weight: 600; }
        .inp { width: 100%; padding: 14px; background: rgba(0,0,0,0.3); border: 1px solid #27272a; color: white; border-radius: 12px; outline: none; transition: 0.3s; font-family: 'Outfit', sans-serif; }
        .inp:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2); }
        .btn { padding: 14px; width: 100%; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); border: none; color: white; border-radius: 12px; cursor: pointer; font-weight: 700; transition: 0.3s; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3); }
        .btn:hover { transform: scale(1.02); box-shadow: 0 8px 25px rgba(124, 58, 237, 0.5); }
        .save-btn { background: #27272a; color: #fff; border: 1px solid #3f3f46; margin-bottom: 20px; }
        .save-btn:hover { background: #3f3f46; border-color: #52525b; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; }
        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 25px; }
        .fade-in { animation: fadeIn 0.6s ease-out forwards; opacity: 0; transform: translateY(10px); } @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="bg-orb"></div> <div className="bg-orb-2"></div>

      <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✖' : '☰'}
      </button>

      <div className={`overlay ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen(false)}></div>

      <div className="app-container">
        <div className={`sidebar ${menuOpen ? 'open' : ''}`}>
          <div className="brand">EQE <span style={{fontWeight:300, color:'white'}}>PRO</span></div>
          <button className="btn save-btn" onClick={veriKaydet}>💾 Profili Kaydet</button>
          <div className="menu-cat">GENEL</div>
          <div className={`menu-item ${tab==='dashboard'?'active':''}`} onClick={()=>handleMenuClick('dashboard')}>🏠 Yönetim Paneli</div>
          <div className="menu-cat">VERİ GİRİŞİ</div>
          <div className={`menu-item ${tab==='devices'?'active':''}`} onClick={()=>handleMenuClick('devices')}>⚡ Cihazlar</div>
          <div className={`menu-item ${tab==='lighting'?'active':''}`} onClick={()=>handleMenuClick('lighting')}>💡 Aydınlatma</div>
          <div className={`menu-item ${tab==='solar'?'active':''}`} onClick={()=>handleMenuClick('solar')}>☀️ Güneş Enerjisi</div>
          <div className="menu-cat">SİSTEM</div>
          <div className={`menu-item ${tab==='settings'?'active':''}`} onClick={()=>handleMenuClick('settings')}>⚙️ Tarife Ayarları</div>
          <div className={`menu-item ${tab==='report'?'active':''}`} onClick={()=>handleMenuClick('report')}>📊 Analiz Raporu</div>
        </div>

        <div className="main">
          {tab === 'dashboard' && (
            <div className="fade-in">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'40px', flexWrap:'wrap'}}>
                  <div>
                      <h1 style={{margin:0, fontSize:'2rem', fontWeight:800, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>
                           EQE PRO Yönetim Paneli 
                      </h1>
                      <p style={{color:'#71717a', fontSize:'1rem', marginTop:'5px'}}>Tüm enerji verileri başarıyla yüklendi.</p>
                  </div>
                  <div style={{background:'rgba(255,255,255,0.05)', padding:'10px 20px', borderRadius:'30px', border:'1px solid rgba(255,255,255,0.1)', color:'#e4e4e7', fontWeight:600, marginTop:'10px'}}>📅 {today} <span style={{opacity:0.5, marginLeft:'10px'}}>|</span> <span style={{color: season === 'kis' ? '#38bdf8' : '#fbbf24', marginLeft:'10px'}}>{season.toUpperCase()} MODU</span></div>
              </div>
              <div className="grid-3">
                 <div className="card hover-glow"><div style={{color:'#a1a1aa', fontSize:'0.9rem', fontWeight:600, marginBottom:'10px'}}>EKLİ CİHAZLAR</div><div style={{fontSize:'3.5rem', fontWeight:800, color:'#c4b5fd'}}>{devices.length}</div><div style={{color:'#71717a'}}>Aktif cihaz sayısı</div></div>
                 <div className="card hover-glow"><div style={{color:'#a1a1aa', fontSize:'0.9rem', fontWeight:600, marginBottom:'10px'}}>GÜNLÜK TÜKETİM</div><div style={{fontSize:'3.5rem', fontWeight:800, color:'#f87171'}}>{result ? result.gunluk_ozet.tuketim : 0}</div><div style={{color:'#71717a'}}>kWh / Gün</div></div>
                 <div className="card hover-glow"><div style={{color:'#a1a1aa', fontSize:'0.9rem', fontWeight:600, marginBottom:'10px'}}>GÜNEŞ KAPASİTESİ</div><div style={{fontSize:'3.5rem', fontWeight:800, color:'#4ade80'}}>{result ? (season==='yaz' ? result.gunluk_ozet.uretim_yaz : result.gunluk_ozet.uretim_kis) : 0}</div><div style={{color:'#71717a'}}>kWh / Gün ({season})</div></div>
              </div>
            </div>
          )}

          {tab === 'devices' && (
             <div className="grid-2 fade-in">
                <div className="card"><h2 style={{marginTop:0, marginBottom:'20px'}}>🔌 Cihaz Ekle</h2><div className="inp-group"><label>Cihaz Tipi</label><select className="inp" value={newDev.tip} onChange={e=>setNewDev({...newDev, tip: e.target.value})}><option>TV</option><option>Buzdolabı</option><option>Klima</option><option>Bilgisayar</option><option>Fırın</option><option>Çamaşır Mak.</option></select></div><div style={{display:'flex', gap:'15px'}}><div className="inp-group" style={{flex:1}}><label>Güç (Watt)</label><input type="number" className="inp" placeholder="Örn: 2000" value={newDev.watt} onChange={e=>setNewDev({...newDev, watt: e.target.value})} /></div><div className="inp-group" style={{flex:1}}><label>Süre (Saat/Gün)</label><input type="number" className="inp" placeholder="Örn: 5" value={newDev.saat} onChange={e=>setNewDev({...newDev, saat: e.target.value})} /></div></div><button className="btn" onClick={addDevice} style={{marginTop:'10px'}}>LİSTEYE EKLE +</button></div>
                <div className="card"><h2 style={{marginTop:0}}>📋 Cihaz Listesi</h2><div style={{maxHeight:'400px', overflowY:'auto', paddingRight:'10px'}}>{devices.length===0 ? <p style={{color:'#52525b', textAlign:'center', marginTop:'50px'}}>Liste boş.</p> : devices.map(d => (<div key={d.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px', background:'rgba(255,255,255,0.03)', marginBottom:'10px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.05)'}}><div><div style={{fontWeight:700, color:'white'}}>{d.tip}</div><div style={{fontSize:'0.85rem', color:'#a1a1aa'}}>{d.watt}W | {d.saat} Saat/Gün</div></div><button onClick={()=>deleteDevice(d.id)} style={{background:'rgba(248, 113, 113, 0.1)', color:'#f87171', border:'none', padding:'8px 12px', borderRadius:'8px', cursor:'pointer'}}>Sil</button></div>))}</div></div>
             </div>
          )}

          {tab === 'lighting' && ( <div className="card fade-in" style={{maxWidth:'600px'}}><h2 style={{marginTop:0}}>💡 Aydınlatma Analizi</h2><div className="inp-group"><label>Toplam Lamba Sayısı</label><input type="number" className="inp" placeholder="Adet" value={lighting.count} onChange={e=>setLighting({...lighting, count: e.target.value})} /></div><div style={{display:'flex', gap:'20px'}}><div className="inp-group" style={{flex:1}}><label>Eski Ampul (Watt)</label><input type="number" className="inp" placeholder="60" value={lighting.oldW} onChange={e=>setLighting({...lighting, oldW: e.target.value})} /></div><div className="inp-group" style={{flex:1}}><label>Yeni LED (Watt)</label><input type="number" className="inp" placeholder="9" value={lighting.newW} onChange={e=>setLighting({...lighting, newW: e.target.value})} /></div></div><div className="inp-group"><label>Günlük Yanma Süresi (Saat)</label><input type="number" className="inp" placeholder="5" value={lighting.hours} onChange={e=>setLighting({...lighting, hours: e.target.value})} /></div></div> )}
          {tab === 'solar' && ( <div className="card fade-in" style={{maxWidth:'600px'}}><h2 style={{marginTop:0}}>☀️ Güneş Enerjisi (GES)</h2><div className="inp-group"><label>Kurulu Güç (kWp)</label><input type="number" className="inp" placeholder="Örn: 5" value={solar.power} onChange={e=>setSolar({...solar, power: e.target.value})} /></div><div className="inp-group"><label>Tahmini Maliyet (TL)</label><input type="number" className="inp" placeholder="Opsiyonel" value={solar.cost} onChange={e=>setSolar({...solar, cost: e.target.value})} /></div></div> )}
          {tab === 'settings' && ( <div className="card fade-in" style={{maxWidth:'600px'}}><h2 style={{marginTop:0}}>⚙️ Tarife Ayarları</h2><div className="inp-group"><label>Bölge</label><select className="inp" value={settings.region} onChange={e=>setSettings({...settings, region: e.target.value})}><option value="marmara">Marmara</option><option value="akdeniz">Akdeniz</option><option value="ic_anadolu">İç Anadolu</option><option value="ege">Ege</option><option value="karadeniz">Karadeniz</option><option value="dogu_anadolu">Doğu Anadolu</option><option value="guneydogu">Güneydoğu Anadolu</option></select></div><div className="inp-group"><label>Birim Fiyat (TL/kWh)</label><input type="number" className="inp" placeholder="2.5" value={settings.price} onChange={e=>setSettings({...settings, price: e.target.value})} /></div></div> )}
          {tab === 'report' && ( <div className="fade-in"><div style={{textAlign:'right', marginBottom:'20px'}}><button onClick={()=>setSeason('yaz')} style={{background: season==='yaz' ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: season==='yaz'?'black':'#a1a1aa', border:'none', padding:'10px 25px', borderRadius:'30px', fontWeight:'bold', cursor:'pointer', marginRight:'10px', transition:'0.3s'}}>☀️ YAZ</button><button onClick={()=>setSeason('kis')} style={{background: season==='kis' ? '#0ea5e9' : 'rgba(255,255,255,0.1)', color: season==='kis'?'white':'#a1a1aa', border:'none', padding:'10px 25px', borderRadius:'30px', fontWeight:'bold', cursor:'pointer', transition:'0.3s'}}>❄️ KIŞ</button></div><AnalysisResults data={result ? result.aylik_rapor[season] : null} season={season} /></div> )}
        </div>
      </div>
    </>
  )
}

export default App