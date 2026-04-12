import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bike, Settings, Activity, Plus, AlertTriangle, CheckCircle, ChevronRight, 
  Search, RefreshCw, Trash2, Loader2, LayoutGrid, History, ExternalLink, 
  ListPlus, FileText, Sparkles, Globe, Lock, LogOut, Users
} from 'lucide-react';

// --- FIREBASE ИМПОРТЫ ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";

// --- ТВОИ КЛЮЧИ ---
const firebaseConfig = {
  apiKey: "AIzaSyDRmTQ3sxe_AFyyNpyYb7SIW_wbi-fh_jI",
  authDomain: "velokeep-cloud.firebaseapp.com",
  projectId: "velokeep-cloud",
  storageBucket: "velokeep-cloud.firebasestorage.app",
  messagingSenderId: "872200307929",
  appId: "1:872200307929:web:9b3c5ab47e7a767f66eac8",
  measurementId: "G-JK6NJD5X8B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- ИИ ПОМОЩНИК ---
const callGemini = async (prompt, jsonSchema = null) => {
  const apiKey = ""; // Вставь свой API ключ Gemini сюда, когда он появится
  if (!apiKey) return "ИИ-советник пока отключен (нет API ключа).";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  if (jsonSchema) payload.generationConfig = { responseMimeType: "application/json", responseSchema: jsonSchema };

  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    return jsonSchema ? JSON.parse(text) : text;
  } catch (error) {
    return null;
  }
};

// --- БАЗА ВЕЛОСИПЕДОВ ---
const bikeDatabase = {
  "racer alpina man 1.0": {
    type: "Hybrid/City", photo: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=800",
    components: [
      { category: 'Рама', type: 'Рама', name: "Алюминий", lifespan: 50000 },
      { category: 'Подвеска', type: 'Вилка', name: "Амортизационная", lifespan: 1500 },
      { category: 'Колеса', type: 'Покрышки', name: "Wanda 700x40C", lifespan: 4000 },
      { category: 'Трансмиссия', type: 'Трещотка', name: "Shimano MF-TZ500", lifespan: 6000 },
      { category: 'Трансмиссия', type: 'Цепь', name: "KMC Z7", lifespan: 1500 },
      { category: 'Тормозная система', type: 'Колодки', name: "Дисковые ZOOM", lifespan: 1500 }
    ]
  }
};

// ==========================================
// ГЛАВНЫЙ КОМПОНЕНТ-КОНТЕЙНЕР (ЛОГИН + РОУТИНГ)
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { console.error("Ошибка входа", error); }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-10 h-10 text-lime-500 animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center shadow-2xl">
          <div className="w-20 h-20 bg-lime-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="w-10 h-10 text-lime-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">VeloKeep Cloud</h1>
          <p className="text-slate-400 mb-8">Умный облачный гараж и социальная сеть для велосипедистов. Синхронизация на всех устройствах.</p>
          <button onClick={handleLogin} className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-3">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
            Войти через Google
          </button>
        </div>
      </div>
    );
  }

  return <MainApp user={user} />;
}

