import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bike, Settings, Activity, Plus, AlertTriangle, CheckCircle, ChevronRight, 
  Search, RefreshCw, Trash2, Loader2, LayoutGrid, History, ExternalLink, 
  ListPlus, FileText, Sparkles, Globe, Lock, LogOut, Users, Calendar, X, Pencil
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
  const apiKey = ""; // Вставь свой API ключ Gemini
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

// --- БАЗА "ЭКСПЕРТ-МЕХАНИК" ---
const bikeDatabase = {
  "racer alpina man 1.0": {
    type: "City/Hybrid", photo: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=800",
    components: [
      { category: 'Рама и Вилка', type: 'Рама', name: "Алюминиевая рама", article: "BSA 68mm, 135mm QR", lifespan: 50000 },
      { category: 'Рама и Вилка', type: 'Вилка', name: "Амортизационная пружинная", article: "1-1/8 straight, 100mm QR", lifespan: 1500 },
      { category: 'Колеса', type: 'Втулка (пер)', name: "Joytech", article: "Насыпные подшипники, 100mm QR, 6 болтов", lifespan: 5000 },
      { category: 'Колеса', type: 'Втулка (зад)', name: "Joytech", article: "Насыпные подшипники, 135mm QR, 6 болтов, под трещотку", lifespan: 5000 },
      { category: 'Колеса', type: 'Покрышка (пер)', name: "Wanda", article: "700x40C", lifespan: 6000 },
      { category: 'Колеса', type: 'Покрышка (зад)', name: "Wanda", article: "700x40C", lifespan: 3500 },
      { category: 'Трансмиссия', type: 'Трещотка', name: "Shimano MF-TZ500", article: "7 скоростей, 14-28T", lifespan: 6000 },
      { category: 'Трансмиссия', type: 'Цепь', name: "KMC Z7", article: "7 скоростей", lifespan: 1500 },
      { category: 'Трансмиссия', type: 'Система шатунов', name: "Prowheel", article: "42/34/24T, под квадрат", lifespan: 15000 },
      { category: 'Трансмиссия', type: 'Переключатель (зад)', name: "Shimano Tourney", article: "7 ск, Long cage", lifespan: 8000 },
      { category: 'Трансмиссия', type: 'Переключатель (пер)', name: "Shimano Tourney", article: "3 ск, 31.8mm clamp", lifespan: 8000 },
      { category: 'Трансмиссия', type: 'Каретка', name: "Картридж", article: "BSA 68mm, под квадрат", lifespan: 10000 },
      { category: 'Тормозная система', type: 'Колодки (пер)', name: "ZOOM Дисковые механика", article: "Аналог B01S", lifespan: 1500 },
      { category: 'Тормозная система', type: 'Колодки (зад)', name: "ZOOM Дисковые механика", article: "Аналог B01S", lifespan: 1500 },
      { category: 'Управление', type: 'Руль', name: "Стальной Riser", article: "31.8mm", lifespan: 0 },
      { category: 'Управление', type: 'Подседельный штырь', name: "Алюминий", article: "27.2mm", lifespan: 0 }
    ]
  }
};

