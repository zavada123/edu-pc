/** While the trainer covers the page, the page under it does not scroll. */
export declare const PAGE_FULL_CLASS = "edu-pc-page-full";
/**
 * Full screen for the trainer. The trainer covers the page (a fixed layer), so it works on an iPhone too, and
 * where the browser can, the page goes to the browser's full screen as well. Esc or the button leaves it; an Esc
 * the trainer has used already (putting back the part in hand) does not.
 */
export declare const useFullScreen: () => Readonly<{
    full: boolean;
    toggle: () => void;
}>;
