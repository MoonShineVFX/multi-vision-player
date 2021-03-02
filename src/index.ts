import './index.less';
import MultiVisionPlayer from "./player";


const player = new MultiVisionPlayer();

const previousButton = <HTMLButtonElement>document.getElementById('btn-previous');
const nextButton = <HTMLButtonElement>document.getElementById('btn-next');
previousButton.addEventListener('click', () => {
    player.changeCamera(-1);
});
nextButton.addEventListener('click', () => {
    player.changeCamera(1);
});

window.document.addEventListener('keydown', event => {
    switch (event.key) {
        case 'a':
            player.changeCamera(-1);
            break;
        case 'd':
            player.changeCamera(1);
            break;
        default:
            break;
    }
});
