/* eslint-disable no-unused-vars */
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
        this.hitCooldown = false;

        /* ---------- CONSTANTS ---------- */
        this.baseSpeed = 4;
        this.speed = this.baseSpeed;
        this.energy = 100;

        this.worldHeight = 400;
        this.groundHeight = 48;
        this.groundY = this.worldHeight - this.groundHeight;

        this.physics.world.gravity.y = 900;

        /* ---------- UI ---------- */
        this.startText = this.add
            .text(400, 180, "PRESS ENTER OR TAP TO START", {
                fontSize: "26px",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

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

        this.gameOverText = this.add
            .text(400, 180, "GAME OVER", {
                fontSize: "32px",
                fill: "#ff4d4d",
            })
            .setOrigin(0.5)
            .setVisible(false);

        /* ---------- GROUND ---------- */
        this.grounds = this.physics.add.staticGroup();
        this.ground1 = this.grounds.create(0, 400, "ground").setOrigin(0, 1);
        this.ground2 = this.grounds.create(800, 400, "ground").setOrigin(0, 1);
        this.ground1.refreshBody();
        this.ground2.refreshBody();

        /* ---------- PLAYER ---------- */
        this.player = this.physics.add.sprite(200, 0, "player");
        this.player.setCollideWorldBounds(true);
        this.player.body.enable = false;

        // ⬆️ keep player ~25px above ground visually
        this.player.y =
            this.groundY - this.player.displayHeight / 3 - 40;

        this.player.setVelocity(0, 0);

        /* ---------- ENEMY ---------- */
        this.enemy = this.physics.add.sprite(80, 0, "enemy");
        this.enemy.body.allowGravity = false;
        this.enemy.setImmovable(true);

        this.enemy.y =
            this.groundY - this.enemy.displayHeight / 2;

        // enemy jump simulation
        this.enemyVelY = 0;
        this.enemyJumpForce = -350;
        this.enemyGravity = 900;

        /* ---------- GROUPS ---------- */
        this.obstacles = this.physics.add.group();
        this.gifts = this.physics.add.group();
        this.energyGifts = this.physics.add.group();

        /* ---------- COLLISIONS ---------- */
        this.physics.add.collider(this.player, this.grounds);

        this.physics.add.collider(
            this.player,
            this.obstacles,
            this.handleObstacleHit,
            null,
            this
        );

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
        this.obstacleTimer = this.time.addEvent({
            delay: 2000,
            loop: true,
            paused: true,
            callback: this.spawnObstacle,
            callbackScope: this,
        });

        this.giftTimer = this.time.addEvent({
            delay: 3500,
            loop: true,
            paused: true,
            callback: this.spawnGift,
            callbackScope: this,
        });

        this.energyTimer = this.time.addEvent({
            delay: 6000,
            loop: true,
            paused: true,
            callback: this.spawnEnergyGift,
            callbackScope: this,
        });
    }

    startGame() {
        this.gameStarted = true;
        this.startText.setVisible(false);

        this.player.body.enable = true;
        this.player.setVelocity(0, 0);

        this.obstacleTimer.paused = false;
        this.giftTimer.paused = false;
        this.energyTimer.paused = false;

        this.music.play();
        this.runSound.play();
    }

    jump() {
        if (
            this.gameStarted &&
            !this.isGameOver &&
            this.player.body.blocked.down
        ) {
            this.player.setVelocityY(-450);
            this.jumpSound.play();
        }
    }

    handleObstacleHit(player, obstacle) {
        if (this.isGameOver) return;

        // FRONT HIT → GAME OVER
        if (player.body.blocked.right || player.body.touching.right) {
            this.handleGameOver();
            return;
        }

        // FALLING ON TOP / CORNER → ENERGY LOSS
        if (player.body.velocity.y > 0 && !this.hitCooldown) {
            this.hitCooldown = true;
            this.modifyEnergy(-20);

            this.time.delayedCall(600, () => {
                this.hitCooldown = false;
            });
        }
    }

    spawnObstacle() {
        const obs = this.obstacles.create(
            850,
            this.groundY,
            "obstacle"
        );
        obs.setOrigin(0.5, 1);
        obs.body.allowGravity = false;
        obs.setImmovable(true); // ❗ NEVER FALL
        obs.setVelocityX(-this.speed * 60);
    }

    spawnGift() {
        const gift = this.gifts.create(
            850,
            this.groundY - 80,
            "gift"
        );
        gift.body.allowGravity = false;
        gift.setVelocityX(-this.speed * 60);
    }

    spawnEnergyGift() {
        const values = [5, 10, 20];
        const value = Phaser.Utils.Array.GetRandom(values);

        const energy = this.energyGifts.create(
            850,
            this.groundY - 120,
            "energy"
        );
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

        this.speed += 0.4;
        this.time.delayedCall(1500, () => {
            this.speed = this.baseSpeed + this.energy / 100;
        });
    }

    modifyEnergy(amount) {
        this.energy = Phaser.Math.Clamp(this.energy + amount, 0, 100);
        this.energyText.setText(`Energy: ${this.energy}%`);

        this.energyText.setScale(1.25);
        this.time.delayedCall(200, () => this.energyText.setScale(1));
    }

    update() {
        // START VIA ENTER
        if (!this.gameStarted && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.startGame();
        }

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

        /* ---------- ENEMY AUTO JUMP ---------- */
        this.obstacles.children.iterate((obs) => {
            if (!obs) return;

            const dist = obs.x - this.enemy.x;
            if (dist > 0 && dist < 90 && this.enemyVelY === 0) {
                this.enemyVelY = this.enemyJumpForce;
            }
        });

        this.enemyVelY += this.enemyGravity * 0.016;
        this.enemy.y += this.enemyVelY * 0.016;

        if (this.enemy.y >= this.groundY - this.enemy.displayHeight / 2) {
            this.enemy.y = this.groundY - this.enemy.displayHeight / 2;
            this.enemyVelY = 0;
        }

        /* ---------- CLEAN ---------- */
        this.obstacles.children.iterate((o) => o && o.x < -50 && o.destroy());
        this.gifts.children.iterate((g) => g && g.x < -50 && g.destroy());
        this.energyGifts.children.iterate((e) => e && e.x < -50 && e.destroy());

        /* ---------- ENEMY CATCH ---------- */
        const danger = 1 - this.energy / 100;
        this.enemy.x = Phaser.Math.Linear(
            this.enemy.x,
            this.player.x - (90 + danger * 160),
            0.05
        );

        if (this.energy <= 0 && this.enemy.x >= this.player.x - 10) {
            this.handleGameOver();
        }
    }

    handleGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        this.music.stop();
        this.runSound.stop();
        this.gameOverSound.play();

        this.gameOverText.setVisible(true);

        this.time.delayedCall(3000, () => {
            this.scene.restart();
        });
    }
}
