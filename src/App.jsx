import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bike, Settings, ShoppingCart, Activity, Plus, AlertTriangle, 
  CheckCircle, ChevronRight, Wrench, Calendar, MapPin, 
  Search, Package, RefreshCw, Archive, Trash2, Loader2, LayoutGrid,
  History, Database, ExternalLink, ListPlus, FileText, Sparkles, MessageSquareText
} from 'lucide-react';

// --- GEMINI API HELPER ---
const callGemini = async (prompt, jsonSchema = null) => {
  const apiKey = ""; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  if (jsonSchema) {
    payload.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: jsonSchema
    };
  }

  let delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < 6; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      return jsonSchema ? JSON.parse(text) : text;
    } catch (error) {
      if (i === 5) throw error;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};

// --- ХУК ДЛЯ ЛОКАЛЬНОГО СОХРАНЕНИЯ (БЕЗ ОБЛАКА) ---
function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

// --- FALLBACK DB (Каталог) ---
const bikeDatabase = {
  "racer alpina man 1.0": {
    type: "Hybrid/City",
    photo: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=800",
    components: [
      { category: 'Рама', type: 'Рама', name: "Алюминий", resource: 50000 },
      { category: 'Подвеска', type: 'Вилка', name: "Амортизационная пружинно-эластомерная", resource: 1500 },
      { category: 'Колеса', type: 'Втулки', name: "28\" Обода + Втулки на насыпных подшипниках", resource: 5000 },
      { category: 'Колеса', type: 'Покрышки', name: "Wanda 700x40C", resource: 4000 },
      { category: 'Трансмиссия', type: 'Трещотка', name: "Shimano MF-TZ500-7", resource: 6000 },
      { category: 'Трансмиссия', type: 'Цепь', name: "KMC Z7", resource: 1500 },
      { category: 'Трансмиссия', type: 'Система', name: "Prowheel 42/34/24T", resource: 15000 },
      { category: 'Трансмиссия', type: 'Переключатель (зад)', name: "Shimano Tourney RD-TY300", resource: 8000 },
      { category: 'Трансмиссия', type: 'Переключатель (пер)', name: "Shimano Tourney FD-TY300", resource: 8000 },
      { category: 'Трансмиссия', type: 'Каретка', name: "Картридж под квадрат", resource: 10000 },
      { category: 'Управление', type: 'Манетки', name: "Shimano ST-EF41", resource: 10000 },
      { category: 'Тормозная система', type: 'Колодки', name: "Дисковые механические ZOOM", resource: 1500 },
      { category: 'Тормозная система', type: 'Тросы', name: "Стальные тросы и рубашки", resource: 3000 }
    ]
  }
};

