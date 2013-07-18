/*
 * Path waypoint.
 *
 * @param inpXCoordNbr: The X coordinate.
 * @param inpYCoordNbr: The Y coordinate.
 * @param inpZCoordNbr: The Z coordinate.
 * @param inpTimeFromCurrPointMs: Number of milliseconds it should take to get from the current point to this point.
 * @param inpPauseMs: Number of milliseconds to pause at this waypoint.
 */
Waypoint = function (inpXCoordNbr, inpYCoordNbr, inpZCoordNbr, inpTimeFromCurrPointMs, inpPauseMs) {
    THREE.Vector3.call( this, inpXCoordNbr, inpYCoordNbr, inpZCoordNbr );

    this.timeFromPrevPointMs = inpTimeFromCurrPointMs || 0;
    this.pauseMs = inpPauseMs || 0;
    this.pausedElapsedMs = 0;
    this.quaternion = new THREE.Quaternion;
};

/*
 * Inherit from THREE.Vector3
 */
Waypoint.prototype = Object.create( THREE.Vector3.prototype );