import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bike, Settings, Activity, Plus, AlertTriangle, 
  CheckCircle, ChevronRight, Calendar, Search, 
  RefreshCw, Trash2, Loader2, LayoutGrid,
  History, Globe, Lock, Users, X, Pencil, LogOut
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';

// --- ТВЕРДЫЕ КЛЮЧИ FIREBASE ---
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

// БАЗА "ЭКСПЕРТ-МЕХАНИК" ДЛЯ АВТОЗАПОЛНЕНИЯ
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

// ==========================================
// ГЛАВНЫЙ КОМПОНЕНТ (АВТОРИЗАЦИЯ)
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-10 h-10 text-lime-500 animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-5">
            <div className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 font-semibold text-sm ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-lime-500 text-slate-950'}`}>
              <AlertTriangle className="w-4 h-4"/> {toast.message}
            </div>
          </div>
        )}
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center shadow-2xl">
          <div className="w-20 h-20 bg-lime-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="w-10 h-10 text-lime-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">VeloKeep 2.0</h1>
          <p className="text-slate-400 mb-8">Умный облачный гараж и социальная сеть для велосипедистов.</p>
          <button onClick={() => signInWithPopup(auth, googleProvider).catch(() => showToast('Ошибка входа', 'error'))} className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-3">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
            Войти через Google
          </button>
        </div>
      </div>
    );
  }

  return <MainApp user={user} toast={toast} showToast={showToast} />;
}

