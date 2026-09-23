(function () {
    "use strict";

    const LOG_W = 320;
    const LOG_H = 88;
    const INK = "#ededed";
    const PAPER = "#0a0a0a";
    const INK_DIM = "#3a3a3a";

    const X_HUMAN = 52;
    const X_ROBOT = 148;
    const BASELINE_Y = 74;
    const BOX_SIZE = 16;
    const BOX_TRAVEL = 8;

    const DURATION = [1400, 500, 1000, 1200, 2400, 900];
    const CONVEYOR_MOVE_START = 0.42;
    const CONVEYOR_LEFT = X_ROBOT - 6;
    const CONVEYOR_TOP = BASELINE_Y - 3;
    const CONVEYOR_H = 4;

    const GLYPH_U = ["1111", "1001", "1001", "1001", "1111"];
    const GLYPH_X = ["1001", "0110", "0110", "1001", "1001"];
    const GLYPHS = { U: GLYPH_U, X: GLYPH_X };

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function easeOutCubic(t) {
        return 1 - (1 - t) ** 3;
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    }

    function blit(ctx, matrix, ox, oy) {
        ctx.fillStyle = INK;
        for (let y = 0; y < matrix.length; y += 1) {
            const row = matrix[y];
            for (let x = 0; x < row.length; x += 1) {
                if (row[x] === "1") ctx.fillRect(ox + x, oy + y, 1, 1);
            }
        }
    }

    function robotRightX() {
        return X_ROBOT + 7;
    }

    function robotBodyCenterY() {
        return BASELINE_Y - 10;
    }

    function boxLayout(emerge, scale, beltX) {
        const e = clamp(emerge, 0, 1);
        const s = clamp(scale, 0, 1);
        const size = Math.max(1, Math.round(BOX_SIZE * s));
        const left = Math.round(robotRightX() - 1 + e * BOX_TRAVEL) + beltX;
        const top = Math.round(robotBodyCenterY() - size / 2);
        return {
            left,
            top,
            size,
            cx: left + size / 2,
            cy: top + size / 2,
        };
    }

    function drawHuman(ctx, x, walkFrame) {
        const y0 = BASELINE_Y - 17;
        ctx.fillStyle = INK;
        ctx.fillRect(x - 1, y0, 2, 3);
        ctx.fillRect(x - 2, y0 + 3, 4, 5);
        ctx.fillRect(x - 3, y0 + 4, 1, 4);
        ctx.fillRect(x + 2, y0 + 4, 1, 4);
        if (walkFrame % 2 === 0) {
            ctx.fillRect(x - 2, y0 + 8, 1, 9);
            ctx.fillRect(x + 1, y0 + 8, 1, 9);
        } else {
            ctx.fillRect(x - 1, y0 + 8, 1, 9);
            ctx.fillRect(x, y0 + 8, 1, 9);
        }
    }

    function drawRobot(ctx, x, antennaOn) {
        const ox = x - 7;
        const oy = BASELINE_Y - 18;
        ctx.fillStyle = INK;
        if (antennaOn) ctx.fillRect(x, oy - 2, 1, 2);
        ctx.fillRect(ox, oy, 14, 4);
        ctx.fillStyle = PAPER;
        ctx.fillRect(ox + 3, oy + 2, 8, 1);
        ctx.fillStyle = INK;
        ctx.fillRect(ox + 1, oy + 4, 12, 7);
        ctx.fillRect(ox - 1, oy + 5, 1, 4);
        ctx.fillRect(ox + 14, oy + 5, 1, 4);
        ctx.fillRect(ox + 2, oy + 11, 4, 7);
        ctx.fillRect(ox + 8, oy + 11, 4, 7);
    }

    function drawIdea(ctx, cx, cy) {
        ctx.fillStyle = INK;
        [[0, 0], [2, 0], [0, 2], [2, 2]].forEach(([dx, dy]) => {
            ctx.fillRect(Math.round(cx + dx - 1), Math.round(cy + dy - 1), 1, 1);
        });
    }

    function humanHeadPos(x) {
        return { x, y: BASELINE_Y - 17 };
    }

    function robotHeadPos(x) {
        return { x, y: BASELINE_Y - 18 };
    }

    function drawUxBoxAt(ctx, left, top, size, label) {
        if (size < 2) return;
        ctx.fillStyle = INK;
        ctx.fillRect(left, top, size, size);
        ctx.fillStyle = PAPER;
        ctx.fillRect(left + 2, top + 2, size - 4, size - 4);

        const chars = String(label || "UX")
            .toUpperCase()
            .replace(/[^A-Z]/g, "")
            .slice(0, 2);
        const g1 = GLYPHS[chars[0] || "U"] || GLYPH_U;
        const g2 = GLYPHS[chars[1] || "X"] || GLYPH_X;
        if (size >= 10) {
            const gx = left + Math.floor((size - 9) / 2) + 1;
            const gy = top + Math.floor((size - 5) / 2) + 1;
            blit(ctx, g1, gx, gy);
            blit(ctx, g2, gx + 5, gy);
        }
    }

    function drawBoxFromRobot(ctx, emerge, scale, label, beltX) {
        const box = boxLayout(emerge, scale, beltX);
        if (scale <= 0) return box;
        const bridgeW = Math.max(1, Math.min(3, box.left - robotRightX() + 2));
        if (bridgeW > 0 && emerge > 0.05 && beltX < 2) {
            ctx.fillStyle = INK;
            ctx.fillRect(robotRightX(), robotBodyCenterY(), bridgeW, 1);
        }
        drawUxBoxAt(ctx, box.left, box.top, box.size, label);
        return box;
    }

    /** Pixel belt with scrolling tread marks. */
    function drawConveyorBelt(ctx, scrollPx) {
        const right = LOG_W;
        const w = right - CONVEYOR_LEFT;
        if (w < 4) return;

        ctx.fillStyle = INK;
        ctx.fillRect(CONVEYOR_LEFT, CONVEYOR_TOP - 1, w, 1);
        ctx.fillRect(CONVEYOR_LEFT, CONVEYOR_TOP + CONVEYOR_H, w, 1);

        ctx.fillStyle = INK_DIM;
        ctx.fillRect(CONVEYOR_LEFT + 1, CONVEYOR_TOP, w - 2, CONVEYOR_H);

        const offset = Math.floor(scrollPx) % 6;
        ctx.fillStyle = INK;
        for (let x = CONVEYOR_LEFT + 1; x < right - 1; x += 1) {
            const phase = (x + offset) % 6;
            if (phase === 0 || phase === 1) {
                ctx.fillRect(x, CONVEYOR_TOP + 1, 1, 1);
            }
            if (phase === 3) {
                ctx.fillRect(x, CONVEYOR_TOP + 2, 1, 1);
            }
        }

        const rollerStep = 18;
        for (let rx = CONVEYOR_LEFT + 4; rx < right - 2; rx += rollerStep) {
            ctx.fillStyle = INK;
            ctx.fillRect(rx, CONVEYOR_TOP + CONVEYOR_H, 1, 1);
            ctx.fillRect(rx + 1, CONVEYOR_TOP + CONVEYOR_H + 1, 1, 1);
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
            this.scale = 2;
            this.ro = null;

            this.humanX = -24;
            this.ideaPop = 0;
            this.ideaX = 0;
            this.ideaY = 0;
            this.antennaOn = true;
            this.boxScale = 0;
            this.boxEmerge = 0;
            this.beltBoxX = 0;
            this.conveyorScroll = 0;
            this.showConveyor = false;

            this.resize = this.resize.bind(this);
            this.tick = this.tick.bind(this);
        }

        conveyorTravelMax() {
            const home = boxLayout(1, 1, 0);
            return LOG_W + BOX_SIZE + 8 - home.left;
        }

        resize() {
            const parent = this.canvas.parentElement;
            const containerWidth = parent ? parent.clientWidth : LOG_W;
            this.scale = Math.max(2, Math.floor(containerWidth / LOG_W));
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
            this.boxEmerge = 0;
            this.beltBoxX = 0;
            this.conveyorScroll = 0;
            this.showConveyor = false;
        }

        advanceState() {
            this.state = (this.state + 1) % 6;
            this.stateElapsed = 0;
            if (this.state === 0) {
                this.boxScale = 0;
                this.boxEmerge = 0;
                this.ideaPop = 0;
                this.beltBoxX = 0;
                this.conveyorScroll = 0;
                this.showConveyor = false;
                if (this.humanX > -20) this.humanX = -24;
            }
            if (this.state === 1) {
                const head = humanHeadPos(this.humanX);
                this.ideaX = head.x;
                this.ideaY = head.y - 6;
            }
            if (this.state === 3) {
                this.boxScale = 0;
                this.boxEmerge = 0;
                this.showConveyor = false;
                this.beltBoxX = 0;
            }
            if (this.state === 4) {
                this.beltBoxX = 0;
                this.conveyorScroll = 0;
                this.showConveyor = true;
            }
        }

        update(dt) {
            this.stateElapsed += dt;
            const dur = DURATION[this.state];
            const t = clamp(this.stateElapsed / dur, 0, 1);

            switch (this.state) {
                case 0:
                    this.humanX = -24 + easeOutCubic(t) * (X_HUMAN + 24);
                    break;
                case 1:
                    this.humanX = X_HUMAN;
                    this.ideaPop = easeOutCubic(t);
                    {
                        const head = humanHeadPos(this.humanX);
                        this.ideaX = head.x;
                        this.ideaY = head.y - 6;
                    }
                    break;
                case 2:
                    this.humanX = X_HUMAN;
                    {
                        const from = humanHeadPos(X_HUMAN);
                        const to = robotHeadPos(X_ROBOT);
                        const e = easeInOutCubic(t);
                        this.ideaX = from.x + (to.x - from.x) * e;
                        this.ideaY = from.y + (to.y - from.y) * e;
                    }
                    this.ideaPop = 1;
                    break;
                case 3:
                    this.humanX = X_HUMAN;
                    this.ideaPop = t < 0.25 ? 1 - t / 0.25 : 0;
                    this.antennaOn = Math.floor(this.stateElapsed / 100) % 2 === 0;
                    if (t > 0.45) {
                        const bt = (t - 0.45) / 0.55;
                        const e = easeOutCubic(bt);
                        this.boxScale = e;
                        this.boxEmerge = e;
                    } else {
                        this.boxScale = 0;
                        this.boxEmerge = 0;
                    }
                    break;
                case 4:
                    this.humanX = X_HUMAN;
                    this.boxScale = 1;
                    this.boxEmerge = 1;
                    this.showConveyor = true;
                    this.conveyorScroll += dt * 0.045;
                    if (t < CONVEYOR_MOVE_START) {
                        this.beltBoxX = 0;
                    } else {
                        const e = easeInOutCubic(
                            (t - CONVEYOR_MOVE_START) / (1 - CONVEYOR_MOVE_START)
                        );
                        this.beltBoxX = e * this.conveyorTravelMax();
                        this.conveyorScroll += dt * 0.04 * (0.35 + e * 0.85);
                    }
                    break;
                case 5:
                    this.humanX = X_HUMAN + easeInOutCubic(t) * (-24 - X_HUMAN);
                    this.boxScale = 0;
                    this.boxEmerge = 0;
                    this.showConveyor = false;
                    this.beltBoxX = 0;
                    break;
                default:
                    break;
            }

            if (this.stateElapsed >= dur) this.advanceState();
        }

        drawScene() {
            const ctx = this.ctx;
            ctx.fillStyle = PAPER;
            ctx.fillRect(0, 0, LOG_W, LOG_H);

            const walkFrame = Math.floor(this.stateElapsed / 120);
            const antenna = this.state === 3 ? this.antennaOn : true;

            drawRobot(ctx, X_ROBOT, antenna);
            if (this.state <= 5) drawHuman(ctx, this.humanX, walkFrame);

            if (this.showConveyor) {
                drawConveyorBelt(ctx, this.conveyorScroll);
            }

            if (this.state >= 1 && this.state <= 3 && this.ideaPop > 0.02) {
                drawIdea(ctx, this.ideaX, this.ideaY);
            }

            if (this.state >= 3 && this.boxScale > 0) {
                const beltX = this.state === 4 ? this.beltBoxX : 0;
                drawBoxFromRobot(ctx, this.boxEmerge, this.boxScale, this.label, beltX);
            }
        }

        drawStaticMidScene() {
            this.resetSceneVars();
            this.humanX = X_HUMAN;
            this.boxScale = 1;
            this.boxEmerge = 1;
            this.showConveyor = true;
            this.drawScene();
        }

        draw() {
            this.drawScene();
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
                if (this.paused) this.drawStaticMidScene();
                else this.draw();
            });
            if (this.canvas.parentElement) this.ro.observe(this.canvas.parentElement);

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