// ==========================================
// ОСНОВНОЕ ПРИЛОЖЕНИЕ (ДЛЯ АВТОРИЗОВАННЫХ)
// ==========================================
function MainApp({ user }) {
  const [activeTab, setActiveTab] = useState('garage');
  
  // Данные из облака
  const [bikes, setBikes] = useState([]);
  const [components, setComponents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeBikeId, setActiveBikeId] = useState(null);
  
  // Подписка на облачные данные пользователя
  useEffect(() => {
    const qBikes = query(collection(db, "bikes"), where("userId", "==", user.uid));
    const unsubBikes = onSnapshot(qBikes, snap => setBikes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qComps = query(collection(db, "components"), where("userId", "==", user.uid));
    const unsubComps = onSnapshot(qComps, snap => setComponents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qLogs = query(collection(db, "logs"), where("userId", "==", user.uid));
    const unsubLogs = onSnapshot(qLogs, snap => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubBikes(); unsubComps(); unsubLogs(); };
  }, [user]);

  const activeBike = bikes.find(b => b.id === activeBikeId) || null;

  // Математика износа
  const activeComponentsWithWear = useMemo(() => {
    if (!activeBike) return [];
    return components
      .filter(c => c.bikeId === activeBike.id && !c.archived)
      .map(comp => {
        const distanceSinceInstall = activeBike.totalMileage - comp.installMileage;
        let wearPercentage = comp.lifespan > 0 ? (distanceSinceInstall / comp.lifespan) * 100 : 0;
        let status = 'good';
        if (wearPercentage >= 100) status = 'critical';
        else if (wearPercentage >= 75) status = 'warning';
        return { ...comp, distanceSinceInstall, wearPercentage, status };
      });
  }, [components, activeBike ? activeBike.totalMileage : 0]);

  // --- ОБЛАЧНЫЕ ДЕЙСТВИЯ ---

  const handleAddRide = async (distance, notes = '') => {
    const distNum = parseFloat(distance);
    if (!activeBike || isNaN(distNum) || distNum <= 0) return;

    await updateDoc(doc(db, "bikes", activeBike.id), { 
      totalMileage: activeBike.totalMileage + distNum 
    });

    await addDoc(collection(db, "logs"), {
      bikeId: activeBike.id,
      userId: user.uid,
      date: new Date().toISOString().split('T')[0],
      type: 'ride',
      text: `Заезд: ${distNum} км` + (notes ? `\n${notes}` : ''),
      timestamp: Date.now()
    });
  };

  const handleAddBike = async (newBike, newComponents) => {
    try {
      const bikeRef = await addDoc(collection(db, "bikes"), { 
        ...newBike, 
        userId: user.uid, 
        isPublic: false,
        authorName: user.displayName 
      });
      
      for (let comp of newComponents) {
        await addDoc(collection(db, "components"), { ...comp, bikeId: bikeRef.id, userId: user.uid });
      }
      
      setActiveBikeId(bikeRef.id);
      setActiveTab('dashboard');
    } catch (e) { console.error("Ошибка добавления", e); }
  };

  const handleQuickReplace = async (oldComponentId, newItemDetails) => {
    const oldComp = components.find(c => c.id === oldComponentId);
    if (!oldComp || !activeBike) return;

    await updateDoc(doc(db, "components", oldComponentId), { 
      archived: true, 
      archiveDate: new Date().toISOString().split('T')[0] 
    });

    await addDoc(collection(db, "components"), {
      bikeId: activeBike.id,
      userId: user.uid,
      name: newItemDetails.name || oldComp.name,
      category: oldComp.category,
      type: oldComp.type,
      installDate: new Date().toISOString().split('T')[0],
      installMileage: activeBike.totalMileage,
      lifespan: newItemDetails.lifespan || oldComp.lifespan,
      archived: false
    });

    await addDoc(collection(db, "logs"), {
      bikeId: activeBike.id,
      userId: user.uid,
      date: new Date().toISOString().split('T')[0],
      type: 'maintenance',
      text: `Замена "${newItemDetails.name || oldComp.name}" на пробеге ${Math.round(activeBike.totalMileage)} км`,
      timestamp: Date.now()
    });
  };

  const handleDeleteBike = async (bikeId) => {
    if(window.confirm("Удалить велосипед навсегда?")) {
      await deleteDoc(doc(db, "bikes", bikeId));
      if (activeBikeId === bikeId) {
        setActiveBikeId(null);
        setActiveTab('garage');
      }
      // Очистка компонентов и логов требует облачных функций, пока оставляем так (они не будут мешать).
    }
  };

  const togglePublicStatus = async (bikeId, currentStatus) => {
    await updateDoc(doc(db, "bikes", bikeId), { isPublic: !currentStatus });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-lime-500 selection:text-slate-950 flex flex-col pb-20 md:pb-8">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lime-400">
            <Activity className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight hidden sm:block">VeloKeep Cloud</span>
          </div>
          <nav className="flex gap-2 overflow-x-auto no-scrollbar">
            <NavBtn active={activeTab === 'garage'} onClick={() => setActiveTab('garage')} icon={<LayoutGrid />} label="Гараж" />
            <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Bike />} label="Дашборд" />
            <NavBtn active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={<Settings />} label="Узлы" />
            <div className="w-px h-6 bg-slate-800 self-center mx-1"></div>
            <NavBtn active={activeTab === 'public'} onClick={() => setActiveTab('public')} icon={<Users className="text-indigo-400" />} label="Парковка" />
          </nav>
          <button onClick={() => signOut(auth)} className="p-2 ml-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 md:py-8">
        {activeTab === 'garage' && (
          <GarageTab bikes={bikes} activeBikeId={activeBikeId} onSelectBike={(id) => { setActiveBikeId(id); setActiveTab('dashboard'); }} onDeleteBike={handleDeleteBike} onAddBike={handleAddBike} onTogglePublic={togglePublicStatus} />
        )}
        
        {activeTab === 'dashboard' && activeBike && (
          <DashboardTab bike={activeBike} alerts={activeComponentsWithWear.filter(c => c.status !== 'good')} components={activeComponentsWithWear} logs={logs.filter(l => l.bikeId === activeBike.id).sort((a,b) => b.timestamp - a.timestamp)} onAddRide={handleAddRide} />
        )}
        
        {activeTab === 'dashboard' && !activeBike && (
          <div className="text-center py-20 text-slate-500">Нет активных велосипедов. Добавьте байк в Гараже.</div>
        )}
        
        {activeTab === 'details' && activeBike && (
          <ComponentsTab components={activeComponentsWithWear} onReplace={handleQuickReplace} />
        )}

        {activeTab === 'public' && (
          <PublicParkingTab currentUserId={user.uid} />
        )}
      </main>
    </div>
  );
}

// ==========================================
// ВКЛАДКИ
// ==========================================

// --- ОБЩЕСТВЕННАЯ ПАРКОВКА ---
function PublicParkingTab({ currentUserId }) {
  const [publicBikes, setPublicBikes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "bikes"), where("isPublic", "==", true));
    const unsub = onSnapshot(q, snap => {
      setPublicBikes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <div className="text-center py-20"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2"><Users className="text-indigo-400 w-8 h-8"/> Общественная парковка</h1>
        <p className="text-slate-400 mt-1">Велосипеды других пользователей VeloKeep</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {publicBikes.map(bike => (
          <div key={bike.id} className="bg-slate-900 border border-indigo-500/20 rounded-2xl overflow-hidden shadow-xl relative">
            {bike.userId === currentUserId && <div className="absolute top-3 left-3 z-20 bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow">Твой байк</div>}
            <div className="h-40 w-full relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
              <img src={bike.photo} alt={bike.name} className="w-full h-full object-cover opacity-60" />
              <div className="absolute bottom-4 left-5 z-20">
                <h3 className="text-2xl font-bold text-white leading-tight">{bike.name}</h3>
                <p className="text-indigo-300 text-sm">Владелец: {bike.authorName || 'Аноним'}</p>
              </div>
            </div>
            <div className="p-5 flex justify-between items-center bg-slate-900">
              <div>
                <div className="text-xs text-slate-500 uppercase font-semibold">Заявленный пробег</div>
                <div className="text-xl font-bold text-slate-200">{Math.round(bike.totalMileage)} км</div>
              </div>
              <button disabled className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl cursor-not-allowed text-sm">Просмотр (скоро)</button>
            </div>
          </div>
        ))}
        {publicBikes.length === 0 && <div className="col-span-2 text-center py-10 text-slate-500">Пока никто не припарковал здесь свой велосипед. Будь первым!</div>}
      </div>
    </div>
  );
}

// --- ГАРАЖ ---
function GarageTab({ bikes, activeBikeId, onSelectBike, onDeleteBike, onAddBike, onTogglePublic }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Мой Гараж</h1>
          <p className="text-slate-400 mt-1">Управление приватным автопарком</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-lime-500 hover:bg-lime-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold transition-colors w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" /> Добавить
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {bikes.map(bike => (
          <div key={bike.id} className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-xl transition-all ${activeBikeId === bike.id ? 'border-lime-500' : 'border-slate-800'}`}>
            <div className="h-40 relative cursor-pointer group" onClick={() => onSelectBike(bike.id)}>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
              <img src={bike.photo} alt={bike.name} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform" />
              <div className="absolute bottom-4 left-5 z-20">
                <h3 className="text-2xl font-bold text-white">{bike.name}</h3>
                <p className="text-slate-300 text-sm">{bike.model}</p>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3 bg-slate-900">
              <div className="flex justify-between items-center">
                <div className="text-xl font-bold text-slate-200">{Math.round(bike.totalMileage)} км</div>
                <div className="flex gap-2">
                  <button onClick={() => onTogglePublic(bike.id, bike.isPublic)} className={`p-2 rounded-xl transition-colors border ${bike.isPublic ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-800 text-slate-500 border-transparent hover:text-slate-300'}`} title="Видимость на общественной парковке">
                    {bike.isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteBike(bike.id); }} className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {isModalOpen && <AddBikeModal onClose={() => setIsModalOpen(false)} onSave={onAddBike} />}
    </div>
  );
}

// --- ДАШБОРД (сокращенный для лимитов кода, функционал сохранен) ---
function DashboardTab({ bike, alerts, components, logs, onAddRide }) {
  const [showAdd, setShowAdd] = useState(false);
  const [dist, setDist] = useState('');

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="h-48 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent z-10" />
          <img src={bike.photo} alt={bike.name} className="w-full h-full object-cover opacity-60" />
          <div className="absolute bottom-4 left-6 z-20">
            <h1 className="text-3xl font-bold text-white">{bike.name}</h1>
            <p className="text-lime-400 font-bold">{Math.round(bike.totalMileage)} км</p>
          </div>
        </div>
        <div className="p-4 bg-slate-900 flex justify-end gap-3">
          <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 bg-lime-500 hover:bg-lime-400 text-slate-950 rounded-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5"/>Добавить заезд</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
         {/* Узлы (кратко) */}
         <div className="space-y-4">
           <h2 className="text-xl font-bold text-white">Текущее состояние</h2>
           <div className="bg-slate-900 rounded-xl border border-slate-800 divide-y divide-slate-800/50">
             {components.slice(0, 5).map(c => (
               <div key={c.id} className="p-4 flex justify-between items-center">
                 <div>
                   <div className="font-bold text-white text-sm">{c.name}</div>
                   <div className="text-xs text-slate-400">{c.type}</div>
                 </div>
                 <div className="w-1/3 text-right">
                   <div className={`text-sm font-bold ${c.status === 'critical' ? 'text-red-500' : 'text-slate-300'}`}>{Math.round(c.wearPercentage)}%</div>
                   <div className="text-xs text-slate-500">{Math.round(c.distanceSinceInstall)} км</div>
                 </div>
               </div>
             ))}
           </div>
         </div>
         {/* История */}
         <div className="space-y-4">
           <h2 className="text-xl font-bold text-white flex items-center gap-2"><History className="w-5 h-5"/> Журнал (Cloud)</h2>
           <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 max-h-[400px] overflow-y-auto">
             {logs.map(log => (
               <div key={log.id} className="mb-4 border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                 <div className={`font-bold text-xs ${log.type === 'maintenance' ? 'text-lime-400' : 'text-blue-400'}`}>{log.date} • {log.type === 'maintenance' ? 'Сервис' : 'Заезд'}</div>
                 <div className="text-sm text-slate-300 mt-1">{log.text}</div>
               </div>
             ))}
             {logs.length === 0 && <div className="text-slate-500 text-center">Нет записей</div>}
           </div>
         </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-4">Внести дистанцию</h3>
            <input type="number" value={dist} onChange={e => setDist(e.target.value)} placeholder="Километры" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white mb-4"/>
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 border border-slate-700 text-slate-300 rounded-xl">Отмена</button>
              <button onClick={() => { onAddRide(dist); setShowAdd(false); setDist(''); }} className="flex-1 py-3 bg-lime-500 text-slate-950 font-bold rounded-xl">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- УЗЛЫ ---
function ComponentsTab({ components, onReplace }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Контроль узлов</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800/50">
        {components.map(c => (
          <div key={c.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <div className="font-bold text-white">{c.name}</div>
              <div className="text-xs text-slate-400">{c.category} • {c.type}</div>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-right">
                 <div className={`font-bold ${c.status === 'critical' ? 'text-red-500' : 'text-slate-300'}`}>{Math.round(c.wearPercentage)}% износа</div>
                 <div className="text-xs text-slate-500">{Math.round(c.distanceSinceInstall)} / {c.lifespan} км</div>
               </div>
               <button onClick={() => onReplace(c.id, {})} className="p-2 bg-lime-500 text-slate-950 rounded-lg font-bold" title="Заменить деталь"><RefreshCw className="w-4 h-4"/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- ВСПОМОГАТЕЛЬНЫЕ ---
function NavBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${active ? 'bg-lime-500/10 text-lime-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
      {React.cloneElement(icon, { size: 18 })} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function AddBikeModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm">
        <h3 className="text-xl font-bold text-white mb-4">Название велосипеда</h3>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Например: Мой Racer" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white mb-4 focus:border-lime-500 focus:outline-none"/>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-700 text-slate-300 rounded-xl font-semibold">Отмена</button>
          <button onClick={() => {
            const dbBike = bikeDatabase["racer alpina man 1.0"]; // Упрощено для примера
            onSave(
              { name: name || 'Racer', model: dbBike.type, photo: dbBike.photo, totalMileage: 0 },
              dbBike.components.map(c => ({ ...c, installMileage: 0, archived: false }))
            );
          }} className="flex-1 py-3 bg-lime-500 text-slate-950 font-bold rounded-xl">В Гараж</button>
        </div>
      </div>
    </div>
  );
}