const mockAnalogsDB = {
  'Цепь': [
    { name: 'KMC X8 Silver/Black', lifespan: 3000, price: 15, brand: 'KMC' },
    { name: 'Shimano HG40', lifespan: 2500, price: 12, brand: 'Shimano' },
  ],
  'Трещотка': [
    { name: 'Shimano TZ500 7-speed', lifespan: 5000, price: 20, brand: 'Shimano' }
  ]
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

  const handleAddRide = async (distance, dateStr, notes = '') => {
    const distNum = parseFloat(distance);
    if (!activeBike || isNaN(distNum) || distNum <= 0) return;

    await updateDoc(doc(db, "bikes", activeBike.id), { 
      totalMileage: activeBike.totalMileage + distNum 
    });

    await addDoc(collection(db, "logs"), {
      bikeId: activeBike.id,
      userId: user.uid,
      date: dateStr, 
      type: 'ride',
      text: `Заезд: ${distNum} км` + (notes ? `\nЗаметка: ${notes}` : ''),
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

  const handleAddNewManualComponent = async (compData) => {
    if (!activeBike) return;
    const newComponent = {
      bikeId: activeBike.id,
      userId: user.uid,
      name: compData.name,
      category: compData.category || 'Дополнительно',
      type: compData.type || 'Узел',
      article: compData.article || '',
      installDate: new Date().toISOString().split('T')[0],
      installMileage: activeBike.totalMileage - (parseFloat(compData.currentWorn) || 0),
      lifespan: parseFloat(compData.lifespan) || 0,
      archived: false
    };
    await addDoc(collection(db, "components"), newComponent);
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
      article: newItemDetails.article !== undefined ? newItemDetails.article : oldComp.article,
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

  const handleEditComponent = async (compId, updatedData) => {
    await updateDoc(doc(db, "components", compId), updatedData);
  };

  const handleDeleteBike = async (bikeId) => {
    if(window.confirm("Удалить велосипед навсегда?")) {
      await deleteDoc(doc(db, "bikes", bikeId));
      if (activeBikeId === bikeId) {
        const remaining = bikes.filter(b => b.id !== bikeId);
        setActiveBikeId(remaining.length > 0 ? remaining[0].id : null);
        if (remaining.length === 0) setActiveTab('garage');
      }
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
          <DashboardTab 
            bike={activeBike} 
            alerts={activeComponentsWithWear.filter(c => c.status !== 'good')} 
            components={activeComponentsWithWear} 
            logs={logs.filter(l => l.bikeId === activeBike.id).sort((a,b) => new Date(b.date) - new Date(a.date) || b.timestamp - a.timestamp)} 
            onAddRide={handleAddRide} 
          />
        )}
        
        {activeTab === 'dashboard' && !activeBike && (
          <div className="text-center py-20 text-slate-500">Нет активных велосипедов. Добавьте байк в Гараже.</div>
        )}
        
        {activeTab === 'details' && activeBike && (
          <ComponentsTab 
            components={activeComponentsWithWear} 
            onReplace={handleQuickReplace} 
            onAddNew={handleAddNewManualComponent} 
            onEdit={handleEditComponent}
          />
        )}

        {activeTab === 'public' && (
          <PublicParkingTab currentUserId={user.uid} />
        )}
      </main>
    </div>
  );
}

// ==========================================
// ВКЛАДКИ И МОДАЛКИ
// ==========================================

// --- ОБЩЕСТВЕННАЯ ПАРКОВКА ---
function PublicParkingTab({ currentUserId }) {
  const [publicBikes, setPublicBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewBike, setViewBike] = useState(null);

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
              <button onClick={() => setViewBike(bike)} className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold transition-colors text-sm flex items-center gap-2">
                <Search className="w-4 h-4" /> Просмотр
              </button>
            </div>
          </div>
        ))}
        {publicBikes.length === 0 && <div className="col-span-2 text-center py-10 text-slate-500">Пока никто не припарковал здесь свой велосипед. Будь первым!</div>}
      </div>

      {viewBike && <PublicBikeViewModal bike={viewBike} onClose={() => setViewBike(null)} />}
    </div>
  );
}

