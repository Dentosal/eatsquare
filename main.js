let canvas;
let ctx;

const width = 1920;
const height = 1080;
const player_move_speed = 0.25;

let nightmare_mode = false;
let state = 'menu'; // 'menu', 'in_game', 'paused', 'game_over'

let time_until_next_enemy = 0;

let player = {
    x: 0,
    y: 0,
    size: 40,
    score: 0,
}
let others = [];

let name_input = "";
let keys_pressed = {
    up: false,
    down: false,
    left: false,
    right: false,
};

const resize =  () => {
    const canvas = document.querySelector('canvas');
    const canvasRatio = canvas.height / canvas.width;
    const windowRatio = window.innerHeight / window.innerWidth;
    let width;
    let height;

    if (windowRatio < canvasRatio) {
        height = window.innerHeight;
        width = height / canvasRatio;
    } else {
        width = window.innerWidth;
        height = width * canvasRatio;
    }

    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
};

const drawMainMenu = () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = '32px Arial';
    ctx.fillText(
        'Eat smaller green squares to grow, avoid larger red squares to not die.',
        100,
        200
    );
    ctx.fillText(
        'Use arrow keys or WASD to move, and space to shrink yourself.',
        100,
        250
    );
    ctx.fillText(
        'Nightmare mode: ' + (nightmare_mode ? 'ON' : 'OFF') + ' (Press N to toggle)',
        100,
        300
    );
    ctx.fillText(
        'Press space to start.',
        100,
        350
    );

    ctx.fillStyle = '#0f0';
    ctx.fillRect(150 - 20/2, 450 - 20/2, 20, 20);
    ctx.fillStyle = '#00f';
    ctx.fillRect(150 - 40/2, 550 - 40/2, 40, 40);
    ctx.fillStyle = '#f00';
    ctx.fillRect(150 - 80/2, 650 - 80/2, 80, 80);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('Food', 200, 450);
    ctx.fillText('You', 200, 550);
    ctx.fillText('Enemy', 200, 650);
    
    
    ctx.textAlign = 'center';
    ctx.fillText('High scores', 1300, 500);
    ctx.fillText('Normal', 1000, 550);
    ctx.fillText('Nightmare', 1550, 550);

    let highscores = JSON.parse(localStorage.getItem('highscores') || 'null');
    if (!highscores) {
        highscores = { normal: [], nightmare: [] };
    }
    for ([mode, offset] of [['normal', 0], ['nightmare', 600]]) {
        for (let i = 0; i < highscores[mode].length; i++) {
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'left';
            ctx.fillText((i + 1) + ". " + highscores[mode][i].nick, 750 + offset, 600 + i * 50);
            ctx.textAlign = 'right';
            ctx.fillText(highscores[mode][i].score, 1300 + offset, 600 + i * 50);
        }
    }

    ctx.textAlign = 'left';
}

const randomFakeHighscore = mode => {
    let highscores = JSON.parse(localStorage.getItem('highscores') || 'null');
    if (!highscores) {
        highscores = { normal: [], nightmare: [] };
    }
    if (highscores[mode].length === 0) {
        return Math.floor(Math.random() * 10000) * (mode == 'nightmare' ? 0.5 : 1);
    } else {
        let min = highscores[mode][highscores[mode].length - 1].score + 1;
        let max = Math.floor(highscores[mode][0].score * (mode == 'nightmare' ? 1.5 : 2.5));
        return Math.floor(Math.random() * Math.random() * (max - min + 1)) + min;
    }
}

const randomFakeNick = () => {
    const fakeNames = [
        'Gamer' + Math.floor(Math.random() * 900 + 100),
        'Anon' + Math.floor(Math.random() * 900 + 100),
        'SquareMaster', 'EatSquarePro', 'Sqrt', 'Root',
        'GreenGoblin', 'RedMenace', 'SquareEater', 'NightmareNibbler',
        'PixelProwler', 'BlockBuster', 'SquareSlayer', 'NomNomNom',
        'SquareSnacker', 'GreenGiant', 'RedRogue', 'SquareSmasher',
        'BlockBuster', 'PixelPusher', 'SquareSurvivor', 'NomadicNibbler',
        'SquareSavior', 'GreenGuardian', 'RedReaper', 'SquareSensation', 'NomadicNomad',
        'TheBlueOne', 'Sloth', 'DenTongSal', 'Perkele', 'Kana', 'Nokkija',
        'Neliö', 'XX', 'Ahmija', 'Otus', 'LuokanSohva',
    ];
    return fakeNames[Math.floor(Math.random() * fakeNames.length)];
}

