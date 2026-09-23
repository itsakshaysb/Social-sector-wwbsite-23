(function () {
    "use strict";

    const LOG_W = 320;
    const LOG_H = 88;
    const INK = "#000000";
    const PAPER = "#ffffff";

    const X_HUMAN = 52;
    const X_ROBOT = 148;
    const GROUND_Y = 74;
    const BOX_EMERGE_DX = 46;

    const DURATION = [1400, 500, 1000, 1200, 2000, 1000];

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

    function boxCenterY() {
        return GROUND_Y - 10;
    }

    function robotBoxSpawnPos() {
        return { x: X_ROBOT + 8, y: boxCenterY() };
    }

    function boxRestPos() {
        return { x: X_ROBOT + BOX_EMERGE_DX, y: boxCenterY() };
    }

    function boxPos(slide, flyX, flyY, liftY) {
        const from = robotBoxSpawnPos();
        const to = boxRestPos();
        const e = clamp(slide, 0, 1);
        return {
            x: from.x + (to.x - from.x) * e + flyX,
            y: from.y + (to.y - from.y) * e - liftY + flyY,
        };
    }

    function drawHuman(ctx, x, walkFrame) {
        const y0 = GROUND_Y - 17;
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
        const oy = GROUND_Y - 18;
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
        if (alpha <= 0) return;
        ctx.fillStyle = INK;
        const dots = [[0, 0], [2, 0], [0, 2], [2, 2]];
        dots.forEach(([dx, dy]) => {
            ctx.fillRect(Math.round(cx + dx - 1), Math.round(cy + dy - 1), 1, 1);
        });
    }

    function humanHeadPos(x) {
        return { x, y: GROUND_Y - 17 };
    }

    function robotHeadPos(x) {
        return { x, y: GROUND_Y - 18 };
    }

    function drawUxBox(ctx, cx, cy, scale, label) {
        const s = Math.max(0, scale);
        if (s <= 0) return;
        const size = Math.round(16 * s);
        const half = Math.floor(size / 2);
        const left = Math.round(cx - half);
        const top = Math.round(cy - half);
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
        const gx = left + Math.floor((size - 9) / 2) + 1;
        const gy = top + Math.floor((size - 5) / 2) + 1;
        blit(ctx, g1, gx, gy);
        blit(ctx, g2, gx + 5, gy);
    }

    function robotBoxSpawnPos() {
        return { x: X_ROBOT + 8, y: boxCenterY() };
    }

    function boxRestPos() {
        return { x: X_ROBOT + BOX_EMERGE_DX, y: boxCenterY() };
    }

    function boxPos(slide, flyX, flyY, liftY) {
        const from = robotBoxSpawnPos();
        const to = boxRestPos();
        const e = clamp(slide, 0, 1);
        return {
            x: from.x + (to.x - from.x) * e + flyX,
            y: from.y + (to.y - from.y) * e - liftY + flyY,
        };
    }

    function drawCloud(ctx, cx, cy, showBeam, boxCx, boxTop) {
        const w = 13;
        const h = 5;
        const left = Math.round(cx - w / 2);
        const top = Math.round(cy - h / 2);
        ctx.fillStyle = INK;
        ctx.fillRect(left + 2, top, 9, 1);
        ctx.fillRect(left + 1, top + 1, 11, 1);
        ctx.fillRect(left, top + 2, w, 2);
        ctx.fillRect(left + 1, top + 4, 11, 1);
        if (showBeam && boxCx != null && boxTop != null) {
            const beamY = top + h;
            ctx.fillRect(boxCx - 5, beamY, 1, boxTop - beamY);
            ctx.fillRect(boxCx + 4, beamY, 1, boxTop - beamY);
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

            this.humanX = -16;
            this.ideaPop = 0;
            this.ideaX = 0;
            this.ideaY = 0;
            this.antennaOn = true;
            this.boxScale = 0;
            this.boxSlide = 0;
            this.cloudX = boxRestPos().x;
            this.cloudY = -8;
            this.boxLiftY = 0;
            this.flyX = 0;
            this.flyY = 0;

            this.resize = this.resize.bind(this);
            this.tick = this.tick.bind(this);
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
            this.humanX = -16;
            this.ideaPop = 0;
            this.ideaX = 0;
            this.ideaY = 0;
            this.antennaOn = true;
            this.boxScale = 0;
            this.boxSlide = 0;
            this.cloudX = boxRestPos().x;
            this.cloudY = -8;
            this.boxLiftY = 0;
            this.flyX = 0;
            this.flyY = 0;
        }

        advanceState() {
            this.state = (this.state + 1) % 6;
            this.stateElapsed = 0;
            if (this.state === 0) this.resetSceneVars();
            if (this.state === 1) {
                const head = humanHeadPos(this.humanX);
                this.ideaX = head.x;
                this.ideaY = head.y - 6;
            }
            if (this.state === 3) this.boxScale = 0;
            if (this.state === 4) {
                const rest = boxRestPos();
                this.cloudX = rest.x;
                this.cloudY = -8;
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
                case 0:
                    this.humanX = -16 + easeOutCubic(t) * (X_HUMAN + 16);
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
                    if (t > 0.5) {
                        const bt = (t - 0.5) / 0.5;
                        const e = easeOutCubic(bt);
                        this.boxScale = e;
                        this.boxSlide = e;
                    } else {
                        this.boxScale = 0;
                        this.boxSlide = 0;
                    }
                    break;
                case 4:
                    this.humanX = X_HUMAN;
                    this.boxScale = 1;
                    this.boxSlide = 1;
                    {
                        const rest = boxRestPos();
                        const pos = boxPos(1, this.flyX, this.flyY, this.boxLiftY);
                        if (t < 0.25) {
                            const e = easeOutCubic(t / 0.25);
                            this.cloudY = -8 + e * (pos.y - 28 - -8);
                            this.cloudX = rest.x + this.flyX;
                        } else if (t < 0.45) {
                            this.cloudY = pos.y - 28;
                            this.cloudX = rest.x + this.flyX;
                        } else if (t < 0.65) {
                            const e = easeInOutCubic((t - 0.45) / 0.2);
                            this.boxLiftY = e * 12;
                            const p = boxPos(1, this.flyX, this.flyY, this.boxLiftY);
                            this.cloudY = p.y - 28;
                            this.cloudX = p.x;
                        } else {
                            const e = easeInOutCubic((t - 0.65) / 0.35);
                            this.flyX = e * 56;
                            this.flyY = e * -58;
                            this.boxLiftY = 12 + e * 16;
                            const p = boxPos(1, this.flyX, this.flyY, this.boxLiftY);
                            this.cloudY = p.y - 28;
                            this.cloudX = p.x;
                        }
                    }
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

            if (this.state === 5) return;

            const walkFrame = Math.floor(this.stateElapsed / 120);
            const antenna = this.state === 3 ? this.antennaOn : true;

            drawRobot(ctx, X_ROBOT, antenna);
            if (this.state <= 4) drawHuman(ctx, this.humanX, walkFrame);

            if (this.state >= 1 && this.state <= 3 && this.ideaPop > 0.02) {
                drawIdea(ctx, this.ideaX, this.ideaY, this.ideaPop);
            }

            const slide = this.state >= 3 ? this.boxSlide : 0;
            const pos = boxPos(slide, this.flyX, this.flyY, this.boxLiftY);

            if (this.state === 4) {
                const phase = this.stateElapsed / DURATION[4];
                const showBeam = phase > 0.45 && phase < 0.68;
                drawCloud(ctx, this.cloudX, this.cloudY, showBeam, pos.x, pos.y - 8);
            }

            if (this.state >= 3 && this.boxScale > 0) {
                drawUxBox(ctx, pos.x, pos.y, this.state === 4 ? 1 : this.boxScale, this.label);
            }
        }

        drawStaticMidScene() {
            this.resetSceneVars();
            this.humanX = X_HUMAN;
            this.boxScale = 1;
            this.boxSlide = 1;
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
