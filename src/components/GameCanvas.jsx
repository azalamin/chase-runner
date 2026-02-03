import Phaser from "phaser";
import { useEffect, useRef } from "react";
import Game from "../game/Game";

export default function GameCanvas() {
	const gameRef = useRef(null);

	useEffect(() => {
		if (!gameRef.current) {
			gameRef.current = new Phaser.Game(Game);
		}

		return () => {
			gameRef.current?.destroy(true);
			gameRef.current = null;
		};
	}, []);

	return <div id='game-container' />;
}