const maybeInsertRandomFakeHighscore = () => {
    let nfi = parseInt(localStorage.getItem('nextFakeInsert'));
    if (nfi === null || isNaN(nfi)) {
        nfi = 0;
    }
    if (nfi < (+new Date())) {
        let mode = Math.random() < 0.3 ? 'nightmare' : 'normal';
        insertHighScore(mode, randomFakeNick(), randomFakeHighscore(mode))

        let delay_days = (1.0 - Math.random() * Math.random()) * rand_normal() * 5;
        let delay_ms = delay_days * 24 * 60 * 60 * 1000;
        localStorage.setItem('nextFakeInsert', (+new Date()) + delay_ms);
    }
}

const isHighScore = () => {
    let highscores = JSON.parse(localStorage.getItem('highscores') || 'null');
    if (!highscores) {
        highscores = { normal: [], nightmare: [] };
    }
    let currentHighscores = nightmare_mode ? highscores.nightmare : highscores.normal;
    return (currentHighscores.length === 0 || currentHighscores[currentHighscores.length - 1].score < Math.floor(player.score));
}

const insertHighScore = (mode, nick, score) => {
    let highscores = JSON.parse(localStorage.getItem('highscores') || 'null');
    if (!highscores) {
        highscores = { normal: [], nightmare: [] };
    }
    highscores[mode].push({ nick: nick.trim(), score: Math.floor(score) });
    highscores[mode].sort((a, b) => b.score - a.score);
    if (highscores[mode].length > 10) {
        highscores[mode] = highscores[mode].slice(0, 10);
    }
    localStorage.setItem('highscores', JSON.stringify(highscores));
}

const drawGameOver = () => {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText('GAME OVER', width / 2, height / 2 - 100);
    ctx.fillText('Score: ' + Math.floor(player.score), width / 2, height / 2 - 50);
    ctx.fillText('Press enter to return to the main menu.', width / 2, height - 100);

    if (isHighScore()) {
        ctx.fillText('New high score! Enter your name:', width / 2, height / 2);
        ctx.fillText(name_input, width / 2, height / 2 + 50);
    }
}

const initGame = () => {
    state = 'in_game';
    player.score = 0;
    player.size = 40;
    player.x = width / 2 - player.size / 2;
    player.y = height / 2 - player.size / 2;
    others = [];
    time_until_next_enemy = 0;
    name_input = "";
}

const gameOver = () => {
    state = 'game_over';
}

const gameOverDone = () => {
    // Submit high score, if any
    if (isHighScore()) {
        insertHighScore(nightmare_mode ? 'nightmare' : 'normal', name_input.trim(), Math.floor(player.score));
    }
    state = 'menu';
}

// From https://stackoverflow.com/a/49434653
function rand_normal() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) return rand_normal() // resample between 0 and 1
    return num
}

const shrinkPlayer = () => {
    player.size = 40;
}

const updateGame = (deltaTime) => {
    // Player movement
    if (keys_pressed.left && !keys_pressed.right) {
        player.x -= player_move_speed * deltaTime;
    }
    if (keys_pressed.right && !keys_pressed.left) {
        player.x += player_move_speed * deltaTime;
    }
    if (keys_pressed.up && !keys_pressed.down) {
        player.y -= player_move_speed * deltaTime;
    }
    if (keys_pressed.down && !keys_pressed.up) {
        player.y += player_move_speed * deltaTime;
    }
    player.x = Math.max(player.size / 2, Math.min(width  - player.size / 2, player.x));
    player.y = Math.max(player.size / 2, Math.min(height - player.size / 2, player.y));

    // Enemy movement, oob detection and collision detection
    let remove = [];
    for (let i = 0; i < others.length; i++) {
        const other = others[i];
        other.x += other.vx * deltaTime;
        other.y += other.vy * deltaTime;
        if (
            (other.x + other.size / 2 < 0 && other.vx < 0)
            || (other.x - other.size / 2 > width && other.vx > 0)
            || (other.y + other.size / 2 < 0 && other.vy < 0)
            || (other.y - other.size / 2 > height && other.vy > 0)
        ) {
            remove.push(i);
            continue;
        }

        if (
            player.x + player.size / 2 > other.x - other.size / 2 &&
            player.x - player.size / 2 < other.x + other.size / 2 &&
            player.y + player.size / 2 > other.y - other.size / 2 &&
            player.y - player.size / 2 < other.y + other.size / 2
        ) {
            if (player.size >= other.size) {
                player.score += other.size;
                player.size += 2 + other.size * 0.05;
                remove.push(i);
            } else {
                gameOver();
                return;
            }
        }
    }
    for (let i = remove.length - 1; i >= 0; i-=1) {
        others.splice(remove[i], 1);
    }

    // Score decay
    player.score = Math.max(0, player.score - deltaTime * 0.001);

    // Shrink player if too large
    if (player.size > 400) {
        player.size = 40;
    }

    // Enemy generation
    time_until_next_enemy -= deltaTime;
    if (time_until_next_enemy <= 0) {
        const size = Math.round(Math.max(15,
            Math.random() < 0.5
                ? player.size + (rand_normal() - 0.4) * 300
                : Math.random() * Math.max(250, player.size * 2)
        ));
        const speed = Math.random() * 0.32 + 0.03;

        const horizontal = nightmare_mode ? Math.random() < 0.5 : true;
        const vx = horizontal ? (Math.random() < 0.5 ? -speed : speed) : 0;
        const vy = horizontal ? 0 : (Math.random() < 0.5 ? -speed : speed);

        const x = horizontal ? (vx > 0 ? -size : width + size) : Math.random() * width;
        const y = horizontal ? Math.random() * height : (vy > 0 ? -size : height + size);
        others.push({
            x: x,
            y: y,
            size: size,
            vx: vx,
            vy: vy
        });
        others.sort((a, b) => a.size - b.size);

        time_until_next_enemy = Math.random() * (nightmare_mode ? 800 : 1400);
    }
}

