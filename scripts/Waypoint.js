/*
 * Represents a point along a normalized orbit path.
 *
 * @param inpDelayTm:  Number of seconds to pause at this waypoint before moving to the next.
 * @param inpTargetTravelTm:  Number of seconds it should take to get from this point to the next.
 * @param inpPhiDegNbr:  Degrees this waypoint lies from the positive y-axis towards the positive z-axis. 
 * @param inpThetaDegNbr:  Degrees this waypoint lies from the positive z-axis towards the positive x-axis.
 * @param inpPathRotationAxis:  Optional. The axis to orbit around to the next waypoint (this is used to perform a slerp function
 *                              when our basic polar/aximuth lerp method creates undesired results -- e.g., the curved path that results
 *                              when lerping from angles (0,0) to (90, 90)). 
 * @param inpPathRotationDegNbr: Optional, to be set if the rotation axis is set. The number of degrees to rotate around the axis to the next 
 *                               waypoint.
 */
OrbitWaypoint = function (inpDelayTm, inpTargetTravelTm, inpPhiDegNbr, inpThetaDegNbr, inpPathRotationAxis, inpPathRotationDegNbr) {
    THREE.Vector3.call(this);

    this.delayMs = (inpDelayTm !== undefined) ? inpDelayTm * 1000 : 0;
    this.targetTravelMs = (inpTargetTravelTm !== undefined) ? inpTargetTravelTm * 1000 : 0;
    this.phiRadianNbr = (inpPhiDegNbr !== undefined) ? inpPhiDegNbr * Math.PI/180 : 0;
    this.thetaRadianNbr = (inpThetaDegNbr !== undefined) ? inpThetaDegNbr * Math.PI/180 : 0;
    this.phiAndThetaRadianNbrs = new THREE.Vector2(this.phiRadianNbr, this.thetaRadianNbr);
    this.pathRotationAxis = (inpPathRotationAxis !== undefined) ? inpPathRotationAxis : new THREE.Vector3(0, 1, 0);
    this.pathRotationRadianNbr = (inpPathRotationDegNbr !== undefined) ? Math.PI/180 * inpPathRotationDegNbr : 0;
    this.startQuat = null;
    this.endQuat = null;

    this.x = Math.sin(this.phiRadianNbr) * Math.sin(this.thetaRadianNbr);
    this.y = Math.cos(this.phiRadianNbr);
    this.z = Math.sin(this.phiRadianNbr) * Math.cos(this.thetaRadianNbr);

    this.normalize();

    if (inpPathRotationAxis !== undefined) {
        this.startQuat = new THREE.Quaternion();
        this.endQuat = new THREE.Quaternion();
        this.startQuat.setFromAxisAngle(this.pathRotationAxis, 0);
        this.endQuat.setFromAxisAngle(this.pathRotationAxis, this.pathRotationRadianNbr);
    }
};

/*
 * Inherit from THREE.Vector3
 */
OrbitWaypoint.prototype = Object.create( THREE.Vector3.prototype );



/*
 * Calculates the path to the next waypoint.
 *
 * @param inpNextWaypoint:  An OrbitWaypoint object representing the next waypoint in the path.
 */
OrbitWaypoint.prototype.CalcNormalizedPath = function(inpNextWaypoint) {

    this.startQuat.setFromEuler(this.clone().normalize());
    this.endQuat.setFromEuler(this.clone().normalize());
};