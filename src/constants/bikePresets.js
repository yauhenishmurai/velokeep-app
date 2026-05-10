export const CATEGORIES = {
  frame:      { label: "Фреймсет", icon: "🚲" },
  cockpit:    { label: "Управление", icon: "🕹️" },
  suspension: { label: "Подвеска", icon: "🪀" },
  drivetrain: { label: "Трансмиссия", icon: "⚙️" },
  brakes:     { label: "Тормоза", icon: "🛑" },
  wheels:     { label: "Колеса", icon: "🛞" },
  accessories:{ label: "Аксессуары", icon: "🔦" },
};

export const BIKE_PRESETS = {
  road: {
    label: "Шоссейный",
    icon: "🚴‍♂️",
    components: [
      { order: 10, category: "cockpit",    subCategory: "Расходники", type: "Обмотка руля",          lifespan: 6000 },
      { order: 20, category: "drivetrain", subCategory: "Привод",     type: "Цепь",                  lifespan: 3500 },
      { order: 30, category: "drivetrain", subCategory: "Привод",     type: "Кассета",               lifespan: 10000 },
      { order: 40, category: "drivetrain", subCategory: "Привод",     type: "Звезды системы",        lifespan: 15000 },
      { order: 50, category: "drivetrain", subCategory: "Подшипники", type: "Каретка",               lifespan: 12000 },
      { order: 60, category: "brakes",     subCategory: "Расходники", type: "Тормозные колодки",     lifespan: 4500 },
      { order: 70, category: "wheels",     subCategory: "Резина",     type: "Покрышка передняя",     lifespan: 6000 },
      { order: 80, category: "wheels",     subCategory: "Резина",     type: "Покрышка задняя",       lifespan: 4000 },
    ]
  },

  mtb_hardtail: {
    label: "MTB Хардтейл",
    icon: "🚵‍♂️",
    components: [
      { order: 10, category: "cockpit",    subCategory: "Расходники", type: "Грипсы",                lifespan: 3000 },
      { order: 20, category: "suspension", subCategory: "Амортизация",type: "Амортизационная вилка", lifespan: 1000 },
      { order: 30, category: "drivetrain", subCategory: "Привод",     type: "Цепь",                  lifespan: 1500 },
      { order: 40, category: "drivetrain", subCategory: "Привод",     type: "Кассета",               lifespan: 5000 },
      { order: 50, category: "drivetrain", subCategory: "Привод",     type: "Звезды системы",        lifespan: 8000 },
      { order: 60, category: "drivetrain", subCategory: "Подшипники", type: "Каретка",               lifespan: 6000 },
      { order: 70, category: "brakes",     subCategory: "Расходники", type: "Тормозные колодки",     lifespan: 1500 },
      { order: 80, category: "wheels",     subCategory: "Резина",     type: "Покрышка задняя",       lifespan: 3000 },
      { order: 90, category: "wheels",     subCategory: "Резина",     type: "Покрышка передняя",     lifespan: 4000 },
    ]
  },

  mtb_full: {
    label: "MTB Двухподвес",
    icon: "⛰️",
    components: [
      { order: 10, category: "cockpit",    subCategory: "Расходники", type: "Грипсы",                lifespan: 3000 },
      { order: 20, category: "suspension", subCategory: "Амортизация",type: "Амортизационная вилка", lifespan: 1000 },
      { order: 30, category: "suspension", subCategory: "Амортизация",type: "Задний амортизатор",    lifespan: 1000 },
      { order: 40, category: "suspension", subCategory: "Линки",      type: "Подшипники подвески",   lifespan: 3000 },
      { order: 50, category: "drivetrain", subCategory: "Привод",     type: "Цепь",                  lifespan: 1200 },
      { order: 60, category: "drivetrain", subCategory: "Привод",     type: "Кассета",               lifespan: 4000 },
      { order: 70, category: "brakes",     subCategory: "Расходники", type: "Тормозные колодки",     lifespan: 1200 },
      { order: 80, category: "frame",      subCategory: "Управление", type: "Дроппер (подседел)",    lifespan: 2000 },
    ]
  },

  gravel: {
    label: "Грэвел",
    icon: "🏕️",
    components: [
      { order: 10, category: "cockpit",    subCategory: "Расходники", type: "Обмотка руля",          lifespan: 5000 },
      { order: 20, category: "drivetrain", subCategory: "Привод",     type: "Цепь",                  lifespan: 2500 },
      { order: 30, category: "drivetrain", subCategory: "Привод",     type: "Кассета",               lifespan: 8000 },
      { order: 40, category: "brakes",     subCategory: "Расходники", type: "Тормозные колодки",     lifespan: 3500 },
      { order: 50, category: "wheels",     subCategory: "Резина",     type: "Покрышка передняя",     lifespan: 5000 },
      { order: 60, category: "wheels",     subCategory: "Резина",     type: "Покрышка задняя",       lifespan: 4000 },
    ]
  },

  city: {
    label: "Городской / Гибрид",
    icon: "🏙️",
    components: [
      { order: 10, category: "cockpit",    subCategory: "Расходники", type: "Грипсы",                lifespan: 5000 },
      { order: 20, category: "drivetrain", subCategory: "Привод",     type: "Цепь",                  lifespan: 3000 },
      { order: 30, category: "drivetrain", subCategory: "Привод",     type: "Кассета / Трещотка",    lifespan: 8000 },
      { order: 40, category: "brakes",     subCategory: "Расходники", type: "Тормозные колодки",     lifespan: 2500 },
      { order: 50, category: "wheels",     subCategory: "Резина",     type: "Покрышка (антипрокол)", lifespan: 7000 },
    ]
  }
};