const drawGame = () => {
    for (let i = 0; i < others.length; i++) {
        const other = others[i];
        ctx.fillStyle = other.size <= player.size ? '#0f0' : '#f00';
        ctx.fillRect(other.x - other.size / 2, other.y - other.size / 2, other.size, other.size);
    }
    ctx.fillStyle = '#00f';
    let s = Math.round(player.size);
    ctx.fillRect(player.x - s / 2, player.y - s / 2, s, s);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = '32px Arial';
    ctx.fillText('Score: ' + Math.floor(player.score), 10, 10);
}

let prevFrameTime, deltaTime;
function mainRenderLoop(time) {
    if (prevFrameTime === undefined) {
        deltaTime = 0;
    } else {
        deltaTime = time - prevFrameTime;
    }
    prevFrameTime = time;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state === 'menu') {
        drawMainMenu();
    } else if (state === 'paused') {
        drawPaused();
    } else if (state === 'in_game') {
        updateGame(deltaTime);
        drawGame();
    } else if (state === 'game_over') {
        drawGameOver();
    } else {
        console.error('Unknown state:', state);
        return;
    }
    requestAnimationFrame(mainRenderLoop);
}

document.addEventListener("DOMContentLoaded", () => {
    canvas = document.querySelector('canvas');
    ctx = canvas.getContext('2d');

    window.addEventListener('resize', resize, false);
    resize();

    window.addEventListener('keydown', (e) => {
        if (state === 'game_over') {
            if (e.key.length === 1 && name_input.length < 20) {
                name_input += e.key;
            } else if (e.key === "Backspace") {
                name_input = name_input.slice(0, -1);
            } else if (e.key === "Enter") {
                gameOverDone();
            }
            return;
        }

        if (state === 'in_game') {
            if (e.key === "ArrowLeft" || e.key === "a") {
                keys_pressed.left = true;
            }
            if (e.key === "ArrowRight" || e.key === "d") {
                keys_pressed.right = true;
            }
            if (e.key === "ArrowUp" || e.key === "w") {
                keys_pressed.up = true;
            }
            if (e.key === "ArrowDown" || e.key === "s") {
                keys_pressed.down = true;
            }
        }

        if (e.key === "n" && state === 'menu') {
            nightmare_mode = !nightmare_mode;
        }
        if (e.key === "p" && state == 'in_game') {
            state = 'paused';
        }
        if (e.key === "p" && state == 'paused') {
            state = 'in_game';
        }
        if (e.key === " ") {
            if (state === 'in_game') {
                shrinkPlayer();
            } else if (state === 'menu') {
                initGame();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === "ArrowLeft" || e.key === "a") {
            keys_pressed.left = false;
        }
        if (e.key === "ArrowRight" || e.key === "d") {
            keys_pressed.right = false;
        }
        if (e.key === "ArrowUp" || e.key === "w") {
            keys_pressed.up = false;
        }
        if (e.key === "ArrowDown" || e.key === "s") {
            keys_pressed.down = false;
        }
    });

    requestAnimationFrame(mainRenderLoop);

    // Highscore faking
    if (localStorage.getItem('highscores') === null) {
        for (let mode of ['normal', 'nightmare']) {
            for (let i = 0; i < 10; i++) {
                insertHighScore(mode, randomFakeNick(), randomFakeHighscore(mode))
            }
        }
    }
    maybeInsertRandomFakeHighscore();
    setTimeout(() => {
        maybeInsertRandomFakeHighscore();
    }, 60 * 1000);

})