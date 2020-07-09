const LINE_DISTANCE = 6;
const DEFAULT_STOP_DIMEN = 10;
const UNITV = [0, -1];
const NODE_DISTANCE = 20;
const DIRS = {'n': 0, 'ne': 45};
const svgns = "http://www.w3.org/2000/svg";
var stationLines = {};
var lines = document.getElementById('lines').children;


for (var i=0; i<lines.length; i++) {
    var stops = lines[i].dataset.stops.split(' ');
    var path = [];
    var precedingStop = undefined;
    var precedingDir = undefined;
    var rightSide = true;
    for (var j=0; j<stops.length; j++) {
        if (stops[j][0] == '_') {
            rightSide = stops[j] == '_r';
            continue;
        }
        var stop = document.getElementById(stops[j]);
        var dir = DIRS[stop.dataset.dir];       
        
        var found = create(stop, getNextStopBaseCoord(stops, j, getStopBaseCoord(stop)), rightSide, path, lines[i], true);
    }
    var d = 'M' + path.join(' L');
    console.log(d);
    lines[i].setAttribute('d', d);
    
    console.log('line')
}

function getExistingLinesAtStation(stop) {
    if (stationLines[stop.id] == undefined) {
        stationLines[stop.id] = {x : [], y: []};
    }
    return stationLines[stop.id];
}

function create(stop, nextStopBaseCoord, rightSide, path, line, recurse) {
    var dir = DIRS[stop.getAttribute('data-dir')];
    var baseCoord = getStopBaseCoord(stop)
    var existingLinesAtStation = getExistingLinesAtStation(stop);
    var positionBoundaries = getPositionBoundaries(existingLinesAtStation);
    var newDir;
    var newCoord;
    if (path.length != 0) {
        var oldCoord = path[path.length-1];
        newDir = getStopOrientation(vdelta(oldCoord, nextStopBaseCoord), dir);
    } else {
        newDir = getStopOrientation(vdelta(nextStopBaseCoord, baseCoord), dir);
    }
    var newPos;
    if (newDir % 180 == 0) {
        newPos = getPosition(rightSide, positionBoundaries.x);
        newCoord = [newPos * LINE_DISTANCE, 0];
    } else {
        newPos = getPosition(rightSide, positionBoundaries.y);
        newCoord = [0, newPos * LINE_DISTANCE];
    }
    newCoord = rotate(newCoord, dir)
    newCoord = [baseCoord[0] + newCoord[0], baseCoord[1] + newCoord[1]];

    
    var found = true;
    if (path.length != 0) {
        var oldCoord = path[path.length-1];

        if (precedingDir == undefined) {
            precedingDir = addDeg(getStopOrientation(vdelta(newCoord, oldCoord), DIRS[precedingStop.dataset.dir]), DIRS[precedingStop.dataset.dir]);
        } else {
            precedingDir = addDeg(precedingDir, 180);
        }
        
        //var newDir = addDeg(dir, getStopOrientation(vdelta(oldCoord, newCoord), dir));
        var stationDir = addDeg(newDir, dir);
        found = insertNode(oldCoord, precedingDir, newCoord, stationDir);

        if (!found && recurse) {
            console.log('no easy solution found');
            var delta = vdelta(oldCoord, newCoord);
            var adjacent = [0,-Math.abs(delta[1])];

            var deg = (Math.sign(delta[0])*Math.acos(vscalar(adjacent, delta)/vlength(adjacent)/vlength(delta))*180/Math.PI);
            var intermediateDir = ((deg >= 0 ? Math.ceil(deg / 45) : Math.floor(deg / 45)) * 45);
            //Math.ceil((addDeg(precedingDir, 180) + newDir) / 90) * 45 + 45;
            //var intermediateCoord = vadd(oldCoord, vwithlength(vadd(rotateUnitV(addDeg(intermediateDir, 180)), rotateUnitV(precedingDir)), NODE_DISTANCE));
            var intermediateCoord = vadd(vwithlength(delta, vlength(delta)/2), newCoord);
            var helpStopId = 'h_' + precedingStop.id + '_' + stop.id;
            var helpStop = document.getElementById(helpStopId);
            if (helpStop == undefined) {
                helpStop = document.createElementNS(svgns, 'rect');
                helpStop.id = helpStopId;
                helpStop.setAttribute('data-dir', intermediateDir == 0 ? 'n' : 'ne');
                helpStop.className.baseVal = 'helper';
                helpStop.setAttribute('x', intermediateCoord[0]);
                helpStop.setAttribute('y', intermediateCoord[1]);
                document.getElementById('stations').appendChild(helpStop);
            }
            precedingDir = addDeg(precedingDir, 180);
            create(helpStop, nextStopBaseCoord, rightSide, path, line, false);
            create(stop, nextStopBaseCoord, rightSide, path, line, false);
            return;
        }
        precedingDir = stationDir;
    }
    existingLinesAtStation[newDir % 180 == 0 ? 'x' : 'y'].push({line: line.dataset.line, pos: newPos});
    var positionBoundaries = getPositionBoundaries(existingLinesAtStation);
    var stopDimen = [Math.max(positionBoundaries.x[1] - positionBoundaries.x[0], 0), Math.max(positionBoundaries.y[1] - positionBoundaries.y[0], 0)];
    
    stop.setAttribute('width', stopDimen[0] * LINE_DISTANCE + DEFAULT_STOP_DIMEN);
    stop.setAttribute('height', stopDimen[1] * LINE_DISTANCE + DEFAULT_STOP_DIMEN);    
    stop.setAttribute('transform','rotate(' + dir + ' ' + baseCoord[0] + ' ' + baseCoord[1] + ') translate(' + (Math.min(positionBoundaries.x[0], 0) * LINE_DISTANCE - DEFAULT_STOP_DIMEN / 2) + ',' + (Math.min(positionBoundaries.y[0], 0) * LINE_DISTANCE - DEFAULT_STOP_DIMEN / 2) + ')');

    path.push(newCoord);
    precedingStop = stop;
}



