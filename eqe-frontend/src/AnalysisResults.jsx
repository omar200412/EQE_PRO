import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, CartesianGrid 
} from 'recharts';

function AnalysisResults({ data }) {
  const [mode, setMode] = useState('yaz');
  const [animate, setAnimate] = useState(false);

  useEffect(() => { setAnimate(true); }, []);

  const activeData = mode === 'yaz' ? data.aylik_rapor.yaz : data.aylik_rapor.kis;
  
  const chartData = [
    { name: 'Tüketim', deger: activeData.toplam_tuketim, fill: '#64748b' },
    { name: 'Üretim', deger: activeData.gunes_uretim, fill: '#10b981' },
    { name: 'Şebeke', deger: activeData.sebekeden_cekilen, fill: '#ef4444' }
  ];

  const chartSolarValue = activeData.gunes_uretim > activeData.toplam_tuketim 
      ? activeData.toplam_tuketim 
      : activeData.gunes_uretim;
  
  const pieData = [
    { name: 'Yeşil Enerji', value: chartSolarValue },
    { name: 'Şebeke', value: activeData.sebekeden_cekilen }
  ];
  
  const COLORS = ['#10b981', '#ef4444'];
  const treeCount = activeData.kurtarilan_karbon ? (activeData.kurtarilan_karbon / 20).toFixed(1) : 0;
  
  const totalConsumption = activeData.toplam_tuketim > 0 ? activeData.toplam_tuketim : 1;
  let rawSolarPercentage = Math.round((activeData.gunes_uretim / totalConsumption) * 100);
  const displayPercentage = Math.min(100, rawSolarPercentage);
  const gridPercentage = Math.round((activeData.sebekeden_cekilen / totalConsumption) * 100);
  
  let efficiencyIndex = displayPercentage;

  const mainMessage = (activeData.oneriler && activeData.oneriler.length > 0)
      ? activeData.oneriler[0] 
      : { baslik: "Analiz Bekleniyor", detay: "Henüz yeterli veri girişi yapılmadı.", tip: "bilgi" };

  const getBannerStyle = (tip) => {
      switch(tip) {
          case 'kritik': return { bg: '#ef4444', icon: '🚨', text: 'white', border: '#b91c1c' };
          case 'uyari': return { bg: '#f59e0b', icon: '⚠️', text: 'black', border: '#d97706' };
          case 'firsat': return { bg: '#3b82f6', icon: '💡', text: 'white', border: '#2563eb' };
          case 'basari': return { bg: '#10b981', icon: '✅', text: 'white', border: '#059669' };
          default: return { bg: '#1e293b', icon: 'ℹ️', text: 'white', border: '#334155' };
      }
  };
  const bannerStyle = getBannerStyle(mainMessage.tip);

  // --- URL DÜZELTMESİ YAPILDI (Sadece /api/...) ---
  const downloadPDF = async () => {
    try {
      const apiUrl = '/api/rapor-indir'; // DÜZELDİ: http://localhost YOK
      
      const response = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ozet: activeData })
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = "EQE_Rapor.pdf";
        document.body.appendChild(a); a.click(); a.remove();
      } else {
        alert("PDF oluşturulurken bir hata oluştu.");
      }
    } catch (e) { alert("Sunucu hatası: PDF indirilemedi."); }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const color = payload[0].payload.fill || COLORS[0];
      return (
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: `1px solid ${color}`, padding: '12px', borderRadius: '8px', color:'white' }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{label || payload[0].name}</p>
          <p style={{ margin: 0, fontSize:'1.1rem' }}>{`${payload[0].value.toFixed(1)} kWh`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`fade-in`} style={{opacity: animate ? 1 : 0}}>
      
      {/* SİSTEM DURUM PANELI */}
      <div style={{
          backgroundColor: bannerStyle.bg, 
          color: bannerStyle.text,
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '30px',
          border: `2px solid ${bannerStyle.border}`,
          boxShadow: '0 10px 30px -5px rgba(0,0,0,0.4)',
          transform: 'scale(1.02)'
      }}>
          <div style={{fontSize: '3.5rem', lineHeight: 1}}>{bannerStyle.icon}</div>
          <div>
              <h2 style={{margin: 0, fontSize: '1.6rem', textTransform: 'uppercase', fontWeight:'800', letterSpacing:'1px'}}>
                  {mainMessage.baslik}
              </h2>
              <p style={{margin: '5px 0 0 0', opacity: 0.9, fontSize: '1.1rem', fontWeight:'500'}}>
                  {mainMessage.detay}
              </p>
          </div>
      </div>

      {/* HEADER */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'20px', marginBottom:'30px', background: 'var(--card-bg)', padding:'25px', borderRadius:'16px', border:'1px solid var(--card-border)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div style={{position:'relative', width:'70px', height:'70px'}}>
                <svg width="70" height="70" viewBox="0 0 100 100" style={{transform:'rotate(-90deg)'}}>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#334155" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke={efficiencyIndex > 50 ? '#10b981' : '#f59e0b'} strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * efficiencyIndex / 100)} strokeLinecap="round" />
                </svg>
                <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', fontWeight:'bold', fontSize:'1.2rem', color:'var(--text-color)'}}>{efficiencyIndex}</div>
            </div>
            <div><h2 style={{fontSize:'1.5rem', margin:0, color:'var(--text-color)'}}>Operasyonel Rapor</h2><span style={{fontSize:'0.9rem', color:'var(--secondary-text)'}}>Detaylı Verimlilik Analizi</span></div>
        </div>
        <div style={{display:'flex', gap:'12px'}}>
             <button onClick={downloadPDF} className="hover-glow" style={{padding:'12px 25px', background:'#334155', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold'}}>📥 PDF İNDİR</button>
             <div style={{background:'var(--input-bg)', padding:'4px', borderRadius:'8px', display:'flex'}}>
                 <button onClick={() => setMode('yaz')} style={{padding:'8px 20px', border:'none', background: mode==='yaz'?'#f59e0b':'transparent', color: mode==='yaz'?'white':'var(--secondary-text)', borderRadius:'6px', cursor:'pointer'}}>YAZ</button>
                 <button onClick={() => setMode('kis')} style={{padding:'8px 20px', border:'none', background: mode==='kis'?'#3b82f6':'transparent', color: mode==='kis'?'white':'var(--secondary-text)', borderRadius:'6px', cursor:'pointer'}}>KIŞ</button>
             </div>
        </div>
      </div>

      {/* KPI KARTLARI */}
      <div className="grid-2" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap:'20px', marginBottom:'30px'}}>
        <div className="card hover-glow" style={{borderLeft:'4px solid #ef4444'}}><h4 style={{margin:0, color:'var(--secondary-text)'}}>GİDER</h4><h1 style={{margin:'10px 0', color:'var(--text-color)'}}>{activeData.eski_fatura} TL</h1></div>
        <div className="card hover-glow glow-success" style={{borderLeft:'4px solid #10b981', background:'linear-gradient(145deg, var(--card-bg), rgba(16, 185, 129, 0.05))'}}><h4 style={{margin:0, color:'#10b981'}}>TASARRUF</h4><h1 style={{margin:'10px 0', color:'#10b981'}}>{activeData.tasarruf_tl} TL</h1></div>
        <div className="card hover-glow glow-warning" style={{borderLeft:'4px solid #f59e0b', background:'linear-gradient(145deg, var(--card-bg), rgba(245, 158, 11, 0.05))'}}><h4 style={{margin:0, color:'#f59e0b'}}>ROI</h4><h1 style={{margin:'10px 0', color:'#f59e0b'}}>{activeData.roi_ay > 0 ? (activeData.roi_ay/12).toFixed(1) : '-'} Yıl</h1></div>
        <div className="card hover-glow glow-success" style={{borderLeft:'4px solid #34d399'}}><h4 style={{margin:0, color:'#34d399'}}>DOĞA</h4><h1 style={{margin:'10px 0', color:'#34d399'}}>{treeCount} Ağaç</h1></div>
      </div>

      {/* GRAFIKLER */}
      <div className="grid-2" style={{gap:'25px', marginBottom:'30px'}}>
         <div className="card hover-glow" style={{height:'400px'}}>
            <h4 style={{marginBottom:'20px', borderBottom:'1px solid var(--card-border)', paddingBottom:'10px'}}>⚡ Denge</h4>
            <ResponsiveContainer width="100%" height="90%"><BarChart data={chartData} margin={{top:10, right:10, left:-20, bottom:0}}><CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false}/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'var(--secondary-text)'}}/><YAxis axisLine={false} tickLine={false} tick={{fill:'var(--secondary-text)'}}/><Tooltip content={<CustomTooltip/>}/><Bar dataKey="deger" radius={[6,6,0,0]}>{chartData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart></ResponsiveContainer>
         </div>
         <div className="card hover-glow" style={{display:'flex', flexWrap:'wrap', gap:'20px', alignItems:'center'}}>
            <div style={{flex:'1 1 200px', height:'350px', position:'relative'}}>
                <h4 style={{position:'absolute'}}>🌍 Dağılım</h4>
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} innerRadius={85} outerRadius={120} paddingAngle={4} dataKey="value" stroke="var(--card-bg)">{pieData.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip content={<CustomTooltip/>}/><text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-color)" style={{fontSize:'1.8rem', fontWeight:'bold'}}>%{displayPercentage}</text></PieChart></ResponsiveContainer>
            </div>
            <div style={{flex:'1 1 200px', display:'flex', flexDirection:'column', gap:'20px', padding:'10px'}}>
                <div style={{borderLeft:'4px solid #10b981', paddingLeft:'15px'}}><h2 style={{margin:0, color:'#10b981', fontSize:'1.2rem'}}>%{displayPercentage} Yeşil</h2><p style={{opacity:0.8, fontSize:'0.9rem'}}>Temiz enerji kullanımı.</p></div>
                <div style={{borderLeft:'4px solid #ef4444', paddingLeft:'15px'}}><h2 style={{margin:0, color:'#ef4444', fontSize:'1.2rem'}}>%{gridPercentage} Şebeke</h2><p style={{opacity:0.8, fontSize:'0.9rem'}}>Dışa bağımlılık oranı.</p></div>
            </div>
         </div>
      </div>

      {/* DİĞER ÖNERİLER */}
      {activeData.oneriler && activeData.oneriler.length > 1 && (
         <div className="card hover-glow" style={{borderTop:'4px solid var(--accent-color)'}}>
             <h3 style={{marginBottom:'20px'}}>📋 Diğer Tespitler</h3>
             <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(350px, 1fr))', gap:'15px'}}>
                {activeData.oneriler.slice(1).map((oneri, i) => { 
                    let borderCol='#3b82f6', bgCol='rgba(59, 130, 246, 0.1)', icon='ℹ️';
                    if (oneri.tip === 'kritik') { borderCol='#ef4444'; bgCol='rgba(239, 68, 68, 0.1)'; icon='🚨'; }
                    if (oneri.tip === 'firsat') { borderCol='#10b981'; bgCol='rgba(16, 185, 129, 0.1)'; icon='💎'; }
                    if (oneri.tip === 'uyari')  { borderCol='#f59e0b'; bgCol='rgba(245, 158, 11, 0.1)'; icon='⚠️'; }
                    if (oneri.tip === 'basari') { borderCol='#8b5cf6'; bgCol='rgba(139, 92, 246, 0.1)'; icon='🌟'; }
                    
                    return (
                        <div key={i} className="hover-glow" style={{padding:'20px', borderRadius:'8px', background: bgCol, borderLeft: `4px solid ${borderCol}`, cursor:'default'}}>
                            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px'}}><span style={{fontSize:'1.4rem'}}>{icon}</span><b style={{color: 'var(--text-color)', fontSize:'1rem'}}>{oneri.baslik}</b></div>
                            <p style={{margin:0, color:'var(--text-color)', opacity:0.8, fontSize:'0.9rem', lineHeight:'1.5'}}>{oneri.detay}</p>
                        </div>
                    )
                })}
             </div>
         </div>
      )}
    </div>
  );
}

export default AnalysisResults;