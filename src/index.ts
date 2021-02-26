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

let count = 1;
const triggerChangeCamera = (step: number) => {
    player.changeCamera(step);
    count += 1;
    if (count > 24) return;
    setTimeout(
        () => triggerChangeCamera(step),
        60
    )
}

setTimeout(() => triggerChangeCamera(1), 3000);
setTimeout(() => {
    count = 1;
    triggerChangeCamera(-1)
}, 8000);
