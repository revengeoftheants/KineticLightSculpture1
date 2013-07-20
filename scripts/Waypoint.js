/*
 * Represents a point along a normalized orbit path.
 *
 * @param inpTargetTravelTm:  Number of seconds it should take to get from this point to the next.
 * @param inpDelayTm:  Number of seconds to pause at this waypoint before moving to the next.
 * @param inpThetaDegNbr:  Degrees this waypoint lies from the positive z-axis towards the positive x-axis.
 * @param inpPhiDegNbr:  Degrees this waypoint lies from the positive y-axis towards the positive z-axis. 
 */
OrbitWaypoint = function (inpTargetTravelTm, inpDelayTm, inpThetaDegNbr, inpPhiDegNbr) {
    THREE.Vector3.call(this);

    this.targetTravelMs = (inpTargetTravelTm !== undefined) ? inpTargetTravelTm * 1000 : 0;
    this.delayMs = (inpDelayTm !== undefined) ? inpDelayTm * 1000 : 0;
    this.thetaRadianNbr = (inpThetaDegNbr !== undefined) ? inpThetaDegNbr * Math.PI/180 : 0;
    this.phiRadianNbr = (inpPhiDegNbr !== undefined) ? inpPhiDegNbr * Math.PI/180 : 0;
    this.pathAxisOfRotation = null;
    this.startQuat = new THREE.Quaternion();
    this.endQuat = new THREE.Quaternion();

    // Note: We want to limit the precision of our positions.
    this.x = parseFloat((Math.sin(this.phiRadianNbr) * Math.sin(this.thetaRadianNbr)).toFixed(5));
    this.y = parseFloat((Math.cos(this.phiRadianNbr)).toFixed(5));
    this.z = parseFloat((Math.sin(this.phiRadianNbr) * Math.cos(this.thetaRadianNbr)).toFixed(5));
};

/*
 * Inherit from THREE.Vector3
 */
OrbitWaypoint.prototype = Object.create( THREE.Vector3.prototype );



/*
 * Calculates the path to the next waypoint.
 *
 * @param inpNextWaypoint:  An Orbitwaypoint object representing the next waypoint in the path.
 */
OrbitWaypoint.prototype.CalcNormalizedPath = function(inpNextWaypoint) {
    this.pathAxisOfRotation = this.clone().cross(inpNextWaypoint).normalize();

    this.startQuat.setFromAxisAngle(this.pathAxisOfRotation, 0);
    this.endQuat.setFromAxisAngle(this.pathAxisOfRotation, this.angleTo(inpNextWaypoint));
};