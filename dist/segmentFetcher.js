"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegmentFetcher = void 0;
// Define
var setting_1 = require("./setting");
// Main
var SegmentFetcher = /** @class */ (function () {
    function SegmentFetcher(fetchCallback, hasAudio) {
        console.info('Initialize SegmentFetcher');
        this.fetchCallback = fetchCallback;
        this.hasAudio = hasAudio;
        this.isFetching = false;
        this.currentIndex = 0;
    }
    SegmentFetcher.prototype.fetchSegment = function (currentCameraIndex) {
        return __awaiter(this, void 0, void 0, function () {
            var requestURL, response, buffer, cursor, size_arr, count, size, segmentIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.isFetching = true;
                        requestURL = setting_1.default.streamHost + "/" + setting_1.default.streamURI + "/" + this.currentIndex;
                        return [4 /*yield*/, fetch(requestURL)];
                    case 1:
                        response = _a.sent();
                        return [4 /*yield*/, response.arrayBuffer()];
                    case 2:
                        buffer = _a.sent();
                        cursor = 4 * (setting_1.default.cameraCount + (this.hasAudio ? 1 : 0));
                        size_arr = new Uint32Array(buffer.slice(0, cursor));
                        // Apply cache to camera
                        for (count = 0; count < setting_1.default.cameraCount; count++) {
                            size = size_arr[count];
                            this.fetchCallback(count + 1, this.currentIndex, buffer.slice(cursor, cursor + size));
                            cursor += size;
                        }
                        // Apply cache to audio
                        if (this.hasAudio) {
                            this.fetchCallback('audio', this.currentIndex, buffer.slice(cursor));
                        }
                        console.debug('Segment fetch finished');
                        this.isFetching = false;
                        segmentIndex = this.currentIndex;
                        this.currentIndex += 1;
                        return [2 /*return*/, {
                                cameraIndex: currentCameraIndex,
                                segmentIndex: segmentIndex
                            }];
                }
            });
        });
    };
    return SegmentFetcher;
}());
exports.SegmentFetcher = SegmentFetcher;
//# sourceMappingURL=segmentFetcher.js.map