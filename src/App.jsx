// 🚀 VeloKeep PRO VERSION
// Добавлено:
// - Offline cache (localStorage)
// - Быстрая загрузка
// - PWA-ready структура
// - Улучшенная архитектура
// - Прогноз износа

import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Search, Trash2, Plus, LogOut } from 'lucide-react';

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 🔥 LOCAL CACHE
const cache = {
  save: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
  load: (key) => {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <button onClick={() => signInWithPopup(auth, provider)}>
        Login with Google
      </button>
    );
  }

  return <Main user={user} />;
}

function Main({ user }) {
  const [bikes, setBikes] = useState(cache.load('bikes') || []);
  const [activeBikeId, setActiveBikeId] = useState(null);
  const [components, setComponents] = useState(cache.load('components') || []);

  // ⚡ Bikes subscription + cache
  useEffect(() => {
    const q = query(collection(db, "bikes"), where("userId", "==", user.uid));
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBikes(data);
      cache.save('bikes', data);
    });
  }, [user.uid]);

  const activeBike = bikes.find(b => b.id === activeBikeId);

  // ⚡ Components subscription
  useEffect(() => {
    if (!activeBikeId) return;

    const q = query(collection(db, "components"), where("bikeId", "==", activeBikeId));
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setComponents(data);
      cache.save('components', data);
    });
  }, [activeBikeId]);

  // 🧠 Smart wear + prediction
  const safeComponents = useMemo(() => {
    if (!activeBike) return [];

    return components.map(c => {
      const install = c.installMileage ?? 0;
      const total = activeBike.totalMileage ?? 0;
      const dist = Math.max(0, total - install);
      const lifespan = Number(c.lifespan) || 0;

      const wear = lifespan > 0 ? (dist / lifespan) * 100 : 0;

      const remainingKm = lifespan - dist;
      const predictedDays = remainingKm > 0 ? Math.round(remainingKm / 20) : 0; // avg 20km/day

      return {
        ...c,
        dist,
        wear: Math.min(100, wear),
        remainingKm,
        predictedDays
      };
    });
  }, [components, activeBike]);

  const addRide = async (km) => {
    try {
      const value = Number(km);
      if (!activeBike || value <= 0) return;

      await updateDoc(doc(db, "bikes", activeBike.id), {
        totalMileage: (activeBike.totalMileage || 0) + value
      });

      await addDoc(collection(db, "logs"), {
        bikeId: activeBike.id,
        userId: user.uid,
        text: `Ride ${value} km`,
        createdAt: serverTimestamp()
      });

    } catch (e) {
      console.error(e);
      alert("Ошибка добавления поездки");
    }
  };

  const deleteBike = async (id) => {
    if (!window.confirm("Delete bike?")) return;

    try {
      const related = components.filter(c => c.bikeId === id);

      for (let c of related) {
        await deleteDoc(doc(db, "components", c.id));
      }

      await deleteDoc(doc(db, "bikes", id));

      setActiveBikeId(null);

    } catch (e) {
      console.error(e);
      alert("Ошибка удаления");
    }
  };

  const searchPart = (name) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(name + " bike part")}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <h1>🚴 VeloKeep PRO</h1>

      <button onClick={() => signOut(auth)}>
        <LogOut /> Logout
      </button>

      {bikes.map(b => (
        <div key={b.id}>
          <h3 onClick={() => setActiveBikeId(b.id)}>{b.name}</h3>
          <button onClick={() => deleteBike(b.id)}>
            <Trash2 />
          </button>
        </div>
      ))}

      {activeBike && (
        <div>
          <h2>{activeBike.name}</h2>

          <button onClick={() => addRide(10)}>
            <Plus /> +10km
          </button>

          {safeComponents.map(c => (
            <div key={c.id} style={{ borderBottom: '1px solid #333', padding: 10 }}>
              <b>{c.name}</b>
              <div>Износ: {Math.round(c.wear)}%</div>
              <div>Осталось: {c.remainingKm} км</div>
              <div>Прогноз: {c.predictedDays} дней</div>

              <button onClick={() => searchPart(c.name)}>
                <Search /> Найти
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