// --- МОДАЛКА ПРОСМОТРА ЧУЖОГО БАЙКА ---
function PublicBikeViewModal({ bike, onClose }) {
  const [components, setComponents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qComps = query(collection(db, "components"), where("bikeId", "==", bike.id));
    const unsubComps = onSnapshot(qComps, snap => setComponents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qLogs = query(collection(db, "logs"), where("bikeId", "==", bike.id));
    const unsubLogs = onSnapshot(qLogs, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubComps(); unsubLogs(); };
  }, [bike.id]);

  const componentsWithWear = useMemo(() => {
    return components.filter(c => !c.archived).map(comp => {
      const distanceSinceInstall = bike.totalMileage - comp.installMileage;
      let wearPercentage = comp.lifespan > 0 ? (distanceSinceInstall / comp.lifespan) * 100 : 0;
      let status = 'good';
      if (wearPercentage >= 100) status = 'critical';
      else if (wearPercentage >= 75) status = 'warning';
      return { ...comp, distanceSinceInstall, wearPercentage, status };
    });
  }, [components, bike.totalMileage]);

  const sortedLogs = [...logs].sort((a,b) => new Date(b.date) - new Date(a.date) || b.timestamp - a.timestamp);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-4 md:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" /> {bike.name}
            </h3>
            <p className="text-slate-400 text-sm">Владелец: {bike.authorName || 'Аноним'}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="h-40 md:h-48 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent z-10" />
              <img src={bike.photo} alt={bike.name} className="w-full h-full object-cover opacity-60" />
              <div className="absolute bottom-4 left-6 z-20">
                <p className="text-indigo-300 text-sm font-semibold mb-1">{bike.model}</p>
                <p className="text-white text-xl md:text-2xl font-bold">Пробег: <span className="text-lime-400">{Math.round(bike.totalMileage)} км</span></p>
              </div>
            </div>
          </div>

          {loading ? (
             <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Текущее состояние</h2>
                <div className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-800/50">
                  {componentsWithWear.length === 0 ? (
                    <div className="p-6 text-slate-500 text-sm text-center">Нет данных об узлах</div>
                  ) : (
                    componentsWithWear.map(c => (
                      <div key={c.id} className="p-4 flex justify-between items-center">
                        <div className="pr-2">
                          <div className="font-bold text-white text-sm leading-tight">{c.name}</div>
                          <div className="text-[10px] text-indigo-400 font-mono mt-0.5">{c.article || 'Нет спецификации'}</div>
                          <div className="text-xs text-slate-500 mt-1">{c.category} • {c.type}</div>
                        </div>
                        <div className="w-1/3 text-right shrink-0">
                          <div className={`text-sm font-bold ${c.status === 'critical' ? 'text-red-500' : 'text-slate-300'}`}>{Math.round(c.wearPercentage)}%</div>
                          <div className="text-[10px] sm:text-xs text-slate-500">{Math.round(c.distanceSinceInstall)} / {c.lifespan || '∞'} км</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><History className="w-5 h-5 text-indigo-400"/> Бортовой журнал</h2>
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {sortedLogs.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-10">Владелец пока не оставил записей</div>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-800">
                      {sortedLogs.map(log => (
                        <div key={log.id} className="relative flex items-start gap-3 md:gap-4">
                          <div className={`mt-1 flex items-center justify-center w-4 h-4 rounded-full border-4 border-slate-950 shrink-0 shadow z-10 ${log.type === 'maintenance' ? 'bg-lime-500' : 'bg-blue-500'}`}></div>
                          <div className="flex-1 bg-slate-900 p-3 rounded-xl border border-slate-800">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-1">
                              <div className={`font-bold text-xs flex items-center gap-1.5 ${log.type === 'maintenance' ? 'text-lime-400' : 'text-blue-400'}`}>
                                <Calendar className="w-3 h-3" /> {log.date}
                              </div>
                              <span className="text-[10px] text-slate-500 uppercase font-semibold">{log.type === 'maintenance' ? 'Сервис' : 'Заезд'}</span>
                            </div>
                            <div className="text-sm text-slate-300 mt-1 whitespace-pre-line">{log.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- ГАРАЖ И МАСТЕР ДОБАВЛЕНИЯ ВЕЛОСИПЕДА ---
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
          <div key={bike.id} className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-xl transition-all ${activeBikeId === bike.id ? 'border-lime-500 ring-1 ring-lime-500' : 'border-slate-800'}`}>
            <div className="h-40 relative cursor-pointer group" onClick={() => onSelectBike(bike.id)}>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
              <img src={bike.photo} alt={bike.name} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute bottom-4 left-5 z-20">
                <h3 className="text-2xl font-bold text-white leading-tight">{bike.name}</h3>
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
        article: comp.article || '',
        lifespan: comp.lifespan,
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
      parsedComponents.push({ category: cat, type: type, name: name, article: '', lifespan: ls, currentWornMileage: 0, id: `tmp_${Math.random()}` });
    };

    if (/Рама/i.test(text)) addComp('Рама и Вилка', 'Рама', 'Рама', 50000);
    if (/Вилка|Амортизац/i.test(text)) addComp('Рама и Вилка', 'Вилка', 'Амортизационная вилка', 1500);
    if (/Втулки|Обода/i.test(text)) { addComp('Колеса', 'Втулка (пер)', 'Втулка передняя', 5000); addComp('Колеса', 'Втулка (зад)', 'Втулка задняя', 5000); }
    if (/Покрышки|Шины|700x/i.test(text)) { addComp('Колеса', 'Покрышка (пер)', 'Покрышка', 6000); addComp('Колеса', 'Покрышка (зад)', 'Покрышка', 3500); }
    if (/Трещотка|Кассета/i.test(text)) addComp('Трансмиссия', 'Кассета/Трещотка', 'Блок задних звезд', 6000);
    if (/Цепь|KMC/i.test(text)) addComp('Трансмиссия', 'Цепь', 'Цепь', 1500);
    if (/Система шатунов/i.test(text)) addComp('Трансмиссия', 'Система', 'Система шатунов', 15000);
    if (/Задний переключатель/i.test(text)) addComp('Трансмиссия', 'Переключатель (зад)', 'Задний переключатель', 8000);
    if (/Манетки/i.test(text)) addComp('Управление', 'Манетки', 'Манетки', 10000);
    if (/Тормоза|Колодки/i.test(text)) { addComp('Тормозная система', 'Колодки (пер)', 'Колодки', 1500); addComp('Тормозная система', 'Колодки (зад)', 'Колодки', 1500); }
    if (/Каретка/i.test(text)) addComp('Трансмиссия', 'Каретка', 'Каретка', 10000);

    if (parsedComponents.length === 0) {
      addComp('Трансмиссия', 'Цепь', 'Цепь (базовая)', 2500);
      addComp('Трансмиссия', 'Кассета', 'Кассета', 5000);
      addComp('Колеса', 'Покрышка (зад)', 'Покрышка', 3500);
      addComp('Колеса', 'Покрышка (пер)', 'Покрышка', 6000);
      addComp('Тормозная система', 'Колодки (пер)', 'Колодки', 1500);
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
      const prompt = `Ты — Эксперт Веломеханик и Архитектор Данных.
      Проанализируй текст спецификации велосипеда и извлеки компоненты в JSON.
      
      СТРОГИЕ ПРАВИЛА:
      1. Категории строго: Рама и Вилка, Трансмиссия, Колеса, Тормозная система, Управление, Аксессуары.
      2. ОБЯЗАТЕЛЬНО разделяй парные детали на две отдельные записи: "Покрышка (пер)" и "Покрышка (зад)", "Колодки (пер)" и "Колодки (зад)", "Втулка (пер)" и "Втулка (зад)", "Ротор (пер)", "Ротор (зад)".
      3. В поле article сохраняй ВСЕ стандарты и спецификации (например: BSA 68mm, Centerlock, 700x40c, 1-1/8, BCD 104, Hollowtech II). Если нет - оставь пустым.
      4. Ресурсы (lifespan) в км: Рама 50000, Вилка 1500, Цепь 2000, Кассета 6000, Шатуны 15000, Передняя покрышка 6000, Задняя покрышка 3500, Колодки 1500, Роторы 8000, Тросы 3000.
      
      Текст: ${pastedSpecs}`;

      const componentSchema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING" },
            type: { type: "STRING" },
            name: { type: "STRING" },
            article: { type: "STRING" },
            lifespan: { type: "INTEGER" }
          },
          required: ["category", "type", "name", "article", "lifespan"]
        }
      };

      const result = await callGemini(prompt, componentSchema);
      
      if (result && Array.isArray(result) && result.length > 0) {
        const mapped = result.map(comp => ({
          id: `tmp_${Math.random()}`,
          category: comp.category || 'Дополнительно',
          type: comp.type || 'Узел',
          name: comp.name || 'Неизвестно',
          article: comp.article || '',
          lifespan: comp.lifespan || 2000,
          currentWornMileage: 0
        }));
        
        setParsedData({ 
          name: bikeName, type: "AI Custom Spec", 
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
    const baseMileage = parseFloat(bikeTotalMileage) || 0;

    const newBike = {
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
        name: comp.name,
        category: comp.category,
        type: comp.type,
        article: comp.article || '',
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
          <div className="p-5 md:p-6 overflow-y-auto">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="w-6 h-6 text-lime-500" /> Добавление велосипеда
            </h3>
            <p className="text-slate-400 mb-6 text-sm">Введите название. Попробуйте "Racer" для автозагрузки спецификации.</p>
            <form onSubmit={handleNextFromStep1}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Название модели</label>
                  <input type="text" autoFocus required value={bikeName} onChange={e => setBikeName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-500 text-sm" placeholder="Например: Racer Alpina Man 1.0" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Текущий пробег (км)</label>
                  <input type="number" min="0" required value={bikeTotalMileage} onChange={e => setBikeTotalMileage(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-500 text-sm" placeholder="0 если новый" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold">Отмена</button>
                <button type="submit" disabled={!bikeName.trim() || !bikeTotalMileage} className="flex-1 py-3 bg-lime-500 text-slate-950 font-bold rounded-xl hover:bg-lime-400 disabled:opacity-50 flex justify-center items-center gap-2">
                   Далее <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="p-5 md:p-6 flex flex-col h-full overflow-hidden">
             <h3 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2 shrink-0">
              <FileText className="w-6 h-6 text-lime-500" /> Парсинг спецификации
            </h3>
            <p className="text-slate-400 mb-4 text-sm shrink-0">Вставьте текст со спецификацией велосипеда для выделения из него всех деталей.</p>
            <form onSubmit={handleParseSpecs} className="flex flex-col flex-1 min-h-[300px]">
              <textarea autoFocus required value={pastedSpecs} onChange={e => setPastedSpecs(e.target.value)} className="w-full flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-500 resize-none text-sm mb-4" placeholder="Рама: Алюминий, Вилка: Амортизационная..." />
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <div className="flex gap-2 w-full sm:w-auto">
                  <button type="button" onClick={() => setStep(1)} className="px-4 py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold">Назад</button>
                  <button type="submit" className="flex-1 px-3 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 flex justify-center items-center gap-2 text-sm">
                     Обычный <Search className="w-4 h-4" />
                  </button>
                </div>
                <button type="button" onClick={handleAiParse} disabled={isParsingAi || !pastedSpecs.trim()} className="w-full sm:flex-1 py-3 bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 font-bold rounded-xl hover:bg-indigo-500/30 flex justify-center items-center gap-2 text-sm">
                   {isParsingAi ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-4 h-4" /> ИИ Анализ</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && parsedData && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-5 md:p-6 border-b border-slate-800 bg-slate-900 shrink-0">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-4">Настройка узлов</h3>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={isAllOriginal} onChange={(e) => setIsAllOriginal(e.target.checked)} className="mt-1 w-5 h-5 rounded border-slate-700 text-lime-500 bg-slate-900" />
                  <div>
                    <div className="font-bold text-white text-base">С завода (Оригинал)</div>
                    <div className="text-xs text-slate-400 mt-0.5">Снимите галочку, если детали менялись и вы хотите указать текущий износ каждой вручную.</div>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-slate-950">
              {parsedData.components.map((comp) => (
                <div key={comp.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 md:items-center">
                  <div className="flex-1">
                    <div className="text-xs text-lime-400 mb-1 font-semibold uppercase">{comp.category} • {comp.type}</div>
                    <input type="text" value={comp.name} onChange={(e) => handleUpdateComponent(comp.id, 'name', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-lime-500 focus:outline-none font-bold mb-2" />
                    <input type="text" value={comp.article} onChange={(e) => handleUpdateComponent(comp.id, 'article', e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-1.5 text-indigo-300 font-mono text-[10px] md:text-xs focus:border-indigo-500 focus:outline-none" placeholder="Спецификации (напр. BSA 68mm, 700x40c)" />
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-1 md:w-28">
                      <label className="block text-xs text-slate-500 mb-1">Ресурс (км)</label>
                      <input type="number" value={comp.lifespan} min="0" onChange={(e) => handleUpdateComponent(comp.id, 'lifespan', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-lime-400 font-mono text-sm focus:border-lime-500 focus:outline-none" />
                    </div>

                    {!isAllOriginal && comp.lifespan > 0 && (
                      <div className="flex-1 md:w-28">
                        <label className="block text-xs text-orange-400 mb-1">Уже прошел (км)</label>
                        <input type="number" value={comp.currentWornMileage} min="0" onChange={(e) => handleUpdateComponent(comp.id, 'currentWornMileage', e.target.value)} className="w-full bg-slate-950 border border-orange-900/50 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 md:p-6 border-t border-slate-800 bg-slate-900 shrink-0 flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="px-5 py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold">В начало</button>
              <button onClick={handleFinalSave} className="flex-1 py-3 bg-lime-500 text-slate-950 font-bold rounded-xl hover:bg-lime-400">Сохранить велосипед</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// --- ДАШБОРД (С ВЫБОРОМ ДАТЫ ЗАЕЗДА) ---
function DashboardTab({ bike, alerts, components, logs, onAddRide }) {
  const [showAdd, setShowAdd] = useState(false);
  const [dist, setDist] = useState('');
  const [rideDate, setRideDate] = useState(new Date().toISOString().split('T')[0]);
  const [rideNotes, setRideNotes] = useState('');

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
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><History className="w-5 h-5"/> Журнал (Cloud)</h2>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 max-h-[400px] overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="mb-4 border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                <div className={`font-bold text-xs flex items-center gap-1.5 ${log.type === 'maintenance' ? 'text-lime-400' : 'text-blue-400'}`}>
                  <Calendar className="w-3 h-3" /> {log.date} • {log.type === 'maintenance' ? 'Сервис' : 'Заезд'}
                </div>
                <div className="text-sm text-slate-300 mt-1 whitespace-pre-line">{log.text}</div>
              </div>
            ))}
            {logs.length === 0 && <div className="text-slate-500 text-center">Нет записей</div>}
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Внести дистанцию</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Дистанция (км)</label>
                <input type="number" value={dist} onChange={e => setDist(e.target.value)} placeholder="Например: 45.5" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white focus:outline-none focus:border-lime-500"/>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Дата заезда (можно изменить)</label>
                <input type="date" value={rideDate} onChange={e => setRideDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white focus:outline-none focus:border-lime-500 [color-scheme:dark]"/>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Заметка (опционально)</label>
                <textarea value={rideNotes} onChange={e => setRideNotes(e.target.value)} placeholder="Грязь, горы, впечатления..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white focus:outline-none focus:border-lime-500 resize-none h-20"/>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 border border-slate-700 text-slate-300 rounded-xl font-semibold hover:bg-slate-800">Отмена</button>
              <button onClick={() => { onAddRide(dist, rideDate, rideNotes); setShowAdd(false); setDist(''); setRideNotes(''); }} className="flex-1 py-3 bg-lime-500 text-slate-950 font-bold rounded-xl hover:bg-lime-400">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- УЗЛЫ (С КНОПКАМИ ДОБАВЛЕНИЯ И РЕДАКТИРОВАНИЯ) ---
function ComponentsTab({ components, onReplace, onAddNew, onEdit }) {
  const [showAddNewModal, setShowAddNewModal] = useState(false);
  const [compToEdit, setCompToEdit] = useState(null);

  const grouped = components.reduce((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Контроль узлов</h1>
          <p className="text-xs text-slate-400 mt-1">Детальная настройка и замена компонентов</p>
        </div>
        <button onClick={() => setShowAddNewModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-lime-400 border border-slate-700 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm">
          <ListPlus className="w-5 h-5" /> Добавить узел
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
             <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-800 text-xs font-bold text-lime-400 uppercase tracking-wider">{category}</div>
             <div className="divide-y divide-slate-800/50">
                {items.map(comp => (
                  <div key={comp.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-800/30 transition-colors group">
                    <div className="flex-1">
                      <div className="font-bold text-white text-base leading-tight">{comp.name}</div>
                      {comp.article && <div className="text-[10px] md:text-xs text-indigo-400 font-mono mt-0.5">{comp.article}</div>}
                      <div className="text-xs text-slate-500 mt-1">{comp.type}</div>
                    </div>
                    <div className="w-full sm:w-1/3 md:w-1/4">
                       {comp.lifespan > 0 ? (
                         <>
                           <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                             <span>{Math.round(comp.distanceSinceInstall)} / {comp.lifespan} км</span>
                             <span className={comp.status === 'critical' ? 'text-red-400 font-bold' : ''}>{Math.round(comp.wearPercentage)}%</span>
                           </div>
                           <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div className={`${comp.status === 'critical' ? 'bg-red-500' : comp.status === 'warning' ? 'bg-orange-500' : 'bg-green-500'} h-full`} style={{ width: `${Math.min(100, Math.max(2, comp.wearPercentage))}%` }} />
                           </div>
                         </>
                       ) : (
                         <div className="text-xs text-slate-500 py-1">Бессрочный узел</div>
                       )}
                    </div>
                    <div className="flex justify-end gap-2 shrink-0 mt-2 sm:mt-0">
                      {/* Кнопка РЕДАКТИРОВАТЬ */}
                      <button onClick={() => setCompToEdit(comp)} className="p-2 md:opacity-0 group-hover:opacity-100 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all" title="Редактировать параметры">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {/* Кнопка ЗАМЕНА */}
                      <button onClick={() => onReplace(comp.id, {})} className="px-3 py-2 bg-lime-500 hover:bg-lime-400 text-slate-950 rounded-lg font-bold text-xs flex gap-1.5 items-center">
                        <RefreshCw className="w-3.5 h-3.5" /> Замена
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        ))}
      </div>

      {showAddNewModal && (
        <AddNewComponentModal onClose={() => setShowAddNewModal(false)} onAdd={onAddNew} />
      )}

      {compToEdit && (
        <EditComponentModal component={compToEdit} onClose={() => setCompToEdit(null)} onSave={(updated) => { onEdit(compToEdit.id, updated); setCompToEdit(null); }} />
      )}
    </div>
  );
}

// МОДАЛКА РЕДАКТИРОВАНИЯ СУЩЕСТВУЮЩЕГО УЗЛА
function EditComponentModal({ component, onClose, onSave }) {
  const [name, setName] = useState(component.name);
  const [article, setArticle] = useState(component.article || '');
  const [category, setCategory] = useState(component.category);
  const [type, setType] = useState(component.type);
  const [lifespan, setLifespan] = useState(component.lifespan);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, article, category, type, lifespan: Number(lifespan) });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2"><Pencil className="w-5 h-5 text-lime-500"/> Изменить узел</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Категория • Тип детали</label>
            <div className="flex gap-2">
              <input type="text" value={category} onChange={e=>setCategory(e.target.value)} required className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-lime-500 focus:outline-none" />
              <input type="text" value={type} onChange={e=>setType(e.target.value)} required className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-lime-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Название детали</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold focus:border-lime-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Стандарты / Интерфейс (опционально)</label>
            <input type="text" value={article} onChange={e=>setArticle(e.target.value)} className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl p-3 text-indigo-300 font-mono text-sm focus:border-indigo-500 focus:outline-none" placeholder="BSA 68mm, 700x40c, Centerlock" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Заявленный ресурс (км)</label>
            <input type="number" value={lifespan} onChange={e=>setLifespan(e.target.value)} required min="0" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-lime-400 font-mono focus:border-lime-500 focus:outline-none" />
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 p-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold">Отмена</button>
            <button type="submit" className="flex-1 p-3 bg-lime-500 text-slate-950 font-bold rounded-xl hover:bg-lime-400">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// МОДАЛКА НОВОЙ ДЕТАЛИ
function AddNewComponentModal({ onClose, onAdd }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onAdd({ 
      name: formData.get('name'), 
      article: formData.get('article'), 
      category: formData.get('category'), 
      type: formData.get('type'), 
      lifespan: formData.get('lifespan'), 
      currentWorn: formData.get('currentWorn') 
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-xl font-bold text-white mb-5">Добавление узла</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Категория</label>
              <select name="category" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-lime-500 focus:outline-none">
                <option value="Трансмиссия">Трансмиссия</option>
                <option value="Колеса">Колеса</option>
                <option value="Тормозная система">Тормозная система</option>
                <option value="Рама и Вилка">Рама и Вилка</option>
                <option value="Управление">Управление</option>
                <option value="Аксессуары">Аксессуары</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Тип узла</label>
              <input type="text" name="type" required className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-lime-500 focus:outline-none" placeholder="Покрышка (зад)" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Название детали</label>
            <input type="text" name="name" required className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold focus:border-lime-500 focus:outline-none" placeholder="Continental Terra Speed" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Стандарты / Интерфейс (опц.)</label>
            <input type="text" name="article" className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl p-3 text-indigo-300 font-mono text-sm focus:border-indigo-500 focus:outline-none" placeholder="700x40c, Tubeless" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Ресурс (км)</label>
              <input type="number" name="lifespan" required min="0" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-lime-500 focus:outline-none" placeholder="0 = бессрочно" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Уже прошел (км)</label>
              <input type="number" name="currentWorn" min="0" defaultValue="0" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-lime-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 p-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold">Отмена</button>
            <button type="submit" className="flex-1 p-3 bg-lime-500 text-slate-950 font-bold rounded-xl hover:bg-lime-400">Добавить</button>
          </div>
        </form>
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