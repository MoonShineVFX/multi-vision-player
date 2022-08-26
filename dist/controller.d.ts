import MultiVisionPlayer from "./player";
declare class Controller {
    private isTouchable;
    private player;
    private HTMLElement;
    private cameraElements;
    private moveX;
    private isPressed;
    private hasMoved;
    private moveThreshold;
    private initial;
    private previousTouchX?;
    private lastSelectCamera?;
    constructor(player: MultiVisionPlayer);
    private initialCameraElements;
    private initialControls;
    mouseDown(event: Event): void;
    mouseMove(event: Event): void;
    mouseUp(event: Event): void;
}
export default Controller;
