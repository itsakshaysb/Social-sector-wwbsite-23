(function () {
    "use strict";

    const LOG_W = 256;
    const LOG_H = 96;
    const INK = "#000000";
    const PAPER = "#ffffff";

    const X_HUMAN = 44;
    const X_ROBOT = 118;
    const X_BOX = 188;
    const GROUND_Y = 72;

    const DURATION = [1400, 500, 1000, 1200, 2000, 1000];

    const GLYPH_U = [
        "11111",
        "10001",
        "10001",
        "10001",
        "10001",
        "10001",
        "11111",
    ];

    const GLYPH_X = [
        "10001",
        "01010",
        "00100",
        "01010",
        "10001",
        "10001",
        "10001",
    ];

    const GLYPHS = { U: GLYPH_U, X: GLYPH_X };

    /** Human walk frame 0 — legs apart */
    const HUMAN_0 = [
        "0011100",
        "0011100",
        "0111110",
        "0111110",
        "0111110",
        "0111110",
        "0011100",
        "0011100",
        "0110110",
        "1100110",
        "1100110",
        "1000001",
        "1000001",
        "1000001",
        "1000001",
        "1100011",
        "1100011",
        "0110110",
    ];

    /** Human walk frame 1 — legs crossed */
    const HUMAN_1 = [
        "0011100",
        "0011100",
        "0111110",
        "0111110",
        "0111110",
        "0111110",
        "0011100",
        "0011100",
        "0110110",
        "1100110",
        "1100110",
        "1000001",
        "1000001",
        "1000001",
        "1000001",
        "0110110",
        "0011100",
        "0011100",
    ];

    const ROBOT = [
        "00100000000000100",
        "01111111111111110",
        "01111111111111110",
        "01110001110011110",
        "01111111111111110",
        "01111111111111110",
        "01111111111111110",
        "01111111111111110",
        "01111111111111110",
        "01111111111111110",
        "01111111111111110",
        "11111111111111111",
        "11111111111111111",
        "11111111111111111",
        "11111111111111111",
        "01111111111111110",
        "01111111111111110",
        "01111111111111110",
        "01111111111111110",
        "01111111111111110",
    ];

    const IDEA_DOTS = [
        [0, 0, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 0],
        [1, 1, 0, 0, 1, 1],
        [1, 1, 0, 0, 1, 1],
        [0, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 0, 0],
    ];

    const CLOUD = [
        "000011111100000",
        "001111111111100",
        "011111111111110",
        "111111111111111",
        "111111111111111",
        "011111111111110",
        "001111111111100",
        "000011111100000",
    ];

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function easeOutCubic(t) {
        return 1 - (1 - t) ** 3;
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    }

    function blit(ctx, matrix, ox, oy, color) {
        ctx.fillStyle = color;
        for (let y = 0; y < matrix.length; y += 1) {
            const row = matrix[y];
            for (let x = 0; x < row.length; x += 1) {
                if (row[x] === "1" || row[x] === 1) {
                    ctx.fillRect(ox + x, oy + y, 1, 1);
                }
            }
        }
    }

    function blitScale(ctx, matrix, ox, oy, scale, color) {
        if (scale <= 0) return;
        ctx.fillStyle = color;
        for (let y = 0; y < matrix.length; y += 1) {
            const row = matrix[y];
            for (let x = 0; x < row.length; x += 1) {
                if (row[x] === "1" || row[x] === 1) {
                    ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
                }
            }
        }
    }

    function drawHuman(ctx, x, walkFrame) {
        const matrix = walkFrame % 2 === 0 ? HUMAN_0 : HUMAN_1;
        const w = matrix[0].length;
        const h = matrix.length;
        blit(ctx, matrix, x - Math.floor(w / 2), GROUND_Y - h, INK);
    }

    function drawRobot(ctx, x, antennaOn) {
        const w = ROBOT[0].length;
        const h = ROBOT.length;
        const ox = x - Math.floor(w / 2);
        const oy = GROUND_Y - h;
        blit(ctx, ROBOT, ox, oy, INK);
        if (!antennaOn) {
            ctx.fillStyle = PAPER;
            ctx.fillRect(ox + 1, oy, 1, 1);
            ctx.fillRect(ox + w - 2, oy, 1, 1);
            ctx.fillRect(ox + Math.floor(w / 2), oy - 1, 1, 1);
        }
    }

    function drawIdea(ctx, cx, cy, popScale) {
        const s = popScale;
        const w = IDEA_DOTS[0].length * s;
        const h = IDEA_DOTS.length * s;
        blitScale(ctx, IDEA_DOTS, cx - w / 2, cy - h / 2, s, INK);
    }

    function humanHeadPos(x) {
        return { x, y: GROUND_Y - HUMAN_0.length + 2 };
    }

    function robotHeadPos(x) {
        const h = ROBOT.length;
        return { x, y: GROUND_Y - h + 4 };
    }

    function drawUxBox(ctx, cx, cy, scale, label) {
        const size = Math.round(22 * scale);
        const half = Math.floor(size / 2);
        const left = cx - half;
        const top = cy - half;
        ctx.fillStyle = INK;
        ctx.fillRect(left, top, size, size);
        ctx.fillStyle = PAPER;
        ctx.fillRect(left + 2, top + 2, size - 4, size - 4);

        const chars = String(label || "UX")
            .toUpperCase()
            .replace(/[^A-Z]/g, "")
            .slice(0, 2);
        const c1 = chars[0] || "U";
        const c2 = chars[1] || "X";
        const g1 = GLYPHS[c1] || GLYPH_U;
        const g2 = GLYPHS[c2] || GLYPH_X;
        const glyphW = 5;
        const glyphH = 7;
        const gap = 2;
        const totalW = glyphW * 2 + gap;
        const gx = left + Math.floor((size - totalW) / 2) + 2;
        const gy = top + Math.floor((size - glyphH) / 2) + 2;
        blit(ctx, g1, gx, gy, INK);
        blit(ctx, g2, gx + glyphW + gap, gy, INK);
    }

    function boxAnchorY() {
        return GROUND_Y - 28;
    }

    function drawCloud(ctx, cx, cy, showBeam, boxCx, boxTop) {
        const w = CLOUD[0].length;
        const h = CLOUD.length;
        blit(ctx, CLOUD, cx - Math.floor(w / 2), cy - Math.floor(h / 2), INK);
        if (showBeam && boxCx != null && boxTop != null) {
            ctx.fillStyle = INK;
            const beamTop = cy + Math.floor(h / 2) - 1;
            ctx.fillRect(boxCx - 4, beamTop, 1, boxTop - beamTop);
            ctx.fillRect(boxCx + 3, beamTop, 1, boxTop - beamTop);
        }
    }

    class PixelUxLoop {
        constructor(canvas, options) {
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d", { alpha: false });
            this.label = (options && options.label) || "UX";
            this.paused = Boolean(options && options.paused);
            this.state = 0;
            this.stateElapsed = 0;
            this.rafId = 0;
            this.lastTs = 0;
            this.scale = 1;
            this.ro = null;

            this.humanX = -24;
            this.ideaPop = 0;
            this.ideaX = 0;
            this.ideaY = 0;
            this.antennaOn = true;
            this.boxScale = 0;
            this.cloudX = X_BOX;
            this.cloudY = -16;
            this.boxLiftY = 0;
            this.flyX = 0;
            this.flyY = 0;

            this.resize = this.resize.bind(this);
            this.tick = this.tick.bind(this);
        }

        resize() {
            const parent = this.canvas.parentElement;
            const containerWidth = parent ? parent.clientWidth : LOG_W;
            this.scale = Math.max(1, Math.floor(containerWidth / LOG_W));
            this.canvas.width = LOG_W * this.scale;
            this.canvas.height = LOG_H * this.scale;
            this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
            this.ctx.imageSmoothingEnabled = false;
        }

        resetSceneVars() {
            this.humanX = -24;
            this.ideaPop = 0;
            this.ideaX = 0;
            this.ideaY = 0;
            this.antennaOn = true;
            this.boxScale = 0;
            this.cloudX = X_BOX;
            this.cloudY = -16;
            this.boxLiftY = 0;
            this.flyX = 0;
            this.flyY = 0;
        }

        advanceState() {
            this.state = (this.state + 1) % 6;
            this.stateElapsed = 0;
            if (this.state === 0) {
                this.resetSceneVars();
            }
            if (this.state === 1) {
                const head = humanHeadPos(this.humanX);
                this.ideaX = head.x;
                this.ideaY = head.y - 8;
            }
            if (this.state === 3) {
                this.boxScale = 0;
            }
            if (this.state === 4) {
                this.cloudX = X_BOX;
                this.cloudY = -16;
                this.boxLiftY = 0;
                this.flyX = 0;
                this.flyY = 0;
            }
        }

        update(dt) {
            this.stateElapsed += dt;
            const dur = DURATION[this.state];
            const t = clamp(this.stateElapsed / dur, 0, 1);

            switch (this.state) {
                case 0: {
                    this.humanX = -24 + easeOutCubic(t) * (X_HUMAN + 24);
                    break;
                }
                case 1: {
                    this.humanX = X_HUMAN;
                    this.ideaPop = easeOutCubic(t);
                    const head = humanHeadPos(this.humanX);
                    this.ideaX = head.x;
                    this.ideaY = head.y - 8;
                    break;
                }
                case 2: {
                    this.humanX = X_HUMAN;
                    const from = humanHeadPos(X_HUMAN);
                    const to = robotHeadPos(X_ROBOT);
                    const e = easeInOutCubic(t);
                    this.ideaX = from.x + (to.x - from.x) * e;
                    this.ideaY = from.y + (to.y - from.y) * e;
                    this.ideaPop = 1;
                    break;
                }
                case 3: {
                    this.humanX = X_HUMAN;
                    this.ideaPop = t < 0.25 ? 1 - t / 0.25 : 0;
                    this.antennaOn = Math.floor(this.stateElapsed / 100) % 2 === 0;
                    if (t > 0.55) {
                        const bt = (t - 0.55) / 0.45;
                        this.boxScale = easeOutCubic(bt);
                    } else {
                        this.boxScale = 0;
                    }
                    break;
                }
                case 4: {
                    this.humanX = X_HUMAN;
                    this.boxScale = 1;
                    const enterEnd = 0.25;
                    const hoverEnd = 0.45;
                    const liftEnd = 0.65;
                    if (t < enterEnd) {
                        const e = easeOutCubic(t / enterEnd);
                        this.cloudY = -16 + e * (boxAnchorY() - 38 - -16);
                        this.cloudX = X_BOX;
                    } else if (t < hoverEnd) {
                        this.cloudY = boxAnchorY() - 38;
                        this.cloudX = X_BOX;
                    } else if (t < liftEnd) {
                        const e = easeInOutCubic((t - hoverEnd) / (liftEnd - hoverEnd));
                        this.boxLiftY = e * 14;
                        this.cloudY = boxAnchorY() - 38 - this.boxLiftY * 0.3;
                    } else {
                        const e = easeInOutCubic((t - liftEnd) / (1 - liftEnd));
                        this.flyX = e * 90;
                        this.flyY = e * -70;
                        this.boxLiftY = 14 + e * 20;
                        this.cloudY = boxAnchorY() - 38 - this.boxLiftY * 0.3 + this.flyY;
                        this.cloudX = X_BOX + this.flyX;
                    }
                    break;
                }
                case 5:
                    break;
                default:
                    break;
            }

            if (this.stateElapsed >= dur) {
                this.advanceState();
            }
        }

        drawStaticMidScene() {
            const ctx = this.ctx;
            ctx.fillStyle = PAPER;
            ctx.fillRect(0, 0, LOG_W, LOG_H);
            drawHuman(ctx, X_HUMAN, 0);
            drawRobot(ctx, X_ROBOT, true);
            drawUxBox(ctx, X_BOX, boxAnchorY(), 1, this.label);
        }

        draw() {
            const ctx = this.ctx;
            ctx.fillStyle = PAPER;
            ctx.fillRect(0, 0, LOG_W, LOG_H);

            if (this.state === 5) {
                return;
            }

            const walkFrame = Math.floor(this.stateElapsed / 120);
            const antenna = this.state === 3 ? this.antennaOn : true;

            drawRobot(ctx, X_ROBOT, antenna);

            if (this.state <= 4) {
                drawHuman(ctx, this.humanX, walkFrame);
            }

            if (this.state >= 1 && this.state <= 3 && this.ideaPop > 0.01) {
                const pop = this.state === 1 ? 0.5 + this.ideaPop * 0.5 : this.ideaPop;
                drawIdea(ctx, this.ideaX, this.ideaY, pop);
            }

            const bx = X_BOX + this.flyX;
            const by = boxAnchorY() - this.boxLiftY + this.flyY;

            if (this.state === 4) {
                const phase = this.stateElapsed / DURATION[4];
                const showBeam = phase > 0.45 && phase < 0.72;
                drawCloud(ctx, this.cloudX, this.cloudY, showBeam, bx, by - 11);
            }

            if (this.state >= 3 && this.boxScale > 0) {
                drawUxBox(ctx, bx, by, this.state === 4 ? 1 : this.boxScale, this.label);
            }
        }

        tick(ts) {
            if (this.paused) return;
            if (!this.lastTs) this.lastTs = ts;
            let dt = ts - this.lastTs;
            this.lastTs = ts;
            dt = Math.min(dt, 50);
            this.update(dt);
            this.draw();
            this.rafId = requestAnimationFrame(this.tick);
        }

        start() {
            this.stop();
            this.resize();
            this.ro = new ResizeObserver(() => {
                this.resize();
                if (this.paused) {
                    this.drawStaticMidScene();
                } else {
                    this.draw();
                }
            });
            if (this.canvas.parentElement) {
                this.ro.observe(this.canvas.parentElement);
            }
            if (this.paused) {
                this.drawStaticMidScene();
                return;
            }
            this.state = 0;
            this.stateElapsed = 0;
            this.resetSceneVars();
            this.lastTs = 0;
            this.draw();
            this.rafId = requestAnimationFrame(this.tick);
        }

        stop() {
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = 0;
            }
        }

        destroy() {
            this.stop();
            if (this.ro) {
                this.ro.disconnect();
                this.ro = null;
            }
        }
    }

    window.PixelUxLoop = PixelUxLoop;
})();