// ==========================================
// ОСНОВНОЕ ПРИЛОЖЕНИЕ
// ==========================================
function MainApp({ user, toast, showToast }) {
  const [activeTab, setActiveTab] = useState('garage');
  
  const [bikes, setBikes] = useState([]);
  const [components, setComponents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeBikeId, setActiveBikeId] = useState(null);
  
  // Подписка на личные данные (используем плоскую структуру для возможности публичного доступа)
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

  // Математика износа 2.0
  const activeComponentsWithWear = useMemo(() => {
    if (!activeBike) return [];
    const totalMil = activeBike.totalMileage ?? 0;

    return components
      .filter(c => c.bikeId === activeBike.id && !c.archived)
      .map(comp => {
        const distanceSinceInstall = Math.max(0, totalMil - (comp.installMileage ?? 0));
        const lifespan = Number(comp.lifespan) || 0;
        
        let wearPercentage = 0, status = 'none', remainingKm = 0, predictedDays = 0;

        if (lifespan > 0) {
          wearPercentage = (distanceSinceInstall / lifespan) * 100;
          status = wearPercentage >= 100 ? 'critical' : wearPercentage >= 75 ? 'warning' : 'good';
          remainingKm = Math.max(0, lifespan - distanceSinceInstall);
          predictedDays = remainingKm > 0 ? Math.round(remainingKm / 20) : 0; 
        }

        return { ...comp, distanceSinceInstall, wearPercentage, status, remainingKm, predictedDays };
      });
  }, [components, activeBike]);

  const criticalAlerts = activeComponentsWithWear.filter(c => c.status === 'critical' || c.status === 'warning');

  // --- ДЕЙСТВИЯ ---

  const handleAddRide = async (distance, dateStr, notes = '') => {
    const distNum = Number(distance);
    if (!activeBike || isNaN(distNum) || distNum <= 0) return;

    try {
      await updateDoc(doc(db, "bikes", activeBike.id), { totalMileage: (activeBike.totalMileage || 0) + distNum });
      await addDoc(collection(db, "logs"), {
        bikeId: activeBike.id, userId: user.uid, date: dateStr, type: 'ride',
        text: `Заезд: ${distNum} км` + (notes ? `\nЗаметка: ${notes}` : ''),
        timestamp: Date.now()
      });
      showToast('Заезд добавлен');
    } catch (e) { showToast('Ошибка добавления заезда', 'error'); }
  };

  const handleAddBike = async (newBike, newComponents) => {
    try {
      const bikeRef = await addDoc(collection(db, "bikes"), { 
        ...newBike, userId: user.uid, isPublic: false, authorName: user.displayName || 'Аноним'
      });
      for (let comp of newComponents) {
        await addDoc(collection(db, "components"), { ...comp, bikeId: bikeRef.id, userId: user.uid });
      }
      setActiveBikeId(bikeRef.id);
      setActiveTab('dashboard');
      showToast('Байк в гараже!');
    } catch (e) { showToast('Ошибка добавления байка', 'error'); }
  };

  const handleDeleteBike = async (bikeId) => {
    if(window.confirm("Удалить велосипед и всю историю навсегда?")) {
      try {
        await deleteDoc(doc(db, "bikes", bikeId));
        components.filter(c => c.bikeId === bikeId).forEach(async c => await deleteDoc(doc(db, "components", c.id)));
        logs.filter(l => l.bikeId === bikeId).forEach(async l => await deleteDoc(doc(db, "logs", l.id)));
        
        const remaining = bikes.filter(b => b.id !== bikeId);
        setActiveBikeId(remaining.length > 0 ? remaining[0].id : null);
        if (remaining.length === 0) setActiveTab('garage');
        showToast('Байк удален');
      } catch (e) { showToast('Ошибка удаления', 'error'); }
    }
  };

  const togglePublicStatus = async (bikeId, currentStatus) => {
    try {
      await updateDoc(doc(db, "bikes", bikeId), { isPublic: !currentStatus });
      showToast(!currentStatus ? 'Велосипед на парковке!' : 'Велосипед скрыт');
    } catch(e) { showToast('Ошибка доступа', 'error'); }
  };

  const handleEditComponent = async (compId, updatedData) => {
    try {
      await updateDoc(doc(db, "components", compId), updatedData);
      showToast('Узел обновлен');
    } catch (e) { showToast('Ошибка обновления', 'error'); }
  };

  const handleQuickReplace = async (oldComponentId, newItemDetails) => {
    const oldComp = components.find(c => c.id === oldComponentId);
    if (!oldComp || !activeBike) return;
    try {
      await updateDoc(doc(db, "components", oldComponentId), { archived: true, archiveDate: new Date().toISOString().split('T')[0] });
      await addDoc(collection(db, "components"), {
        ...oldComp, id: undefined, name: newItemDetails.name || oldComp.name, article: newItemDetails.article !== undefined ? newItemDetails.article : oldComp.article,
        installDate: new Date().toISOString().split('T')[0], installMileage: activeBike.totalMileage, lifespan: newItemDetails.lifespan || oldComp.lifespan, archived: false
      });
      await addDoc(collection(db, "logs"), {
        bikeId: activeBike.id, userId: user.uid, date: new Date().toISOString().split('T')[0], type: 'maintenance',
        text: `Замена "${newItemDetails.name || oldComp.name}" на пробеге ${Math.round(activeBike.totalMileage)} км`, timestamp: Date.now()
      });
      showToast('Деталь заменена!');
    } catch (e) { showToast('Ошибка замены', 'error'); }
  };

  const handleAddNewManualComponent = async (compData) => {
    if (!activeBike) return;
    try {
      await addDoc(collection(db, "components"), {
        bikeId: activeBike.id, userId: user.uid, name: compData.name, category: compData.category, type: compData.type,
        article: compData.article || '', installDate: new Date().toISOString().split('T')[0], installMileage: activeBike.totalMileage - (Number(compData.currentWorn) || 0),
        lifespan: Number(compData.lifespan) || 0, archived: false
      });
      showToast('Деталь добавлена');
    } catch (e) { showToast('Ошибка добавления', 'error'); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-lime-500 selection:text-slate-950 flex flex-col pb-20 md:pb-8">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-5">
          <div className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 font-semibold text-sm ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-lime-500 text-slate-950'}`}>
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>} {toast.message}
          </div>
        </div>
      )}

      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lime-400">
            <Activity className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight hidden sm:block">VeloKeep 2.0</span>
          </div>
          <nav className="flex gap-1 md:gap-2 overflow-x-auto no-scrollbar">
            <NavBtn active={activeTab === 'garage'} onClick={() => setActiveTab('garage')} icon={<LayoutGrid />} label="Гараж" />
            <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Bike />} label="Дашборд" />
            <NavBtn active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={<Settings />} label="Узлы" />
            <div className="w-px h-6 bg-slate-800 self-center mx-1 md:mx-2"></div>
            <NavBtn active={activeTab === 'public'} onClick={() => setActiveTab('public')} icon={<Users className="text-indigo-400" />} label="Парковка" />
          </nav>
          <button onClick={() => signOut(auth)} className="p-2 ml-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors" title="Выйти">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 md:py-8">
        {activeTab === 'garage' && (
          <GarageTab bikes={bikes} activeBikeId={activeBikeId} onSelectBike={(id) => { setActiveBikeId(id); setActiveTab('dashboard'); }} onDeleteBike={handleDeleteBike} onAddBike={handleAddBike} onTogglePublic={togglePublicStatus} />
        )}
        {activeTab === 'dashboard' && activeBike && (
          <DashboardTab bike={activeBike} alerts={criticalAlerts} components={activeComponentsWithWear} logs={logs.filter(l => l.bikeId === activeBike.id).sort((a,b) => b.timestamp - a.timestamp)} onAddRide={handleAddRide} onGoToDetails={() => setActiveTab('details')} />
        )}
        {activeTab === 'dashboard' && !activeBike && (
          <div className="text-center py-20 text-slate-500">Нет активных велосипедов. Добавьте байк в Гараже.</div>
        )}
        {activeTab === 'details' && activeBike && (
          <ComponentsTab components={activeComponentsWithWear} onReplace={handleQuickReplace} onAddNew={handleAddNewManualComponent} onEdit={handleEditComponent} />
        )}
        {activeTab === 'public' && (
          <PublicParkingTab currentUserId={user.uid} />
        )}
      </main>
    </div>
  );
}

