import type { Scenario, Slot } from "../core/scenario.ts"
import type { PartKind } from "../core/parts.ts"

const DEVICES: ReadonlyArray<PartKind> = ["monitor", "keyboard", "mouse", "speakers", "printer", "flashDrive"]
const IN = "Кошик «Передає в комп'ютер»"
const OUT = "Кошик «Показує результат»"
const STORE = "Кошик «Зберігає на потім»"
const basket = (id: string, label: string): Slot => ({ id, label, accepts: DEVICES })
const usb = (id: string): Slot => ({ id, label: "Гніздо USB", accepts: ["keyboardCable", "mouseCable"] })
const IN_SLOTS = ["in1", "in2"]
const OUT_SLOTS = ["out1", "out2", "out3"]

/**
 * 3–4 клас, «Нова коробка». Комп'ютер привезли в коробках: розпакувати, розкласти пристрої за тим,
 * що вони роблять, поставити на стіл, підключити кабелі й увімкнути. Без поворотів деталей, великі цілі.
 * Цілі: A — пристрої введення й виведення, B — підключення, C — хто в комп'ютері «думає».
 */
export const grade3Box: Scenario = {
  id: "grade3-new-box",
  grade: 3,
  title: "Нова коробка",
  topic: "connect",
  summary: "Розпакуй пристрої, розклади їх по кошиках, постав на стіл, підключи кабелі й увімкни комп'ютер.",
  goals: { A: "пристрої введення й виведення", B: "підключення пристроїв", C: "що робить системний блок" },
  story: [
    "До класу привезли новий комп'ютер. Він приїхав у коробках!",
    "Розпакуй пристрої, розберися, що робить кожен, і підключи комп'ютер."
  ],
  parts: [
    {
      id: "tower",
      kind: "case",
      name: "Системний блок",
      role: "Головна частина комп'ютера. Усередині процесор: він «думає», рахує і керує всіма іншими пристроями."
    },
    { id: "monitor", kind: "monitor", name: "Монітор", role: "Показує картинку: те, що зробив комп'ютер. Це пристрій виведення." },
    { id: "keyboard", kind: "keyboard", name: "Клавіатура", role: "Нею ми вводимо в комп'ютер літери й цифри. Це пристрій введення." },
    { id: "mouse", kind: "mouse", name: "Миша", role: "Рухає стрілку на екрані й натискає кнопки. Це пристрій введення." },
    { id: "speakers", kind: "speakers", name: "Колонки", role: "Відтворюють звук: музику, голос, звуки ігор. Це пристрій виведення." },
    { id: "printer", kind: "printer", name: "Принтер", role: "Друкує на папері те, що є в комп'ютері. Це пристрій виведення." },
    {
      id: "flash",
      kind: "flashDrive",
      name: "Флешка",
      role: "Зберігає файли, навіть коли її витягли з комп'ютера. На ній можна перенести малюнок чи текст на інший комп'ютер."
    },
    { id: "monitorCable", kind: "monitorCable", name: "Кабель монітора (HDMI)", role: "Несе картинку від системного блока до монітора." },
    { id: "keyboardCable", kind: "keyboardCable", name: "Кабель клавіатури (USB)", role: "Несе в системний блок те, що ти набираєш." },
    { id: "mouseCable", kind: "mouseCable", name: "Кабель миші (USB)", role: "Несе в системний блок, куди ти рухаєш мишу і що натискаєш." }
  ],
  slots: [
    basket("in1", IN),
    basket("in2", IN),
    basket("out1", OUT),
    basket("out2", OUT),
    basket("out3", OUT),
    basket("store1", STORE),
    { id: "deskMonitor", label: "Місце для монітора", accepts: ["monitor"] },
    { id: "deskKeyboard", label: "Місце для клавіатури", accepts: ["keyboard"] },
    { id: "deskMouse", label: "Місце для миші", accepts: ["mouse"] },
    { id: "hdmi", label: "Гніздо HDMI", accepts: ["monitorCable"] },
    usb("usb1"),
    usb("usb2"),
    usb("usb3"),
    usb("usb4")
  ],
  controls: [
    { id: "power", label: "Кнопка живлення системного блока", values: ["off", "on"] },
    { id: "monitorPower", label: "Кнопка монітора", values: ["off", "on"] }
  ],
  steps: [
    {
      id: "unbox",
      kind: "inspect",
      title: "Розпакуй коробки",
      explain:
        "Натискай на коробки, щоб відкрити їх і прочитати, що всередині. Системний блок уже стоїть на столі ліворуч: натисни й на нього.",
      parts: ["tower", "monitor", "keyboard", "mouse", "speakers", "printer", "flash"]
    },
    {
      id: "sort",
      kind: "place",
      title: "Розклади пристрої по кошиках",
      goal: "A",
      explain:
        "Одні пристрої передають у комп'ютер те, що робиш ти. Інші показують результат: картинкою, звуком або на папері. А деякі зберігають файли на потім.",
      question: {
        text: "У який кошик покласти принтер?",
        right: "«Показує результат»",
        wrong: ["«Передає в комп'ютер»", "«Зберігає на потім»"]
      },
      targets: {
        keyboard: IN_SLOTS,
        mouse: IN_SLOTS,
        monitor: OUT_SLOTS,
        speakers: OUT_SLOTS,
        printer: OUT_SLOTS,
        flash: ["store1"]
      },
      messages: {
        wrongSlot: "Подумай, що робить цей пристрій: передає щось у комп'ютер, показує результат чи зберігає файли на потім?"
      }
    },
    {
      id: "desk",
      kind: "place",
      title: "Постав монітор, клавіатуру й мишу",
      explain: "Візьми їх із кошиків. Монітор стоїть далі, клавіатура перед ним, а миша праворуч від клавіатури.",
      targets: { monitor: ["deskMonitor"], keyboard: ["deskKeyboard"], mouse: ["deskMouse"] }
    },
    {
      id: "cables",
      kind: "place",
      title: "Підключи кабелі",
      goal: "B",
      explain:
        "Гнізда для кабелів ззаду на системному блоці. Кожен кабель має свою форму: кабель монітора йде в широке гніздо HDMI, клавіатура й миша — у прямокутні гнізда USB.",
      question: {
        text: "Чому кабель монітора не влазить у гніздо USB?",
        right: "У них різна форма",
        wrong: ["Кабель зламаний", "Треба натиснути сильніше"]
      },
      targets: { monitorCable: ["hdmi"], keyboardCable: ["usb1", "usb2", "usb3", "usb4"], mouseCable: ["usb1", "usb2", "usb3", "usb4"] }
    },
    {
      id: "power",
      kind: "set",
      title: "Увімкни комп'ютер",
      goal: "C",
      explain: "Комп'ютер «думає» в системному блоці. Знайди на ньому кнопку живлення: вона зверху.",
      question: {
        text: "Де комп'ютер «думає»?",
        right: "У системному блоці",
        wrong: ["У моніторі", "У клавіатурі"]
      },
      control: "power",
      value: "on",
      otherControls: {
        monitorPower: "Монітор лише показує картинку, а думає системний блок. Спершу увімкни системний блок."
      }
    },
    {
      id: "screen",
      kind: "set",
      title: "Увімкни монітор",
      explain: "Системний блок працює: чути, як крутяться вентилятори. Тепер натисни кнопку на моніторі, щоб побачити картинку.",
      control: "monitorPower",
      value: "on"
    },
    {
      id: "advice",
      kind: "inspect",
      title: "Порадь бабусі",
      goal: "A",
      explain:
        "Буває комп'ютер, у якому все в одному корпусі: екран, клавіатура, тачпад замість миші і батарея. Це ноутбук, його можна взяти з собою.",
      question: {
        text: "Бабусі потрібен комп'ютер на дачу, і вона хоче возити його з собою. Що їй порадити?",
        right: "Ноутбук",
        wrong: ["Такий самий системний блок і монітор", "Лише монітор і клавіатуру"]
      },
      parts: []
    }
  ]
}
