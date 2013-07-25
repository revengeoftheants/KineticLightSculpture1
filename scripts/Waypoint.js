/*
 * Represents a point along a path.
 *
 * @param inpDelayTm:  Number of seconds to pause at this waypoint before moving to the next.
 * @param inpTargetTravelTm:  Number of seconds it should take to get from this point to the next.
 * @param inpPhiDegNbr:  Degrees this waypoint lies from the positive y-axis towards the positive z-axis. 
 * @param inpThetaDegNbr:  Degrees this waypoint lies from the positive z-axis towards the positive x-axis.
 * @param inpLookAtPos:  Vector3 object representing the position in world space to look at.
 */
Waypoint = function(inpDelayTm, inpTargetTravelTm, inpPhiDegNbr, inpThetaDegNbr) {
    THREE.Vector3.call(this);

    this.delayMs = (inpDelayTm !== undefined) ? inpDelayTm * 1000 : 0;
    this.targetTravelMs = (inpTargetTravelTm !== undefined) ? inpTargetTravelTm * 1000 : 0;
    this.phiRadianNbr = (inpPhiDegNbr !== undefined) ? inpPhiDegNbr * Math.PI/180 : 0;
    this.thetaRadianNbr = (inpThetaDegNbr !== undefined) ? inpThetaDegNbr * Math.PI/180 : 0;
    this.phiAndThetaRadianNbrs = new THREE.Vector2(this.phiRadianNbr, this.thetaRadianNbr);

    this.x = Math.sin(this.phiRadianNbr) * Math.sin(this.thetaRadianNbr);
    this.y = Math.cos(this.phiRadianNbr);
    this.z = Math.sin(this.phiRadianNbr) * Math.cos(this.thetaRadianNbr);

    this.orientationStartQuats = [];
    this.orientationEndQuats = [];
    this.orientationTweens = [];
    this.currOrientationIdx = 0;
    this.orientationTweensStartedInd = false;
    this.camOrientationAtTweenStart = null;

    /*
    this.orientationTween = null;
    this.orientationStartQuat = null;
    this.orientationEndQuat = null;
    */
};

// Inherit from THREE.Vector3
Waypoint.prototype = Object.create( THREE.Vector3.prototype );

/*
 * Sets the orientation change that should affect the camera along this path.
 *
 * @param inpRotationAxis:  A Vector3 object representing the axis to rotate around.
 * @param inpRotationDegNbr:  The number of degrees to rotate around this axis.
 * @param inpOrientationTween:  The Tween object to handle the interpolation from the start orientation to the end orientation.
 *                              NOTE: If there is a prior Tween, this one will get chained to it.
 */
Waypoint.prototype.AddOrientationTween = function(inpRotationAxis, inpRotationDegNbr, inpOrientationTween) {
    var orientationStartQuat = new THREE.Quaternion();
    orientationStartQuat.setFromAxisAngle(inpRotationAxis, 0);
    this.orientationStartQuats.push(orientationStartQuat);

    var orientationEndQuat = new THREE.Quaternion();
    orientationEndQuat.setFromAxisAngle(inpRotationAxis, inpRotationDegNbr * Math.PI/180);
    this.orientationEndQuats.push(orientationEndQuat);
    this.orientationTweens.push(inpOrientationTween);

    if (this.orientationTweens.length - 2 >= 0) {
        this.orientationTweens[this.orientationTweens.length - 2].chain(inpOrientationTween);
    }
};



/*
 * Represents a point along a normalized orbit path.
 *
 * @param inpDelayTm:  Number of seconds to pause at this waypoint before moving to the next.
 * @param inpTargetTravelTm:  Number of seconds it should take to get from this point to the next.
 * @param inpPhiDegNbr:  Degrees this waypoint lies from the positive y-axis towards the positive z-axis. 
 * @param inpThetaDegNbr:  Degrees this waypoint lies from the positive z-axis towards the positive x-axis.
 * @param inpLookAtPos:  Vector3 object representing the position in world space to look at.
 * @param inpPathRotationAxis:  Optional. The axis to orbit around to the next waypoint (this is used to perform a slerp function
 *                              when our basic polar/aximuth lerp method creates undesired results -- e.g., the curved path that results
 *                              when lerping from angles (0,0) to (90, 90)). 
 * @param inpPathRotationDegNbr:  Optional, to be set if the rotation axis is set. The number of degrees to rotate around the axis to the next 
 *                                  waypoint.
 */
OrbitWaypoint = function (inpDelayTm, inpTargetTravelTm, inpPhiDegNbr, inpThetaDegNbr, inpPathRotationAxis, inpPathRotationDegNbr) {
    Waypoint.call(this, inpDelayTm, inpTargetTravelTm, inpPhiDegNbr, inpThetaDegNbr);

    this.normalize();

    this.pathRotationAxis = null;
    this.pathRotationRadianNbr = (inpPathRotationDegNbr !== undefined) ? inpPathRotationDegNbr * Math.PI/180 : 0;
    this.orbitStartQuat = null;
    this.orbitEndQuat = null;

    if (inpPathRotationAxis !== undefined) {
        this.pathRotationAxis = inpPathRotationAxis;
        this.orbitStartQuat = new THREE.Quaternion();
        this.orbitEndQuat = new THREE.Quaternion();
        this.orbitStartQuat.setFromAxisAngle(this.pathRotationAxis, 0);
        this.orbitEndQuat.setFromAxisAngle(this.pathRotationAxis, this.pathRotationRadianNbr);
    }
};

// Inherit from Waypoint
OrbitWaypoint.prototype = Object.create( Waypoint.prototype );





/*
 * Represents a point along a linear path.
 *
 * @param inpDelayTm:  Number of seconds to pause at this waypoint before moving to the next.
 * @param inpTargetTravelTm:  Number of seconds it should take to get from this point to the next.
 * @param inpPhiDegNbr:  Degrees this waypoint lies from the positive y-axis towards the positive z-axis. 
 * @param inpThetaDegNbr:  Degrees this waypoint lies from the positive z-axis towards the positive x-axis.
 */
LinearWaypoint = function(inpDelayTm, inpTargetTravelTm, inpPhiDegNbr, inpThetaDegNbr) {
    Waypoint.call(this, inpDelayTm, inpTargetTravelTm, inpPhiDegNbr, inpThetaDegNbr);

    this.normalize();
};

// Inherit from Waypoint
LinearWaypoint.prototype = Object.create( Waypoint.prototype );