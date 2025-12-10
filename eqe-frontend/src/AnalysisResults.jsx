import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        border: '1px solid #444', padding: '15px', borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)', minWidth: '150px'
      }}>
        <p style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '0.85rem', borderBottom:'1px solid #333', paddingBottom:'5px' }}>{label || 'Detay'}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: '3px 0', color: entry.color, fontSize: '0.95rem', fontWeight: 'bold' }}>
            {entry.name}: <span style={{color:'#fff'}}>{entry.value} {unit}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AnalysisResults = ({ data, season }) => {
  if (!data) return null;

  if (data.toplam_tuketim === 0 && data.gunes_uretim === 0) {
      return (
        <div className="fade-in" style={{textAlign:'center', padding:'60px', color:'#555', border:'2px dashed #333', borderRadius:'10px'}}>
            <h2>📭 Veri Bekleniyor...</h2>
            <p>Sol menüden cihaz ve güneş paneli ekleyiniz.</p>
        </div>
      );
  }

  const pieData = [
    { name: 'Güneş', value: data.gunes_uretim },
    { name: 'Şebeke', value: data.sebekeden_cekilen } 
  ];
  const COLORS = ['#00d25b', '#fc424a']; 

  const barData = [
    { name: 'Fatura Analizi', 'Normal': data.eski_fatura, 'İndirimli': data.yeni_fatura }
  ];

  return (
    <div className="fade-in">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px'}}>
         <h2 style={{margin:0, fontSize:'1.8rem'}}>📊 Analiz Raporu</h2>
         <span style={{
             background: season === 'kis' ? 'linear-gradient(45deg, #36a2eb, #0056b3)' : 'linear-gradient(45deg, #ff9f43, #ff6b6b)',
             color: 'white', padding: '8px 20px', borderRadius: '30px', fontSize: '0.9rem', fontWeight: 'bold',
             boxShadow: season === 'kis' ? '0 0 15px rgba(54, 162, 235, 0.4)' : '0 0 15px rgba(255, 159, 67, 0.4)'
         }}>
             {season === 'kis' ? '❄️ KIŞ MODU' : '☀️ YAZ MODU'}
         </span>
      </div>

      <div className="grid-2">
         <div className="card hover-glow" style={{height: '400px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
            <h3 style={{marginBottom:'20px'}}>Enerji Kaynağı (kWh)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip unit="kWh" />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{textAlign:'center', marginTop:'10px', fontSize:'0.9rem', color:'#aaa', background:'#222', padding:'5px 15px', borderRadius:'15px'}}>
                Toplam İhtiyaç: <b style={{color:'#fff'}}>{data.toplam_tuketim} kWh</b>
            </div>
         </div>

         <div className="card hover-glow" style={{height: '400px'}}>
            <h3 style={{marginBottom:'20px', textAlign:'center'}}>Fatura Karşılaştırma (TL)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barGap={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{fill: '#888'}} />
                <YAxis stroke="#666" tick={{fill: '#888'}} unit="₺" width={60}/>
                <Tooltip content={<CustomTooltip unit="TL" />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Legend verticalAlign="top" align="right" iconType="circle"/>
                <Bar dataKey="Normal" fill="#fc424a" radius={[6, 6, 0, 0]} name="Güneşsiz Fatura" barSize={50} animationDuration={1500}/>
                <Bar dataKey="İndirimli" fill="#00d25b" radius={[6, 6, 0, 0]} name="Ödenecek Tutar" barSize={50} animationDuration={1500}/>
              </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      <div className="grid-2" style={{marginTop:'20px'}}>
          <div className="card hover-glow" style={{borderLeft:'5px solid #8f5fe8', display:'flex', alignItems:'center', justifyContent:'space-between', background: 'linear-gradient(90deg, #1e1e1e 0%, #252525 100%)'}}>
              <div>
                  <h4 style={{margin:'0 0 5px 0', color:'#aaa', textTransform:'uppercase', fontSize:'0.8rem'}}>Aylık Net Tasarruf</h4>
                  <h1 style={{margin:0, fontSize:'2.8rem', color:'#8f5fe8', textShadow:'0 0 20px rgba(143, 95, 232, 0.3)'}}>{data.tasarruf_tl} TL</h1>
              </div>
              <div style={{fontSize:'3.5rem', opacity:0.8}}>💰</div>
          </div>

          <div className="card hover-glow" style={{borderLeft:'5px solid #36a2eb', display:'flex', alignItems:'center', justifyContent:'space-between', background: 'linear-gradient(90deg, #1e1e1e 0%, #252525 100%)'}}>
              <div>
                  <h4 style={{margin:'0 0 5px 0', color:'#aaa', textTransform:'uppercase', fontSize:'0.8rem'}}>Karbon İzi</h4>
                  <h1 style={{margin:0, fontSize:'2.8rem', color: data.karbon > 0 ? '#fc424a' : '#00d25b', textShadow:'0 0 20px rgba(54, 162, 235, 0.3)'}}>
                      {data.karbon} <span style={{fontSize:'1.2rem'}}>kg</span>
                  </h1>
                  <small style={{color:'#666'}}>{data.karbon === 0 ? "🌱 Harika! Sıfır Salınım" : `⚠️ ${data.kurtarilan_karbon} kg engellendi`}</small>
              </div>
              <div style={{fontSize:'3.5rem', opacity:0.8}}>🌍</div>
          </div>
      </div>
    </div>
  );
};
export default AnalysisResults;