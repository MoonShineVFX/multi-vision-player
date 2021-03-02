import './index.less';
import MultiVisionPlayer from "./player";
import Controller from "./controller";
// import { testChangCamera } from "./test";


const player = new MultiVisionPlayer();
new Controller(
    step => player.changeCamera(step)
);