// ==========================================
// ОБЩЕСТВЕННАЯ ПАРКОВКА (ВОЗВРАЩЕНО)
// ==========================================
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
              <div className="absolute bottom-4 left-5 z-20 pr-4">
                <h3 className="text-xl md:text-2xl font-bold text-white leading-tight line-clamp-1">{bike.name}</h3>
                <p className="text-indigo-300 text-xs md:text-sm">Владелец: {bike.authorName || 'Аноним'}</p>
              </div>
            </div>
            <div className="p-5 flex justify-between items-center bg-slate-900">
              <div>
                <div className="text-xs text-slate-500 uppercase font-semibold">Заявленный пробег</div>
                <div className="text-xl font-bold text-slate-200">{Math.round(bike.totalMileage || 0)} км</div>
              </div>
              <button onClick={() => setViewBike(bike)} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold transition-colors text-sm flex items-center gap-2">
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
      const distanceSinceInstall = Math.max(0, (bike.totalMileage || 0) - (comp.installMileage || 0));
      let wearPercentage = comp.lifespan > 0 ? (distanceSinceInstall / comp.lifespan) * 100 : 0;
      let status = wearPercentage >= 100 ? 'critical' : wearPercentage >= 75 ? 'warning' : 'good';
      return { ...comp, distanceSinceInstall, wearPercentage, status };
    });
  }, [components, bike.totalMileage]);

  const sortedLogs = [...logs].sort((a,b) => b.timestamp - a.timestamp);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-400" /> {bike.name}</h3>
            <p className="text-slate-400 text-xs">Владелец: {bike.authorName || 'Аноним'}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg h-40 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent z-10" />
            <img src={bike.photo} alt={bike.name} className="w-full h-full object-cover opacity-60" />
            <div className="absolute bottom-4 left-6 z-20">
              <p className="text-indigo-300 text-sm font-semibold mb-1">{bike.model}</p>
              <p className="text-white text-xl md:text-2xl font-bold">Пробег: <span className="text-lime-400">{Math.round(bike.totalMileage || 0)} км</span></p>
            </div>
          </div>

          {loading ? ( <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div> ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Узлы (Чтение)</h2>
                <div className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-800/50">
                  {componentsWithWear.length === 0 ? <div className="p-6 text-slate-500 text-sm text-center">Нет данных</div> : 
                    componentsWithWear.map(c => (
                      <div key={c.id} className="p-4 flex justify-between items-center">
                        <div className="pr-2">
                          <div className="font-bold text-white text-sm">{c.name}</div>
                          <div className="text-[10px] text-indigo-400 font-mono mt-0.5">{c.article || ''}</div>
                          <div className="text-xs text-slate-500 mt-1">{c.type}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-sm font-bold ${c.status === 'critical' ? 'text-red-500' : 'text-slate-300'}`}>{Math.round(c.wearPercentage)}%</div>
                          <div className="text-[10px] text-slate-500">{Math.round(c.distanceSinceInstall)} / {c.lifespan || '∞'} км</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><History className="w-5 h-5 text-indigo-400"/> Журнал</h2>
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                  {sortedLogs.length === 0 ? <div className="text-slate-500 text-sm text-center py-10">Пусто</div> : 
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-800">
                      {sortedLogs.map(log => (
                        <div key={log.id} className="relative flex items-start gap-3">
                          <div className={`mt-1 flex items-center justify-center w-4 h-4 rounded-full border-4 border-slate-950 z-10 ${log.type === 'maintenance' ? 'bg-lime-500' : 'bg-blue-500'}`}></div>
                          <div className="flex-1 bg-slate-900 p-3 rounded-xl border border-slate-800">
                            <div className="flex justify-between mb-1">
                              <div className={`font-bold text-xs ${log.type === 'maintenance' ? 'text-lime-400' : 'text-blue-400'}`}>{log.date}</div>
                            </div>
                            <div className="text-sm text-slate-300 whitespace-pre-line">{log.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ДАШБОРД
// ==========================================
function DashboardTab({ bike, alerts, components, logs, onAddRide, onGoToDetails }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [rideDist, setRideDist] = useState('');
  const [rideDate, setRideDate] = useState(new Date().toISOString().split('T')[0]);
  const [rideNotes, setRideNotes] = useState('');

  const handleSubmitRide = (e) => {
    e.preventDefault();
    onAddRide(rideDist, rideDate, rideNotes);
    setRideDist(''); setRideNotes(''); setShowAddModal(false);
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
          <div className="absolute bottom-4 left-6 z-20">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{bike.name}</h1>
            <p className="text-slate-300 text-sm">{bike.model} • Пробег: <span className="text-lime-400 font-bold">{Math.round(bike.totalMileage || 0)} км</span></p>
          </div>
        </div>
        <div className="p-4 bg-slate-900 flex justify-end">
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-lime-500 hover:bg-lime-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold transition-colors">
            <Plus className="w-5 h-5" /> Добавить заезд
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><AlertTriangle className="text-red-500 w-5 h-5" /> Критический износ</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {alerts.map(alert => (
              <div key={alert.id} className={`p-4 rounded-xl border ${alert.status === 'critical' ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm">{alert.name}</h3>
                    <p className="text-xs text-slate-400">{alert.type}</p>
                  </div>
                  <span className={`text-lg font-bold ${alert.status === 'critical' ? 'text-red-400' : 'text-orange-400'}`}>{Math.round(alert.wearPercentage)}%</span>
                </div>
                <div className="text-xs font-mono text-slate-400">Осталось: ~{alert.remainingKm} км ({alert.predictedDays} дн.)</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-end">
            <h2 className="text-lg font-bold text-white">Состояние узлов</h2>
            <button onClick={onGoToDetails} className="text-sm text-lime-400 hover:text-lime-300 font-semibold">Настройки &rarr;</button>
          </div>
          {Object.entries(groupedComponents).map(([category, items]) => (
            <div key={category} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-800"><h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider">{category}</h3></div>
              <div className="divide-y divide-slate-800/50">
                {items.filter(c => c.lifespan > 0).map(comp => (
                  <div key={comp.id} className="p-4 flex justify-between items-center gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-200 text-sm">{comp.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{comp.type}</div>
                    </div>
                    <div className="w-1/3 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono"><span className="text-slate-400">{Math.round(comp.distanceSinceInstall)} / {comp.lifespan}</span><span className={comp.status === 'critical' ? 'text-red-400 font-bold' : 'text-slate-400'}>{Math.round(comp.wearPercentage)}%</span></div>
                      <WearProgressBar wear={comp.wearPercentage} status={comp.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><History className="w-5 h-5"/> История</h2>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 max-h-[400px] overflow-y-auto">
            {logs.length === 0 ? <div className="text-sm text-slate-500 text-center py-10">Пусто</div> : 
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-800">
                {logs.map((log) => (
                  <div key={log.id} className="relative flex items-start gap-3">
                    <div className={`mt-1 w-4 h-4 rounded-full border-4 border-slate-900 z-10 ${log.type === 'maintenance' ? 'bg-lime-500' : 'bg-blue-500'}`}></div>
                    <div className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between mb-1">
                        <div className={`font-bold text-xs ${log.type === 'maintenance' ? 'text-lime-400' : 'text-blue-400'}`}>{log.date}</div>
                      </div>
                      <div className="text-sm text-slate-300">{log.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Внести дистанцию</h3>
            <form onSubmit={handleSubmitRide} className="space-y-4">
              <div><label className="block text-xs text-slate-400 mb-1">Дистанция (км)</label><input type="number" step="0.1" required value={rideDist} onChange={e => setRideDist(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white focus:border-lime-500 outline-none"/></div>
              <div><label className="block text-xs text-slate-400 mb-1">Дата</label><input type="date" value={rideDate} onChange={e => setRideDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none [color-scheme:dark]"/></div>
              <div><label className="block text-xs text-slate-400 mb-1">Заметка</label><textarea value={rideNotes} onChange={e => setRideNotes(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none resize-none h-20"/></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border border-slate-700 text-slate-300 rounded-xl font-semibold">Отмена</button>
                <button type="submit" className="flex-1 py-3 bg-lime-500 text-slate-950 font-bold rounded-xl">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// НАСТРОЙКА УЗЛОВ (С КНОПКАМИ РЕДАКТИРОВАНИЯ И GOOGLE SEARCH)
// ==========================================
function ComponentsTab({ components, onReplace, onAddNew, onEdit }) {
  const [showAddNewModal, setShowAddNewModal] = useState(false);
  const [compToEdit, setCompToEdit] = useState(null);
  const [compToReplace, setCompToReplace] = useState(null);
  const [replaceName, setReplaceName] = useState('');
  const [replaceLifespan, setReplaceLifespan] = useState('');
  const [replaceArticle, setReplaceArticle] = useState('');

  const grouped = components.reduce((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {});

  const handleDirectReplace = (comp) => {
    setCompToReplace(comp);
    setReplaceName(comp.name);
    setReplaceLifespan(comp.lifespan);
    setReplaceArticle(comp.article || '');
  };

  const confirmDirectReplace = () => {
    if (compToReplace && replaceName.trim() && replaceLifespan) {
      onReplace(compToReplace.id, { name: replaceName, lifespan: Number(replaceLifespan), article: replaceArticle });
      setCompToReplace(null); setReplaceName(''); setReplaceLifespan(''); setReplaceArticle('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div><h1 className="text-2xl font-bold text-white">Список компонентов</h1><p className="text-sm text-slate-400 mt-1">Детальный контроль износа</p></div>
        <button onClick={() => setShowAddNewModal(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-lime-400 border border-slate-700 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm">
          <ListPlus className="w-5 h-5" /> Добавить узел
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
             <div className="bg-slate-800/50 px-4 py-2.5 border-b border-slate-800 text-xs font-bold text-lime-400 uppercase tracking-wider">{category}</div>
             <div className="divide-y divide-slate-800/50">
                {items.map(comp => (
                  <div key={comp.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-800/30 transition-colors group">
                    <div className="flex-1">
                      <div className="font-bold text-slate-200 text-base">{comp.name}</div>
                      {comp.article && <div className="text-xs text-indigo-400 font-mono mt-0.5">{comp.article}</div>}
                      <div className="text-xs text-slate-500 mt-1">{comp.type}</div>
                    </div>

                    <div className="w-full sm:w-1/3 md:w-1/4">
                       {comp.lifespan > 0 ? (
                         <>
                           <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                             <span>{Math.round(comp.distanceSinceInstall)} / {comp.lifespan} км</span>
                             <span className={comp.status === 'critical' ? 'text-red-400 font-bold' : ''}>{Math.round(comp.wearPercentage)}%</span>
                           </div>
                           <WearProgressBar wear={comp.wearPercentage} status={comp.status} size="sm" />
                           <div className="text-[10px] text-slate-500 mt-1">Осталось: ~{comp.remainingKm} км</div>
                         </>
                       ) : <div className="text-xs text-slate-500 py-1">Бессрочный узел</div>}
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0 mt-2 sm:mt-0">
                      {/* Поиск в Google */}
                      <a 
                        href={`https://www.google.com/search?q=${encodeURIComponent(comp.name + " " + comp.type + " купить")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors" title="Искать деталь в Google"
                      >
                        <Search className="w-4 h-4" />
                      </a>
                      
                      {/* Редактирование компонента (карандаш) */}
                      <button onClick={() => setCompToEdit(comp)} className="p-2 md:opacity-0 group-hover:opacity-100 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all" title="Редактировать">
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Замена узла */}
                      <button onClick={() => handleDirectReplace(comp)} className="px-3 py-2 bg-lime-500 hover:bg-lime-400 text-slate-950 rounded-lg transition-colors font-bold text-xs flex gap-1.5" title="Установил новую">
                        <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Замена</span>
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        ))}
      </div>

      {showAddNewModal && <AddNewComponentModal onClose={() => setShowAddNewModal(false)} onAdd={onAddNew} />}
      {compToEdit && <EditComponentModal component={compToEdit} onClose={() => setCompToEdit(null)} onSave={(updated) => { onEdit(compToEdit.id, updated); setCompToEdit(null); }} />}
      
      {compToReplace && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><RefreshCw className="w-5 h-5 text-lime-500"/> Замена узла</h3>
            <p className="text-sm text-slate-400 mb-6">Новая деталь сбросит пробег этого узла.</p>
            <div className="space-y-4 mb-6">
              <div><label className="block text-xs text-slate-400 mb-1">Название новой детали</label><input type="text" required value={replaceName} onChange={e => setReplaceName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-lime-500 outline-none" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Стандарты (опц.)</label><input type="text" value={replaceArticle} onChange={e => setReplaceArticle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-lime-500 outline-none" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Ресурс (км)</label><input type="number" required min="1" value={replaceLifespan} onChange={e => setReplaceLifespan(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-lime-500 outline-none" /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCompToReplace(null)} className="flex-1 py-3 border border-slate-700 text-slate-300 rounded-xl font-semibold">Отмена</button>
              <button onClick={confirmDirectReplace} disabled={!replaceName.trim() || !replaceLifespan} className="flex-1 py-3 bg-lime-500 text-slate-950 font-bold rounded-xl disabled:opacity-50">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditComponentModal({ component, onClose, onSave }) {
  const [name, setName] = useState(component.name);
  const [article, setArticle] = useState(component.article || '');
  const [lifespan, setLifespan] = useState(component.lifespan);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, article, lifespan: Number(lifespan) });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2"><Pencil className="w-5 h-5 text-lime-500"/> Изменить параметры</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-xs text-slate-400 mb-1">Название детали</label><input type="text" value={name} onChange={e=>setName(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold outline-none focus:border-lime-500" /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Стандарты / Спецификации</label><input type="text" value={article} onChange={e=>setArticle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-lime-500" /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Заявленный ресурс (км)</label><input type="number" value={lifespan} onChange={e=>setLifespan(e.target.value)} required min="0" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-lime-400 font-mono outline-none focus:border-lime-500" /></div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 p-3 border border-slate-700 text-slate-300 rounded-xl font-semibold">Отмена</button>
            <button type="submit" className="flex-1 p-3 bg-lime-500 text-slate-950 font-bold rounded-xl">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddNewComponentModal({ onClose, onAdd }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    onAdd({ name: fd.get('name'), category: fd.get('category'), type: fd.get('type'), article: fd.get('article'), lifespan: fd.get('lifespan'), currentWorn: fd.get('currentWorn') });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-xl font-bold text-white mb-5">Добавление узла</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-xs text-slate-400 mb-1">Название детали</label><input type="text" name="name" required className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-400 mb-1">Категория</label><input type="text" name="category" required defaultValue="Дополнительно" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none" /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Тип узла</label><input type="text" name="type" required className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none" /></div>
          </div>
          <div><label className="block text-xs text-slate-400 mb-1">Стандарты (опц.)</label><input type="text" name="article" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs text-slate-400 mb-1">Ресурс (км)</label><input type="number" name="lifespan" required min="0" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none" /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Уже прошел (км)</label><input type="number" name="currentWorn" min="0" defaultValue="0" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none" /></div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 p-3 border border-slate-700 text-slate-300 rounded-xl font-semibold">Отмена</button>
            <button type="submit" className="flex-1 p-3 bg-lime-500 text-slate-950 font-bold rounded-xl">Добавить</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// ГАРАЖ
// ==========================================
function GarageTab({ bikes, activeBikeId, onSelectBike, onDeleteBike, onAddBike, onTogglePublic }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-white">Мой Гараж</h1><p className="text-sm text-slate-400">Управление парком</p></div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-lime-500 hover:bg-lime-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold transition-colors w-full sm:w-auto justify-center"><Plus className="w-5 h-5" /> Добавить</button>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {bikes.map(bike => (
          <div key={bike.id} className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-xl ${activeBikeId === bike.id ? 'border-lime-500 ring-1 ring-lime-500' : 'border-slate-800'}`}>
            <div className="h-40 relative cursor-pointer group" onClick={() => onSelectBike(bike.id)}>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
              <img src={bike.photo} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform" alt="" />
              <div className="absolute bottom-4 left-5 z-20 pr-4">
                <h3 className="text-2xl font-bold text-white line-clamp-1">{bike.name}</h3>
                <p className="text-slate-300 text-sm line-clamp-1">{bike.model}</p>
              </div>
            </div>
            <div className="p-4 flex justify-between items-center bg-slate-900">
              <div><div className="text-xs text-slate-500 uppercase font-semibold">Пробег</div><div className="text-xl font-bold text-slate-200">{Math.round(bike.totalMileage || 0)} км</div></div>
              <div className="flex gap-2">
                <button onClick={() => onTogglePublic(bike.id, bike.isPublic)} className={`p-2 rounded-xl transition-colors border ${bike.isPublic ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-800 text-slate-500 border-transparent hover:text-slate-300'}`} title="На парковке">
                  {bike.isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteBike(bike.id); }} className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
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

  const handleNext = (e) => {
    e.preventDefault();
    if (!bikeName.trim()) return;
    const lower = bikeName.toLowerCase().trim();
    if (lower.includes('racer') && bikeDatabase["racer alpina man 1.0"]) {
      const dbBike = bikeDatabase["racer alpina man 1.0"];
      setParsedData({ name: bikeName, type: dbBike.type, photo: dbBike.photo, components: dbBike.components.map(c => ({...c, id: Date.now()+Math.random(), currentWornMileage: 0})) });
      setStep(3); 
    } else { setStep(2); }
  };

  const handleParse = (e) => {
    e.preventDefault();
    let comps = [];
    const add = (cat, type, name, ls) => comps.push({ category: cat, type, name, article: '', lifespan: ls, currentWornMileage: 0, id: Date.now()+Math.random() });
    const t = pastedSpecs;
    if (/Рама/i.test(t)) add('Рама и Вилка', 'Рама', 'Рама', 50000);
    if (/Вилка/i.test(t)) add('Рама и Вилка', 'Вилка', 'Вилка', 1500);
    if (/Покрышки/i.test(t)) { add('Колеса', 'Покрышка (пер)', 'Покрышка', 6000); add('Колеса', 'Покрышка (зад)', 'Покрышка', 3500); }
    if (/Трещотка/i.test(t)) add('Трансмиссия', 'Кассета/Трещотка', 'Блок звезд', 6000);
    if (/Цепь/i.test(t)) add('Трансмиссия', 'Цепь', 'Цепь', 1500);
    if (comps.length === 0) { add('Трансмиссия', 'Цепь', 'Цепь', 2000); add('Тормоза', 'Колодки', 'Колодки', 1500); }
    setParsedData({ name: bikeName, type: "Custom Spec", photo: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&q=80&w=800", components: comps });
    setStep(3);
  };

  const handleSave = () => {
    const baseMileage = Number(bikeTotalMileage) || 0;
    const newBike = { name: parsedData.name, model: parsedData.type, totalMileage: baseMileage, photo: parsedData.photo };
    const newComps = parsedData.components.map(c => ({
      name: c.name, category: c.category, type: c.type, article: c.article || '', 
      installDate: new Date().toISOString().split('T')[0],
      installMileage: Math.max(0, baseMileage - (isAllOriginal ? baseMileage : (Number(c.currentWornMileage) || 0))),
      lifespan: Number(c.lifespan), archived: false
    }));
    onSave(newBike, newComps);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {step === 1 && (
          <div className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Добавление велосипеда</h3>
            <form onSubmit={handleNext}>
              <div className="space-y-4 mb-6">
                <div><label className="block text-sm text-slate-300 mb-1">Название (введи Racer для теста)</label><input type="text" autoFocus required value={bikeName} onChange={e => setBikeName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-lime-500" /></div>
                <div><label className="block text-sm text-slate-300 mb-1">Текущий пробег (км)</label><input type="number" min="0" required value={bikeTotalMileage} onChange={e => setBikeTotalMileage(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-lime-500" /></div>
              </div>
              <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-700 text-slate-300 rounded-xl">Отмена</button><button type="submit" className="flex-1 py-3 bg-lime-500 text-slate-950 font-bold rounded-xl">Далее</button></div>
            </form>
          </div>
        )}
        {step === 2 && (
          <div className="p-6 flex flex-col h-full overflow-hidden">
            <h3 className="text-xl font-bold text-white mb-4">Парсинг спецификации</h3>
            <form onSubmit={handleParse} className="flex flex-col flex-1">
              <textarea autoFocus required value={pastedSpecs} onChange={e => setPastedSpecs(e.target.value)} className="w-full flex-1 bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-lime-500 mb-4 resize-none min-h-[200px]" placeholder="Вставь текст спецификации..." />
              <div className="flex gap-3"><button type="button" onClick={()=>setStep(1)} className="py-3 px-6 border border-slate-700 text-slate-300 rounded-xl">Назад</button><button type="submit" className="flex-1 py-3 bg-lime-500 text-slate-950 font-bold rounded-xl">Найти детали</button></div>
            </form>
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-900 shrink-0">
              <h3 className="text-xl font-bold text-white mb-4">Настройка узлов</h3>
              <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={isAllOriginal} onChange={(e) => setIsAllOriginal(e.target.checked)} className="w-5 h-5 rounded border-slate-700 text-lime-500 bg-slate-900" /><span className="text-white font-bold">С завода (Оригинал)</span></label>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-950">
              {parsedData.components.map((comp) => (
                <div key={comp.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4">
                  <div className="flex-1"><div className="text-xs text-lime-400 mb-1">{comp.category} • {comp.type}</div><input type="text" value={comp.name} onChange={(e) => setParsedData(p => ({...p, components: p.components.map(c => c.id === comp.id ? {...c, name: e.target.value} : c)}))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm mb-2" /><input type="text" value={comp.article} onChange={(e) => setParsedData(p => ({...p, components: p.components.map(c => c.id === comp.id ? {...c, article: e.target.value} : c)}))} className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2 text-indigo-300 text-xs" placeholder="Спецификации (напр. BSA 68mm)" /></div>
                  <div className="flex gap-3"><div className="w-24"><label className="block text-xs text-slate-500 mb-1">Ресурс (км)</label><input type="number" value={comp.lifespan} onChange={(e) => setParsedData(p => ({...p, components: p.components.map(c => c.id === comp.id ? {...c, lifespan: e.target.value} : c)}))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-lime-400 text-sm" /></div>{!isAllOriginal && comp.lifespan > 0 && <div className="w-24"><label className="block text-xs text-orange-400 mb-1">Прошел</label><input type="number" value={comp.currentWornMileage} onChange={(e) => setParsedData(p => ({...p, components: p.components.map(c => c.id === comp.id ? {...c, currentWornMileage: e.target.value} : c)}))} className="w-full bg-slate-950 border border-orange-900/50 rounded-lg p-2 text-white text-sm" /></div>}</div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0 flex gap-3"><button onClick={() => setStep(1)} className="px-5 py-3 border border-slate-700 text-slate-300 rounded-xl font-semibold">В начало</button><button onClick={handleSave} className="flex-1 py-3 bg-lime-500 text-slate-950 font-bold rounded-xl">Сохранить велосипед</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- ВСПОМОГАТЕЛЬНЫЕ ---
function NavBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] sm:text-sm font-semibold transition-all ${active ? 'bg-lime-500/10 text-lime-400 scale-105' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
      {React.cloneElement(icon, { size: 18 })} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
function WearProgressBar({ wear, status, size = "md" }) {
  const color = status === 'critical' ? 'bg-red-500' : status === 'warning' ? 'bg-orange-500' : 'bg-green-500';
  return <div className={`w-full bg-slate-800 rounded-full overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2'}`}><div className={`${color} h-full transition-all duration-1000`} style={{ width: `${Math.min(100, Math.max(2, wear))}%` }} /></div>;
}