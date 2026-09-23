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

    /** State 0 walk+idea, 1 box UI, 2 box UX, 3 reset */
    const DURATION = [3200, 3600, 3600, 1400];
    const BOX_LABELS = ["UI", "UX"];

    const CONVEYOR_GAP = 24;
    const CONVEYOR_LEFT = X_ROBOT + 7 + CONVEYOR_GAP;
    const CONVEYOR_ELEV = 7;
    const CONVEYOR_TOP = BASELINE_Y - 3 - CONVEYOR_ELEV;
    const CONVEYOR_H = 4;

    const GLYPH_U = ["1111", "1001", "1001", "1001", "1111"];
    const GLYPH_I = ["1111", "0100", "0100", "0100", "1111"];
    const GLYPH_X = ["1001", "0110", "0110", "1001", "1001"];
    const GLYPHS = { U: GLYPH_U, I: GLYPH_I, X: GLYPH_X };

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function easeOutCubic(t) {
        return 1 - (1 - t) ** 3;
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
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

    function boxSpawnLeft(emerge) {
        const e = clamp(emerge, 0, 1);
        return Math.round(robotRightX() - 1 + e * BOX_TRAVEL);
    }

    function boxSpawnTop(size) {
        return Math.round(robotBodyCenterY() - size / 2);
    }

    function boxOnBeltTop(size) {
        return CONVEYOR_TOP - size + 1;
    }

    function beltLandingLeft() {
        return CONVEYOR_LEFT + 3;
    }

    function beltExitLeft() {
        return LOG_W + BOX_SIZE + 6;
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

    function drawIdea(ctx, cx, cy, alpha) {
        if (alpha <= 0.02) return;
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

    function drawLabeledBox(ctx, left, top, size, label) {
        if (size < 2) return;
        ctx.fillStyle = INK;
        ctx.fillRect(left, top, size, size);
        ctx.fillStyle = PAPER;
        ctx.fillRect(left + 2, top + 2, size - 4, size - 4);

        const chars = String(label || "UX")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 2);
        const g1 = GLYPHS[chars[0]] || GLYPH_U;
        const g2 = GLYPHS[chars[1]] || GLYPH_X;
        if (size >= 10) {
            const gx = left + Math.floor((size - 9) / 2) + 1;
            const gy = top + Math.floor((size - 5) / 2) + 1;
            blit(ctx, g1, gx, gy);
            blit(ctx, g2, gx + 5, gy);
        }
    }

    function drawConveyorLegs(ctx) {
        const beltBottom = CONVEYOR_TOP + CONVEYOR_H;
        const footY = BASELINE_Y - 1;
        const legTop = beltBottom;
        const positions = [
            CONVEYOR_LEFT + 2,
            CONVEYOR_LEFT + 28,
            CONVEYOR_LEFT + 54,
            CONVEYOR_LEFT + 80,
            CONVEYOR_LEFT + 106,
            LOG_W - 8,
        ];
        ctx.fillStyle = INK_DIM;
        positions.forEach((lx) => {
            if (lx >= LOG_W - 2) return;
            ctx.fillRect(lx, legTop, 1, footY - legTop);
            ctx.fillRect(lx + 1, footY - 1, 2, 1);
        });
    }

    /** Belt always drawn; tread scrolls only when `active`. */
    function drawConveyorBelt(ctx, scrollPx, active) {
        const right = LOG_W;
        const w = right - CONVEYOR_LEFT;
        if (w < 4) return;

        drawConveyorLegs(ctx);

        ctx.fillStyle = INK;
        ctx.fillRect(CONVEYOR_LEFT, CONVEYOR_TOP - 1, w, 1);
        ctx.fillRect(CONVEYOR_LEFT, CONVEYOR_TOP + CONVEYOR_H, w, 1);

        ctx.fillStyle = INK_DIM;
        ctx.fillRect(CONVEYOR_LEFT + 1, CONVEYOR_TOP, w - 2, CONVEYOR_H);

        const offset = active ? Math.floor(scrollPx) % 6 : 0;
        ctx.fillStyle = active ? INK : INK_DIM;
        for (let x = CONVEYOR_LEFT + 1; x < right - 1; x += 1) {
            const phase = (x + offset) % 6;
            if (phase === 0 || phase === 1) {
                ctx.fillRect(x, CONVEYOR_TOP + 1, 1, 1);
            }
            if (phase === 3) {
                ctx.fillRect(x, CONVEYOR_TOP + 2, 1, 1);
            }
            if (!active && phase === 4) {
                ctx.fillRect(x, CONVEYOR_TOP + 2, 1, 1);
            }
        }
    }

    class PixelUxLoop {
        constructor(canvas, options) {
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d", { alpha: false });
            this.fallbackLabel = (options && options.label) || "UX";
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
            this.boxLeft = 0;
            this.boxTop = 0;
            this.boxLabel = BOX_LABELS[0];
            this.boxVisible = false;

            this.beltActive = false;
            this.conveyorScroll = 0;

            this.resize = this.resize.bind(this);
            this.tick = this.tick.bind(this);
        }

        resetSceneVars() {
            this.humanX = -24;
            this.ideaPop = 0;
            this.ideaX = 0;
            this.ideaY = 0;
            this.antennaOn = true;
            this.boxScale = 0;
            this.boxLeft = 0;
            this.boxTop = 0;
            this.boxLabel = BOX_LABELS[0];
            this.boxVisible = false;
            this.beltActive = false;
        }

        advanceState() {
            this.state = (this.state + 1) % 4;
            this.stateElapsed = 0;
            if (this.state === 0) {
                this.resetSceneVars();
            }
        }

        updateWalkAndIdea(t) {
            const walkEnd = 0.38;
            const ideaPopStart = 0.32;
            const ideaPopEnd = 0.48;
            const transferStart = 0.44;
            const transferEnd = 0.88;
            const fadeEnd = 0.96;

            this.humanX = -24 + easeOutCubic(Math.min(t / walkEnd, 1)) * (X_HUMAN + 24);

            const head = humanHeadPos(this.humanX);
            const robot = robotHeadPos(X_ROBOT);

            if (t < ideaPopStart) {
                this.ideaPop = 0;
            } else if (t < ideaPopEnd) {
                this.ideaPop = easeOutCubic((t - ideaPopStart) / (ideaPopEnd - ideaPopStart));
                this.ideaX = head.x;
                this.ideaY = head.y - 6;
            } else if (t < transferEnd) {
                const e = easeInOutCubic((t - transferStart) / (transferEnd - transferStart));
                this.ideaPop = 1;
                this.ideaX = lerp(head.x, robot.x, e);
                this.ideaY = lerp(head.y - 6, robot.y, e);
            } else if (t < fadeEnd) {
                this.ideaPop = 1 - (t - transferEnd) / (fadeEnd - transferEnd);
                this.ideaX = robot.x;
                this.ideaY = robot.y;
            } else {
                this.ideaPop = 0;
            }

            this.boxVisible = false;
            this.beltActive = false;
            this.antennaOn = true;
        }

        updateBoxDelivery(t, label) {
            this.humanX = X_HUMAN;
            this.ideaPop = 0;
            this.boxLabel = label;

            const processEnd = 0.18;
            const spawnEnd = 0.38;
            const gapEnd = 0.54;
            const size = BOX_SIZE;

            if (t < processEnd) {
                this.antennaOn = Math.floor(this.stateElapsed / 90) % 2 === 0;
                this.boxVisible = false;
                this.boxScale = 0;
                this.beltActive = false;
                return;
            }

            this.antennaOn = true;

            if (t < spawnEnd) {
                const e = easeOutCubic((t - processEnd) / (spawnEnd - processEnd));
                this.boxScale = e;
                this.boxVisible = e > 0.04;
                this.boxLeft = boxSpawnLeft(e);
                this.boxTop = boxSpawnTop(Math.max(1, Math.round(size * e)));
                this.beltActive = false;
                return;
            }

            const spawnLeft = boxSpawnLeft(1);
            const spawnTop = boxSpawnTop(size);
            const landLeft = beltLandingLeft();
            const landTop = boxOnBeltTop(size);

            if (t < gapEnd) {
                const e = easeInOutCubic((t - spawnEnd) / (gapEnd - spawnEnd));
                this.boxScale = 1;
                this.boxVisible = true;
                this.boxLeft = Math.round(lerp(spawnLeft, landLeft, e));
                this.boxTop = Math.round(lerp(spawnTop, landTop, e));
                this.beltActive = false;
                return;
            }

            const rideE = easeInOutCubic((t - gapEnd) / (1 - gapEnd));
            this.boxScale = 1;
            this.boxVisible = rideE < 1;
            this.boxLeft = Math.round(lerp(landLeft, beltExitLeft(), rideE));
            this.boxTop = landTop;
            this.beltActive = this.boxVisible;
        }

        updateReset(t) {
            const walkEnd = 0.72;
            this.ideaPop = 0;
            this.boxVisible = false;
            this.beltActive = false;
            this.antennaOn = true;

            if (t < walkEnd) {
                this.humanX = X_HUMAN + easeInOutCubic(t / walkEnd) * (-24 - X_HUMAN);
            } else {
                this.humanX = -24;
            }
        }

        update(dt) {
            this.stateElapsed += dt;
            const dur = DURATION[this.state];
            const t = clamp(this.stateElapsed / dur, 0, 1);

            switch (this.state) {
                case 0:
                    this.updateWalkAndIdea(t);
                    break;
                case 1:
                    this.updateBoxDelivery(t, BOX_LABELS[0]);
                    break;
                case 2:
                    this.updateBoxDelivery(t, BOX_LABELS[1]);
                    break;
                case 3:
                    this.updateReset(t);
                    break;
                default:
                    break;
            }

            if (this.beltActive) {
                this.conveyorScroll += dt * 0.055;
            }

            if (this.stateElapsed >= dur) this.advanceState();
        }

        drawScene() {
            const ctx = this.ctx;
            ctx.fillStyle = PAPER;
            ctx.fillRect(0, 0, LOG_W, LOG_H);

            const walkFrame = Math.floor(this.stateElapsed / 120);
            const blinkAntenna =
                (this.state === 1 || this.state === 2) && this.stateElapsed < DURATION[this.state] * 0.18;
            const antenna = blinkAntenna ? this.antennaOn : true;

            drawConveyorBelt(ctx, this.conveyorScroll, this.beltActive);
            drawRobot(ctx, X_ROBOT, antenna);

            if (this.state !== 3 || this.humanX > -20) {
                drawHuman(ctx, this.humanX, walkFrame);
            }

            if (this.ideaPop > 0.02) {
                drawIdea(ctx, this.ideaX, this.ideaY, this.ideaPop);
            }

            if (this.boxVisible && this.boxScale > 0) {
                const size = Math.max(1, Math.round(BOX_SIZE * this.boxScale));
                if (this.boxLeft < beltLandingLeft() + 2) {
                    const bridgeW = Math.max(
                        0,
                        Math.min(3, this.boxLeft - robotRightX() + 2)
                    );
                    if (bridgeW > 0) {
                        ctx.fillStyle = INK;
                        ctx.fillRect(robotRightX(), robotBodyCenterY(), bridgeW, 1);
                    }
                }
                drawLabeledBox(ctx, this.boxLeft, this.boxTop, size, this.boxLabel);
            }
        }

        drawStaticMidScene() {
            this.resetSceneVars();
            this.humanX = X_HUMAN;
            this.state = 0;
            this.drawScene();
        }

        draw() {
            this.drawScene();
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
