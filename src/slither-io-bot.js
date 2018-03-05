var SlitherBot = window.bot = (function (window) {
    return {
        id: 0,
        isBotRunning: false,
        isBotEnabled: true,
        isSelfCirclingEnabled: false,
        stage: 'grow',
        collisionPoints: [],
        collisionAngles: [],
        foodAngles: [],
        scores: [],
        kills: [],
        foodTimeout: undefined,
        sectorBoxSide: 0,
        defaultAccel: 0,
        sectorBox: {},
        currentFood: {},
        opt: {
            // target fps
            targetFps: 20,
            // size of arc for collisionAngles
            arcSize: Math.PI / 8,
            // radius multiple for circle intersects
            radiusMult: 10,
            // food cluster size to trigger acceleration
            foodAccelSz: 200,
            // maximum angle of food to trigger acceleration
            foodAccelDa: Math.PI / 2,
            // how many frames per action
            actionFrames: 2,
            // how many frames to delay action after collision
            collisionDelay: 10,
            // base speed
            speedBase: 5.78,
            // front angle size
            frontAngle: Math.PI / 2,
            // percent of angles covered by same snake to be considered an encircle attempt
            enCircleThreshold: 0.5625,
            // percent of angles covered by all snakes to move to safety
            enCircleAllThreshold: 0.5625,
            // distance multiplier for enCircleAllThreshold
            enCircleDistanceMult: 20,
            // snake score to start circling on self
            followCircleLength: 5000,
            // direction for followCircle: +1 for counter clockwise and -1 for clockwise
            followCircleDirection: +1,
            //radius of cluster distance to calculate for food.
            foodClusterRadius: 100
        },
        MID_X: 0,
        MID_Y: 0,
        MAP_R: 0,
        MAXARC: 0,

        getSnakeWidth: function (sc) {
            if (sc === undefined) sc = window.snake.sc;
            return Math.round(sc * 29.0);
        },

        quickRespawn: function () {
            window.dead_mtm = 0;
            window.login_fr = 0;

            SlitherBot.isBotRunning = false;
            window.forcing = true;
            SlitherBot.connect();
            window.forcing = false;
        },

        connect: function () {
            if (window.force_ip && window.force_port) {
                window.forceServer(window.force_ip, window.force_port);
            }

            window.connect();
        },

        // angleBetween - get the smallest angle between two angles (0-pi)
        angleBetween: function (a1, a2) {
            var r1 = 0.0;
            var r2 = 0.0;

            r1 = (a1 - a2) % Math.PI;
            r2 = (a2 - a1) % Math.PI;

            return r1 < r2 ? -r1 : r2;
        },

        // Change heading to ang
        changeHeadingAbs: function (angle) {
            var cos = Math.cos(angle);
            var sin = Math.sin(angle);

            window.goalCoordinates = {
                x: Math.round(
                    window.snake.xx + (SlitherBot.headCircle.radius) * cos),
                y: Math.round(
                    window.snake.yy + (SlitherBot.headCircle.radius) * sin)
            };

            /*if (window.visualDebugging) {
                canvas.drawLine({
                    x: window.snake.xx,
                    y: window.snake.yy},
                    window.goalCoordinates, 'yellow', '8');
            }*/

            canvas.setMouseCoordinates(canvas.mapToMouse(window.goalCoordinates));
        },

        // Change heading by ang
        // +0-pi turn left
        // -0-pi turn right

        changeHeadingRel: function (angle) {
            var heading = {
                x: window.snake.xx + 500 * SlitherBot.cos,
                y: window.snake.yy + 500 * SlitherBot.sin
            };

            var cos = Math.cos(-angle);
            var sin = Math.sin(-angle);

            window.goalCoordinates = {
                x: Math.round(
                    cos * (heading.x - window.snake.xx) -
                    sin * (heading.y - window.snake.yy) + window.snake.xx),
                y: Math.round(
                    sin * (heading.x - window.snake.xx) +
                    cos * (heading.y - window.snake.yy) + window.snake.yy)
            };

            canvas.setMouseCoordinates(canvas.mapToMouse(window.goalCoordinates));
        },

        // Change heading to the best angle for avoidance.
        headingBestAngle: function () {
            var best;
            var distance;
            var openAngles = [];
            var openStart;

            var sIndex = SlitherBot.getAngleIndex(window.snake.ehang) + SlitherBot.MAXARC / 2;
            if (sIndex > SlitherBot.MAXARC) sIndex -= SlitherBot.MAXARC;

            for (var i = 0; i < SlitherBot.MAXARC; i++) {
                if (SlitherBot.collisionAngles[i] === undefined) {
                    distance = 0;
                    if (openStart === undefined) openStart = i;
                } else {
                    distance = SlitherBot.collisionAngles[i].distance;
                    if (openStart) {
                        openAngles.push({
                            openStart: openStart,
                            openEnd: i - 1,
                            sz: (i - 1) - openStart
                        });
                        openStart = undefined;
                    }
                }

                if (best === undefined ||
                    (best.distance < distance && best.distance !== 0)) {
                    best = {
                        distance: distance,
                        aIndex: i
                    };
                }
            }

            if (openStart && openAngles[0]) {
                openAngles[0].openStart = openStart;
                openAngles[0].sz = openAngles[0].openEnd - openStart;
                if (openAngles[0].sz < 0) openAngles[0].sz += SlitherBot.MAXARC;

            } else if (openStart) {
                openAngles.push({openStart: openStart, openEnd: openStart, sz: 0});
            }

            if (openAngles.length > 0) {
                openAngles.sort(SlitherBot.sortSz);
                SlitherBot.changeHeadingAbs(
                    (openAngles[0].openEnd - openAngles[0].sz / 2) * SlitherBot.opt.arcSize);
            } else {
                SlitherBot.changeHeadingAbs(best.aIndex * SlitherBot.opt.arcSize);
            }
        },

        // Avoid collision point by ang
        // ang radians <= Math.PI (180deg)
        avoidCollisionPoint: function (point, ang) {
            if (ang === undefined || ang > Math.PI) {
                ang = Math.PI;
            }

            var end = {
                x: window.snake.xx + 2000 * SlitherBot.cos,
                y: window.snake.yy + 2000 * SlitherBot.sin
            };

            if (window.visualDebugging) {
                canvas.drawLine(
                    { x: window.snake.xx, y: window.snake.yy },
                    end,
                    'orange', 5);
                canvas.drawLine(
                    { x: window.snake.xx, y: window.snake.yy },
                    { x: point.x, y: point.y },
                    'red', 5);
            }

            if (canvas.isLeft(
                { x: window.snake.xx, y: window.snake.yy }, end,
                { x: point.x, y: point.y })) {
                SlitherBot.changeHeadingAbs(point.ang - ang);
            } else {
                SlitherBot.changeHeadingAbs(point.ang + ang);
            }
        },

        // get collision angle index, expects angle +/i 0 to Math.PI
        getAngleIndex: function (angle) {
            var index;

            if (angle < 0) {
                angle += 2 * Math.PI;
            }

            index = Math.round(angle * (1 / SlitherBot.opt.arcSize));

            if (index === SlitherBot.MAXARC) {
                return 0;
            }
            return index;
        },

        // Add to collisionAngles if distance is closer
        addCollisionAngle: function (sp) {
            var ang = canvas.fastAtan2(
                Math.round(sp.yy - window.snake.yy),
                Math.round(sp.xx - window.snake.xx));
            var aIndex = SlitherBot.getAngleIndex(ang);

            var actualDistance = Math.round(Math.pow(
                Math.sqrt(sp.distance) - sp.radius, 2));

            if (SlitherBot.collisionAngles[aIndex] === undefined ||
                 SlitherBot.collisionAngles[aIndex].distance > sp.distance) {
                SlitherBot.collisionAngles[aIndex] = {
                    x: Math.round(sp.xx),
                    y: Math.round(sp.yy),
                    ang: ang,
                    snake: sp.snake,
                    distance: actualDistance,
                    radius: sp.radius,
                    aIndex: aIndex
                };
            }
        },

        // Add and score foodAngles
        addFoodAngle: function (f) {
            var ang = canvas.fastAtan2(
                Math.round(f.yy - window.snake.yy),
                Math.round(f.xx - window.snake.xx));

            var aIndex = SlitherBot.getAngleIndex(ang);

            canvas.getDistance2FromSnake(f);

            if (SlitherBot.collisionAngles[aIndex] === undefined ||
                Math.sqrt(SlitherBot.collisionAngles[aIndex].distance) >
                Math.sqrt(f.distance) + SlitherBot.snakeRadius * SlitherBot.opt.radiusMult * SlitherBot.speedMult / 2) {
                if (SlitherBot.foodAngles[aIndex] === undefined) {
                    SlitherBot.foodAngles[aIndex] = {
                        x: Math.round(f.xx),
                        y: Math.round(f.yy),
                        ang: ang,
                        da: Math.abs(SlitherBot.angleBetween(ang, window.snake.ehang)),
                        distance: f.distance,
                        sz: f.sz,
                        score: (Math.pow(f.sz, 2) / f.distance * f.clusterRatio)
                    };
                } else {
                    SlitherBot.foodAngles[aIndex].sz += Math.round(f.sz);
                    if (f.isSparse || f.isDense) {
                        window.log('Food\'s original score: ' + SlitherBot.foodAngles[aIndex].score);
                    }

                    SlitherBot.foodAngles[aIndex].score += (Math.pow(f.sz, 2) / f.distance * f.clusterRatio);
                    if (f.isSparse) {
                        window.log('Food is SPARSE.');
                    }
                    if (f.isDense) {
                        window.log('Food is DENSE.');
                    }
                    if (f.isDense || f.isSparse) {
                        window.log('Total Cluster Ratio of Food: ' + f.clusterRatio);
                        window.log('[Best] Original score to add: ' + (Math.pow(f.sz, 2) / f.distance));
    //                    window.log('[Worst] New score to add (v1): ' + ((Math.pow(f.sz, 2) / f.distance) - f.clusterRatio));
    //                    window.log('[Small Negative Number] New score to add (v2): ' + ((Math.pow(f.sz, 2) - f.clusterRatio) / f.distance));
    //                    window.log('[Large Positive Number] New score to add (v3): ' + ((Math.pow(f.sz - f.clusterRatio, 2)) / f.distance));
    //                    window.log('[TRYING] New score to add (v4): ' + (Math.pow(f.sz, 2) / f.distance / f.clusterRatio));
                        window.log('[TRYING] New score to add (v5): ' + (Math.pow(f.sz, 2) / f.distance * f.clusterRatio));
                    }

                    if (SlitherBot.foodAngles[aIndex].distance > f.distance) {
                        SlitherBot.foodAngles[aIndex].x = Math.round(f.xx);
                        SlitherBot.foodAngles[aIndex].y = Math.round(f.yy);
                        SlitherBot.foodAngles[aIndex].distance = f.distance;
                    }
                }
            }
        },

        // Get closest collision point per snake.
        getCollisionPoints: function () {
            var scPoint;

            SlitherBot.collisionPoints = [];
            SlitherBot.collisionAngles = [];


            for (var snake = 0, ls = window.snakes.length; snake < ls; snake++) {
                scPoint = undefined;

                if (window.snakes[snake].id !== window.snake.id &&
                    window.snakes[snake].alive_amt === 1) {

                    var s = window.snakes[snake];
                    var sRadius = SlitherBot.getSnakeWidth(s.sc) / 2;
                    var sSpMult = Math.min(1, s.sp / 5.78 - 1 );

                    scPoint = {
                        xx: s.xx + Math.cos(s.ehang) * sRadius * sSpMult * SlitherBot.opt.radiusMult / 2,
                        yy: s.yy + Math.sin(s.ehang) * sRadius * sSpMult * SlitherBot.opt.radiusMult / 2,
                        snake: snake,
                        radius: SlitherBot.headCircle.radius,
                        head: true
                    };

                    canvas.getDistance2FromSnake(scPoint);
                    SlitherBot.addCollisionAngle(scPoint);
                    SlitherBot.collisionPoints.push(scPoint);

                    if (window.visualDebugging) {
                        canvas.drawCircle(canvas.circle(
                            scPoint.xx,
                            scPoint.yy,
                            scPoint.radius),
                            'red', false);
                    }

                    scPoint = undefined;

                    for (var pts = 0, lp = s.pts.length; pts < lp; pts++) {
                        if (!s.pts[pts].dying &&
                            canvas.pointInRect(
                                {
                                    x: s.pts[pts].xx,
                                    y: s.pts[pts].yy
                                }, SlitherBot.sectorBox)
                        ) {
                            var collisionPoint = {
                                xx: s.pts[pts].xx,
                                yy: s.pts[pts].yy,
                                snake: snake,
                                radius: sRadius
                            };

                            if (window.visualDebugging && true === false) {
                                canvas.drawCircle(canvas.circle(
                                    collisionPoint.xx,
                                    collisionPoint.yy,
                                    collisionPoint.radius),
                                    '#00FF00', false);
                            }

                            canvas.getDistance2FromSnake(collisionPoint);
                            SlitherBot.addCollisionAngle(collisionPoint);

                            if (collisionPoint.distance <= Math.pow(
                                (SlitherBot.headCircle.radius)
                                + collisionPoint.radius, 2)) {
                                SlitherBot.collisionPoints.push(collisionPoint);
                                if (window.visualDebugging) {
                                    canvas.drawCircle(canvas.circle(
                                        collisionPoint.xx,
                                        collisionPoint.yy,
                                        collisionPoint.radius
                                    ), 'red', false);
                                }
                            }
                        }
                    }
                }
            }

            // WALL
            if (canvas.getDistance2(SlitherBot.MID_X, SlitherBot.MID_Y, window.snake.xx, window.snake.yy) >
                Math.pow(SlitherBot.MAP_R - 1000, 2)) {
                var midAng = canvas.fastAtan2(
                    window.snake.yy - SlitherBot.MID_X, window.snake.xx - SlitherBot.MID_Y);
                scPoint = {
                    xx: SlitherBot.MID_X + SlitherBot.MAP_R * Math.cos(midAng),
                    yy: SlitherBot.MID_Y + SlitherBot.MAP_R * Math.sin(midAng),
                    snake: -1,
                    radius: SlitherBot.snakeWidth
                };
                canvas.getDistance2FromSnake(scPoint);
                SlitherBot.collisionPoints.push(scPoint);
                SlitherBot.addCollisionAngle(scPoint);
                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        scPoint.xx,
                        scPoint.yy,
                        scPoint.radius
                    ), 'yellow', false);
                }
            }


            SlitherBot.collisionPoints.sort(SlitherBot.sortDistance);
            if (window.visualDebugging) {
                for (var i = 0; i < SlitherBot.collisionAngles.length; i++) {
                    if (SlitherBot.collisionAngles[i] !== undefined) {
                        canvas.drawLine(
                            { x: window.snake.xx, y: window.snake.yy },
                            { x: SlitherBot.collisionAngles[i].x, y: SlitherBot.collisionAngles[i].y },
                            'red', 2);
                    }
                }
            }
        },

        // Is collisionPoint (xx) in frontAngle
        inFrontAngle: function (point) {
            var ang = canvas.fastAtan2(
                Math.round(point.y - window.snake.yy),
                Math.round(point.x - window.snake.xx));

            if (Math.abs(SlitherBot.angleBetween(ang, window.snake.ehang)) < SlitherBot.opt.frontAngle) {
                return true;
            } else {
                return false;
            }

        },

        // Checks to see if you are going to collide with anything in the collision detection radius
        checkCollision: function () {
            var point;

            SlitherBot.getCollisionPoints();
            if (SlitherBot.collisionPoints.length === 0) return false;

            for (var i = 0; i < SlitherBot.collisionPoints.length; i++) {
                var collisionCircle = canvas.circle(
                    SlitherBot.collisionPoints[i].xx,
                    SlitherBot.collisionPoints[i].yy,
                    SlitherBot.collisionPoints[i].radius
                );

                // -1 snake is special case for non snake object.
                if ((point = canvas.circleIntersect(SlitherBot.headCircle, collisionCircle)) &&
                    SlitherBot.inFrontAngle(point)) {
                    if (SlitherBot.collisionPoints[i].snake !== -1 &&
                        SlitherBot.collisionPoints[i].head &&
                        window.snakes[SlitherBot.collisionPoints[i].snake].sp > 10) {
                        window.setAcceleration(1);
                    } else {
                        window.setAcceleration(SlitherBot.defaultAccel);
                    }
                    SlitherBot.avoidCollisionPoint(point);
                    return true;
                }
            }

            window.setAcceleration(SlitherBot.defaultAccel);
            return false;
        },

        checkEncircle: function () {
            var enSnake = [];
            var high = 0;
            var highSnake;
            var enAll = 0;

            for (var i = 0; i < SlitherBot.collisionAngles.length; i++) {
                if (SlitherBot.collisionAngles[i] !== undefined) {
                    var s = SlitherBot.collisionAngles[i].snake;
                    if (enSnake[s]) {
                        enSnake[s]++;
                    } else {
                        enSnake[s] = 1;
                    }
                    if (enSnake[s] > high) {
                        high = enSnake[s];
                        highSnake = s;
                    }

                    if (SlitherBot.collisionAngles[i].distance <
                        Math.pow(SlitherBot.snakeRadius * SlitherBot.opt.enCircleDistanceMult, 2)) {
                        enAll++;
                    }
                }
            }

            if (high > SlitherBot.MAXARC * SlitherBot.opt.enCircleThreshold) {
                SlitherBot.headingBestAngle();

                if (high !== SlitherBot.MAXARC && window.snakes[highSnake].sp > 10) {
                    window.setAcceleration(1);
                } else {
                    window.setAcceleration(SlitherBot.defaultAccel);
                }

                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        window.snake.xx,
                        window.snake.yy,
                        SlitherBot.opt.radiusMult * SlitherBot.snakeRadius),
                        'red', true, 0.2);
                }
                return true;
            }

            if (enAll > SlitherBot.MAXARC * SlitherBot.opt.enCircleAllThreshold) {
                SlitherBot.headingBestAngle();
                window.setAcceleration(SlitherBot.defaultAccel);

                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        window.snake.xx,
                        window.snake.yy,
                        SlitherBot.snakeRadius * SlitherBot.opt.enCircleDistanceMult),
                        'yellow', true, 0.2);
                }
                return true;
            } else {
                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        window.snake.xx,
                        window.snake.yy,
                        SlitherBot.snakeRadius * SlitherBot.opt.enCircleDistanceMult),
                        'yellow');
                }
            }

            window.setAcceleration(SlitherBot.defaultAccel);
            return false;
        },

        populatePts: function () {
            let x = window.snake.xx + window.snake.fx;
            let y = window.snake.yy + window.snake.fy;
            let l = 0.0;
            SlitherBot.pts = [{
                x: x,
                y: y,
                len: l
            }];
            for (let p = window.snake.pts.length - 1; p >= 0; p--) {
                if (window.snake.pts[p].dying) {
                    continue;
                } else {
                    let xx = window.snake.pts[p].xx + window.snake.pts[p].fx;
                    let yy = window.snake.pts[p].yy + window.snake.pts[p].fy;
                    let ll = l + Math.sqrt(canvas.getDistance2(x, y, xx, yy));
                    SlitherBot.pts.push({
                        x: xx,
                        y: yy,
                        len: ll
                    });
                    x = xx;
                    y = yy;
                    l = ll;
                }
            }
            SlitherBot.len = l;
        },

        // set the direction of rotation based on the velocity of
        // the head with respect to the center of mass
        determineCircleDirection: function () {
            // find center mass (cx, cy)
            let cx = 0.0;
            let cy = 0.0;
            let pn = SlitherBot.pts.length;
            for (let p = 0; p < pn; p++) {
                cx += SlitherBot.pts[p].x;
                cy += SlitherBot.pts[p].y;
            }
            cx /= pn;
            cy /= pn;

            // vector from (cx, cy) to the head
            let head = {
                x: window.snake.xx + window.snake.fx,
                y: window.snake.yy + window.snake.fy
            };
            let dx = head.x - cx;
            let dy = head.y - cy;

            // check the sign of dot product of (SlitherBot.cos, SlitherBot.sin) and (-dy, dx)
            if (- dy * SlitherBot.cos + dx * SlitherBot.sin > 0) {
                // clockwise
                SlitherBot.opt.followCircleDirection = -1;
            } else {
                // couter clockwise
                SlitherBot.opt.followCircleDirection = +1;
            }
        },

        // returns a point on snake's body on given length from the head
        // assumes that SlitherBot.pts is populated
        smoothPoint: function (t) {
            // range check
            if (t >= SlitherBot.len) {
                let tail = SlitherBot.pts[SlitherBot.pts.length - 1];
                return {
                    x: tail.x,
                    y: tail.y
                };
            } else if (t <= 0 ) {
                return {
                    x: SlitherBot.pts[0].x,
                    y: SlitherBot.pts[0].y
                };
            }
            // binary search
            let p = 0;
            let q = SlitherBot.pts.length - 1;
            while (q - p > 1) {
                let m = Math.round((p + q) / 2);
                if (t > SlitherBot.pts[m].len) {
                    p = m;
                } else {
                    q = m;
                }
            }
            // now q = p + 1, and the point is in between;
            // compute approximation
            let wp = SlitherBot.pts[q].len - t;
            let wq = t - SlitherBot.pts[p].len;
            let w = wp + wq;
            return {
                x: (wp * SlitherBot.pts[p].x + wq * SlitherBot.pts[q].x) / w,
                y: (wp * SlitherBot.pts[p].y + wq * SlitherBot.pts[q].y) / w
            };
        },

        // finds a point on snake's body closest to the head;
        // returns length from the head
        // excludes points close to the head
        closestBodyPoint: function () {
            let head = {
                x: window.snake.xx + window.snake.fx,
                y: window.snake.yy + window.snake.fy
            };

            let ptsLength = SlitherBot.pts.length;

            // skip head area
            let start_n = 0;
            let start_d2 = 0.0;
            for ( ;; ) {
                let prev_d2 = start_d2;
                start_n ++;
                start_d2 = canvas.getDistance2(head.x, head.y,
                    SlitherBot.pts[start_n].x, SlitherBot.pts[start_n].y);
                if (start_d2 < prev_d2 || start_n == ptsLength - 1) {
                    break;
                }
            }

            if (start_n >= ptsLength || start_n <= 1) {
                return SlitherBot.len;
            }

            // find closets point in SlitherBot.pts
            let min_n = start_n;
            let min_d2 = start_d2;
            for (let n = min_n + 1; n < ptsLength; n++) {
                let d2 = canvas.getDistance2(head.x, head.y, SlitherBot.pts[n].x, SlitherBot.pts[n].y);
                if (d2 < min_d2) {
                    min_n = n;
                    min_d2 = d2;
                }
            }

            // find second closest point
            let next_n = min_n;
            let next_d2 = min_d2;
            if (min_n == ptsLength - 1) {
                next_n = min_n - 1;
                next_d2 = canvas.getDistance2(head.x, head.y,
                    SlitherBot.pts[next_n].x, SlitherBot.pts[next_n].y);
            } else {
                let d2m = canvas.getDistance2(head.x, head.y,
                    SlitherBot.pts[min_n - 1].x, SlitherBot.pts[min_n - 1].y);
                let d2p = canvas.getDistance2(head.x, head.y,
                    SlitherBot.pts[min_n + 1].x, SlitherBot.pts[min_n + 1].y);
                if (d2m < d2p) {
                    next_n = min_n - 1;
                    next_d2 = d2m;
                } else {
                    next_n = min_n + 1;
                    next_d2 = d2p;
                }
            }

            // compute approximation
            let t2 = SlitherBot.pts[min_n].len - SlitherBot.pts[next_n].len;
            t2 *= t2;

            if (t2 == 0) {
                return SlitherBot.pts[min_n].len;
            } else {
                let min_w = t2 - (min_d2 - next_d2);
                let next_w = t2 + (min_d2 - next_d2);
                return (SlitherBot.pts[min_n].len * min_w + SlitherBot.pts[next_n].len * next_w) / (2 * t2);
            }
        },

        bodyDangerZone: function (
            offset, targetPoint, targetPointNormal, closePointDist, pastTargetPoint, closePoint) {
            var head = {
                x: window.snake.xx + window.snake.fx,
                y: window.snake.yy + window.snake.fy
            };
            const o = SlitherBot.opt.followCircleDirection;
            var pts = [
                {
                    x: head.x - o * offset * SlitherBot.sin,
                    y: head.y + o * offset * SlitherBot.cos
                },
                {
                    x: head.x + SlitherBot.snakeWidth * SlitherBot.cos +
                        offset * (SlitherBot.cos - o * SlitherBot.sin),
                    y: head.y + SlitherBot.snakeWidth * SlitherBot.sin +
                        offset * (SlitherBot.sin + o * SlitherBot.cos)
                },
                {
                    x: head.x + 1.75 * SlitherBot.snakeWidth * SlitherBot.cos +
                        o * 0.3 * SlitherBot.snakeWidth * SlitherBot.sin +
                        offset * (SlitherBot.cos - o * SlitherBot.sin),
                    y: head.y + 1.75 * SlitherBot.snakeWidth * SlitherBot.sin -
                        o * 0.3 * SlitherBot.snakeWidth * SlitherBot.cos +
                        offset * (SlitherBot.sin + o * SlitherBot.cos)
                },
                {
                    x: head.x + 2.5 * SlitherBot.snakeWidth * SlitherBot.cos +
                        o * 0.7 * SlitherBot.snakeWidth * SlitherBot.sin +
                        offset * (SlitherBot.cos - o * SlitherBot.sin),
                    y: head.y + 2.5 * SlitherBot.snakeWidth * SlitherBot.sin -
                        o * 0.7 * SlitherBot.snakeWidth * SlitherBot.cos +
                        offset * (SlitherBot.sin + o * SlitherBot.cos)
                },
                {
                    x: head.x + 3 * SlitherBot.snakeWidth * SlitherBot.cos +
                        o * 1.2 * SlitherBot.snakeWidth * SlitherBot.sin +
                        offset * SlitherBot.cos,
                    y: head.y + 3 * SlitherBot.snakeWidth * SlitherBot.sin -
                        o * 1.2 * SlitherBot.snakeWidth * SlitherBot.cos +
                        offset * SlitherBot.sin
                },
                {
                    x: targetPoint.x +
                        targetPointNormal.x * (offset + 0.5 * Math.max(closePointDist, 0)),
                    y: targetPoint.y +
                        targetPointNormal.y * (offset + 0.5 * Math.max(closePointDist, 0))
                },
                {
                    x: pastTargetPoint.x + targetPointNormal.x * offset,
                    y: pastTargetPoint.y + targetPointNormal.y * offset
                },
                pastTargetPoint,
                targetPoint,
                closePoint
            ];
            pts = canvas.convexHull(pts);
            var poly = {
                pts: pts
            };
            poly = canvas.addPolyBox(poly);
            return (poly);
        },

        followCircleSelf: function () {

            SlitherBot.populatePts();
            SlitherBot.determineCircleDirection();
            const o = SlitherBot.opt.followCircleDirection;


            // exit if too short
            if (SlitherBot.len < 9 * SlitherBot.snakeWidth) {
                return;
            }

            var head = {
                x: window.snake.xx + window.snake.fx,
                y: window.snake.yy + window.snake.fy
            };

            let closePointT = SlitherBot.closestBodyPoint();
            let closePoint = SlitherBot.smoothPoint(closePointT);

            // approx tangent and normal vectors and closePoint
            var closePointNext = SlitherBot.smoothPoint(closePointT - SlitherBot.snakeWidth);
            var closePointTangent = canvas.unitVector({
                x: closePointNext.x - closePoint.x,
                y: closePointNext.y - closePoint.y});
            var closePointNormal = {
                x: - o * closePointTangent.y,
                y:   o * closePointTangent.x
            };

            // angle wrt closePointTangent
            var currentCourse = Math.asin(Math.max(
                -1, Math.min(1, SlitherBot.cos * closePointNormal.x + SlitherBot.sin * closePointNormal.y)));

            // compute (oriented) distance from the body at closePointDist
            var closePointDist = (head.x - closePoint.x) * closePointNormal.x +
                (head.y - closePoint.y) * closePointNormal.y;

            // construct polygon for snake inside
            var insidePolygonStartT = 5 * SlitherBot.snakeWidth;
            var insidePolygonEndT = closePointT + 5 * SlitherBot.snakeWidth;
            var insidePolygonPts = [
                SlitherBot.smoothPoint(insidePolygonEndT),
                SlitherBot.smoothPoint(insidePolygonStartT)
            ];
            for (let t = insidePolygonStartT; t < insidePolygonEndT; t += SlitherBot.snakeWidth) {
                insidePolygonPts.push(SlitherBot.smoothPoint(t));
            }

            var insidePolygon = canvas.addPolyBox({
                pts: insidePolygonPts
            });

            // get target point; this is an estimate where we land if we hurry
            var targetPointT = closePointT;
            var targetPointFar = 0.0;
            let targetPointStep = SlitherBot.snakeWidth / 64;
            for (let h = closePointDist, a = currentCourse; h >= 0.125 * SlitherBot.snakeWidth; ) {
                targetPointT -= targetPointStep;
                targetPointFar += targetPointStep * Math.cos(a);
                h += targetPointStep * Math.sin(a);
                a = Math.max(-Math.PI / 4, a - targetPointStep / SlitherBot.snakeWidth);
            }

            var targetPoint = SlitherBot.smoothPoint(targetPointT);

            var pastTargetPointT = targetPointT - 3 * SlitherBot.snakeWidth;
            var pastTargetPoint = SlitherBot.smoothPoint(pastTargetPointT);

            // look for danger from enemies
            var enemyBodyOffsetDelta = 0.25 * SlitherBot.snakeWidth;
            var enemyHeadDist2 = 64 * 64 * SlitherBot.snakeWidth * SlitherBot.snakeWidth;
            for (let snake = 0, snakesNum = window.snakes.length; snake < snakesNum; snake++) {
                if (window.snakes[snake].id !== window.snake.id
                    && window.snakes[snake].alive_amt === 1) {
                    let enemyHead = {
                        x: window.snakes[snake].xx + window.snakes[snake].fx,
                        y: window.snakes[snake].yy + window.snakes[snake].fy
                    };
                    let enemyAhead = {
                        x: enemyHead.x +
                            Math.cos(window.snakes[snake].ang) * SlitherBot.snakeWidth,
                        y: enemyHead.y +
                            Math.sin(window.snakes[snake].ang) * SlitherBot.snakeWidth
                    };
                    // heads
                    if (!canvas.pointInPoly(enemyHead, insidePolygon)) {
                        enemyHeadDist2 = Math.min(
                            enemyHeadDist2,
                            canvas.getDistance2(enemyHead.x,  enemyHead.y,
                                targetPoint.x, targetPoint.y),
                            canvas.getDistance2(enemyAhead.x, enemyAhead.y,
                                targetPoint.x, targetPoint.y)
                            );
                    }
                    // bodies
                    let offsetSet = false;
                    let offset = 0.0;
                    let cpolbody = {};
                    for (let pts = 0, ptsNum = window.snakes[snake].pts.length;
                        pts < ptsNum; pts++) {
                        if (!window.snakes[snake].pts[pts].dying) {
                            let point = {
                                x: window.snakes[snake].pts[pts].xx +
                                   window.snakes[snake].pts[pts].fx,
                                y: window.snakes[snake].pts[pts].yy +
                                   window.snakes[snake].pts[pts].fy
                            };
                            while (!offsetSet || (enemyBodyOffsetDelta >= -SlitherBot.snakeWidth
                                && canvas.pointInPoly(point, cpolbody))) {
                                if (!offsetSet) {
                                    offsetSet = true;
                                } else {
                                    enemyBodyOffsetDelta -= 0.0625 * SlitherBot.snakeWidth;
                                }
                                offset = 0.5 * (SlitherBot.snakeWidth +
                                    SlitherBot.getSnakeWidth(window.snakes[snake].sc)) +
                                    enemyBodyOffsetDelta;
                                cpolbody = SlitherBot.bodyDangerZone(
                                    offset, targetPoint, closePointNormal, closePointDist,
                                    pastTargetPoint, closePoint);

                            }
                        }
                    }
                }
            }
            var enemyHeadDist = Math.sqrt(enemyHeadDist2);

            // plot inside polygon
            if (window.visualDebugging) {
                for (let p = 0, l = insidePolygon.pts.length; p < l; p++) {
                    let q = p + 1;
                    if (q == l) {
                        q = 0;
                    }
                    canvas.drawLine(
                        {x: insidePolygon.pts[p].x, y: insidePolygon.pts[p].y},
                        {x: insidePolygon.pts[q].x, y: insidePolygon.pts[q].y},
                        'orange');
                }
            }

            // mark closePoint
            if (window.visualDebugging) {
                canvas.drawCircle(canvas.circle(
                    closePoint.x,
                    closePoint.y,
                    SlitherBot.snakeWidth * 0.25
                ), 'white', false);
            }

            // mark safeZone
            if (window.visualDebugging) {
                canvas.drawCircle(canvas.circle(
                    targetPoint.x,
                    targetPoint.y,
                    SlitherBot.snakeWidth + 2 * targetPointFar
                ), 'white', false);
                canvas.drawCircle(canvas.circle(
                    targetPoint.x,
                    targetPoint.y,
                    0.2 * SlitherBot.snakeWidth
                ), 'white', false);
            }

            // draw sample cpolbody
            if (window.visualDebugging) {
                let soffset = 0.5 * SlitherBot.snakeWidth;
                let scpolbody = SlitherBot.bodyDangerZone(
                    soffset, targetPoint, closePointNormal,
                    closePointDist, pastTargetPoint, closePoint);
                for (let p = 0, l = scpolbody.pts.length; p < l; p++) {
                    let q = p + 1;
                    if (q == l) {
                        q = 0;
                    }
                    canvas.drawLine(
                        {x: scpolbody.pts[p].x, y: scpolbody.pts[p].y},
                        {x: scpolbody.pts[q].x, y: scpolbody.pts[q].y},
                        'white');
                }
            }

            // TAKE ACTION

            // expand?
            let targetCourse = currentCourse + 0.25;
            // enemy head nearby?
            let headProx = -1.0 - (2 * targetPointFar - enemyHeadDist) / SlitherBot.snakeWidth;
            if (headProx > 0) {
                headProx = 0.125 * headProx * headProx;
            } else {
                headProx = - 0.5 * headProx * headProx;
            }
            targetCourse = Math.min(targetCourse, headProx);
            // enemy body nearby?
            targetCourse = Math.min(
                targetCourse, targetCourse + (enemyBodyOffsetDelta - 0.0625 * SlitherBot.snakeWidth) /
                SlitherBot.snakeWidth);
            // small tail?
            var tailBehind = SlitherBot.len - closePointT;
            var targetDir = canvas.unitVector({
                x: SlitherBot.opt.followCircleTarget.x - head.x,
                y: SlitherBot.opt.followCircleTarget.y - head.y
            });
            var driftQ = targetDir.x * closePointNormal.x + targetDir.y * closePointNormal.y;
            var allowTail = SlitherBot.snakeWidth * (2 - 0.5 * driftQ);
            // a line in the direction of the target point
            if (window.visualDebugging) {
                canvas.drawLine(
                    { x: head.x, y: head.y },
                    { x: head.x + allowTail * targetDir.x, y: head.y + allowTail * targetDir.y },
                    'red');
            }
            targetCourse = Math.min(
                targetCourse,
                (tailBehind - allowTail + (SlitherBot.snakeWidth - closePointDist)) /
                SlitherBot.snakeWidth);
            // far away?
            targetCourse = Math.min(
                targetCourse, - 0.5 * (closePointDist - 4 * SlitherBot.snakeWidth) / SlitherBot.snakeWidth);
            // final corrections
            // too fast in?
            targetCourse = Math.max(targetCourse, -0.75 * closePointDist / SlitherBot.snakeWidth);
            // too fast out?
            targetCourse = Math.min(targetCourse, 1.0);

            var goalDir = {
                x: closePointTangent.x * Math.cos(targetCourse) -
                    o * closePointTangent.y * Math.sin(targetCourse),
                y: closePointTangent.y * Math.cos(targetCourse) +
                    o * closePointTangent.x * Math.sin(targetCourse)
            };
            var goal = {
                x: head.x + goalDir.x * 4 * SlitherBot.snakeWidth,
                y: head.y + goalDir.y * 4 * SlitherBot.snakeWidth
            };


            if (window.goalCoordinates
                && Math.abs(goal.x - window.goalCoordinates.x) < 1000
                && Math.abs(goal.y - window.goalCoordinates.y) < 1000) {
                window.goalCoordinates = {
                    x: Math.round(goal.x * 0.25 + window.goalCoordinates.x * 0.75),
                    y: Math.round(goal.y * 0.25 + window.goalCoordinates.y * 0.75)
                };
            } else {
                window.goalCoordinates = {
                    x: Math.round(goal.x),
                    y: Math.round(goal.y)
                };
            }

            canvas.setMouseCoordinates(canvas.mapToMouse(window.goalCoordinates));
        },

        // Sorting by property 'score' descending
        sortScore: function (a, b) {
            return b.score - a.score;
        },

        // Sorting by property 'sz' descending
        sortSz: function (a, b) {
            return b.sz - a.sz;
        },

        // Sorting by property 'distance' ascending
        sortDistance: function (a, b) {
            return a.distance - b.distance;
        },

        //Set the snake ID of the current SlitherBot. Should only be called once.
        setBotSnakeId: function () {
            if (SlitherBot.id === 0) {
                var id = window.snakes[0].id;
                window.log('Setting bot snake ID to: ' + id);
                SlitherBot.id = id;
            }
         },

        computeFoodGoal: function () {
            SlitherBot.foodAngles = [];
            window.log('Snakes:');
            window.log(window.snakes);
            for (var i = 0; i < window.foods.length && window.foods[i] !== null; i++) {
                var f = window.foods[i];
                f.clusterRatio = 0.001; // Initialize cluster ratio to .001.
                var totalClusterDistance = 0;
                var numberOfFoodsInRadius = 0;

                if (!f.eaten &&
                    !(
                        canvas.circleIntersect(
                            canvas.circle(f.xx, f.yy, 2),
                            SlitherBot.sidecircle_l) ||
                        canvas.circleIntersect(
                            canvas.circle(f.xx, f.yy, 2),
                            SlitherBot.sidecircle_r))

                            ) {
                            //calculate clustering index.
                            for (var j = 0; j < window.foods.length && window.foods[j] !== null; j++) {
                                var clusterFood = window.foods[j];
                                var distanceFromCurrentFood = Math.sqrt(Math.pow(f.xx - clusterFood.xx, 2) + Math.pow(f.yy - clusterFood.yy, 2));

                                //If food is close enough, then add distance to running tally and increment number of foods counted.
                                if (distanceFromCurrentFood <= SlitherBot.opt.foodClusterRadius && distanceFromCurrentFood > 0) {
                                    totalClusterDistance += distanceFromCurrentFood;
                                    numberOfFoodsInRadius++;

                                    f.clusterRatio = (numberOfFoodsInRadius / totalClusterDistance);
                                }
                            }

                            if (f.clusterRatio > 0.25) {
                                f.isDense = true;
                                window.log('Number of foods in radius: ' + numberOfFoodsInRadius);
                                window.log('Total cluster distance: ' + totalClusterDistance);
                                window.log(f);
                            } else {
                                f.isDense = false;
                            }
                            if (f.clusterRatio <= 0.01 && f.clusterRatio > 0.001) {
                                f.isSparse = true;
                                window.log('Number of foods in radius: ' + numberOfFoodsInRadius);
                                window.log('Total cluster distance: ' + totalClusterDistance);
                                window.log(f);
                            } else {
                                f.isSparse = false;
                            }

                            SlitherBot.addFoodAngle(f);
                }
            }

            SlitherBot.foodAngles.sort(SlitherBot.sortScore);

            if (SlitherBot.foodAngles[0] !== undefined && SlitherBot.foodAngles[0].sz > 0) {
                SlitherBot.currentFood = { x: SlitherBot.foodAngles[0].x,
                                    y: SlitherBot.foodAngles[0].y,
                                    sz: SlitherBot.foodAngles[0].sz,
                                    da: SlitherBot.foodAngles[0].da };
            } else {
                SlitherBot.currentFood = { x: SlitherBot.MID_X, y: SlitherBot.MID_Y, sz: 0 };
            }
        },

        foodAccel: function () {
            var aIndex = 0;

            if (SlitherBot.currentFood && SlitherBot.currentFood.sz > SlitherBot.opt.foodAccelSz) {
                aIndex = SlitherBot.getAngleIndex(SlitherBot.currentFood.ang);

                if (
                    SlitherBot.collisionAngles[aIndex] && SlitherBot.collisionAngles[aIndex].distance >
                    SlitherBot.currentFood.distance + SlitherBot.snakeRadius * SlitherBot.opt.radiusMult
                    && SlitherBot.currentFood.da < SlitherBot.opt.foodAccelDa) {
                    return 1;
                }

                if (SlitherBot.collisionAngles[aIndex] === undefined
                    && SlitherBot.currentFood.da < SlitherBot.opt.foodAccelDa) {
                    return 1;
                }
            }

            return SlitherBot.defaultAccel;
        },

        toCircle: function () {
            for (var i = 0; i < window.snake.pts.length && window.snake.pts[i].dying; i++);
            const o = SlitherBot.opt.followCircleDirection;
            var tailCircle = canvas.circle(
                window.snake.pts[i].xx,
                window.snake.pts[i].yy,
                SlitherBot.headCircle.radius
            );

            if (window.visualDebugging) {
                canvas.drawCircle(tailCircle, 'blue', false);
            }

            window.setAcceleration(SlitherBot.defaultAccel);
            SlitherBot.changeHeadingRel(o * Math.PI / 32);

            if (canvas.circleIntersect(SlitherBot.headCircle, tailCircle)) {
                SlitherBot.stage = 'circle';
            }
        },

        every: function () {
            SlitherBot.MID_X = window.grd;
            SlitherBot.MID_Y = window.grd;
            SlitherBot.MAP_R = window.grd * 0.98;
            SlitherBot.MAXARC = (2 * Math.PI) / SlitherBot.opt.arcSize;

            if (SlitherBot.opt.followCircleTarget === undefined) {
                SlitherBot.opt.followCircleTarget = {
                    x: SlitherBot.MID_X,
                    y: SlitherBot.MID_Y
                };
            }

            SlitherBot.sectorBoxSide = Math.floor(Math.sqrt(window.sectors.length)) * window.sector_size;
            SlitherBot.sectorBox = canvas.rect(
                window.snake.xx - (SlitherBot.sectorBoxSide / 2),
                window.snake.yy - (SlitherBot.sectorBoxSide / 2),
                SlitherBot.sectorBoxSide, SlitherBot.sectorBoxSide);
            // if (window.visualDebugging) canvas.drawRect(SlitherBot.sectorBox, '#c0c0c0', true, 0.1);

            SlitherBot.cos = Math.cos(window.snake.ang);
            SlitherBot.sin = Math.sin(window.snake.ang);

            SlitherBot.speedMult = window.snake.sp / SlitherBot.opt.speedBase;
            SlitherBot.snakeRadius = SlitherBot.getSnakeWidth() / 2;
            SlitherBot.snakeWidth = SlitherBot.getSnakeWidth();
            SlitherBot.snakeLength = Math.floor(15 * (window.fpsls[window.snake.sct] + window.snake.fam /
                window.fmlts[window.snake.sct] - 1) - 5);

            SlitherBot.headCircle = canvas.circle(
                window.snake.xx + SlitherBot.cos * Math.min(1, SlitherBot.speedMult - 1) *
                SlitherBot.opt.radiusMult / 2 * SlitherBot.snakeRadius,
                window.snake.yy + SlitherBot.sin * Math.min(1, SlitherBot.speedMult - 1) *
                SlitherBot.opt.radiusMult / 2 * SlitherBot.snakeRadius,
                SlitherBot.opt.radiusMult / 2 * SlitherBot.snakeRadius
            );

            SlitherBot.sidecircle_r = canvas.circle(
                window.snake.lnp.xx -
                ((window.snake.lnp.yy + SlitherBot.sin * SlitherBot.snakeWidth) -
                    window.snake.lnp.yy),
                window.snake.lnp.yy +
                ((window.snake.lnp.xx + SlitherBot.cos * SlitherBot.snakeWidth) -
                    window.snake.lnp.xx),
                SlitherBot.snakeWidth * SlitherBot.speedMult
            );

            SlitherBot.sidecircle_l = canvas.circle(
                window.snake.lnp.xx +
                ((window.snake.lnp.yy + SlitherBot.sin * SlitherBot.snakeWidth) -
                    window.snake.lnp.yy),
                window.snake.lnp.yy -
                ((window.snake.lnp.xx + SlitherBot.cos * SlitherBot.snakeWidth) -
                    window.snake.lnp.xx),
                SlitherBot.snakeWidth * SlitherBot.speedMult
            );


            if (window.visualDebugging) {
                canvas.drawCircle(SlitherBot.headCircle, 'blue', false);
                canvas.drawCircle(SlitherBot.sidecircle_r, 'green', false);
                canvas.drawCircle(SlitherBot.sidecircle_l, 'green', false);
            }

        },

        // Main bot
        go: function () {
            SlitherBot.every();

            if (SlitherBot.snakeLength < SlitherBot.opt.followCircleLength) {
                SlitherBot.stage = 'grow';
            }

            if (SlitherBot.currentFood && SlitherBot.stage !== 'grow') {
                SlitherBot.currentFood = undefined;
            }

            if (SlitherBot.stage === 'circle' && !SlitherBot.isSelfCirclingEnabled) {
                window.setAcceleration(SlitherBot.defaultAccel);
                SlitherBot.followCircleSelf();
            } else if (SlitherBot.checkCollision() || SlitherBot.checkEncircle()) {
                if (SlitherBot.actionTimeout) {
                    window.clearTimeout(SlitherBot.actionTimeout);
                    SlitherBot.actionTimeout = window.setTimeout(
                        SlitherBot.actionTimer, 1000 / SlitherBot.opt.targetFps * SlitherBot.opt.collisionDelay);
                }
            } else {
                if (SlitherBot.snakeLength > SlitherBot.opt.followCircleLength) {
                    SlitherBot.stage = 'tocircle';
                }
                if (SlitherBot.actionTimeout === undefined) {
                    SlitherBot.actionTimeout = window.setTimeout(
                        SlitherBot.actionTimer, 1000 / SlitherBot.opt.targetFps * SlitherBot.opt.actionFrames);
                }
                window.setAcceleration(SlitherBot.foodAccel());
            }
        },

        // Timer version of food check
        actionTimer: function () {
            if (window.playing && window.snake !== null && window.snake.alive_amt === 1) {
                if (SlitherBot.stage === 'grow') {
                    SlitherBot.computeFoodGoal();
                    window.goalCoordinates = SlitherBot.currentFood;
                    canvas.setMouseCoordinates(canvas.mapToMouse(window.goalCoordinates));
                } else if (SlitherBot.stage === 'tocircle') {
                    SlitherBot.toCircle();
                }
            }
            SlitherBot.actionTimeout = undefined;
        }
    };
})(window);