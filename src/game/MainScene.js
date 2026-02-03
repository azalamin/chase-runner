import Phaser from "phaser";

export default class MainScene extends Phaser.Scene {
    constructor() {
        super("main");
    }

    preload() {
        this.load.image("player", "/player.png");
        this.load.image("enemy", "/enemy.png");
        this.load.image("ground", "/ground.png");
        this.load.image("obstacle", "/obstacle.png");
        this.load.image("gift", "/gift.png");
        this.load.image("energy", "/energy.png");

        this.load.audio("music", "/sounds/chase_music.mp3");
        this.load.audio("jump", "/sounds/jump.mp3");
        this.load.audio("run", "/sounds/run_loop.mp3");
        this.load.audio("gameover", "/sounds/game_over.mp3");
    }

    create() {
        /* ---------- STATE ---------- */
        this.gameStarted = false;
        this.isGameOver = false;

        /* ---------- CONSTANTS ---------- */
        this.baseSpeed = 4;
        this.speed = this.baseSpeed;
        this.energy = 100;

        this.groundHeight = 48;
        this.groundY = 400 - this.groundHeight;

        this.physics.world.gravity.y = 900;

        /* ---------- UI ---------- */
        this.startText = this.add.text(
            400,
            180,
            "PRESS ENTER OR TAP TO START",
            { fontSize: "26px", fill: "#ffffff" }
        ).setOrigin(0.5);

        this.score = 0;
        this.scoreText = this.add.text(16, 16, "Score: 0", {
            fontSize: "18px",
            fill: "#ffffff",
        });

        this.energyText = this.add.text(16, 40, "Energy: 100%", {
            fontSize: "18px",
            fill: "#00ff99",
            fontStyle: "bold",
        });

        this.gameOverText = this.add.text(400, 180, "GAME OVER", {
            fontSize: "32px",
            fill: "#ff4d4d",
        }).setOrigin(0.5).setVisible(false);

        /* ---------- GROUND ---------- */
        this.grounds = this.physics.add.staticGroup();
        this.ground1 = this.grounds.create(0, 400, "ground").setOrigin(0, 1);
        this.ground2 = this.grounds.create(800, 400, "ground").setOrigin(0, 1);
        this.ground1.refreshBody();
        this.ground2.refreshBody();

        /* ---------- PLAYER ---------- */
        this.player = this.physics.add.sprite(
            200,
            this.groundY - 40,
            "player"
        );
        this.player.setCollideWorldBounds(true);
        this.player.body.enable = false;

        /* ---------- ENEMY ---------- */
        this.enemy = this.physics.add.sprite(80, this.groundY, "enemy");
        this.enemy.body.allowGravity = false;

        /* ---------- GROUPS ---------- */
        this.obstacles = this.physics.add.group();
        this.gifts = this.physics.add.group();
        this.energyGifts = this.physics.add.group();

        /* ---------- COLLISIONS ---------- */
        this.physics.add.collider(this.player, this.grounds);

        this.physics.add.collider(this.player, this.obstacles, () => {
            this.modifyEnergy(-25);
        });

        this.physics.add.overlap(this.player, this.gifts, this.collectGift, null, this);
        this.physics.add.overlap(
            this.player,
            this.energyGifts,
            this.collectEnergy,
            null,
            this
        );

        /* ---------- INPUT ---------- */
        this.enterKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ENTER
        );
        this.input.keyboard.on("keydown-SPACE", this.jump, this);
        this.input.once("pointerdown", () => {
            if (!this.gameStarted) this.startGame();
        });

        /* ---------- SOUND ---------- */
        this.music = this.sound.add("music", { loop: true, volume: 0.25 });
        this.runSound = this.sound.add("run", { loop: true, volume: 0.15 });
        this.jumpSound = this.sound.add("jump", { volume: 0.4 });
        this.gameOverSound = this.sound.add("gameover", { volume: 0.5 });

        /* ---------- TIMERS ---------- */
        this.time.addEvent({ delay: 2000, loop: true, paused: true, callback: () => this.spawnObstacle() });
        this.time.addEvent({ delay: 3500, loop: true, paused: true, callback: () => this.spawnGift() });
        this.time.addEvent({ delay: 6000, loop: true, paused: true, callback: () => this.spawnEnergyGift() });
    }

    startGame() {
        this.gameStarted = true;
        this.startText.setVisible(false);
        this.player.body.enable = true;

        this.music.play();
        this.runSound.play();

        this.time.events.forEach(e => e.paused = false);
    }

    jump() {
        if (this.gameStarted && !this.isGameOver && this.player.body.blocked.down) {
            this.player.setVelocityY(-450);
            this.jumpSound.play();
        }
    }

    spawnObstacle() {
        const obs = this.obstacles.create(850, this.groundY, "obstacle");
        obs.setOrigin(0.5, 1);
        obs.body.allowGravity = false;
        obs.setVelocityX(-this.speed * 60);
    }

    spawnGift() {
        const gift = this.gifts.create(850, this.groundY - 80, "gift");
        gift.body.allowGravity = false;
        gift.setVelocityX(-this.speed * 60);
    }

    spawnEnergyGift() {
        const percents = [5, 10, 20];
        const value = Phaser.Utils.Array.GetRandom(percents);

        const energy = this.energyGifts.create(850, this.groundY - 120, "energy");
        energy.body.allowGravity = false;
        energy.setVelocityX(-this.speed * 60);
        energy.energyValue = value;
    }

    collectGift(player, gift) {
        gift.destroy();
        this.score += 100;
        this.scoreText.setText(`Score: ${this.score}`);
    }

    collectEnergy(player, energy) {
        energy.destroy();
        this.modifyEnergy(energy.energyValue);

        this.speed += 0.3; // speed boost
        this.time.delayedCall(1500, () => {
            this.speed = this.baseSpeed + (this.energy / 100);
        });
    }

    modifyEnergy(amount) {
        this.energy = Phaser.Math.Clamp(this.energy + amount, 0, 100);
        this.energyText.setText(`Energy: ${this.energy}%`);

        // Glow effect
        this.energyText.setScale(1.2);
        this.time.delayedCall(200, () => this.energyText.setScale(1));
    }

    update() {
        if (!this.gameStarted || this.isGameOver) return;

        /* ---------- MOVE GROUND ---------- */
        this.ground1.x -= this.speed;
        this.ground2.x -= this.speed;

        if (this.ground1.x <= -800) {
            this.ground1.x = this.ground2.x + 800;
            this.ground1.refreshBody();
        }
        if (this.ground2.x <= -800) {
            this.ground2.x = this.ground1.x + 800;
            this.ground2.refreshBody();
        }

        /* ---------- ENEMY BASED ON ENERGY ---------- */
        const danger = 1 - this.energy / 100;
        this.enemy.x = Phaser.Math.Linear(
            this.enemy.x,
            this.player.x - (80 + danger * 120),
            0.05
        );

        if (this.energy <= 0) {
            this.handleGameOver();
        }
    }

    handleGameOver() {
        this.isGameOver = true;
        this.music.stop();
        this.runSound.stop();
        this.gameOverSound.play();
        this.gameOverText.setVisible(true);

        this.time.delayedCall(3000, () => this.scene.restart());
    }
}
