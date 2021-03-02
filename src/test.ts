import MultiVisionPlayer from "./player";

const testChangCamera = (player: MultiVisionPlayer) => {
    let count = 1;
    const triggerChangeCamera = (step: number) => {
        player.changeCamera(step);
        count += 1;
        if (count > 24) return;
        setTimeout(
            () => triggerChangeCamera(step),
            30
        )
    }
    setTimeout(() => triggerChangeCamera(1), 3000);
    setTimeout(() => {
        count = 1;
        triggerChangeCamera(-1)
    }, 8000);
}

export { testChangCamera };
