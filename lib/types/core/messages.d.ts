/** General messages for the student. A step can replace the mistake ones with its own (StepMessages). */
export declare const MESSAGES: {
    readonly wrongKind: (part: string, slot: string) => string;
    readonly wrongSlot: (part: string, slot: string) => string;
    readonly wrongTurn: (part: string) => string;
    readonly notReady: (control: string) => string;
    readonly wrongAnswer: "Ще ні. Перечитай пояснення кроку й спробуй іншу відповідь.";
    readonly slotTaken: (slot: string) => string;
    readonly notNow: (step: string) => string;
    readonly answerFirst: "Спершу дай відповідь на запитання.";
    readonly noQuestion: "Зараз немає запитання.";
    readonly finished: "Усе вже зібрано.";
    readonly unknownPart: "Такої деталі тут немає.";
    readonly wrongStop: (stop: string, after: string | undefined) => string;
    readonly alreadyOnPath: (stop: string) => string;
    readonly overBudget: (budget: number) => string;
    readonly sameGroup: "Обидві картки замінюють одну деталь. Вибери одну з них.";
    readonly tooSlow: (task: string, time: string, target: string) => string;
};
