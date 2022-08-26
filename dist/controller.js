"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var setting_1 = require("./setting");
var bufferManager_1 = require("./bufferManager");
var Controller = /** @class */ (function () {
    function Controller(player) {
        this.isTouchable = navigator.maxTouchPoints > 0;
        this.HTMLElement = document.getElementById(setting_1.default.controllerHTMLElementID);
        this.cameraElements = [];
        this.player = player;
        this.lastSelectCamera = 1;
        this.moveX = 0;
        this.isPressed = false;
        this.hasMoved = false;
        this.moveThreshold = -1;
        this.initial = true;
        this.previousTouchX = undefined;
        this.initialCameraElements();
        this.initialControls();
    }
    Controller.prototype.initialCameraElements = function () {
        var _this = this;
        for (var i = 0; i < setting_1.default.cameraCount; i++) {
            var spanElement = document.createElement('span');
            spanElement.className = i === 0 ? setting_1.default.cameraDotStyleSelect : setting_1.default.cameraDotStyleDefault;
            this.HTMLElement.appendChild(spanElement);
            this.cameraElements.push(spanElement);
        }
        this.player.bufferManager.on(bufferManager_1.BufferEvent.CHANGE_CAMERA, function () {
            if (_this.lastSelectCamera) {
                _this.cameraElements[_this.lastSelectCamera - 1].className = setting_1.default.cameraDotStyleDefault;
            }
            var currentCameraIndex = _this.player.bufferManager.currentCameraIndex;
            _this.cameraElements[currentCameraIndex - 1].className = setting_1.default.cameraDotStyleSelect;
            _this.lastSelectCamera = currentCameraIndex;
        });
    };
    Controller.prototype.initialControls = function () {
        var _this = this;
        // ui control
        document.addEventListener('keydown', function (event) {
            switch (event.key) {
                case 'a':
                    _this.player.requestChangeCamera(-setting_1.default.changeDirection);
                    break;
                case 'd':
                    _this.player.requestChangeCamera(setting_1.default.changeDirection);
                    break;
                default:
                    break;
            }
        });
        var interact = {
            down: 'mousedown',
            up: 'mouseup',
            move: 'mousemove',
            out: 'mouseout'
        };
        if (this.isTouchable) {
            interact.down = 'touchstart';
            interact.up = 'touchend';
            interact.move = 'touchmove';
            interact.out = 'touchcancel';
        }
        this.HTMLElement.addEventListener(interact.down, function (event) { return _this.mouseDown(event); });
        this.HTMLElement.addEventListener(interact.move, function (event) { return _this.mouseMove(event); });
        this.HTMLElement.addEventListener(interact.up, function (event) { return _this.mouseUp(event); });
        this.HTMLElement.addEventListener(interact.out, function (event) { return _this.mouseUp(event); });
        this.HTMLElement.style.display = 'flex';
    };
    Controller.prototype.mouseDown = function (event) {
        event.preventDefault();
        event.stopPropagation();
        this.isPressed = true;
        this.hasMoved = false;
        this.moveX = 0;
        if (event.type === 'touchstart') {
            var touchEvent = event;
            this.previousTouchX = touchEvent.touches[0].pageX;
        }
        this.moveThreshold = this.HTMLElement.offsetWidth / (setting_1.default.cameraCount * setting_1.default.slideSensitive);
    };
    Controller.prototype.mouseMove = function (event) {
        event.preventDefault();
        event.stopPropagation();
        var moveX;
        if (event.type === 'touchmove') {
            var touchEvent = event;
            var currentTouchX = touchEvent.touches[0].pageX;
            moveX = currentTouchX - this.previousTouchX;
            this.previousTouchX = currentTouchX;
        }
        else {
            var mouseEvent = event;
            moveX = mouseEvent.movementX;
        }
        if (this.isPressed && moveX !== 0) {
            this.moveX += moveX;
            if (Math.abs(this.moveX) >= this.moveThreshold) {
                var steps = Math.floor(Math.abs(this.moveX) / this.moveThreshold) * Math.sign(this.moveX);
                this.moveX -= steps * this.moveThreshold;
                this.player.requestChangeCamera(steps * setting_1.default.changeDirection);
                this.hasMoved = true;
            }
        }
    };
    Controller.prototype.mouseUp = function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (!this.isPressed)
            return;
        this.isPressed = false;
        if (this.hasMoved) {
            this.hasMoved = false;
        }
    };
    return Controller;
}());
exports.default = Controller;
//# sourceMappingURL=controller.js.map