import setting from "./setting";


class Controller {
    private isTouchable: boolean;
    private HTMLElement: HTMLDivElement;
    private moveX: number;
    private isPressed: boolean;
    private hasMoved: boolean;
    private moveThreshold: number;
    private initial: boolean;
    private previousTouchX?: number;
    private changeCamera: (step: number) => void;


    constructor(changeCamera: (step: number) => void) {
        this.isTouchable = navigator.maxTouchPoints > 0;
        this.HTMLElement = <HTMLDivElement>document.getElementById(setting.controllerHTMLElementID);
        this.changeCamera = changeCamera;
        
        this.moveX = 0
        this.isPressed = false;
        this.hasMoved = false;
        this.moveThreshold = -1;
        this.initial = true;
        this.previousTouchX = undefined;

        this.subscribe();
    }

    subscribe() {
        // ui control
        document.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'a':
                    this.changeCamera(-1);
                    break;
                case 'd':
                    this.changeCamera(1);
                    break;
                default:
                    break;
            }
        });

        const interact = {
            down: 'mousedown',
            up: 'mouseup',
            move: 'mousemove',
            out: 'mouseout'
        }
        if (this.isTouchable) {
            interact.down = 'touchstart'
            interact.up = 'touchend'
            interact.move = 'touchmove'
            interact.out = 'touchcancel'
        }

        this.HTMLElement.addEventListener(interact.down, event => this.mouseDown(event));
        this.HTMLElement.addEventListener(interact.move, event => this.mouseMove(event));
        this.HTMLElement.addEventListener(interact.up, event => this.mouseUp(event));
        this.HTMLElement.addEventListener(interact.out, event => this.mouseUp(event));
    }

    mouseDown(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.isPressed = true;
        this.hasMoved = false;
        this.moveX = 0;

        if (event.type === 'touchstart') {
            const touchEvent = <TouchEvent>event;
            this.previousTouchX = touchEvent.touches[0].pageX;
        }

        this.moveThreshold = this.HTMLElement.offsetWidth / (setting.cameraCount * 1.5);
    }

    mouseMove(event: Event) {
        event.preventDefault();
        event.stopPropagation();

        let moveX: number;
        if (event.type === 'touchmove') {
            const touchEvent = <TouchEvent>event;
            const currentTouchX = touchEvent.touches[0].pageX;
            moveX = currentTouchX - this.previousTouchX!;
            this.previousTouchX = currentTouchX;
        } else {
            const mouseEvent = <MouseEvent>event;
            moveX = mouseEvent.movementX;
        }

        if (this.isPressed && moveX !== 0) {
            this.moveX += moveX;
            if (Math.abs(this.moveX) >= this.moveThreshold) {
                const steps = Math.floor(
                    Math.abs(this.moveX) / this.moveThreshold
                ) * Math.sign(this.moveX);
                this.moveX -= steps * this.moveThreshold;
                this.changeCamera(steps);
                this.hasMoved = true;
            }
        }
    }

    mouseUp(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        if (!this.isPressed) return;
        this.isPressed = false;
        if (this.hasMoved) {
            this.hasMoved = false;
        }
    }
}

export default Controller;