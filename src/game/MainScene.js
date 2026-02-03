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

        this.load.audio("music", "/sounds/chase_music.mp3");
        this.load.audio("jump", "/sounds/jump.mp3");
        this.load.audio("run", "/sounds/run_loop.mp3");
        this.load.audio("gameover", "/sounds/game_over.mp3");
    }

    create() {
        /* ---------- GAME STATE ---------- */
        this.gameStarted = false;
        this.isGameOver = false;

        /* ---------- CONSTANTS ---------- */
        this.speed = 4;
        this.groundHeight = 48;
        this.groundY = 400 - this.groundHeight;
        this.score = 0;

        this.physics.world.gravity.y = 900;

        /* ---------- UI ---------- */
        this.startText = this.add
            .text(400, 180, "PRESS ENTER OR TAP TO START", {
                fontSize: "26px",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        this.scoreText = this.add.text(16, 16, "Score: 0", {
            fontSize: "18px",
            fill: "#ffffff",
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
        this.player = this.physics.add.sprite(
            200,
            this.groundY - this.playerHeightOffset(),
            "player"
        );
        this.player.setCollideWorldBounds(true);
        this.player.body.enable = false;

        /* ---------- ENEMY ---------- */
        this.enemy = this.physics.add.sprite(80, this.groundY, "enemy");
        this.enemy.body.allowGravity = false;
        this.enemy.setImmovable(true);

        this.enemyDistance = 140;
        this.enemyCatchSpeed = 0.02;

        // Enemy jump simulation
        this.enemyVelocityY = 0;
        this.enemyJumpForce = -350;
        this.enemyGravity = 900;

        /* ---------- GROUPS ---------- */
        this.obstacles = this.physics.add.group();
        this.gifts = this.physics.add.group();

        /* ---------- COLLISIONS ---------- */
        this.physics.add.collider(this.player, this.grounds);

        this.physics.add.collider(this.player, this.obstacles, () => {
            this.enemyDistance -= 30;
            if (this.enemyDistance < 50) this.enemyDistance = 50;
        });

        this.physics.add.overlap(
            this.player,
            this.gifts,
            this.collectGift,
            null,
            this
        );

        /* ---------- INPUT ---------- */
        this.enterKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ENTER
        );

        this.input.keyboard.on("keydown-SPACE", this.jump, this);
        this.input.on("pointerdown", this.jump, this);

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
    }

    playerHeightOffset() {
        return this.player?.height ? this.player.height * 0.5 : 40;
    }

    startGame() {
        this.gameStarted = true;
        this.startText.setVisible(false);

        this.player.body.enable = true;
        this.obstacleTimer.paused = false;
        this.giftTimer.paused = false;

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

    spawnObstacle() {
        const obs = this.obstacles.create(850, this.groundY, "obstacle");
        obs.setOrigin(0.5, 1);
        obs.body.allowGravity = false;
        obs.setVelocityX(-this.speed * 60);
        obs.setImmovable(true);
    }

    spawnGift() {
        const gift = this.gifts.create(850, this.groundY - 80, "gift");
        gift.body.allowGravity = false;
        gift.setVelocityX(-this.speed * 60);
    }

    collectGift(player, gift) {
        gift.destroy();
        this.score += 100;
        this.scoreText.setText(`Score: ${this.score}`);
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

        /* ---------- ENEMY AUTO JUMP ---------- */
        this.obstacles.children.iterate((obs) => {
            if (!obs) return;

            const distance = obs.x - this.enemy.x;
            if (distance > 0 && distance < 80 && this.enemyVelocityY === 0) {
                this.enemyVelocityY = this.enemyJumpForce;
            }
        });

        // Simulate enemy jump
        this.enemyVelocityY += this.enemyGravity * 0.016;
        this.enemy.y += this.enemyVelocityY * 0.016;

        if (this.enemy.y >= this.groundY) {
            this.enemy.y = this.groundY;
            this.enemyVelocityY = 0;
        }

        /* ---------- CLEAN OBJECTS ---------- */
        this.obstacles.children.iterate((o) => o && o.x < -50 && o.destroy());
        this.gifts.children.iterate((g) => g && g.x < -50 && g.destroy());

        /* ---------- ENEMY CHASE ---------- */
        const targetX = this.player.x - this.enemyDistance;
        this.enemy.x = Phaser.Math.Linear(
            this.enemy.x,
            targetX,
            this.enemyCatchSpeed
        );

        /* ---------- GAME OVER ---------- */
        if (this.enemy.x + this.enemy.width * 0.5 >= this.player.x) {
            this.handleGameOver();
        }
    }

    handleGameOver() {
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
