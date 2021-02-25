import './index.less';
import setting from './setting';
import MultiVisionPlayer from "./player";


new MultiVisionPlayer(
  setting.mimeCodec,
  <HTMLMediaElement>document.getElementById(setting.playerHTMLElementID)!
)
