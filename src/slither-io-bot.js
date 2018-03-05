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

            bot.isBotRunning = false;
            window.forcing = true;
            bot.connect();
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
                    window.snake.xx + (bot.headCircle.radius) * cos),
                y: Math.round(
                    window.snake.yy + (bot.headCircle.radius) * sin)
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
                x: window.snake.xx + 500 * bot.cos,
                y: window.snake.yy + 500 * bot.sin
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

            var sIndex = bot.getAngleIndex(window.snake.ehang) + bot.MAXARC / 2;
            if (sIndex > bot.MAXARC) sIndex -= bot.MAXARC;

            for (var i = 0; i < bot.MAXARC; i++) {
                if (bot.collisionAngles[i] === undefined) {
                    distance = 0;
                    if (openStart === undefined) openStart = i;
                } else {
                    distance = bot.collisionAngles[i].distance;
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
                if (openAngles[0].sz < 0) openAngles[0].sz += bot.MAXARC;

            } else if (openStart) {
                openAngles.push({openStart: openStart, openEnd: openStart, sz: 0});
            }

            if (openAngles.length > 0) {
                openAngles.sort(bot.sortSz);
                bot.changeHeadingAbs(
                    (openAngles[0].openEnd - openAngles[0].sz / 2) * bot.opt.arcSize);
            } else {
                bot.changeHeadingAbs(best.aIndex * bot.opt.arcSize);
            }
        },

        // Avoid collision point by ang
        // ang radians <= Math.PI (180deg)
        avoidCollisionPoint: function (point, ang) {
            if (ang === undefined || ang > Math.PI) {
                ang = Math.PI;
            }

            var end = {
                x: window.snake.xx + 2000 * bot.cos,
                y: window.snake.yy + 2000 * bot.sin
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
                bot.changeHeadingAbs(point.ang - ang);
            } else {
                bot.changeHeadingAbs(point.ang + ang);
            }
        },

        // get collision angle index, expects angle +/i 0 to Math.PI
        getAngleIndex: function (angle) {
            var index;

            if (angle < 0) {
                angle += 2 * Math.PI;
            }

            index = Math.round(angle * (1 / bot.opt.arcSize));

            if (index === bot.MAXARC) {
                return 0;
            }
            return index;
        },

        // Add to collisionAngles if distance is closer
        addCollisionAngle: function (sp) {
            var ang = canvas.fastAtan2(
                Math.round(sp.yy - window.snake.yy),
                Math.round(sp.xx - window.snake.xx));
            var aIndex = bot.getAngleIndex(ang);

            var actualDistance = Math.round(Math.pow(
                Math.sqrt(sp.distance) - sp.radius, 2));

            if (bot.collisionAngles[aIndex] === undefined ||
                 bot.collisionAngles[aIndex].distance > sp.distance) {
                bot.collisionAngles[aIndex] = {
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

            var aIndex = bot.getAngleIndex(ang);

            canvas.getDistance2FromSnake(f);

            if (bot.collisionAngles[aIndex] === undefined ||
                Math.sqrt(bot.collisionAngles[aIndex].distance) >
                Math.sqrt(f.distance) + bot.snakeRadius * bot.opt.radiusMult * bot.speedMult / 2) {
                if (bot.foodAngles[aIndex] === undefined) {
                    bot.foodAngles[aIndex] = {
                        x: Math.round(f.xx),
                        y: Math.round(f.yy),
                        ang: ang,
                        da: Math.abs(bot.angleBetween(ang, window.snake.ehang)),
                        distance: f.distance,
                        sz: f.sz,
                        score: (Math.pow(f.sz, 2) / f.distance * f.clusterRatio)
                    };
                } else {
                    bot.foodAngles[aIndex].sz += Math.round(f.sz);
                    if (f.isSparse || f.isDense) {
                        window.log('Food\'s original score: ' + bot.foodAngles[aIndex].score);
                    }

                    bot.foodAngles[aIndex].score += (Math.pow(f.sz, 2) / f.distance * f.clusterRatio);
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

                    if (bot.foodAngles[aIndex].distance > f.distance) {
                        bot.foodAngles[aIndex].x = Math.round(f.xx);
                        bot.foodAngles[aIndex].y = Math.round(f.yy);
                        bot.foodAngles[aIndex].distance = f.distance;
                    }
                }
            }
        },

        // Get closest collision point per snake.
        getCollisionPoints: function () {
            var scPoint;

            bot.collisionPoints = [];
            bot.collisionAngles = [];


            for (var snake = 0, ls = window.snakes.length; snake < ls; snake++) {
                scPoint = undefined;

                if (window.snakes[snake].id !== window.snake.id &&
                    window.snakes[snake].alive_amt === 1) {

                    var s = window.snakes[snake];
                    var sRadius = bot.getSnakeWidth(s.sc) / 2;
                    var sSpMult = Math.min(1, s.sp / 5.78 - 1 );

                    scPoint = {
                        xx: s.xx + Math.cos(s.ehang) * sRadius * sSpMult * bot.opt.radiusMult / 2,
                        yy: s.yy + Math.sin(s.ehang) * sRadius * sSpMult * bot.opt.radiusMult / 2,
                        snake: snake,
                        radius: bot.headCircle.radius,
                        head: true
                    };

                    canvas.getDistance2FromSnake(scPoint);
                    bot.addCollisionAngle(scPoint);
                    bot.collisionPoints.push(scPoint);

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
                                }, bot.sectorBox)
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
                            bot.addCollisionAngle(collisionPoint);

                            if (collisionPoint.distance <= Math.pow(
                                (bot.headCircle.radius)
                                + collisionPoint.radius, 2)) {
                                bot.collisionPoints.push(collisionPoint);
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
            if (canvas.getDistance2(bot.MID_X, bot.MID_Y, window.snake.xx, window.snake.yy) >
                Math.pow(bot.MAP_R - 1000, 2)) {
                var midAng = canvas.fastAtan2(
                    window.snake.yy - bot.MID_X, window.snake.xx - bot.MID_Y);
                scPoint = {
                    xx: bot.MID_X + bot.MAP_R * Math.cos(midAng),
                    yy: bot.MID_Y + bot.MAP_R * Math.sin(midAng),
                    snake: -1,
                    radius: bot.snakeWidth
                };
                canvas.getDistance2FromSnake(scPoint);
                bot.collisionPoints.push(scPoint);
                bot.addCollisionAngle(scPoint);
                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        scPoint.xx,
                        scPoint.yy,
                        scPoint.radius
                    ), 'yellow', false);
                }
            }


            bot.collisionPoints.sort(bot.sortDistance);
            if (window.visualDebugging) {
                for (var i = 0; i < bot.collisionAngles.length; i++) {
                    if (bot.collisionAngles[i] !== undefined) {
                        canvas.drawLine(
                            { x: window.snake.xx, y: window.snake.yy },
                            { x: bot.collisionAngles[i].x, y: bot.collisionAngles[i].y },
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

            if (Math.abs(bot.angleBetween(ang, window.snake.ehang)) < bot.opt.frontAngle) {
                return true;
            } else {
                return false;
            }

        },

        // Checks to see if you are going to collide with anything in the collision detection radius
        checkCollision: function () {
            var point;

            bot.getCollisionPoints();
            if (bot.collisionPoints.length === 0) return false;

            for (var i = 0; i < bot.collisionPoints.length; i++) {
                var collisionCircle = canvas.circle(
                    bot.collisionPoints[i].xx,
                    bot.collisionPoints[i].yy,
                    bot.collisionPoints[i].radius
                );

                // -1 snake is special case for non snake object.
                if ((point = canvas.circleIntersect(bot.headCircle, collisionCircle)) &&
                    bot.inFrontAngle(point)) {
                    if (bot.collisionPoints[i].snake !== -1 &&
                        bot.collisionPoints[i].head &&
                        window.snakes[bot.collisionPoints[i].snake].sp > 10) {
                        window.setAcceleration(1);
                    } else {
                        window.setAcceleration(bot.defaultAccel);
                    }
                    bot.avoidCollisionPoint(point);
                    return true;
                }
            }

            window.setAcceleration(bot.defaultAccel);
            return false;
        },

        checkEncircle: function () {
            var enSnake = [];
            var high = 0;
            var highSnake;
            var enAll = 0;

            for (var i = 0; i < bot.collisionAngles.length; i++) {
                if (bot.collisionAngles[i] !== undefined) {
                    var s = bot.collisionAngles[i].snake;
                    if (enSnake[s]) {
                        enSnake[s]++;
                    } else {
                        enSnake[s] = 1;
                    }
                    if (enSnake[s] > high) {
                        high = enSnake[s];
                        highSnake = s;
                    }

                    if (bot.collisionAngles[i].distance <
                        Math.pow(bot.snakeRadius * bot.opt.enCircleDistanceMult, 2)) {
                        enAll++;
                    }
                }
            }

            if (high > bot.MAXARC * bot.opt.enCircleThreshold) {
                bot.headingBestAngle();

                if (high !== bot.MAXARC && window.snakes[highSnake].sp > 10) {
                    window.setAcceleration(1);
                } else {
                    window.setAcceleration(bot.defaultAccel);
                }

                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        window.snake.xx,
                        window.snake.yy,
                        bot.opt.radiusMult * bot.snakeRadius),
                        'red', true, 0.2);
                }
                return true;
            }

            if (enAll > bot.MAXARC * bot.opt.enCircleAllThreshold) {
                bot.headingBestAngle();
                window.setAcceleration(bot.defaultAccel);

                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        window.snake.xx,
                        window.snake.yy,
                        bot.snakeRadius * bot.opt.enCircleDistanceMult),
                        'yellow', true, 0.2);
                }
                return true;
            } else {
                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        window.snake.xx,
                        window.snake.yy,
                        bot.snakeRadius * bot.opt.enCircleDistanceMult),
                        'yellow');
                }
            }

            window.setAcceleration(bot.defaultAccel);
            return false;
        },

        populatePts: function () {
            let x = window.snake.xx + window.snake.fx;
            let y = window.snake.yy + window.snake.fy;
            let l = 0.0;
            bot.pts = [{
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
                    bot.pts.push({
                        x: xx,
                        y: yy,
                        len: ll
                    });
                    x = xx;
                    y = yy;
                    l = ll;
                }
            }
            bot.len = l;
        },

        // set the direction of rotation based on the velocity of
        // the head with respect to the center of mass
        determineCircleDirection: function () {
            // find center mass (cx, cy)
            let cx = 0.0;
            let cy = 0.0;
            let pn = bot.pts.length;
            for (let p = 0; p < pn; p++) {
                cx += bot.pts[p].x;
                cy += bot.pts[p].y;
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

            // check the sign of dot product of (bot.cos, bot.sin) and (-dy, dx)
            if (- dy * bot.cos + dx * bot.sin > 0) {
                // clockwise
                bot.opt.followCircleDirection = -1;
            } else {
                // couter clockwise
                bot.opt.followCircleDirection = +1;
            }
        },

        // returns a point on snake's body on given length from the head
        // assumes that bot.pts is populated
        smoothPoint: function (t) {
            // range check
            if (t >= bot.len) {
                let tail = bot.pts[bot.pts.length - 1];
                return {
                    x: tail.x,
                    y: tail.y
                };
            } else if (t <= 0 ) {
                return {
                    x: bot.pts[0].x,
                    y: bot.pts[0].y
                };
            }
            // binary search
            let p = 0;
            let q = bot.pts.length - 1;
            while (q - p > 1) {
                let m = Math.round((p + q) / 2);
                if (t > bot.pts[m].len) {
                    p = m;
                } else {
                    q = m;
                }
            }
            // now q = p + 1, and the point is in between;
            // compute approximation
            let wp = bot.pts[q].len - t;
            let wq = t - bot.pts[p].len;
            let w = wp + wq;
            return {
                x: (wp * bot.pts[p].x + wq * bot.pts[q].x) / w,
                y: (wp * bot.pts[p].y + wq * bot.pts[q].y) / w
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

            let ptsLength = bot.pts.length;

            // skip head area
            let start_n = 0;
            let start_d2 = 0.0;
            for ( ;; ) {
                let prev_d2 = start_d2;
                start_n ++;
                start_d2 = canvas.getDistance2(head.x, head.y,
                    bot.pts[start_n].x, bot.pts[start_n].y);
                if (start_d2 < prev_d2 || start_n == ptsLength - 1) {
                    break;
                }
            }

            if (start_n >= ptsLength || start_n <= 1) {
                return bot.len;
            }

            // find closets point in bot.pts
            let min_n = start_n;
            let min_d2 = start_d2;
            for (let n = min_n + 1; n < ptsLength; n++) {
                let d2 = canvas.getDistance2(head.x, head.y, bot.pts[n].x, bot.pts[n].y);
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
                    bot.pts[next_n].x, bot.pts[next_n].y);
            } else {
                let d2m = canvas.getDistance2(head.x, head.y,
                    bot.pts[min_n - 1].x, bot.pts[min_n - 1].y);
                let d2p = canvas.getDistance2(head.x, head.y,
                    bot.pts[min_n + 1].x, bot.pts[min_n + 1].y);
                if (d2m < d2p) {
                    next_n = min_n - 1;
                    next_d2 = d2m;
                } else {
                    next_n = min_n + 1;
                    next_d2 = d2p;
                }
            }

            // compute approximation
            let t2 = bot.pts[min_n].len - bot.pts[next_n].len;
            t2 *= t2;

            if (t2 == 0) {
                return bot.pts[min_n].len;
            } else {
                let min_w = t2 - (min_d2 - next_d2);
                let next_w = t2 + (min_d2 - next_d2);
                return (bot.pts[min_n].len * min_w + bot.pts[next_n].len * next_w) / (2 * t2);
            }
        },

        bodyDangerZone: function (
            offset, targetPoint, targetPointNormal, closePointDist, pastTargetPoint, closePoint) {
            var head = {
                x: window.snake.xx + window.snake.fx,
                y: window.snake.yy + window.snake.fy
            };
            const o = bot.opt.followCircleDirection;
            var pts = [
                {
                    x: head.x - o * offset * bot.sin,
                    y: head.y + o * offset * bot.cos
                },
                {
                    x: head.x + bot.snakeWidth * bot.cos +
                        offset * (bot.cos - o * bot.sin),
                    y: head.y + bot.snakeWidth * bot.sin +
                        offset * (bot.sin + o * bot.cos)
                },
                {
                    x: head.x + 1.75 * bot.snakeWidth * bot.cos +
                        o * 0.3 * bot.snakeWidth * bot.sin +
                        offset * (bot.cos - o * bot.sin),
                    y: head.y + 1.75 * bot.snakeWidth * bot.sin -
                        o * 0.3 * bot.snakeWidth * bot.cos +
                        offset * (bot.sin + o * bot.cos)
                },
                {
                    x: head.x + 2.5 * bot.snakeWidth * bot.cos +
                        o * 0.7 * bot.snakeWidth * bot.sin +
                        offset * (bot.cos - o * bot.sin),
                    y: head.y + 2.5 * bot.snakeWidth * bot.sin -
                        o * 0.7 * bot.snakeWidth * bot.cos +
                        offset * (bot.sin + o * bot.cos)
                },
                {
                    x: head.x + 3 * bot.snakeWidth * bot.cos +
                        o * 1.2 * bot.snakeWidth * bot.sin +
                        offset * bot.cos,
                    y: head.y + 3 * bot.snakeWidth * bot.sin -
                        o * 1.2 * bot.snakeWidth * bot.cos +
                        offset * bot.sin
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

            bot.populatePts();
            bot.determineCircleDirection();
            const o = bot.opt.followCircleDirection;


            // exit if too short
            if (bot.len < 9 * bot.snakeWidth) {
                return;
            }

            var head = {
                x: window.snake.xx + window.snake.fx,
                y: window.snake.yy + window.snake.fy
            };

            let closePointT = bot.closestBodyPoint();
            let closePoint = bot.smoothPoint(closePointT);

            // approx tangent and normal vectors and closePoint
            var closePointNext = bot.smoothPoint(closePointT - bot.snakeWidth);
            var closePointTangent = canvas.unitVector({
                x: closePointNext.x - closePoint.x,
                y: closePointNext.y - closePoint.y});
            var closePointNormal = {
                x: - o * closePointTangent.y,
                y:   o * closePointTangent.x
            };

            // angle wrt closePointTangent
            var currentCourse = Math.asin(Math.max(
                -1, Math.min(1, bot.cos * closePointNormal.x + bot.sin * closePointNormal.y)));

            // compute (oriented) distance from the body at closePointDist
            var closePointDist = (head.x - closePoint.x) * closePointNormal.x +
                (head.y - closePoint.y) * closePointNormal.y;

            // construct polygon for snake inside
            var insidePolygonStartT = 5 * bot.snakeWidth;
            var insidePolygonEndT = closePointT + 5 * bot.snakeWidth;
            var insidePolygonPts = [
                bot.smoothPoint(insidePolygonEndT),
                bot.smoothPoint(insidePolygonStartT)
            ];
            for (let t = insidePolygonStartT; t < insidePolygonEndT; t += bot.snakeWidth) {
                insidePolygonPts.push(bot.smoothPoint(t));
            }

            var insidePolygon = canvas.addPolyBox({
                pts: insidePolygonPts
            });

            // get target point; this is an estimate where we land if we hurry
            var targetPointT = closePointT;
            var targetPointFar = 0.0;
            let targetPointStep = bot.snakeWidth / 64;
            for (let h = closePointDist, a = currentCourse; h >= 0.125 * bot.snakeWidth; ) {
                targetPointT -= targetPointStep;
                targetPointFar += targetPointStep * Math.cos(a);
                h += targetPointStep * Math.sin(a);
                a = Math.max(-Math.PI / 4, a - targetPointStep / bot.snakeWidth);
            }

            var targetPoint = bot.smoothPoint(targetPointT);

            var pastTargetPointT = targetPointT - 3 * bot.snakeWidth;
            var pastTargetPoint = bot.smoothPoint(pastTargetPointT);

            // look for danger from enemies
            var enemyBodyOffsetDelta = 0.25 * bot.snakeWidth;
            var enemyHeadDist2 = 64 * 64 * bot.snakeWidth * bot.snakeWidth;
            for (let snake = 0, snakesNum = window.snakes.length; snake < snakesNum; snake++) {
                if (window.snakes[snake].id !== window.snake.id
                    && window.snakes[snake].alive_amt === 1) {
                    let enemyHead = {
                        x: window.snakes[snake].xx + window.snakes[snake].fx,
                        y: window.snakes[snake].yy + window.snakes[snake].fy
                    };
                    let enemyAhead = {
                        x: enemyHead.x +
                            Math.cos(window.snakes[snake].ang) * bot.snakeWidth,
                        y: enemyHead.y +
                            Math.sin(window.snakes[snake].ang) * bot.snakeWidth
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
                            while (!offsetSet || (enemyBodyOffsetDelta >= -bot.snakeWidth
                                && canvas.pointInPoly(point, cpolbody))) {
                                if (!offsetSet) {
                                    offsetSet = true;
                                } else {
                                    enemyBodyOffsetDelta -= 0.0625 * bot.snakeWidth;
                                }
                                offset = 0.5 * (bot.snakeWidth +
                                    bot.getSnakeWidth(window.snakes[snake].sc)) +
                                    enemyBodyOffsetDelta;
                                cpolbody = bot.bodyDangerZone(
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
                    bot.snakeWidth * 0.25
                ), 'white', false);
            }

            // mark safeZone
            if (window.visualDebugging) {
                canvas.drawCircle(canvas.circle(
                    targetPoint.x,
                    targetPoint.y,
                    bot.snakeWidth + 2 * targetPointFar
                ), 'white', false);
                canvas.drawCircle(canvas.circle(
                    targetPoint.x,
                    targetPoint.y,
                    0.2 * bot.snakeWidth
                ), 'white', false);
            }

            // draw sample cpolbody
            if (window.visualDebugging) {
                let soffset = 0.5 * bot.snakeWidth;
                let scpolbody = bot.bodyDangerZone(
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
            let headProx = -1.0 - (2 * targetPointFar - enemyHeadDist) / bot.snakeWidth;
            if (headProx > 0) {
                headProx = 0.125 * headProx * headProx;
            } else {
                headProx = - 0.5 * headProx * headProx;
            }
            targetCourse = Math.min(targetCourse, headProx);
            // enemy body nearby?
            targetCourse = Math.min(
                targetCourse, targetCourse + (enemyBodyOffsetDelta - 0.0625 * bot.snakeWidth) /
                bot.snakeWidth);
            // small tail?
            var tailBehind = bot.len - closePointT;
            var targetDir = canvas.unitVector({
                x: bot.opt.followCircleTarget.x - head.x,
                y: bot.opt.followCircleTarget.y - head.y
            });
            var driftQ = targetDir.x * closePointNormal.x + targetDir.y * closePointNormal.y;
            var allowTail = bot.snakeWidth * (2 - 0.5 * driftQ);
            // a line in the direction of the target point
            if (window.visualDebugging) {
                canvas.drawLine(
                    { x: head.x, y: head.y },
                    { x: head.x + allowTail * targetDir.x, y: head.y + allowTail * targetDir.y },
                    'red');
            }
            targetCourse = Math.min(
                targetCourse,
                (tailBehind - allowTail + (bot.snakeWidth - closePointDist)) /
                bot.snakeWidth);
            // far away?
            targetCourse = Math.min(
                targetCourse, - 0.5 * (closePointDist - 4 * bot.snakeWidth) / bot.snakeWidth);
            // final corrections
            // too fast in?
            targetCourse = Math.max(targetCourse, -0.75 * closePointDist / bot.snakeWidth);
            // too fast out?
            targetCourse = Math.min(targetCourse, 1.0);

            var goalDir = {
                x: closePointTangent.x * Math.cos(targetCourse) -
                    o * closePointTangent.y * Math.sin(targetCourse),
                y: closePointTangent.y * Math.cos(targetCourse) +
                    o * closePointTangent.x * Math.sin(targetCourse)
            };
            var goal = {
                x: head.x + goalDir.x * 4 * bot.snakeWidth,
                y: head.y + goalDir.y * 4 * bot.snakeWidth
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

        //Set the snake ID of the current bot. Should only be called once.
        setBotSnakeId: function () {
            if (bot.id === 0) {
                var id = window.snakes[0].id;
                window.log('Setting bot snake ID to: ' + id);
                bot.id = id;
            }
         },

        computeFoodGoal: function () {
            bot.foodAngles = [];

            for (var i = 0; i < window.foods.length && window.foods[i] !== null; i++) {
                var f = window.foods[i];
                f.clusterRatio = 0.001; // Initialize cluster ratio to .001.
                var totalClusterDistance = 0;
                var numberOfFoodsInRadius = 0;

                if (!f.eaten &&
                    !(
                        canvas.circleIntersect(
                            canvas.circle(f.xx, f.yy, 2),
                            bot.sidecircle_l) ||
                        canvas.circleIntersect(
                            canvas.circle(f.xx, f.yy, 2),
                            bot.sidecircle_r))

                            ) {
                            //calculate clustering index.
                            for (var j = 0; j < window.foods.length && window.foods[j] !== null; j++) {
                                var clusterFood = window.foods[j];
                                var distanceFromCurrentFood = Math.sqrt(Math.pow(f.xx - clusterFood.xx, 2) + Math.pow(f.yy - clusterFood.yy, 2));

                                //If food is close enough, then add distance to running tally and increment number of foods counted.
                                if (distanceFromCurrentFood <= bot.opt.foodClusterRadius && distanceFromCurrentFood > 0) {
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

                            bot.addFoodAngle(f);
                }
            }

            bot.foodAngles.sort(bot.sortScore);

            if (bot.foodAngles[0] !== undefined && bot.foodAngles[0].sz > 0) {
                bot.currentFood = { x: bot.foodAngles[0].x,
                                    y: bot.foodAngles[0].y,
                                    sz: bot.foodAngles[0].sz,
                                    da: bot.foodAngles[0].da };
            } else {
                bot.currentFood = { x: bot.MID_X, y: bot.MID_Y, sz: 0 };
            }
        },

        foodAccel: function () {
            var aIndex = 0;

            if (bot.currentFood && bot.currentFood.sz > bot.opt.foodAccelSz) {
                aIndex = bot.getAngleIndex(bot.currentFood.ang);

                if (
                    bot.collisionAngles[aIndex] && bot.collisionAngles[aIndex].distance >
                    bot.currentFood.distance + bot.snakeRadius * bot.opt.radiusMult
                    && bot.currentFood.da < bot.opt.foodAccelDa) {
                    return 1;
                }

                if (bot.collisionAngles[aIndex] === undefined
                    && bot.currentFood.da < bot.opt.foodAccelDa) {
                    return 1;
                }
            }

            return bot.defaultAccel;
        },

        toCircle: function () {
            for (var i = 0; i < window.snake.pts.length && window.snake.pts[i].dying; i++);
            const o = bot.opt.followCircleDirection;
            var tailCircle = canvas.circle(
                window.snake.pts[i].xx,
                window.snake.pts[i].yy,
                bot.headCircle.radius
            );

            if (window.visualDebugging) {
                canvas.drawCircle(tailCircle, 'blue', false);
            }

            window.setAcceleration(bot.defaultAccel);
            bot.changeHeadingRel(o * Math.PI / 32);

            if (canvas.circleIntersect(bot.headCircle, tailCircle)) {
                bot.stage = 'circle';
            }
        },

        every: function () {
            bot.MID_X = window.grd;
            bot.MID_Y = window.grd;
            bot.MAP_R = window.grd * 0.98;
            bot.MAXARC = (2 * Math.PI) / bot.opt.arcSize;

            if (bot.opt.followCircleTarget === undefined) {
                bot.opt.followCircleTarget = {
                    x: bot.MID_X,
                    y: bot.MID_Y
                };
            }

            bot.sectorBoxSide = Math.floor(Math.sqrt(window.sectors.length)) * window.sector_size;
            bot.sectorBox = canvas.rect(
                window.snake.xx - (bot.sectorBoxSide / 2),
                window.snake.yy - (bot.sectorBoxSide / 2),
                bot.sectorBoxSide, bot.sectorBoxSide);
            // if (window.visualDebugging) canvas.drawRect(bot.sectorBox, '#c0c0c0', true, 0.1);

            bot.cos = Math.cos(window.snake.ang);
            bot.sin = Math.sin(window.snake.ang);

            bot.speedMult = window.snake.sp / bot.opt.speedBase;
            bot.snakeRadius = bot.getSnakeWidth() / 2;
            bot.snakeWidth = bot.getSnakeWidth();
            bot.snakeLength = Math.floor(15 * (window.fpsls[window.snake.sct] + window.snake.fam /
                window.fmlts[window.snake.sct] - 1) - 5);

            bot.headCircle = canvas.circle(
                window.snake.xx + bot.cos * Math.min(1, bot.speedMult - 1) *
                bot.opt.radiusMult / 2 * bot.snakeRadius,
                window.snake.yy + bot.sin * Math.min(1, bot.speedMult - 1) *
                bot.opt.radiusMult / 2 * bot.snakeRadius,
                bot.opt.radiusMult / 2 * bot.snakeRadius
            );

            bot.sidecircle_r = canvas.circle(
                window.snake.lnp.xx -
                ((window.snake.lnp.yy + bot.sin * bot.snakeWidth) -
                    window.snake.lnp.yy),
                window.snake.lnp.yy +
                ((window.snake.lnp.xx + bot.cos * bot.snakeWidth) -
                    window.snake.lnp.xx),
                bot.snakeWidth * bot.speedMult
            );

            bot.sidecircle_l = canvas.circle(
                window.snake.lnp.xx +
                ((window.snake.lnp.yy + bot.sin * bot.snakeWidth) -
                    window.snake.lnp.yy),
                window.snake.lnp.yy -
                ((window.snake.lnp.xx + bot.cos * bot.snakeWidth) -
                    window.snake.lnp.xx),
                bot.snakeWidth * bot.speedMult
            );


            if (window.visualDebugging) {
                canvas.drawCircle(bot.headCircle, 'blue', false);
                canvas.drawCircle(bot.sidecircle_r, 'green', false);
                canvas.drawCircle(bot.sidecircle_l, 'green', false);
            }

        },

        // Main bot
        go: function () {
            bot.every();

            if (bot.snakeLength < bot.opt.followCircleLength) {
                bot.stage = 'grow';
            }

            if (bot.currentFood && bot.stage !== 'grow') {
                bot.currentFood = undefined;
            }

            if (bot.stage === 'circle' && !bot.isSelfCirclingEnabled) {
                window.setAcceleration(bot.defaultAccel);
                bot.followCircleSelf();
            } else if (bot.checkCollision() || bot.checkEncircle()) {
                if (bot.actionTimeout) {
                    window.clearTimeout(bot.actionTimeout);
                    bot.actionTimeout = window.setTimeout(
                        bot.actionTimer, 1000 / bot.opt.targetFps * bot.opt.collisionDelay);
                }
            } else {
                if (bot.snakeLength > bot.opt.followCircleLength) {
                    bot.stage = 'tocircle';
                }
                if (bot.actionTimeout === undefined) {
                    bot.actionTimeout = window.setTimeout(
                        bot.actionTimer, 1000 / bot.opt.targetFps * bot.opt.actionFrames);
                }
                window.setAcceleration(bot.foodAccel());
            }
        },

        // Timer version of food check
        actionTimer: function () {
            if (window.playing && window.snake !== null && window.snake.alive_amt === 1) {
                if (bot.stage === 'grow') {
                    bot.computeFoodGoal();
                    window.goalCoordinates = bot.currentFood;
                    canvas.setMouseCoordinates(canvas.mapToMouse(window.goalCoordinates));
                } else if (bot.stage === 'tocircle') {
                    bot.toCircle();
                }
            }
            bot.actionTimeout = undefined;
        }
    };
})(window);