function getNextStopBaseCoord(stops, currentStopIndex, defaultCoord) {
    for (var j=currentStopIndex+1;j<stops.length;j++) {
        if (stops[j][0] == '_') {
            continue;
        }
        return getStopBaseCoord(document.getElementById(stops[j]));
    }
    return defaultCoord;
}

function getStopBaseCoord(stop) {
    if (stop == undefined)
        return [0, 0];
    return [parseInt(stop.getAttribute('x')), parseInt(stop.getAttribute('y'))];
}

function ensureDefault(number, def) {
    number = parseInt(number);
    if (isNaN(number)) {
        return def;
    }
    return number;
}

function getPosition(rightSide, positionBoundariesAtStationAxis) {
    return rightSide ? positionBoundariesAtStationAxis[1] + 1 : positionBoundariesAtStationAxis[0] - 1;
}

function getPositionBoundaries(existingLinesAtStation) {
    return {
        x: getPositionBoundariesForAxis(existingLinesAtStation.x),
        y: getPositionBoundariesForAxis(existingLinesAtStation.y)
    };
}

function getPositionBoundariesForAxis(existingLinesAtStationAxis) {
    if (existingLinesAtStationAxis.length == 0) {
        return [1, -1];
    }
    var left = 0;
    var right = 0;
    for (var i=0;i<existingLinesAtStationAxis.length;i++) {
        if (right < existingLinesAtStationAxis[i].pos) {
            right = existingLinesAtStationAxis[i].pos;
        }
        if (left > existingLinesAtStationAxis[i].pos) {
            left = existingLinesAtStationAxis[i].pos;
        }
    }
    return [left, right];
}

function rotate(coords, theta) {
    theta = theta / 180 * Math.PI;
    return [coords[0] * Math.cos(theta) - coords[1] * Math.sin(theta), coords[0] * Math.sin(theta) + coords[1] * Math.cos(theta)]
}

function rotateUnitV(theta) {
    return rotate(UNITV, theta);
}

function solveForAAndB(delta, v1, v2) {
    var swapZeroDivision = v2[1] == 0;
    var x = 0 ^ swapZeroDivision;
    var y = 1 ^ swapZeroDivision;
    var denominator = (v1[y]*v2[x]-v1[x]*v2[y]);
    if (denominator == 0) {
        return [NaN, NaN];
    }
    var a = (delta[x]*v2[y]-delta[y]*v2[x])/denominator;
    var b = (delta[y]+a*v1[y])/v2[y];
    return [a, b];
}

function vdelta(v1, v2) {
    return [v1[0]-v2[0], v1[1]-v2[1]];
}
function vlength(v) {
    return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2));
}
function vwithlength(v, length) {
    var ratio = length/vlength(v);
    return [v[0]*ratio, v[1]*ratio];
}
function vadd(v1, v2) {
    return [v1[0]+v2[0], v1[1]+v2[1]];
}
function vscalar(v1, v2) {
    return v1[0]*v2[0]+v1[1]*v2[1];
}

function getStopOrientation(delta, dir) {
    var deltaDir = Math.sign(delta[0])*Math.acos(-delta[1]/Math.sqrt(Math.pow(delta[0], 2) + Math.pow(delta[1], 2)));
    var deg = Math.floor((deltaDir*180/Math.PI-dir+45)/90)*90;
    return deg;
}

function insertNode(fromCoord, fromDir, toCoord, toDir) {
    var delta = vdelta(fromCoord, toCoord);
    var oldDirV = rotateUnitV(fromDir);
    var newDirV = rotateUnitV(toDir);
    console.log('dirs', oldDirV, newDirV);
    if (matchingParallel(0, fromCoord, toCoord, oldDirV, newDirV) || matchingParallel(1, fromCoord, toCoord, oldDirV, newDirV)) {
        return true;
    }
    //var a = (delta[0]*newDirV[1]-delta[1]*newDirV[0])/(oldDirV[1]*newDirV[0]-oldDirV[0]*newDirV[1]);
    var solution = solveForAAndB(delta, oldDirV, newDirV)
    console.log('slution', solution)
    if (solution[0] > 0 && solution[1] > 0) {
        path.push([fromCoord[0]+oldDirV[0]*solution[0], fromCoord[1]+oldDirV[1]*solution[0]]);
        console.log('virtual station', path[path.length-1])
        return newDirV;
    }
    return false;
}

function matchingParallel(axis, fromCoord, toCoord, oldDirV, newDirV) {
    return fromCoord[axis] == toCoord[axis] && oldDirV[axis] == 0 && newDirV[axis] == 0
}

function addDeg(a, b) {
    //TODO attention -10 % 360 != 350
    return (a % 360 + b % 360) % 360;
}