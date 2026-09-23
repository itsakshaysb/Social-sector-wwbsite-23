(function () {
    "use strict";

    const LOG_W = 320;
    const LOG_H = 88;
    const INK = "#000000";
    const PAPER = "#ffffff";

    const X_HUMAN = 52;
    const X_ROBOT = 148;
    const BASELINE_Y = 74;
    const BOX_SIZE = 16;
    const BOX_TRAVEL = 8;

    const DURATION = [1400, 500, 1000, 1200, 2400, 1000];
    const FLY_START = 0.58;

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

    function cubicPoint(t, p0, p1, p2, p3) {
        const u = 1 - t;
        const uu = u * u;
        const tt = t * t;
        return {
            x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
            y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
        };
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

    function boxLayout(emerge, scale, flyX, flyY, liftY) {
        const e = clamp(emerge, 0, 1);
        const s = clamp(scale, 0, 1);
        const size = Math.max(1, Math.round(BOX_SIZE * s));
        const left = Math.round(robotRightX() - 1 + e * BOX_TRAVEL) + flyX;
        const top = Math.round(robotBodyCenterY() - size / 2 - liftY) + flyY;
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

    function drawBoxFromRobot(ctx, emerge, scale, label, flyX, flyY, liftY) {
        const box = boxLayout(emerge, scale, flyX, flyY, liftY);
        if (scale <= 0) return box;
        const bridgeW = Math.max(1, Math.min(3, box.left - robotRightX() + 2));
        if (bridgeW > 0 && emerge > 0.05) {
            ctx.fillStyle = INK;
            ctx.fillRect(robotRightX(), robotBodyCenterY(), bridgeW, 1);
        }
        drawUxBoxAt(ctx, box.left, box.top, box.size, label);
        return box;
    }

    function drawCloudSaucer(ctx, cx, cy) {
        const left = Math.round(cx - 7);
        const top = Math.round(cy - 3);
        ctx.fillStyle = INK;
        ctx.fillRect(left + 1, top, 12, 1);
        ctx.fillRect(left, top + 1, 14, 2);
        ctx.fillRect(left + 2, top + 3, 10, 1);
        ctx.fillRect(cx - 1, top - 2, 2, 1);
    }

    function drawCloud(ctx, cx, cy, showBeam, box) {
        drawCloudSaucer(ctx, cx, cy);
        if (showBeam && box) {
            ctx.fillStyle = INK;
            const beamY = cy + 2;
            ctx.fillRect(box.cx - 5, beamY, 1, box.top - beamY);
            ctx.fillRect(box.cx + 4, beamY, 1, box.top - beamY);
        }
    }

    /** Spacecraft + UX box (carried below saucer). Origin = center of saucer. */
    function drawSpacecraftPickup(ctx, cx, cy, label) {
        drawCloudSaucer(ctx, cx, cy);
        const boxLeft = Math.round(cx - BOX_SIZE / 2);
        const boxTop = Math.round(cy + 4);
        drawUxBoxAt(ctx, boxLeft, boxTop, BOX_SIZE, label);
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
            this.boxEmerge = 0;
            this.cloudX = X_ROBOT + 20;
            this.cloudY = -8;
            this.boxLiftY = 0;
            this.flightProgress = -1;
            this.flightPath = null;
            this.flightLayer = null;
            this.flightCtx = null;

            this.resize = this.resize.bind(this);
            this.tick = this.tick.bind(this);
            this.onWindowResize = this.onWindowResize.bind(this);
        }

        logicalToScreen(lx, ly) {
            const r = this.canvas.getBoundingClientRect();
            return {
                x: r.left + (lx / LOG_W) * r.width,
                y: r.top + (ly / LOG_H) * r.height,
            };
        }

        buildFlightPath() {
            const lifted = boxLayout(1, 1, 0, 0, 12);
            const start = this.logicalToScreen(lifted.cx, lifted.top - 4);
            const headline = document.querySelector(".hero .display");
            const hr = headline
                ? headline.getBoundingClientRect()
                : { left: 24, top: 120, width: 280, height: 120 };
            const end = { x: window.innerWidth + 56, y: -56 };
            const cp1 = {
                x: start.x + Math.min(48, window.innerWidth * 0.08),
                y: hr.top + hr.height * 0.55,
            };
            const cp2 = {
                x: window.innerWidth * 0.78,
                y: Math.max(32, window.innerHeight * 0.08),
            };
            this.flightPath = { start, cp1, cp2, end };
        }

        ensureFlightLayer() {
            if (this.flightLayer) return;
            const layer = document.createElement("canvas");
            layer.className = "pixel-ux-flight";
            layer.setAttribute("aria-hidden", "true");
            document.body.appendChild(layer);
            this.flightLayer = layer;
            this.flightCtx = layer.getContext("2d", { alpha: true });
            window.addEventListener("resize", this.onWindowResize);
        }

        hideFlightLayer() {
            if (!this.flightLayer) return;
            this.flightLayer.width = 0;
            this.flightLayer.height = 0;
            this.flightLayer.style.display = "none";
            this.flightProgress = -1;
            this.flightPath = null;
        }

        onWindowResize() {
            if (this.flightProgress >= 0 && this.state === 4) {
                this.buildFlightPath();
            }
        }

        resizeFlightLayer() {
            if (!this.flightLayer) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.flightLayer.style.display = "block";
            this.flightLayer.width = Math.round(w * dpr);
            this.flightLayer.height = Math.round(h * dpr);
            this.flightLayer.style.width = `${w}px`;
            this.flightLayer.style.height = `${h}px`;
            this.flightCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.flightCtx.imageSmoothingEnabled = false;
        }

        drawFlightOverlay() {
            if (this.flightProgress < 0 || !this.flightPath) return;
            this.ensureFlightLayer();
            this.resizeFlightLayer();
            const ctx = this.flightCtx;
            const w = window.innerWidth;
            const h = window.innerHeight;
            ctx.clearRect(0, 0, w, h);

            const t = easeInOutCubic(clamp(this.flightProgress, 0, 1));
            const p = cubicPoint(t, this.flightPath.start, this.flightPath.cp1, this.flightPath.cp2, this.flightPath.end);
            const px = Math.round(p.x);
            const py = Math.round(p.y);

            ctx.save();
            ctx.translate(px, py);
            ctx.scale(this.scale, this.scale);
            drawSpacecraftPickup(ctx, 0, 0, this.label);
            ctx.restore();
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
            this.boxEmerge = 0;
            this.cloudX = X_ROBOT + 20;
            this.cloudY = -8;
            this.boxLiftY = 0;
            this.flightProgress = -1;
            this.hideFlightLayer();
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
            if (this.state === 3) {
                this.boxScale = 0;
                this.boxEmerge = 0;
            }
            if (this.state === 4) {
                const b = boxLayout(1, 1, 0, 0, 0);
                this.cloudX = b.cx;
                this.cloudY = -8;
                this.boxLiftY = 0;
                this.flightProgress = -1;
            }
            if (this.state === 5) this.hideFlightLayer();
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
                    if (t < FLY_START) {
                        this.flightProgress = -1;
                        const box = boxLayout(1, 1, 0, 0, this.boxLiftY);
                        if (t < 0.22) {
                            const e = easeOutCubic(t / 0.22);
                            this.cloudY = -8 + e * (box.top - 24);
                            this.cloudX = box.cx;
                        } else if (t < 0.42) {
                            this.cloudY = box.top - 24;
                            this.cloudX = box.cx;
                        } else {
                            const e = easeInOutCubic((t - 0.42) / (FLY_START - 0.42));
                            this.boxLiftY = e * 12;
                            const b = boxLayout(1, 1, 0, 0, this.boxLiftY);
                            this.cloudY = b.top - 24;
                            this.cloudX = b.cx;
                        }
                    } else {
                        if (this.flightProgress < 0) {
                            this.buildFlightPath();
                            this.flightProgress = 0;
                        }
                        this.flightProgress = (t - FLY_START) / (1 - FLY_START);
                        if (this.flightProgress >= 1) this.hideFlightLayer();
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
            const onViewportFlight = this.state === 4 && this.flightProgress >= 0;

            drawRobot(ctx, X_ROBOT, antenna);
            if (this.state <= 4) drawHuman(ctx, this.humanX, walkFrame);

            if (this.state >= 1 && this.state <= 3 && this.ideaPop > 0.02) {
                drawIdea(ctx, this.ideaX, this.ideaY);
            }

            if (!onViewportFlight && this.state >= 3 && this.boxScale > 0) {
                const box = drawBoxFromRobot(
                    ctx,
                    this.boxEmerge,
                    this.boxScale,
                    this.label,
                    0,
                    0,
                    this.boxLiftY
                );

                if (this.state === 4 && box) {
                    const phase = this.stateElapsed / DURATION[4];
                    const showBeam = phase > 0.42 && phase < FLY_START;
                    drawCloud(ctx, this.cloudX, this.cloudY, showBeam, box);
                }
            }

            if (onViewportFlight) {
                this.drawFlightOverlay();
            }
        }

        drawStaticMidScene() {
            this.resetSceneVars();
            this.humanX = X_HUMAN;
            this.boxScale = 1;
            this.boxEmerge = 1;
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
            this.hideFlightLayer();
            if (this.flightLayer) {
                this.flightLayer.remove();
                this.flightLayer = null;
                this.flightCtx = null;
            }
            window.removeEventListener("resize", this.onWindowResize);
            if (this.ro) {
                this.ro.disconnect();
                this.ro = null;
            }
        }
    }

    window.PixelUxLoop = PixelUxLoop;
})();
