/* eslint-disable no-undef */
import MainScene from "./MainScene";

const Game = {
    type: Phaser.AUTO,
    width: 800,
    height: 400,
    parent: "game-container",
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 700 }
        }
    },
    scene: [MainScene]
};

export default Game;