const mockAnalogsDB = {
  'Цепь': [
    { name: 'KMC X8 Silver/Black', lifespan: 3000, price: 15, brand: 'KMC' },
    { name: 'Shimano HG40', lifespan: 2500, price: 12, brand: 'Shimano' },
  ],
  'Трещотка': [
    { name: 'Shimano TZ500 7-speed', lifespan: 5000, price: 20, brand: 'Shimano' },
    { name: 'SunRace MFM300', lifespan: 4500, price: 18, brand: 'SunRace' }
  ]
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ ---

export default function App() {
  const [activeTab, setActiveTab] = useState('garage');
  
  // Данные сохраняются в localStorage
  const [bikes, setBikes] = useStickyState([], 'vk_bikes_v3');
  const [components, setComponents] = useStickyState([], 'vk_components_v3');
  const [activityLogs, setActivityLogs] = useStickyState([], 'vk_logs_v3');
  const [activeBikeId, setActiveBikeId] = useStickyState(null, 'vk_active_bike_v3');
  const [bikeToDelete, setBikeToDelete] = useState(null);

  const activeBike = bikes.find(b => b.id === activeBikeId) || null;

  // Математика износа 2.0
  const activeComponentsWithWear = useMemo(() => {
    if (!activeBike) return [];
    return components
      .filter(c => c.bikeId === activeBike.id && !c.archived)
      .map(comp => {
        const distanceSinceInstall = activeBike.totalMileage - comp.installMileage;
        
        let wearPercentage = 0;
        let status = 'none';

        if (comp.lifespan > 0) {
          wearPercentage = (distanceSinceInstall / comp.lifespan) * 100;
          status = 'good';
          if (wearPercentage >= 100) status = 'critical';
          else if (wearPercentage >= 75) status = 'warning';
        }

        return { ...comp, distanceSinceInstall, wearPercentage, status };
      });
  }, [components, activeBike ? activeBike.totalMileage : 0]);

  const criticalAlerts = activeComponentsWithWear.filter(c => c.status === 'critical' || c.status === 'warning');

  // --- ОБРАБОТЧИКИ ДЕЙСТВИЙ ---

  const handleAddRide = (distance, notes = '') => {
    const distNum = parseFloat(distance);
    if (isNaN(distNum) || distNum <= 0 || !activeBike) return;

    setBikes(prev => prev.map(b => 
      b.id === activeBike.id ? { ...b, totalMileage: b.totalMileage + distNum } : b
    ));

    setActivityLogs(prev => [{
      id: `log_${Date.now()}`,
      bikeId: activeBike.id,
      date: new Date().toISOString().split('T')[0],
      type: 'ride',
      text: `Заезд на ${distNum} км` + (notes ? `\nЗаметки: ${notes}` : '')
    }, ...prev]);
  };

  const handleQuickReplace = (oldComponentId, newItemDetails) => {
    setComponents(prevComponents => {
      const oldComp = prevComponents.find(c => c.id === oldComponentId);
      if (!oldComp || !activeBike) return prevComponents;

      const archivedPrev = prevComponents.map(c => 
        c.id === oldComponentId ? { ...c, archived: true, archiveDate: new Date().toISOString().split('T')[0] } : c
      );

      const newComponent = {
        id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        bikeId: oldComp.bikeId,
        name: newItemDetails.name || oldComp.name,
        category: oldComp.category,
        type: oldComp.type,
        installDate: new Date().toISOString().split('T')[0],
        installMileage: activeBike.totalMileage,
        lifespan: newItemDetails.lifespan || oldComp.lifespan,
        archived: false
      };
      
      return [...archivedPrev, newComponent];
    });

    setActivityLogs(prev => [{
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      bikeId: activeBike.id,
      date: new Date().toISOString().split('T')[0],
      type: 'maintenance',
      text: `Замена "${newItemDetails.name || 'узла'}" на пробеге ${Math.round(activeBike.totalMileage)} км`
    }, ...prev]);
  };

  const handleAddNewManualComponent = (compData) => {
    if (!activeBike) return;
    const newComponent = {
      id: `c_${Date.now()}`,
      bikeId: activeBike.id,
      name: compData.name,
      category: compData.category || 'Дополнительно',
      type: compData.type || 'Узел',
      installDate: new Date().toISOString().split('T')[0],
      installMileage: activeBike.totalMileage - (parseFloat(compData.currentWorn) || 0),
      lifespan: parseFloat(compData.lifespan) || 0,
      archived: false
    };
    setComponents(prev => [...prev, newComponent]);
  };

  const handleDeleteBike = (bikeId) => {
    setBikeToDelete(bikeId);
  };

  const confirmDeleteBike = () => {
    const bikeId = bikeToDelete;
    
    setBikes(prev => {
      const remaining = prev.filter(b => b.id !== bikeId);
      if (activeBikeId === bikeId) {
        setActiveBikeId(remaining.length > 0 ? remaining[0].id : null);
        if (remaining.length === 0) setActiveTab('garage');
      }
      return remaining;
    });
    
    setComponents(prev => prev.filter(c => c.bikeId !== bikeId));
    setActivityLogs(prev => prev.filter(l => l.bikeId !== bikeId));
    setBikeToDelete(null);
  };

  const handleAddBike = (newBike, newComponents) => {
    setBikes(prev => [...prev, newBike]);
    setComponents(prev => [...prev, ...newComponents]);
    setActiveBikeId(newBike.id);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-lime-500 selection:text-slate-950 flex flex-col pb-20 md:pb-8">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lime-400 shrink-0">
            <Activity className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-lg md:text-xl font-bold tracking-tight">VeloKeep 2.0</span>
          </div>
          <nav className="flex gap-1 md:gap-4 overflow-x-auto no-scrollbar pl-2">
            <NavBtn active={activeTab === 'garage'} onClick={() => setActiveTab('garage')} icon={<LayoutGrid />} label="Гараж" />
            <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Bike />} label="Дашборд" />
            <NavBtn active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={<Settings />} label="Узлы" />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 md:py-8">
        {activeTab === 'garage' && (
          <GarageTab 
            bikes={bikes} 
            activeBikeId={activeBikeId}
            onSelectBike={(id) => { setActiveBikeId(id); setActiveTab('dashboard'); }}
            onDeleteBike={handleDeleteBike}
            onAddBike={handleAddBike}
          />
        )}
        
        {activeTab === 'dashboard' && activeBike && (
          <DashboardTab 
            bike={activeBike} 
            alerts={criticalAlerts} 
            components={activeComponentsWithWear}
            logs={activityLogs.filter(l => l.bikeId === activeBike.id)}
            onAddRide={handleAddRide} 
            onGoToDetails={() => setActiveTab('details')}
          />
        )}
        
        {activeTab === 'dashboard' && !activeBike && (
          <div className="text-center py-20 text-slate-500 px-4">Нет активных велосипедов. Добавьте байк в Гараже.</div>
        )}
        
        {activeTab === 'details' && activeBike && (
          <ComponentsTab 
            components={activeComponentsWithWear} 
            onReplace={handleQuickReplace}
            onAddNew={handleAddNewManualComponent}
          />
        )}
      </main>

      {bikeToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl md:text-2xl font-bold text-red-500 mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5 md:w-6 md:h-6"/> Удаление велосипеда</h3>
            <p className="text-slate-400 mb-6 text-sm md:text-base">Вы уверены, что хотите удалить этот велосипед и всю историю его обслуживания навсегда?</p>
            <div className="flex gap-3">
              <button onClick={() => setBikeToDelete(null)} className="flex-1 px-4 py-2.5 md:py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm md:text-base font-semibold">Отмена</button>
              <button onClick={confirmDeleteBike} className="flex-1 px-4 py-2.5 md:py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-colors text-sm md:text-base">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- КОМПОНЕНТЫ ВКЛАДОК ---

function DashboardTab({ bike, alerts, components, logs, onAddRide, onGoToDetails }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiAuditModal, setShowAiAuditModal] = useState(false);
  
  const [rideDist, setRideDist] = useState('');
  const [rideMode, setRideMode] = useState('manual');
  const [aiRideText, setAiRideText] = useState('');
  const [isParsingRide, setIsParsingRide] = useState(false);

  const handleSubmitRide = (e) => {
    e.preventDefault();
    onAddRide(rideDist);
    setRideDist('');
    setShowAddModal(false);
  };

  const handleAiRideSubmit = async (e) => {
    e.preventDefault();
    if(!aiRideText.trim()) return;
    setIsParsingRide(true);

    try {
      const prompt = `Пользователь описывает свою поездку на велосипеде: "${aiRideText}". 
      Извлеки пройденную дистанцию в километрах (если не указана точно, оцени примерно на основе текста, если это невозможно - верни 0). 
      Также кратко резюмируй условия поездки или состояние велосипеда (грязь, дождь, поломки, горы), если об этом сказано.`;
      
      const schema = {
        type: "OBJECT",
        properties: {
          distance: { type: "NUMBER" },
          notes: { type: "STRING" }
        },
        required: ["distance"]
      };

      const result = await callGemini(prompt, schema);
      if(result && result.distance > 0) {
        onAddRide(result.distance, result.notes);
        setShowAddModal(false);
        setAiRideText('');
      } else {
        alert("Не удалось определить дистанцию из текста. Пожалуйста, введите данные вручную.");
      }
    } catch (err) {
      alert("Произошла ошибка ИИ-анализа. Попробуйте ручной ввод.");
    } finally {
      setIsParsingRide(false);
    }
  };

  const groupedComponents = components.reduce((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="h-40 md:h-48 w-full relative">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent z-10" />
          <img src={bike.photo} alt={bike.name} className="w-full h-full object-cover opacity-60" />
          <div className="absolute bottom-4 left-4 md:left-6 z-20 pr-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 leading-tight">{bike.name}</h1>
            <p className="text-slate-300 text-xs md:text-sm">{bike.model} • Общий пробег: <span className="text-lime-400 font-bold">{Math.round(bike.totalMileage)} км</span></p>
          </div>
        </div>
        
        <div className="p-4 bg-slate-900 flex flex-col sm:flex-row justify-end gap-3">
          <button onClick={() => setShowAiAuditModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-900/50 hover:bg-indigo-800/80 border border-indigo-500/50 text-indigo-300 px-5 py-2.5 rounded-xl font-bold transition-colors text-sm md:text-base">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5" /> ИИ-Аудит байка
          </button>
          <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-lime-500 hover:bg-lime-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold transition-colors text-sm md:text-base">
            <Plus className="w-4 h-4 md:w-5 md:h-5" /> Добавить поездку
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><AlertTriangle className="text-red-500 w-5 h-5" /> Критический износ</h2>
          <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
            {alerts.map(alert => (
              <div key={alert.id} className={`p-4 rounded-xl border ${alert.status === 'critical' ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm md:text-base leading-tight mb-1">{alert.name}</h3>
                    <p className="text-xs text-slate-400">{alert.type}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-lg md:text-xl font-bold ${alert.status === 'critical' ? 'text-red-400' : 'text-orange-400'}`}>{Math.round(alert.wearPercentage)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="flex justify-between items-end">
            <h2 className="text-lg md:text-xl font-bold text-white">Состояние всех узлов</h2>
            <button onClick={onGoToDetails} className="text-xs md:text-sm text-lime-400 hover:text-lime-300 font-semibold">Настройки узлов &rarr;</button>
          </div>
          
          {Object.keys(groupedComponents).length === 0 && (
            <div className="text-slate-500 text-sm py-4">Нет добавленных узлов.</div>
          )}

          {Object.entries(groupedComponents).map(([category, items]) => (
            <div key={category} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="bg-slate-800/50 px-4 py-2 md:py-3 border-b border-slate-800">
                <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider">{category}</h3>
              </div>
              <div className="divide-y divide-slate-800/50">
                {items.filter(c => c.lifespan > 0).map(comp => (
                  <div key={comp.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-200 text-sm md:text-base leading-tight">{comp.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{comp.type}</div>
                    </div>
                    <div className="w-full sm:w-1/3 md:w-2/5 space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">{Math.round(comp.distanceSinceInstall)} / {comp.lifespan} км</span>
                        <span className={comp.status === 'critical' ? 'text-red-400 font-bold' : 'text-slate-400'}>{Math.round(comp.wearPercentage)}%</span>
                      </div>
                      <WearProgressBar wear={comp.wearPercentage} status={comp.status} />
                    </div>
                  </div>
                ))}
                {items.filter(c => c.lifespan === 0).map(comp => (
                  <div key={comp.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-1 opacity-60">
                    <div>
                      <div className="font-semibold text-slate-400 text-sm">{comp.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{comp.type}</div>
                    </div>
                    <div className="text-xs text-slate-500">Бессрочный узел</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><History className="w-5 h-5"/> История сервиса</h2>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 max-h-[400px] md:max-h-[600px] overflow-y-auto custom-scrollbar">
            {logs.length === 0 ? (
               <div className="text-sm text-slate-500 text-center py-10">История пуста</div>
            ) : (
               <div className="space-y-5 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-800">
                {logs.map((log) => (
                  <div key={log.id} className="relative flex items-start gap-3 md:gap-4">
                    <div className={`mt-1 flex items-center justify-center w-4 h-4 md:w-5 md:h-5 rounded-full border-4 border-slate-900 shrink-0 shadow z-10 ${log.type === 'maintenance' ? 'bg-lime-500' : 'bg-blue-500'}`}></div>
                    <div className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 gap-1">
                        <div className={`font-bold text-xs ${log.type === 'maintenance' ? 'text-lime-400' : 'text-blue-400'}`}>{log.type === 'maintenance' ? 'Сервис / Замена' : 'Заезд'}</div>
                        <time className="text-[10px] md:text-xs font-medium text-slate-500">{log.date}</time>
                      </div>
                      <div className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-line">{log.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex border-b border-slate-800 bg-slate-950 shrink-0">
              <button 
                onClick={() => setRideMode('manual')}
                className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold transition-colors ${rideMode === 'manual' ? 'text-lime-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Ручной ввод
              </button>
              <button 
                onClick={() => setRideMode('ai')}
                className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${rideMode === 'ai' ? 'text-indigo-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4"/> ИИ-Ввод
              </button>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar">
              {rideMode === 'manual' ? (
                <form onSubmit={handleSubmitRide}>
                  <div className="mb-6">
                    <label className="block text-xs md:text-sm text-slate-400 mb-2">Дистанция (км)</label>
                    <input 
                      type="number" step="0.1" required autoFocus
                      value={rideDist} onChange={e => setRideDist(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
                      placeholder="Например: 45.5"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm font-semibold">Отмена</button>
                    <button type="submit" className="flex-1 px-4 py-3 bg-lime-500 text-slate-950 font-bold rounded-xl hover:bg-lime-400 transition-colors text-sm">Сохранить</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAiRideSubmit}>
                  <div className="mb-6">
                    <label className="block text-xs md:text-sm text-slate-400 mb-2">Опишите вашу поездку</label>
                    <textarea 
                      required autoFocus
                      value={aiRideText} onChange={e => setAiRideText(e.target.value)}
                      className="w-full h-32 bg-slate-950 border border-indigo-500/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none custom-scrollbar"
                      placeholder="Например: Вчера прокатил 30 километров по лесу под сильным дождем..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm font-semibold">Отмена</button>
                    <button type="submit" disabled={isParsingRide || !aiRideText.trim()} className="flex-1 px-3 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 text-sm">
                      {isParsingRide ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" /> Распознать</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {showAiAuditModal && (
        <AiAuditModal bike={bike} components={components} onClose={() => setShowAiAuditModal(false)} />
      )}
    </div>
  );
}

function AiAuditModal({ bike, components, onClose }) {
  const [auditResult, setAuditResult] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runAudit = async () => {
      try {
        const prompt = `Ты профессиональный веломеханик. Проведи быстрый аудит состояния велосипеда "${bike.name}".
        Общий пробег: ${Math.round(bike.totalMileage)} км.
        Износ ключевых узлов:
        ${components.filter(c => c.lifespan > 0).map(c => `- ${c.name}: износ ${Math.round(( (bike.totalMileage - c.installMileage) / c.lifespan ) * 100)}%`).join('\n')}
        
        Дай краткий вердикт о состоянии (2 предложения) и выдели маркированным списком 3 самых приоритетных действия по обслуживанию, которые нужно сделать прямо сейчас или в ближайшие 200 км. Отвечай на русском языке без сложной разметки, просто текст.`;
        
        const response = await callGemini(prompt);
        setAuditResult(response);
      } catch (error) {
        setAuditResult('Не удалось выполнить аудит. Проверьте подключение к сети.');
      } finally {
        setLoading(false);
      }
    };
    runAudit();
  }, [bike, components]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-5 md:p-6 w-full max-w-xl shadow-[0_0_50px_-15px_rgba(99,102,241,0.4)] flex flex-col max-h-[90vh]">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2 flex items-center gap-2 shrink-0">
          <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-indigo-400"/> ИИ-Аудит
        </h3>
        <p className="text-xs md:text-sm text-slate-400 mb-4 md:mb-6 shrink-0 line-clamp-1">Комплексный анализ для: {bike.name}</p>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-10">
               <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-indigo-500 animate-spin mb-4" />
               <p className="text-indigo-300 animate-pulse font-semibold text-sm text-center">Анализируем узлы...</p>
             </div>
          ) : (
            <div className="bg-slate-950/50 border border-indigo-500/30 p-4 md:p-5 rounded-xl text-slate-200 leading-relaxed whitespace-pre-line shadow-inner text-sm md:text-base">
              {auditResult}
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-4 md:mt-6 shrink-0">
          <button onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-bold text-sm md:text-base">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

function ComponentsTab({ components, onReplace, onAddNew }) {
  const [showAddNewModal, setShowAddNewModal] = useState(false);
  const [analogSearchOpen, setAnalogSearchOpen] = useState(false);
  const [selectedCompForAnalog, setSelectedCompForAnalog] = useState(null);
  const [aiAdvisorOpen, setAiAdvisorOpen] = useState(false);
  const [selectedCompForAi, setSelectedCompForAi] = useState(null);
  const [compToReplace, setCompToReplace] = useState(null);
  const [replaceName, setReplaceName] = useState('');
  const [replaceLifespan, setReplaceLifespan] = useState('');

  const grouped = components.reduce((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {});

  const openAnalogSearch = (comp) => {
    setSelectedCompForAnalog(comp);
    setAnalogSearchOpen(true);
  };

  const handleApplyAnalog = (analogData) => {
    onReplace(selectedCompForAnalog.id, analogData);
    setAnalogSearchOpen(false);
    setSelectedCompForAnalog(null);
  };

  const handleDirectReplace = (comp) => {
    setCompToReplace(comp);
    setReplaceName(comp.name);
    setReplaceLifespan(comp.lifespan);
  };

  const confirmDirectReplace = () => {
    if (compToReplace && replaceName.trim() && replaceLifespan) {
      onReplace(compToReplace.id, { name: replaceName, lifespan: Number(replaceLifespan) });
      setCompToReplace(null);
      setReplaceName('');
      setReplaceLifespan('');
    }
  };

  const openAiAdvisor = (comp) => {
    setSelectedCompForAi(comp);
    setAiAdvisorOpen(true);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Список компонентов</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">Детальный контроль износа и замена узлов</p>
        </div>
        <button onClick={() => setShowAddNewModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-lime-400 border border-slate-700 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm md:text-base">
          <ListPlus className="w-5 h-5" /> Добавить узел
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
             <div className="bg-slate-800/50 px-4 py-2.5 border-b border-slate-800 text-xs font-bold text-lime-400 uppercase tracking-wider">
               {category}
             </div>
             <div className="divide-y divide-slate-800/50">
                {items.map(comp => (
                  <div key={comp.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-800/30 transition-colors">
                    
                    <div className="flex-1">
                      <div className="font-bold text-slate-200 text-sm md:text-base leading-tight">{comp.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{comp.type}</div>
                    </div>

                    <div className="w-full sm:w-1/3 md:w-1/4">
                       {comp.lifespan > 0 ? (
                         <>
                           <div className="flex justify-between text-[11px] md:text-xs font-mono text-slate-300 mb-1.5">
                             <span>{Math.round(comp.distanceSinceInstall)} / {comp.lifespan} км</span>
                             <span className={comp.status === 'critical' ? 'text-red-400 font-bold' : ''}>{Math.round(comp.wearPercentage)}%</span>
                           </div>
                           <WearProgressBar wear={comp.wearPercentage} status={comp.status} size="sm" />
                         </>
                       ) : (
                         <div className="text-xs text-slate-500 py-1">Бессрочный узел</div>
                       )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 md:gap-2 sm:ml-4 shrink-0 mt-1 sm:mt-0">
                      <a 
                        href={`https://catalog.onliner.by/search?query=${encodeURIComponent(comp.name)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-2 bg-[#1b1c1e] hover:bg-[#2b2c2e] border border-[#fcc02c]/30 text-[#fcc02c] rounded-lg transition-colors"
                        title="Найти на Onliner"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      
                      {comp.lifespan > 0 && (
                        <button onClick={() => openAnalogSearch(comp)} className="inline-flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 text-lime-400 rounded-lg transition-colors" title="Подобрать аналог">
                          <Search className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button onClick={() => openAiAdvisor(comp)} className="inline-flex items-center justify-center p-2 bg-indigo-900/40 hover:bg-indigo-800/80 border border-indigo-500/30 text-indigo-300 rounded-lg transition-colors" title="Спросить ИИ-механика">
                        <Sparkles className="w-4 h-4" />
                      </button>
                      
                      <button onClick={() => handleDirectReplace(comp)} className="inline-flex items-center justify-center px-3 py-2 bg-lime-500 hover:bg-lime-400 text-slate-950 rounded-lg transition-colors font-bold text-xs md:text-sm flex gap-1.5" title="Установил новую деталь">
                        <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Замена</span>
                      </button>
                    </div>

                  </div>
                ))}
             </div>
          </div>
        ))}
      </div>

      {analogSearchOpen && selectedCompForAnalog && (
        <AnalogSearchModal component={selectedCompForAnalog} onClose={() => setAnalogSearchOpen(false)} onSelect={handleApplyAnalog} />
      )}
      
      {aiAdvisorOpen && selectedCompForAi && (
        <AiAdvisorModal component={selectedCompForAi} onClose={() => setAiAdvisorOpen(false)} />
      )}
      
      {showAddNewModal && (
        <AddNewComponentModal onClose={() => setShowAddNewModal(false)} onAdd={onAddNew} />
      )}

      {compToReplace && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2"><RefreshCw className="w-5 h-5 md:w-6 md:h-6 text-lime-500"/> Замена узла</h3>
            <p className="text-xs md:text-sm text-slate-400 mb-5 md:mb-6">Укажите данные <b>новой</b> детали. Пробег этого узла будет обнулен.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs md:text-sm text-slate-400 mb-1.5">Название новой детали</label>
                <input 
                  type="text" 
                  required
                  value={replaceName} 
                  onChange={e => setReplaceName(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:border-lime-500 focus:outline-none text-sm" 
                  placeholder="Например: Continental Terra Speed"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm text-slate-400 mb-1.5">Ресурс (км)</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  value={replaceLifespan} 
                  onChange={e => setReplaceLifespan(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:border-lime-500 focus:outline-none text-sm" 
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCompToReplace(null)} className="flex-1 px-4 py-2.5 md:py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm font-semibold">Отмена</button>
              <button onClick={confirmDirectReplace} disabled={!replaceName.trim() || !replaceLifespan} className="flex-1 px-4 py-2.5 md:py-3 bg-lime-500 text-slate-950 font-bold rounded-xl hover:bg-lime-400 disabled:opacity-50 transition-colors text-sm">Подтвердить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AiAdvisorModal({ component, onClose }) {
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdvice = async () => {
      try {
        const prompt = `Ты опытный веломеханик. Деталь моего велосипеда: ${component.name} (Тип: ${component.type}). 
        Ее текущий износ: ${Math.round(component.wearPercentage)}% (Пробег: ${Math.round(component.distanceSinceInstall)} км из расчетных ${component.lifespan || 'неизвестно'} км).
        Кратко (в 3-4 предложениях) расскажи, какие симптомы износа я могу заметить при езде, и дай совет по обслуживанию или замене этой детали. Отвечай на русском языке.`;
        
        const response = await callGemini(prompt);
        setAdvice(response);
      } catch (error) {
        setAdvice('Не удалось получить совет от ИИ. Проверьте подключение.');
      } finally {
        setLoading(false);
      }
    };
    fetchAdvice();
  }, [component]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 md:p-6 w-full max-w-lg shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)] flex flex-col max-h-[90vh]">
        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2 shrink-0">
          <Sparkles className="w-5 h-5 text-indigo-400"/> Совет механика
        </h3>
        <p className="text-xs md:text-sm text-slate-400 mb-5 shrink-0">Диагностика: {component.name}</p>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-8">
               <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-indigo-500 animate-spin mb-4" />
               <p className="text-indigo-300 text-xs md:text-sm animate-pulse text-center">Анализируем износ...</p>
             </div>
          ) : (
            <div className="bg-slate-950/50 border border-slate-800 p-4 md:p-5 rounded-xl text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {advice}
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-5 shrink-0">
          <button onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-semibold text-sm">
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}

function AddNewComponentModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Дополнительно');
  const [lifespan, setLifespan] = useState('');
  const [currentWorn, setCurrentWorn] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({ name, category, lifespan, currentWorn });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-5">Добавление узла</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs md:text-sm text-slate-400 mb-1.5">Название детали</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:border-lime-500 focus:outline-none text-sm" placeholder="Напр: Левая манетка" />
          </div>
          <div>
            <label className="block text-xs md:text-sm text-slate-400 mb-1.5">Категория</label>
            <input type="text" required value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:border-lime-500 focus:outline-none text-sm" placeholder="Напр: Трансмиссия" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm text-slate-400 mb-1.5">Ресурс (км)</label>
              <input type="number" required min="0" value={lifespan} onChange={e => setLifespan(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:border-lime-500 focus:outline-none text-sm" placeholder="0 = бессрочно" />
            </div>
            <div>
              <label className="block text-xs md:text-sm text-slate-400 mb-1.5">Уже прошел (км)</label>
              <input type="number" min="0" value={currentWorn} onChange={e => setCurrentWorn(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:border-lime-500 focus:outline-none text-sm" placeholder="0" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 md:py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm font-semibold">Отмена</button>
            <button type="submit" disabled={!name.trim()} className="flex-1 px-4 py-2.5 md:py-3 bg-lime-500 text-slate-950 font-bold rounded-xl hover:bg-lime-400 transition-colors disabled:opacity-50 text-sm">Добавить</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AnalogSearchModal({ component, onClose, onSelect }) {
  const [isSearching, setIsSearching] = useState(true);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      let found = mockAnalogsDB[component.type] || [];
      if (found.length === 0) {
        found = [
          { name: `Аналог ${component.type} (Premium)`, lifespan: component.lifespan + 500, price: 45, brand: 'ProBrand' },
          { name: `Замена ${component.type} (Std)`, lifespan: component.lifespan, price: 25, brand: 'Standard' }
        ];
      }
      setResults(found);
      setIsSearching(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [component]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2 shrink-0"><Search className="w-5 h-5 text-lime-400"/> Подбор аналогов</h3>
        <p className="text-xs md:text-sm text-slate-400 mb-5 md:mb-6 shrink-0">Ищем замены для: {component.name}</p>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isSearching ? (
             <div className="flex flex-col items-center justify-center py-10">
               <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-lime-500 animate-spin mb-4" />
               <p className="text-slate-400 text-xs md:text-sm animate-pulse">Поиск по внутренней базе...</p>
             </div>
          ) : (
            <div className="space-y-3 pr-1 md:pr-2">
              {results.map((item, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 p-3.5 md:p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <div className="text-[10px] md:text-xs text-lime-400 font-bold mb-1">{item.brand}</div>
                    <div className="font-bold text-slate-200 text-sm md:text-base">{item.name}</div>
                    <div className="text-xs text-slate-500 mt-1">Ресурс: ~{item.lifespan} км</div>
                  </div>
                  <div className="flex sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <div className="font-bold text-white sm:mb-2 text-sm md:text-base">${item.price}</div>
                    <button onClick={() => onSelect(item)} className="text-xs bg-lime-500 hover:bg-lime-400 text-slate-950 px-3 py-1.5 md:py-2 rounded-lg font-bold transition-colors">
                      Установить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-5 md:mt-6 flex justify-end shrink-0">
          <button onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 text-slate-300 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors text-sm font-semibold">Закрыть</button>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg text-[13px] md:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${active ? 'bg-lime-500/10 text-lime-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>{React.cloneElement(icon, { size: 18 })}</div>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function WearProgressBar({ wear, status, size = "md" }) {
  let colorClass = 'bg-green-500';
  if (status === 'warning') colorClass = 'bg-orange-500';
  if (status === 'critical') colorClass = 'bg-red-500';
  const heightClass = size === "lg" ? "h-2.5 md:h-3" : "h-1.5 md:h-2";

  const visualWear = Math.min(100, Math.max(2, wear));

  return (
    <div className={`w-full bg-slate-800 rounded-full overflow-hidden ${heightClass}`}>
      <div className={`${colorClass} h-full transition-all duration-1000 ease-out`} style={{ width: `${visualWear}%` }} />
    </div>
  );
}

function GarageTab({ bikes, activeBikeId, onSelectBike, onDeleteBike, onAddBike }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Мой Гараж</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">Добавление и управление велосипедами</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-lime-500 hover:bg-lime-400 text-slate-950 px-5 py-3 sm:py-2.5 rounded-xl font-bold transition-colors text-sm md:text-base">
          <Plus className="w-5 h-5" /> Добавить велосипед
        </button>
      </div>

      {bikes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 border-dashed rounded-2xl p-8 md:p-12 text-center mt-6 md:mt-8">
          <Bike className="w-10 h-10 md:w-12 md:h-12 text-slate-600 mx-auto mb-3 md:mb-4" />
          <h3 className="text-lg md:text-xl font-bold text-slate-300 mb-2">В гараже пусто</h3>
          <p className="text-sm text-slate-500 px-4">Добавьте свой первый велосипед для отслеживания ТО.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
          {bikes.map(bike => (
            <div key={bike.id} className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-xl transition-all ${activeBikeId === bike.id ? 'border-lime-500 ring-1 ring-lime-500' : 'border-slate-800 hover:border-slate-700'}`}>
              <div className="h-36 md:h-40 w-full relative cursor-pointer group" onClick={() => onSelectBike(bike.id)}>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
                <img src={bike.photo} alt={bike.name} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute bottom-3 md:bottom-4 left-4 md:left-5 z-20 pr-4">
                  <h3 className="text-xl md:text-2xl font-bold text-white leading-tight line-clamp-1">{bike.name}</h3>
                  <p className="text-slate-300 text-xs md:text-sm mt-0.5 line-clamp-1">{bike.model}</p>
                </div>
                {activeBikeId === bike.id && <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20 bg-lime-500 text-slate-950 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg"><CheckCircle className="w-3 h-3 md:w-3.5 md:h-3.5" /> Активный</div>}
              </div>
              <div className="p-4 md:p-5 flex justify-between items-center bg-slate-900">
                <div>
                  <div className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider font-semibold">Пробег</div>
                  <div className="text-lg md:text-xl font-bold text-slate-200">{Math.round(bike.totalMileage)} км</div>
                </div>
                <div className="flex gap-1.5 md:gap-2">
                  <button onClick={() => onSelectBike(bike.id)} className="p-2 md:p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg md:rounded-xl transition-colors"><Activity className="w-4 h-4 md:w-5 md:h-5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteBike(bike.id); }} className="p-2 md:p-2.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg md:rounded-xl transition-colors"><Trash2 className="w-4 h-4 md:w-5 md:h-5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && <AddBikeModal onClose={() => setIsModalOpen(false)} onSave={onAddBike} />}
    </div>
  );
}

function AddBikeModal({ onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [bikeName, setBikeName] = useState('');
  const [bikeTotalMileage, setBikeTotalMileage] = useState('');
  const [pastedSpecs, setPastedSpecs] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [isAllOriginal, setIsAllOriginal] = useState(true);
  const [isParsingAi, setIsParsingAi] = useState(false);

  const handleNextFromStep1 = (e) => {
    e.preventDefault();
    if (!bikeName.trim()) return;

    const lowerQuery = bikeName.toLowerCase().trim();
    const isAlpina = lowerQuery.includes('racer') || lowerQuery.includes('alpina') || lowerQuery.includes('man 1.0');

    if (isAlpina && bikeDatabase["racer alpina man 1.0"]) {
      const dbBike = bikeDatabase["racer alpina man 1.0"];
      const componentsMapped = dbBike.components.map(comp => ({
        id: `tmp_${Math.random()}`,
        category: comp.category,
        type: comp.type || comp.name.split(' ')[0],
        name: comp.name,
        lifespan: comp.resource !== undefined ? comp.resource : comp.lifespan,
        currentWornMileage: 0 
      }));
      setParsedData({ name: bikeName, type: dbBike.type, photo: dbBike.photo, components: componentsMapped });
      setStep(3); 
    } else {
      setStep(2);
    }
  };

  const handleParseSpecs = (e) => {
    if(e && e.preventDefault) e.preventDefault();
    const text = pastedSpecs;
    let parsedComponents = [];

    const addComp = (cat, type, name, ls) => {
      parsedComponents.push({ category: cat, type: type, name: name, lifespan: ls, currentWornMileage: 0, id: `tmp_${Math.random()}` });
    };

    if (/Рама/i.test(text)) addComp('Рама', 'Рама', 'Рама', 50000);
    if (/Вилка|Амортизац/i.test(text)) addComp('Подвеска', 'Вилка', 'Амортизационная вилка', 1500);
    if (/Втулки|Обода/i.test(text)) addComp('Колеса', 'Втулки', 'Втулки', 5000);
    if (/Покрышки|Шины|700x/i.test(text)) addComp('Колеса', 'Покрышки', 'Покрышки', 4000);
    if (/Трещотка|Кассета/i.test(text)) addComp('Трансмиссия', 'Трещотка/Кассета', 'Блок задних звезд', 6000);
    if (/Цепь|KMC/i.test(text)) addComp('Трансмиссия', 'Цепь', 'Цепь', 1500);
    if (/Система шатунов/i.test(text)) addComp('Трансмиссия', 'Система', 'Система шатунов', 15000);
    if (/Задний переключатель/i.test(text)) addComp('Трансмиссия', 'Переключатель (зад)', 'Задний переключатель', 8000);
    if (/Передний переключатель/i.test(text)) addComp('Трансмиссия', 'Переключатель (пер)', 'Передний переключатель', 8000);
    if (/Манетки/i.test(text)) addComp('Управление', 'Манетки', 'Манетки', 10000);
    if (/Тормоза|Колодки/i.test(text)) addComp('Тормозная система', 'Колодки', 'Тормозные колодки', 1500);
    if (/Каретка/i.test(text)) addComp('Трансмиссия', 'Каретка', 'Каретка', 10000);
    if (/Тросы|Рубашки/i.test(text)) addComp('Тормозная система', 'Тросы', 'Тросы и рубашки', 3000);

    if (parsedComponents.length === 0) {
      addComp('Трансмиссия', 'Цепь', 'Цепь (базовая)', 2500);
      addComp('Трансмиссия', 'Кассета', 'Кассета', 5000);
      addComp('Колеса', 'Покрышки', 'Покрышки', 4000);
      addComp('Тормозная система', 'Колодки', 'Колодки', 1500);
    }

    setParsedData({ 
      name: bikeName, 
      type: "Custom", 
      photo: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&q=80&w=800", 
      components: parsedComponents 
    });
    setStep(3);
  };

  const handleAiParse = async () => {
    if (!pastedSpecs.trim()) return;
    setIsParsingAi(true);
    
    try {
      const prompt = `Проанализируй следующий текст со спецификацией велосипеда и извлеки из него все компоненты. 
      Для каждого компонента определи:
      1. Категорию (category): Трансмиссия, Тормозная система, Колеса, Подвеска, Рама, Управление.
      2. Тип (type): Цепь, Кассета, Покрышки, Вилка, Тормоза и т.д.
      3. Название (name): Конкретная модель из текста (например, "KMC Z7", "Shimano Tourney").
      4. Ресурс в км (lifespan): Оцени примерный ресурс до замены или ТО в километрах (целое число). Цепь ~1500-2500, Кассета ~5000-7000, Покрышки ~4000, Колодки ~1500, Рама ~50000. Если не уверен, дай среднюю оценку.
      
      Текст спецификации:
      ${pastedSpecs}`;

      const componentSchema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING" },
            type: { type: "STRING" },
            name: { type: "STRING" },
            lifespan: { type: "INTEGER" }
          },
          required: ["category", "type", "name", "lifespan"]
        }
      };

      const result = await callGemini(prompt, componentSchema);
      
      if (result && Array.isArray(result) && result.length > 0) {
        const mapped = result.map(comp => ({
          id: `tmp_${Math.random()}`,
          category: comp.category || 'Дополнительно',
          type: comp.type || 'Узел',
          name: comp.name || 'Неизвестно',
          lifespan: comp.lifespan || 2000,
          currentWornMileage: 0
        }));
        
        setParsedData({ 
          name: bikeName, 
          type: "AI Custom Spec", 
          photo: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&q=80&w=800", 
          components: mapped 
        });
        setStep(3);
      } else {
        throw new Error("Invalid format");
      }
    } catch (error) {
      alert('Ошибка ИИ-анализа. Попробуем обычный парсинг.');
      handleParseSpecs({preventDefault: () => {}});
    } finally {
      setIsParsingAi(false);
    }
  };

  const handleUpdateComponent = (id, field, value) => {
    setParsedData(prev => ({
      ...prev,
      components: prev.components.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const handleFinalSave = () => {
    const newBikeId = `b_${Date.now().toString()}`;
    const baseMileage = parseFloat(bikeTotalMileage) || 0;

    const newBike = {
      id: newBikeId,
      name: parsedData.name,
      model: parsedData.type, 
      year: new Date().getFullYear(),
      totalMileage: baseMileage,
      photo: parsedData.photo
    };

    const newComponents = parsedData.components.map(comp => {
      const wear = isAllOriginal ? baseMileage : (parseFloat(comp.currentWornMileage) || 0);
      const calculatedInstallMileage = baseMileage - wear;

      return {
        id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        bikeId: newBikeId,
        name: comp.name,
        category: comp.category,
        type: comp.type,
        installDate: new Date().toISOString().split('T')[0],
        installMileage: calculatedInstallMileage,
        lifespan: Number(comp.lifespan),
        archived: false
      }
    });

    onSave(newBike, newComponents);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {step === 1 && (
          <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 md:w-6 md:h-6 text-lime-500" /> Добавление велосипеда
            </h3>
            <p className="text-slate-400 mb-5 md:mb-6 text-xs md:text-sm">Введите название. Попробуйте написать "Racer" для загрузки полной спецификации из базы.</p>
            
            <form onSubmit={handleNextFromStep1}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-1.5 md:mb-2">Название модели</label>
                  <input 
                    type="text" autoFocus required
                    value={bikeName} onChange={e => setBikeName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 text-sm"
                    placeholder="Например: Racer Alpina Man 1.0"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-1.5 md:mb-2">Текущий пробег (км)</label>
                  <input 
                    type="number" min="0" required
                    value={bikeTotalMileage} onChange={e => setBikeTotalMileage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 text-sm"
                    placeholder="0 если новый"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6 md:mt-8">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 md:py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm font-semibold">Отмена</button>
                <button type="submit" disabled={!bikeName.trim() || !bikeTotalMileage} className="flex-1 px-4 py-2.5 md:py-3 bg-lime-500 text-slate-950 font-bold rounded-xl hover:bg-lime-400 disabled:opacity-50 flex justify-center items-center gap-1.5 md:gap-2 text-sm">
                   Далее <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="p-5 md:p-6 flex flex-col h-full overflow-hidden">
             <h3 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2 shrink-0">
              <FileText className="w-5 h-5 md:w-6 md:h-6 text-lime-500" /> Парсинг спецификации
            </h3>
            <p className="text-slate-400 mb-4 text-xs md:text-sm shrink-0">Вставьте текст со спецификацией велосипеда (например, скопированный из магазина), и система выделит из него все детали.</p>
            <form onSubmit={handleParseSpecs} className="flex flex-col flex-1 min-h-[300px]">
              <div className="flex-1 mb-4 md:mb-6 min-h-[150px]">
                 <textarea 
                    autoFocus required value={pastedSpecs} onChange={e => setPastedSpecs(e.target.value)}
                    className="w-full h-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 resize-none custom-scrollbar text-sm"
                    placeholder="Рама: Алюминий, Вилка: Амортизационная..."
                  />
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 md:gap-3 shrink-0">
                <div className="flex gap-2 w-full sm:w-auto">
                  <button type="button" onClick={() => setStep(1)} className="w-1/3 sm:w-auto px-4 py-2.5 md:py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm font-semibold">Назад</button>
                  <button type="submit" className="w-2/3 sm:flex-1 px-3 py-2.5 md:py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors flex justify-center items-center gap-1.5 text-xs md:text-sm">
                     Обычный <Search className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </div>
                <button type="button" onClick={handleAiParse} disabled={isParsingAi || !pastedSpecs.trim()} className="w-full sm:flex-1 px-3 py-2.5 md:py-3 bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 font-bold rounded-xl hover:bg-indigo-500/30 transition-colors flex justify-center items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                   {isParsingAi ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" /> ИИ Анализ</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && parsedData && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-5 md:p-6 border-b border-slate-800 bg-slate-900 shrink-0">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Настройка узлов</h3>
              
              <div className="bg-slate-950 border border-slate-800 p-3 md:p-4 rounded-xl">
                <label className="flex items-start gap-2.5 md:gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isAllOriginal}
                    onChange={(e) => setIsAllOriginal(e.target.checked)}
                    className="mt-0.5 md:mt-1 w-4 h-4 md:w-5 md:h-5 rounded border-slate-700 text-lime-500 focus:ring-lime-500 bg-slate-900"
                  />
                  <div>
                    <div className="font-bold text-white text-sm md:text-base">С завода (Оригинал)</div>
                    <div className="text-[10px] md:text-xs text-slate-400 mt-0.5">Снимите галочку, если детали менялись и вы хотите указать пробег каждой вручную.</div>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar bg-slate-950">
              {parsedData.components.map((comp) => (
                <div key={comp.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-3 md:gap-4 md:items-center">
                  <div className="flex-1">
                    <div className="text-[10px] md:text-xs text-lime-400 mb-1 font-semibold uppercase">{comp.category} • {comp.type}</div>
                    <input 
                      type="text" value={comp.name}
                      onChange={(e) => handleUpdateComponent(comp.id, 'name', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-lime-500 focus:outline-none font-bold"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-1 md:w-28">
                      <label className="block text-[10px] md:text-xs text-slate-500 mb-1">Ресурс (км)</label>
                      <input 
                        type="number" value={comp.lifespan} min="0"
                        onChange={(e) => handleUpdateComponent(comp.id, 'lifespan', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-lime-400 font-mono text-sm focus:border-lime-500 focus:outline-none"
                      />
                    </div>

                    {!isAllOriginal && comp.lifespan > 0 && (
                      <div className="flex-1 md:w-28">
                        <label className="block text-[10px] md:text-xs text-orange-400 mb-1">Прошел (км)</label>
                        <input 
                          type="number" value={comp.currentWornMileage} min="0"
                          onChange={(e) => handleUpdateComponent(comp.id, 'currentWornMileage', e.target.value)}
                          className="w-full bg-slate-950 border border-orange-900/50 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 md:p-6 border-t border-slate-800 bg-slate-900 shrink-0">
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="px-5 py-2.5 md:py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm font-semibold">В начало</button>
                <button onClick={handleFinalSave} className="flex-1 px-4 py-2.5 md:py-3 bg-lime-500 text-slate-950 font-bold rounded-xl hover:bg-lime-400 transition-colors text-sm">Сохранить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}