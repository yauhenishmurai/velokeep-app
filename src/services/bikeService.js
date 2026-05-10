import { db } from '../firebase';
import { 
  doc, collection, writeBatch, serverTimestamp, 
  getDocs, query, where 
} from 'firebase/firestore';
import { BIKE_PRESETS } from '../constants/bikePresets';

export const createBikeFromPreset = async (userId, bikeName, presetKey) => {
  const preset = BIKE_PRESETS[presetKey];
  if (!preset) throw new Error(`Пресет "${presetKey}" не найден`);

  const batch = writeBatch(db);

  // ЯВНОЕ СОЗДАНИЕ БАЙКА
  const bikeRef = doc(collection(db, "users", userId, "bikes"));
  
  const bikeData = {
    name: bikeName,
    model: "",
    category: presetKey,
    totalMileage: 0,
    photo: "",
    isPublic: false,
    createdAt: serverTimestamp(),
    status: "active",
    schemaVersion: 2,
  };

  batch.set(bikeRef, bikeData);

  // ЯВНОЕ СОЗДАНИЕ КОМПОНЕНТОВ
  const componentsRef = collection(db, "users", userId, "bikes", bikeRef.id, "components");

  preset.components.forEach((comp) => {
    const compRef = doc(componentsRef);
    
    batch.set(compRef, {
      order: comp.order,
      category: comp.category,
      subCategory: comp.subCategory,
      type: comp.type,
      name: comp.type, 
      article: "",
      installMileage: 0,
      usageKm: 0,
      lifespan: comp.lifespan,
      lastReplacedAt: null, 
      isStock: true,
      isCustom: false,
      price: 0,
      archived: false,
      notes: "",
    });
  });

  await batch.commit();
  return bikeRef.id;
};

const mapOldCategory = (oldCategory = "", oldType = "") => {
  const cat = oldCategory.toLowerCase();
  const type = oldType.toLowerCase();

  if (cat.includes("рама") || cat.includes("вилка")) {
    return type.includes("вилка") || type.includes("аморт") ? "suspension" : "frame";
  }
  if (cat.includes("трансмиссия")) return "drivetrain";
  if (cat.includes("тормоз")) return "brakes";
  if (cat.includes("колес") || cat.includes("покрышк")) return "wheels";
  if (cat.includes("управление")) return "cockpit";
  return "accessories";
};

export const migrateOldBikeData = async (userId, oldBike) => {
  if (oldBike.schemaVersion === 2) {
    console.log(`Байк "${oldBike.name}" уже мигрирован (v2)`);
    return;
  }

  let batch = writeBatch(db);
  let operationCount = 0;

  const commitBatchIfNeeded = async () => {
    if (operationCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      operationCount = 0;
    }
  };

  const newBikeRef = doc(db, "users", userId, "bikes", oldBike.id);

  batch.set(newBikeRef, {
    name: oldBike.name || "Мой велосипед",
    model: oldBike.model || "",
    category: oldBike.category || "custom",
    totalMileage: oldBike.totalMileage || 0,
    photo: oldBike.photo || "",
    isPublic: oldBike.isPublic || false,
    createdAt: oldBike.createdAt || serverTimestamp(),
    status: "active",
    schemaVersion: 2,
  }, { merge: true });
  operationCount++;

  const oldCompsQuery = query(collection(db, "components"), where("bikeId", "==", oldBike.id));
  const oldCompsSnap = await getDocs(oldCompsQuery);
  
  for (const compDoc of oldCompsSnap.docs) {
    const data = compDoc.data();
    const newCompRef = doc(db, "users", userId, "bikes", oldBike.id, "components", compDoc.id);
    
    batch.set(newCompRef, {
      category: mapOldCategory(data.category, data.type),
      subCategory: "Общее",
      type: data.type || "Узел",
      name: data.name || data.type || "Деталь",
      article: data.article || "",
      installMileage: data.installMileage || 0,
      usageKm: Math.max(0, (oldBike.totalMileage || 0) - (data.installMileage || 0)),
      lifespan: data.lifespan || 0,
      lastReplacedAt: null,
      isStock: true,
      isCustom: false,
      price: 0,
      archived: data.archived || false,
      notes: "Мигрировано из v1",
      order: 99 
    });
    operationCount++;
    await commitBatchIfNeeded();
  }

  const oldLogsQuery = query(collection(db, "logs"), where("bikeId", "==", oldBike.id));
  const oldLogsSnap = await getDocs(oldLogsQuery);
  
  for (const logDoc of oldLogsSnap.docs) {
    const newLogRef = doc(db, "users", userId, "bikes", oldBike.id, "logs", logDoc.id);
    batch.set(newLogRef, logDoc.data());
    operationCount++;
    await commitBatchIfNeeded();
  }

  if (operationCount > 0) {
    await batch.commit();
  }
  
  console.log(`✅ Миграция байка "${oldBike.name}" завершена успешно`);
};