/** General messages for the student. A step can replace the mistake ones with its own (StepMessages). */
export const MESSAGES = {
  wrongKind: (part: string, slot: string) => `«${part}» не підходить до місця «${slot}». Подивись на форму роз'єму.`,
  wrongSlot: (part: string, slot: string) => `«${part}» вставляється в «${slot}», але зараз потрібне інше місце. Перечитай пояснення кроку.`,
  wrongTurn: (part: string) =>
    `«${part}» повернуто не тим боком. Поверни деталь кнопками ⟲ ⟳ під назвою деталі або клавішами Q і E, тоді спробуй ще раз.`,
  firstEnd: (cable: string) => `Спершу під'єднай перший кінець: «${cable}».`,
  notReady: (control: string) => `Спершу підготуй: «${control}».`,
  wrongAnswer: "Ще ні. Перечитай пояснення кроку й спробуй іншу відповідь.",
  slotTaken: (slot: string) => `На місці «${slot}» уже є деталь.`,
  notNow: (step: string) => `Зараз інший крок: «${step}».`,
  answerFirst: "Спершу дай відповідь на запитання.",
  noQuestion: "Зараз немає запитання.",
  finished: "Усе вже зібрано.",
  unknownPart: "Такої деталі тут немає.",
  wrongStop: (stop: string, after: string | undefined) =>
    after === undefined
      ? `Дані ще не можуть потрапити в «${stop}». Подумай, звідки вони приходять у комп'ютер.`
      : `Після «${after}» дані йдуть не в «${stop}». Перечитай пояснення кроку.`,
  alreadyOnPath: (stop: string) => `«${stop}» уже є на шляху.`,
  overBudget: (budget: number) => `Це дорожче, ніж є грошей: бюджет ${budget}. Прибери одну картку.`,
  sameGroup: "Обидві картки замінюють одну деталь. Вибери одну з них.",
  tooSlow: (task: string, time: string, target: string) => `${task}: ${time}, а треба не довше ${target}.`
} as const
