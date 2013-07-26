/*
 * Creates a kinetic sculpture comprised of lights.
 *
 *
 * This uses a Self-Executing Anonymous Function to declare the namespace "Main" and create public and private members within in.
 *
 * @author Kevin Dean
 *
 * Note: By far the most resource-intensive part of this application is looping through the lights and patterns. That section drops it from close
 *			to 60fps to 30fps. Performing the audio analysis and animating the lights, both the area lights
 *			and the geometry faces, all have no real effect on FPS.
 */

/*
 * @param Main: Defines the namespace to use for public members of this class.
 * @param $: The shorthand to use for jQuery.
 * @param undefined: Nothing should be passed via this parameter. This ensures that you can use "undefined" here without worrying that another loaded
 *						script as redefined the global variable "undefined".
 */
(function(Main, $, undefined) {

	/**********************
	 * Constants
	 **********************/
	var SCALE = 1;
	var CAM = {ORBIT_RADIUS_NBR: 180, FOV_ANGLE_NBR: 46, NEAR_PLANE_NBR: 1, FAR_PLANE_NBR: 5000, LOOK_AT_POS: new THREE.Vector3(0, 45, 0)};
	// Keep the number of lights low because they are expensive for the GPU to calculate
	var LIGHT_NBRS = {ROWS: 13, COLS: 38, SRC_INTRVL: 34, WIDTH: 3, HEIGHT: 3, DEPTH: 0.5, MARGIN: 1, EMITTER_FACE: 3, MIN_HEIGHT: 65};
	var LIGHT_CNT = LIGHT_NBRS.ROWS * LIGHT_NBRS.COLS;
	var LIGHTS_LEFT_STRT_COORD_NBR = -(LIGHT_NBRS.COLS * (LIGHT_NBRS.WIDTH + LIGHT_NBRS.MARGIN))/2 + LIGHT_NBRS.MARGIN;
	var LIGHTS_FAR_STRT_COORD_NBR = -(LIGHT_NBRS.ROWS * (LIGHT_NBRS.HEIGHT + LIGHT_NBRS.MARGIN))/2 + LIGHT_NBRS.MARGIN;
	var LIGHT_CLRS = {ON: new THREE.Color(0xE5D9CA), OFF: new THREE.Color(0x090909)};   // ON: new THREE.Color(0xFFF1E0)
	var LIGHT_INTENSITY_NBRS = {START: 0.0, MAX: 4, HEMI: 0.2};
	var ROOM_NBRS = {WIDTH: 800, DEPTH: 600, HEIGHT: 80};
	var TORUS_KNOT_NBRS = {KNOT_RADIUS: 10, TUBE_RADIUS: 1.5, RADIAL_SEGMENTS: 11, TUBE_SEGMENTS: 30, COPRIME_INT_P: 2, COPRIME_INT_Q: 3};
	var SCULPTURE_ROTATE_NBRS = {MAX_SPEED: 1, START_LERP_TM: 8, START_LERP_TM_MS: 8000, END_LERP_TM_MS: 33000};
	var ROLLING_AVG_NBRS = {SAMPLES_CNT: 20};

	var SOUNDCLOUD = {CLIENT_ID: "ace41127a1d0a4904d5e548447130eee", TRACK_ID: 17889996};

	// For patterns
	var PATTERN_NBRS = {MIN_SPEED: 1.5, MAX_SPEED: 7, MAX_SPEED_SCALE: 1.3, MAX_INTENSITY_INCRMNT_RATIO: 0.1, START_POSITION_ARC_RADIUS: 100, MAX_CNT: 8};
	var PATTERN_ID_PROP_TXT = "patternId";
	var BOX_NBRS = {MIN_HEIGHT: 20, MIN_WIDTH: 20, MIN_DEPTH: 20, MAX_HEIGHT: 100, MAX_WIDTH: 100, MAX_DEPTH: 100};
	var SPHERE_NBRS = {MIN_RADIUS: 25, MAX_RADIUS: 75};


	/**********************
	 * Global variables
	 **********************/
	var _camera, _scene, _stats, _clock, _delta, _currTm, _animationFrameId, firstFrameInd = true;
	var	_cameraControls, _effectController;
	var _canvasWidth = window.innerWidth, _canvasHeight = window.innerHeight;
	var _lightSources = [], _lightEmitterGeoms = [], _lights = [], _lightCasingFaceGeom, _lightCasingSideGeom, _lightCasingGeom, _lightCasingMat, _universalCasingMesh;
	var _lightHeightNbr, _lightHeightDirNbr, _lightHeightChgIncrmntNbr;
	var _availablePatterns = [], _activePatterns = [];
	var _patternIdCnt = 0, _patternReleaseInd = false, _prevPatternReleaseTm = 0;
	var _torusKnot;
	var _sculptureRotateInd = false, _sculptureElapsedRotationDstncNbr = 0, _sculptureElapsedLerpTm = 0;
	var _rollingAvgBeatLvLs = [ROLLING_AVG_NBRS.SAMPLES_CNT], _rollingAvgBeatLvlNbr = 0;
	var _audioTrack;
	var _camPathWaypointsSeq = [], _currWaypointIdx = 0, _waypointTweens = [], _currCamPathTweenDat = {interpolantNbr: 0}, _currCamOrientTweenDat = {interpolantNbr: 0};
	var _camOrbitTranslationMatrix = new THREE.Matrix4();




	/**********************
	 * Public methods
	 **********************/


	/*
	 * Initializes SoundManager2, which needs to happen before the DOM is ready because that is when SM2 applies configuration and starts up.
	 */
	Main.InitAudio = function() {
		soundManager.setup( { url: "/flash/", flashVersion: 9, debugFlash: false, debugMode: false, useHTML5Audio: false, preferFlash: false, flashLoadTimeout: 10000, useHighPerformance: true } );
	};



	/*
	 * Determines if the user's browser and machine are WebGL-capable.
	 */
	Main.CheckCompatibility = function() {
		var compatibleInd = true;

		if (Detector.webgl === false) {
			Detector.addGetWebGLMessage();
			compatibleInd = false;
		} else if (Detector.chrome === false) {
			Detector.addGetChromeMessage();
			compatibleInd = false;
		}

		return compatibleInd;
	};


	/*
	 * Initializes the scene.
	 */
	Main.InitScene = function() {

		try {
			/*
			_debugCanvas = WebGLDebugUtils.makeLostContextSimulatingCanvas(document.createElement('canvas'));
			//debugCanvas.loseContextInNCalls(5);
			window.addEventListener("mousedown", function() {
										_debugCanvas.loseContext();
										}, false);

			var gl = _debugCanvas.getContext("experimental-webgl");
			*/
			
			
			initRenderer();
			initSceneAndCamera();
			initLights();
			initStats();
			initGUI();
			addRoom();
			addSceneObjs();
			initPatterns();
			loadAudio();
			
			addContextLostListener();
			_rollingAvgBeatLvLs = initArray(_rollingAvgBeatLvLs, 0);

			
			$(window).load( function() {
				animate();
			});
		} catch ( error ) {

			$(container).innerHTML = "There was a problem with WebGL. Please reload the page.";
		}
	};




	/**********************
	 * Private methods
	 **********************/


	/*
	 * Initializes the Stats window.
	 */
	function initStats() {
		_stats = new Stats();
		_stats.domElement.style.position = "absolute";
		_stats.domElement.style.top = "8px";
		_stats.domElement.style.zIndex = 100;
		container.appendChild(_stats.domElement);
	}


	/*
	 * Initializes the renderer.
	 */
	function initRenderer() {

		_renderer = new THREE.WebGLDeferredRenderer( { antialias: true, scale: SCALE, brightness: 5, tonemapping: THREE.FilmicOperator } );
		//_renderer = new THREE.WebGLRenderer( { antialias: true, scale: SCALE } );

		_renderer.setSize(_canvasWidth, _canvasHeight);  // Cannot set size via constructor parameters for WebGL_renderer.

		// Gamma correction
		_renderer.gammaInput = true;
		_renderer.gammaOutput = true;
		
		_renderer.shadowMapEnabled = true;  // Shadows are enabled.

		var container = document.getElementById('container');
		container.appendChild( _renderer.domElement );
	}


	/*
	 * Initializes the camera and scene.
	 */
	function initSceneAndCamera() {
		_scene = new THREE.Scene();
		_clock = new THREE.Clock();

		var tweenInterpolateDat = {interpolantNbr: 1};
		var xRotationAxis = new THREE.Vector3(1, 0, 0);
		var yRotationAxis = new THREE.Vector3(0, 1, 0);
		var zRotationAxis = new THREE.Vector3(0, 0, 1);

		// Create waypoints for the camera's path.

		// We will use a quaternion slerp to get from point0 to point1 because Euler rotations produce a curved path from deg (0,0) to (90, 90).
		//var point0 = new OrbitWaypoint(0, 21, 0, 0, new THREE.Vector3(0, 0, -1), 90);

		var point0 = new OrbitWaypoint(0, 21, 0.1, 0);
		var point1 = new OrbitWaypoint(0, 23, 90, 90);  // No delay at point1 is best because of hurry to get to point2.
		// Arrive at point2 at 0:44 to match first major beat. Depart from point2 at 1:18, which is the song's next stage. Get to point4 at 2:18.
		var point2 = new OrbitWaypoint(34, 25, 103, -76);
		var point3 = new OrbitWaypoint(10, 25, 103, -180);
		// Ensure this rotation angle matches the location of the next waypoint.
		var point4 = new OrbitWaypoint(15, 10, 103, -270, new THREE.Vector3(0, 0, -1), -17);
		var point5 = new LinearWaypoint(0, 55, 86, -270);

		var xOrientTween = new TWEEN.Tween(_currCamOrientTweenDat).to(tweenInterpolateDat, 10000);
		xOrientTween.delay(10000);
		xOrientTween.easing(TWEEN.Easing.Quadratic.InOut);
		xOrientTween.onStart(handleTweenOrientStart);
		xOrientTween.onUpdate(handleTweenOrientUpdate);
		xOrientTween.onComplete(handleTweenOrientCompletion);
		var yOrientTween = new TWEEN.Tween(_currCamOrientTweenDat).to(tweenInterpolateDat, 10000);
		yOrientTween.delay(10000);
		yOrientTween.easing(TWEEN.Easing.Quadratic.InOut);
		yOrientTween.onStart(handleTweenOrientStart);
		yOrientTween.onUpdate(handleTweenOrientUpdate);
		yOrientTween.onComplete(handleTweenOrientCompletion);
		var xOrientTween2 = new TWEEN.Tween(_currCamOrientTweenDat).to(tweenInterpolateDat, 10000);
		xOrientTween2.delay(0);
		xOrientTween2.easing(TWEEN.Easing.Quadratic.InOut);
		xOrientTween2.onStart(handleTweenOrientStart);
		xOrientTween2.onUpdate(handleTweenOrientUpdate);
		xOrientTween2.onComplete(handleTweenOrientCompletion);
		
		// Orient the camera straight up and down, turn 180 degrees, and point the camera back down at the target.
		point5.AddOrientationTween(xRotationAxis, 4, xOrientTween);
		point5.AddOrientationTween(yRotationAxis, 180, yOrientTween);
		point5.AddOrientationTween(xRotationAxis, -4, xOrientTween2);

		var point6 = new OrbitWaypoint(5, 45, 86, -90);
		var point7 = new OrbitWaypoint(0, 0, 0.1, 0);

		// Create a sequence of waypoints
		_camPathWaypointsSeq = [point0, point1, point2, point3, point4, point5, point6, point7];

		for (var idx = 0, pointCnt = _camPathWaypointsSeq.length; idx < pointCnt; idx++) {
			var thisPoint = _camPathWaypointsSeq[idx];
			var thisTween = new TWEEN.Tween(_currCamPathTweenDat).to(tweenInterpolateDat, thisPoint.targetTravelMs);
			thisTween.delay(thisPoint.delayMs);
			thisTween.easing(TWEEN.Easing.Quadratic.InOut);
			thisTween.onUpdate(handleTweenPathUpdate);
			thisTween.onComplete(handleTweenPathSegmentCompletion);
			_waypointTweens.push(thisTween);

			if (idx > 0) {
				_waypointTweens[idx - 1].chain(thisTween);
			}
		}


		// Create the camera itself
		_camera = new THREE.PerspectiveCamera(CAM.FOV_ANGLE_NBR, _canvasWidth / _canvasHeight, CAM.NEAR_PLANE_NBR, CAM.FAR_PLANE_NBR);

		// We need this translation matrix because all the orbit calculations we do use the origin as the center of the orbit.
		_camOrbitTranslationMatrix.makeTranslation(CAM.LOOK_AT_POS.x, CAM.LOOK_AT_POS.y, CAM.LOOK_AT_POS.z);

		var camStartPos = point0.clone();  // The normalized position.
		camStartPos.multiplyScalar(CAM.ORBIT_RADIUS_NBR);  // Multiply the normalized camera position by the camera's orbit radius
		camStartPos.applyMatrix4(_camOrbitTranslationMatrix);  // Translate the position from the origin to the orbit center (i.e. the look-at position)
		_camera.position.copy(camStartPos);
		_camera.lookAt(CAM.LOOK_AT_POS);
		_camera.useQuaternion = true;
		_camera.rotationAutoUpdate = true;  // This is set to true by default. It forces the rotationMatrix to get calculated each frame.
		_scene.add(_camera);

		_cameraControls = new THREE.OrbitAndPanControls(_camera, _renderer.domElement);
		_cameraControls.target.copy(CAM.LOOK_AT_POS);
		_cameraControls.noPan = true;  // Don't let the user pan the camera. We want to control the target.
		_cameraControls.noRotate = false;
		//_cameraControls.autoRotate = true;

		_scene.fog = new THREE.FogExp2( 0xefd1b5, 0.0025 );
	}


	/*
	 * Initializes all of the lights.
	 */
	function initLights() {
		//AmbientLight is not currently supported in WebGLDeferred_renderer, so we are using a directional light instead.
		//_scene.add(new THREE.AmbientLight(0xFFFFFF));

		var hemisphereLight = new THREE.HemisphereLight(LIGHT_CLRS.ON.getHex(), LIGHT_CLRS.ON.getHex(), LIGHT_INTENSITY_NBRS.HEMI);
		_scene.add(hemisphereLight);


		// Create a 5-sided box to represent the case for each sculpture light. We only need a single case geometry for all of these lights
		// because these cases will be static (i.e., we won't alter their face colors or anything like that).
		_lightCasingFaceGeom = new THREE.PlaneGeometry(LIGHT_NBRS.WIDTH, LIGHT_NBRS.HEIGHT, 1, 1);
		_lightCasingSideGeom = new THREE.PlaneGeometry(LIGHT_NBRS.WIDTH, LIGHT_NBRS.DEPTH, 1, 1);

		var matrix = new THREE.Matrix4();

		var lightCasingTopGeom = _lightCasingFaceGeom.clone();
		lightCasingTopGeom.applyMatrix( matrix.makeRotationX(180 * Math.PI/180) );
		lightCasingTopGeom.applyMatrix( matrix.makeTranslation(0, 0, -LIGHT_NBRS.DEPTH/2) );

		var lightCasingSide0Geom = _lightCasingSideGeom.clone();
		lightCasingSide0Geom.applyMatrix( matrix.makeRotationX(90 * Math.PI/180) );
		lightCasingSide0Geom.applyMatrix( matrix.makeRotationZ(90 * Math.PI/180) );
		lightCasingSide0Geom.applyMatrix( matrix.makeTranslation(LIGHT_NBRS.WIDTH/2, 0, 0) );

		var lightCasingSide1Geom = _lightCasingSideGeom.clone();
		lightCasingSide1Geom.applyMatrix( matrix.makeRotationX(90 * Math.PI/180) );
		lightCasingSide1Geom.applyMatrix( matrix.makeRotationZ(-90 * Math.PI/180) );
		lightCasingSide1Geom.applyMatrix( matrix.makeTranslation(-LIGHT_NBRS.WIDTH/2, 0, 0) );

		var lightCasingSide2Geom = _lightCasingSideGeom.clone();
		lightCasingSide2Geom.applyMatrix( matrix.makeRotationX(-90 * Math.PI/180) );
		lightCasingSide2Geom.applyMatrix( matrix.makeTranslation(0, LIGHT_NBRS.WIDTH/2, 0) );

		var lightCasingSide3Geom = _lightCasingSideGeom.clone();
		lightCasingSide3Geom.applyMatrix( matrix.makeRotationX(90 * Math.PI/180) );
		lightCasingSide3Geom.applyMatrix( matrix.makeTranslation(0, -LIGHT_NBRS.WIDTH/2, 0) );


		_lightCasingGeom = new THREE.Geometry();
		THREE.GeometryUtils.merge(_lightCasingGeom, lightCasingTopGeom);
		THREE.GeometryUtils.merge(_lightCasingGeom, lightCasingSide0Geom);
		THREE.GeometryUtils.merge(_lightCasingGeom, lightCasingSide1Geom);
		THREE.GeometryUtils.merge(_lightCasingGeom, lightCasingSide2Geom);
		THREE.GeometryUtils.merge(_lightCasingGeom, lightCasingSide3Geom);


		// NOTE: Set the mesh ambient and diffuse colors to the full intensity of the lights they represent; otherwise, they will not glow.
		_lightCasingMat = new THREE.MeshBasicMaterial( {color: LIGHT_CLRS.ON.getHex(), ambient: LIGHT_CLRS.ON.getHex(), vertexColors: THREE.FaceColors} );

		// Set the faces to the desired "off" color and set colorsNeedUpdate to true. This will cause the lights to appear off upon first render.
		for (var idx = 0, cnt = _lightCasingGeom.faces.length; idx < cnt; idx++) {
			_lightCasingGeom.faces[idx].color.setHex(LIGHT_CLRS.OFF.getHex());
		}

		_lightCasingGeom.colorsNeedUpdate = true;


		// Create sculpture lights
		for (var i = 0; i < LIGHT_NBRS.ROWS; i++) {
			for (var j = 0; j < LIGHT_NBRS.COLS; j++) {
				crteSculptureLight(i, j);
			}
		}
	}


	/*
	 * Initializes the GUI pane.
	 */
	function initGUI() {
		var gui = new dat.GUI();

		_effectController = {
			intensity: LIGHT_INTENSITY_NBRS.START,
			muteInd: false,
			patternCnt: 3
		};

		//gui.add(_effectController, "intensity", 0.00, 1.00).step(0.01).onChange(onParmsChange);
		gui.add(_effectController, "muteInd").name("No Music");
		gui.add(_effectController, "patternCnt", 0, PATTERN_NBRS.MAX_CNT).step(1).name("Pattern Count");
	}


	/*
	 * Creates a light for the sculpture.
	 *
	 * @param inpLightRowIdx: The index of this light's row.
	 * @param inpLightColIdx: The index of this light's column.
	 */
	function crteSculptureLight(inpLightRowIdx, inpLightColIdx) {

		var lightIdx = inpLightRowIdx * LIGHT_NBRS.COLS + inpLightColIdx;

		var lightSrc = new THREE.AreaLight(LIGHT_CLRS.ON.getHex(), LIGHT_INTENSITY_NBRS.START);
		_lightSources[lightIdx] = lightSrc;
		//lightSrc = new THREE.SpotLight(LIGHT_CLRS.ON.getHex(), sculptureLightIntensityNbr, 250);
		lightSrc.angle = Math.PI/2;  // Should not go past PI/2.
		lightSrc.castShadow = true;
		lightSrc.shadow_cameraNear = 0.1;  // Set the near plane for the shadow _camera frustum as close to the light as  possible.
		lightSrc.shadow_cameraFov = 130;  // Default is 50.
		lightSrc.shadow_cameraVisible = false;  // Does not apply to WebGLDeferred_renderer.

		var lightXCoordNbr = LIGHTS_LEFT_STRT_COORD_NBR + (inpLightColIdx * (LIGHT_NBRS.WIDTH + LIGHT_NBRS.MARGIN));
		var lightZCoordNbr = LIGHTS_FAR_STRT_COORD_NBR + (inpLightRowIdx * (LIGHT_NBRS.HEIGHT + LIGHT_NBRS.MARGIN));


		// Create a sine wave that transposes itself as the row number increases.
		// To make a more organic shape (i.e., get rid of diagonal peaks and troughs), create another sine wave that is influenced more by the column number.
		// Note: All of these numbers are rather arbitrary.
		_lightHeightNbr = (Math.sin(185 * ((inpLightRowIdx + inpLightColIdx) * 0.53)/360) * 3.3) + 
							(Math.sin(210 * ((inpLightRowIdx + (inpLightColIdx * 2.8)) * 0.45)/360) * 1.5) +
							LIGHT_NBRS.MIN_HEIGHT;

		lightSrc.position.set(lightXCoordNbr, _lightHeightNbr, lightZCoordNbr);
		lightSrc.width = 1;
		lightSrc.height = 1;


		// Having many lights in a _scene is expensive so we will only add a light source at a certain interval.
		if (lightIdx % LIGHT_NBRS.SRC_INTRVL === 0) {
			_scene.add(lightSrc);
		}


		var matrix = new THREE.Matrix4();

		// The emitter face cannot be reused across light objects because we will update each light's emitter face color independently.
		var lightEmitterFaceGeom = _lightCasingFaceGeom.clone();
		lightEmitterFaceGeom.applyMatrix( matrix.makeTranslation(0, 0, LIGHT_NBRS.DEPTH/2) );

		// Add new properties to the light geometry
		lightEmitterFaceGeom.lightIntensityRatioNbr = 0;  // Range of 0-1 of how intensely this light is shining at this time.
		_lightEmitterGeoms[lightIdx] = lightEmitterFaceGeom;

		// Set the faces to the desired "off" color and set colorsNeedUpdate to true. This will cause the lights to appear off upon first render.
		lightEmitterFaceGeom.faces[0].color.setHex(LIGHT_CLRS.OFF.getHex());
		lightEmitterFaceGeom.colorsNeedUpdate = true;		

		var lightCasingMesh = new THREE.Mesh(_lightCasingGeom, _lightCasingMat);
		var lightEmitterMesh = new THREE.Mesh(lightEmitterFaceGeom, _lightCasingMat);
		lightCasingMesh.receiveShadow = lightCasingMesh.castShadow = lightEmitterMesh.receiveShadow = lightEmitterMesh.castShadow = true;

		// FOR TESTING
		//lightEmitterFaceGeom.faces[0].color.setHex(LIGHT_CLRS.ON.getHex());
		//lightEmitterFaceGeom.colorsNeedUpdate = true;
		
		var lightObj = new THREE.Object3D();
		lightObj.add(lightCasingMesh);
		lightObj.add(lightEmitterMesh);
		lightObj.position = lightSrc.position;
		lightObj.rotation.set(90 * Math.PI/180, 0, 0);
		lightObj.scale = lightSrc.scale;

		_scene.add(lightObj);

		_lights[lightIdx] = lightObj;
	}



	/*
	 * Creates the 3D space around the sculpture.
	 */
	function addRoom() {
		var floorMap = THREE.ImageUtils.loadTexture( "textures/Ground_Concrete.jpg" );
		floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
		floorMap.repeat.set(Math.round(ROOM_NBRS.WIDTH/100), Math.round(ROOM_NBRS.DEPTH/100));
		floorMap.anisotropy = 4;

		// The lower the specular value is, the less shiny the material will be. The closer it is to the diffuse color, the more it will look like metal.
		var concreteMat = new THREE.MeshPhongMaterial({color: 0x808080, ambient: 0xFFFFFF, specular: 0x141414, shininess: 05, map: floorMap, bumpMap: floorMap, bumpScale: 0.25});
		var floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_NBRS.WIDTH, ROOM_NBRS.DEPTH), concreteMat);
		//floor.rotation.y = Math.PI;  // The repetition of the pattern is less obvious from the side.
		floor.rotation.x = -Math.PI/2;
		floor.receiveShadow = true;
		_scene.add(floor);

		/*
		var longWallGeom = new THREE.PlaneGeometry(ROOM_NBRS.WIDTH, ROOM_NBRS.HEIGHT);
		
		var backWall = new THREE.Mesh(longWallGeom, concreteMat);
		backWall.position.set(0, ROOM_NBRS.HEIGHT/2, -ROOM_NBRS.DEPTH/2);
		backWall.receiveShadow = true;
		_scene.add(backWall);

		var frontWall = new THREE.Mesh(longWallGeom, concreteMat);
		frontWall.position.set(0, ROOM_NBRS.HEIGHT/2, ROOM_NBRS.DEPTH/2);
		frontWall.rotation.y = Math.PI;
		frontWall.receiveShadow = true;
		_scene.add(frontWall);		

		var shortWallGeom = new THREE.PlaneGeometry(ROOM_NBRS.DEPTH, ROOM_NBRS.HEIGHT);

		var leftWall = new THREE.Mesh(shortWallGeom, concreteMat);
		leftWall.position.set(-ROOM_NBRS.WIDTH/2, ROOM_NBRS.HEIGHT/2, 0);
		leftWall.rotation.y = Math.PI/2;
		leftWall.receiveShadow = true;
		_scene.add(leftWall);

		var rightWall = new THREE.Mesh(shortWallGeom, concreteMat);
		rightWall.position.set(ROOM_NBRS.WIDTH/2, ROOM_NBRS.HEIGHT/2, 0);
		rightWall.rotation.y = -Math.PI/2;
		rightWall.receiveShadow = true;
		_scene.add(rightWall);
		*/
	}



	/*
	 * Initializes the patterns that will effect the sculpture lights.
	 */
	function initPatterns() {
		// Box 
		_availablePatterns.push(crteRandomBoxPattern());

		// Sphere
		_availablePatterns.push(crteRandomSpherePattern());
	}



	/*
	 * Initializes the audio.
	 */
	function loadAudio() {
		soundManager.onready( function() {
			loadSoundCloudTrack(); 
		});
	}



	/*
	 * Loads a SoundCloud track into SoundManager2.
	 */
	function loadSoundCloudTrack() {

		soundManager.stopAll();
		soundManager.destroySound("track");

		_audioTrack = soundManager.createSound(
			{
				id: "track",
				url: "http://api.soundcloud.com/tracks/" + SOUNDCLOUD.TRACK_ID + "/stream?client_id=" + SOUNDCLOUD.CLIENT_ID,
				usePeakData: false,
				useEQData: true,  // True: enables frequency spectrum data
				onfinish: handleAudioCompletion
			}
		);

		loopSound({ volume: 100, whileplaying: handleEQData});  
	}



	/*
	 * Loops the audio track each time it finishes playing.
	 */
	function loopSound(inpOptions) {
		// http://getsatisfaction.com/schillmania/topics/looping_tracks_in_soundmanager_2

		// Initialize the analyzer.
		AudioAnalyzer.InitBeatRangeSamples();

		window.setTimeout(function() {
			// Start our camera tweening.
			_waypointTweens[0].start();

			_audioTrack.play(inpOptions);
		}, 1);
	}



	/*
	 * Creates a randomly sized box pattern.
	 */
	function crteRandomBoxPattern() {
		var width = Math.max(BOX_NBRS.MIN_WIDTH, Math.random() * BOX_NBRS.MAX_WIDTH);
		var height = Math.max(BOX_NBRS.MIN_HEIGHT, Math.random() * BOX_NBRS.MAX_HEIGHT);
		var depth = Math.max(BOX_NBRS.MIN_DEPTH, Math.random() * BOX_NBRS.MAX_DEPTH);

		return new BoxPattern(width, height, depth);
	}



	/*
	 * Creates a randomly sized sphere pattern.
	 */
	function crteRandomSpherePattern() {

		return new SpherePattern(Math.max(SPHERE_NBRS.MIN_RADIUS, Math.random() * SPHERE_NBRS.MAX_RADIUS));
	}



	/*
	 * Returns -1 or 1 by random.
	 */
	function rtrvRandomPlusOrMinusOne() {
		var rtnNbr;

		if (Math.random() <= 0.49) {
			rtnNbr = -1;
		} else {
			rtnNbr = 1;
		}

		return rtnNbr;	
	}



	/*
	 * Returns a random position along an arc around the sculpture.
	 */
	function rtrvRandomPatternStartPos() {
		// Get a number between PI/2 and 3PI/2.
		//var randomRadianNbr = (Math.random() * Math.PI) + Math.PI/2;
		var randomRadianNbr = Math.random() * 2 * Math.PI;

		var xPosnNbr = PATTERN_NBRS.START_POSITION_ARC_RADIUS * Math.cos(randomRadianNbr);
		var yPosnNbr = LIGHT_NBRS.MIN_HEIGHT;  // We won't care about height for now.
		var zPosnNbr = PATTERN_NBRS.START_POSITION_ARC_RADIUS * Math.sin(randomRadianNbr);

		return new THREE.Vector3(xPosnNbr, yPosnNbr, zPosnNbr);
	}



	/*
	 * Returns a velocity for the pattern appropriate to its start position (i.e., directing it towards the sculpture)l
	 */
	function rtrvRandomPatternVelocity(inpStartPos) {
		var unitCircleCosValNbr = inpStartPos.x / PATTERN_NBRS.START_POSITION_ARC_RADIUS;
		var unitCircleSinValNbr = inpStartPos.z / PATTERN_NBRS.START_POSITION_ARC_RADIUS;

		// Negate the unit circle values to get velocities that point towards the world center.
		var xVelocityNbr = -unitCircleCosValNbr * THREE.Math.randFloat(PATTERN_NBRS.MIN_SPEED, PATTERN_NBRS.MAX_SPEED);
		var yVelocityNbr = 0;  // We will not have vertical movement at this time.
		var zVelocityNbr = -unitCircleSinValNbr * THREE.Math.randFloat(PATTERN_NBRS.MIN_SPEED, PATTERN_NBRS.MAX_SPEED);

		var velocity = new THREE.Vector3(xVelocityNbr, yVelocityNbr, zVelocityNbr);

		// Multiply by the pattern count so that the more patterns we have the faster they will go.
		return velocity.multiplyScalar(THREE.Math.mapLinear(_effectController.patternCnt, 0, PATTERN_NBRS.MAX_CNT, 1, PATTERN_NBRS.MAX_SPEED_SCALE));
	}



	/*
	 * Adds additional objects to the scene.
	 */
	function addSceneObjs() {
		var boxWidthNbr = 10;
		var boxHeightNbr = boxWidthNbr + boxWidthNbr/4;
		var showFrame = true;

		// The lower the specular value is, the less shiny the material will be. The closer it is to the diffuse color, the more it will look like metal.
		var boxMat = new THREE.MeshPhongMaterial( { color: "#FFFFFF", ambient: "#FFFFFF", specular: "#FFFFFF", shininess: 10} );		

		var boxGeom = new THREE.CubeGeometry(boxWidthNbr, boxHeightNbr, boxWidthNbr);

		var box = new THREE.Mesh(boxGeom, boxMat);
		box.position.x = 0;
		box.position.y = boxHeightNbr/2;
		box.position.z = 0;
		box.receiveShadow = true;
		_scene.add(box);


		//Note: The 5th and 6th parameters must be coprime; otherwise, the result will be a torus link.
		var torusKnotGeom = new THREE.TorusKnotGeometry(TORUS_KNOT_NBRS.KNOT_RADIUS, TORUS_KNOT_NBRS.TUBE_RADIUS,
														TORUS_KNOT_NBRS.RADIAL_SEGMENTS, TORUS_KNOT_NBRS.TUBE_SEGMENTS, 
														TORUS_KNOT_NBRS.COPRIME_INT_P, TORUS_KNOT_NBRS.COPRIME_INT_Q);

		var torusKnotMat = new THREE.MeshPhongMaterial( { color: "#FFFFFF", ambient: "#FFFFFF", specular: "#FFFFFF", shininess: 10} );

		_torusKnot = new THREE.Mesh(torusKnotGeom, torusKnotMat);
		_torusKnot.position.set(0, 30, 0);
		_torusKnot.receiveShadow = true;
		_scene.add(_torusKnot);
		
	}



	/*
	 * For performance reasons we only want to update values when the user actually changes parameters.
	 */
	function onParmsChange() {
		// Update lights
		var newColor = new THREE.Color();
		newColor.copy(LIGHT_CLRS.OFF);
		newColor.lerp(LIGHT_CLRS.ON, _effectController.intensity);


		for (var idx = 0, lightCnt = _lightSources.length; idx < lightCnt; idx++) {
			_lightSources[idx].intensity = _effectController.intensity * LIGHT_INTENSITY_NBRS.MAX;

			_lightEmitterGeoms[idx].faces[LIGHT_NBRS.EMITTER_FACE].color.copy(newColor);
			_lightEmitterGeoms[idx].colorsNeedUpdate = true;
		}
		
	}



	/*
	 * Creates the animation loop.
	 */
	function animate() {
		// Rendering loop.
		_animationFrameId = window.requestAnimationFrame(animate);
		render();
		_stats.update();
	}



	/*
	 * Renders the scene during each animation loop.
	 */
	function render() {
		_delta = _clock.getDelta();
		_currTm = _clock.getElapsedTime();
		
		// Update _camera
		TWEEN.update();
		//_cameraControls.update();


		// Update audio
		AudioAnalyzer.SetMuteState(_effectController.muteInd);

		
		var currElapsedTm = _clock.getElapsedTime();

		// Add a new light pattern at general intervals
		if (_effectController.muteInd === false) {
			if (_patternReleaseInd) {
				startRandomLightPattern(currElapsedTm);
			}
		//} else if (currElapsedTm - _prevPatternReleaseTm > 2 + (Math.random() * 2)) {  // Use this for a timed release
		} else {
			startRandomLightPattern(currElapsedTm);
		}
		

		// Set new light intensities
		animateLightIntensities();


		// Rotate the sculpture underneath the lights
		rotateSculpture();


		if (_renderer.getContext().isContextLost()) {
			console.log("Context lost!");
		}


		// Render
		_renderer.render(_scene, _camera);

		firstFrameInd = false;
	}


	/*
	 * Selects an available light pattern by random to start.
	 *
	 * @param inpElapsedTm: The amount of time elapsed since the application began.
	 */
	function startRandomLightPattern(inpElapsedTm) {

		// Limit the number of patterns active at any given time.
		if (_activePatterns.length < _effectController.patternCnt) {
			var selectedPattern = _availablePatterns[Math.floor(Math.random() * _availablePatterns.length)];

			_activePatterns.push(clonePatternWithRandomValues(selectedPattern));

			_prevPatternReleaseTm = inpElapsedTm;
		}
	}



	/*
	 * Clones a pattern's necessary properties into a new object.
	 *
	 * We do this so that we can concurrently run multiple versions of the same underlying pattern.
	 */
	function clonePatternWithRandomValues(inpPattern) {

		_patternIdCnt++;

		var startPosition = rtrvRandomPatternStartPos();

		var rtnClone = {
			id: _patternIdCnt,
			isPointInside: inpPattern.isPointInside,
			vertices: inpPattern.vertices,
			position: startPosition,
			velocity: rtrvRandomPatternVelocity(startPosition),
			lightIntensityRatioIncrmntNbr: Math.random() * PATTERN_NBRS.MAX_INTENSITY_INCRMNT_RATIO,
			renderLoopsCnt: 0,
			matrixWorld: new THREE.Matrix4(),
			worldVertices: [],
			radius: (inpPattern.radius === undefined) ? 0 : inpPattern.radius,
			radiusSquaredNbr: (inpPattern.radiusSquaredNbr === undefined) ? 0 : inpPattern.radiusSquaredNbr
		};

		return rtnClone;
	}



	/*
	 * Based on given patterns, changes the intensity of the sculptural lights.
	 */
	function animateLightIntensities() {

		var newActivePatterns = [], thisLightGeom, thisPattern, thisPatternPropIdTxt, intensityRatioNbr, 
			patternIdx = 0, patternCnt = _activePatterns.length, lightIdx = 0, lightCnt = _lightEmitterGeoms.length, newColor = new THREE.Color();


		// First loop through the active patterns to update their properties to represent this render frame.
		for (patternIdx = 0; patternIdx < patternCnt; patternIdx++) {
			thisPattern = _activePatterns[patternIdx];
			thisPattern.renderLoopsCnt++;

			// Translate the pattern.
			thisPattern.position.add(thisPattern.velocity);
			thisPattern.matrixWorld.identity();
			thisPattern.matrixWorld.setPosition(thisPattern.position);

			// Calculate the pattern's vertices in world coordinates (THREE.js stores vertices in object space)
			calcVerticesInWorldCoords(thisPattern);
		}


		// Next loop through each light, accumulating the effect of each pattern on each one.
		// NOTE: The lights should be the outermost loop because there are a lot of them. It's far more efficient.
		for (lightIdx = 0; lightIdx < lightCnt; lightIdx++) {
			thisLightGeom = _lightEmitterGeoms[lightIdx];
			intensityRatioNbr = 0;

			for (patternIdx = 0; patternIdx < patternCnt; patternIdx++) {
				thisPattern = _activePatterns[patternIdx];
				thisPatternPropIdTxt = PATTERN_ID_PROP_TXT + thisPattern.id.toString();

				// Determine if any points lie within the pattern
				if (thisPattern.isPointInside(_lights[lightIdx].position)) {

					// Update this pattern's existing effect on this light.
					if (thisLightGeom[thisPatternPropIdTxt] === undefined) {
						thisLightGeom[thisPatternPropIdTxt] = thisPattern.lightIntensityRatioIncrmntNbr;
					} else {
						thisLightGeom[thisPatternPropIdTxt] = Math.min(1, thisLightGeom[thisPatternPropIdTxt] + thisPattern.lightIntensityRatioIncrmntNbr);
					}

					// Keep those patterns which have affected a light.
					if (newActivePatterns.indexOf(thisPattern) === -1) {
						newActivePatterns.push(thisPattern);
					}
				
				} else if (thisLightGeom[thisPatternPropIdTxt] !== undefined && thisLightGeom[thisPatternPropIdTxt] > 0) {
					// This light was previously touched by this pattern, so we must dim it accordingly.

					// Update this pattern's existing effect on this light.
					thisLightGeom[thisPatternPropIdTxt] = Math.max(0, thisLightGeom[thisPatternPropIdTxt] - thisPattern.lightIntensityRatioIncrmntNbr);

					// If this pattern's effect has been completely removed from the light, delete the pattern's property from it.
					if (thisLightGeom[thisPatternPropIdTxt] <= 0) {
						delete thisLightGeom[thisPatternPropIdTxt];
					} else {
						// Keep those patterns which have affected a light.
						if (newActivePatterns.indexOf(thisPattern) === -1) {
							newActivePatterns.push(thisPattern);
						}
					}
				}

				if (thisLightGeom[thisPatternPropIdTxt]) {
					intensityRatioNbr += thisLightGeom[thisPatternPropIdTxt];
				}
			}

			thisLightGeom.lightIntensityRatioNbr = Math.min(1, intensityRatioNbr);

			// Update the emitter face color
			newColor.copy(LIGHT_CLRS.OFF);
			newColor.lerp(LIGHT_CLRS.ON, thisLightGeom.lightIntensityRatioNbr);

			// For performance, do not update a face's color if we do not have to.
			if (thisLightGeom.faces[0].color.getHex() !== newColor.getHex()) {
				thisLightGeom.faces[0].color.copy(newColor);
				thisLightGeom.colorsNeedUpdate = true;
			}

			// Update the area light's intensity
			_lightSources[lightIdx].intensity = thisLightGeom.lightIntensityRatioNbr * LIGHT_INTENSITY_NBRS.MAX;
		}


		// Keep a pattern if it is still early in its life (i.e., we need to give them a chance to reach the lights).
		for (patternIdx = 0; patternIdx < patternCnt; patternIdx++) {
			thisPattern = _activePatterns[patternIdx];

			if (thisPattern.renderLoopsCnt <= 15 && newActivePatterns.indexOf(thisPattern) === -1) {
				newActivePatterns.push(thisPattern);
			}
		}

		// Update our list of active patterns.
		_activePatterns = newActivePatterns;
	}



	/*
	 * Convert an object's vertices from object to world coordinates.
	 */
	function calcVerticesInWorldCoords (inpObj) {
		for (var idx = 0, vertexCnt = inpObj.vertices.length; idx < vertexCnt; idx++) {
			inpObj.worldVertices[idx] = inpObj.vertices[idx].clone();
			inpObj.worldVertices[idx].applyMatrix4(inpObj.matrixWorld);
		}
	}



	/*
	 * Alters the location of the sculptural lights.
	 */
	function transformLights() {

		// Some starter code...
		var heightChgNbr = (0.001 * _clock.getElapsedTime()) % 15;
		var newHeightNbr = _lightSources[9].position.y + (heightChgNbr * heightChgDirectionNbr);

		if (newHeightNbr <= 35) {
			newHeightNbr = 35;
			heightChgDirectionNbr = -heightChgDirectionNbr;
		} else if (newHeightNbr >= 65) {
			newHeightNbr = 65;
			heightChgDirectionNbr = -heightChgDirectionNbr;
		}

		_lightSources[9].position.setY(newHeightNbr);
		_lights[9].position.setY(newHeightNbr);
	}


	/*
	 * Rotates the sculpture.
	 */
	function rotateSculpture() {

		var rotateSpeedNbr = 0;
		var trackPositionMs = (_audioTrack && _audioTrack.position) ? _audioTrack.position : 0;
		var trackDurationMs = (_audioTrack && _audioTrack.duration) ? _audioTrack.duration : 0;
		var trackRemainingMs = trackDurationMs - trackPositionMs;

		if (_sculptureRotateInd) {
			if (trackRemainingMs <= SCULPTURE_ROTATE_NBRS.END_LERP_TM_MS) {
				rotateSpeedNbr = calcLerp(0, SCULPTURE_ROTATE_NBRS.MAX_SPEED, trackRemainingMs/SCULPTURE_ROTATE_NBRS.END_LERP_TM_MS);
			} else {
				// Add an extra fraction of a second so that we are sure to get a positive rotation speed upon rotation startup.
				_sculptureElapsedLerpTm += _delta + 0.001;
				rotateSpeedNbr = calcLerp(0, SCULPTURE_ROTATE_NBRS.MAX_SPEED, _sculptureElapsedLerpTm/SCULPTURE_ROTATE_NBRS.START_LERP_TM);
			}

			_torusKnot.useQuaternion = true;
			var quat = new THREE.Quaternion();

			// Note: We don't want to calculate distance directly from the overall elapsed time because that doesn't work when we went to decelerate
			// the rotation at the end of the audio track. We would end up multiplying a large number (the overall elapsed time) by a smaller number
			// than we had been using, thus leading to jerkiness. So we first calculate the interval distance and then add it to the overall distance.
			_sculptureElapsedRotationDstncNbr += _delta * rotateSpeedNbr;
			quat.setFromAxisAngle( new THREE.Vector3(0, 0.8, 0.2), _sculptureElapsedRotationDstncNbr);

			quat.normalize();  // Normalize the quaternion or else you will get a distorted shape.
			_torusKnot.quaternion = quat;
		}


		if (rotateSpeedNbr === 0) {
			// Initialize these values so that they are ready for the next time rotation starts up.
			_sculptureRotateInd = false;
			_sculptureElapsedLerpTm = 0;
		}
	}



	/*
	 * Adds a listener for the webglcontextlost event.
	 */
	function addContextLostListener() {
		this._renderer.domElement.addEventListener("webglcontextlost", handleContextLost, false);
	}



	/*
	 * Handles the event of the WebGL context being lost.
	 */
	function handleContextLost(inpEvent) {
		// By default when a WebGL program loses its context, it never gets that context back. Prevent this default behavior.
		inpEvent.preventDefault();

		// Turn off the rendering loop.
		window.cancelAnimationFrame(_animationFrameId);
		
		// Rebuild the scene.
		Main.InitScene();
	}



    /*
     * Handler for SoundManager2's whilePlaying event. It fires this event after it takes its FFT samples.
     */
    function handleEQData() {
        if (_effectController.muteInd === false) {
			var beatDetectNbr = AudioAnalyzer.DetectBeat(this.eqData);

			if (beatDetectNbr > 1.15) {  //Note: For Lusine's "Baffle", the first major beat is 1.21.
				_patternReleaseInd = true;
			_sculptureRotateInd = true;
			} else {
				_patternReleaseInd = false;
			}
        }
    }



    /*
     * Sets all the entries in the input array to the input value.
     */
    function initArray(inpArray, inpVal) {
		var idx = 0;

		while (idx < inpArray.length) {
			inpArray[idx] = inpVal;
			idx++;
		}

		return inpArray;
    }


    /*
     * Calculates the rolling average of beat levels.
     *
     * @param inpNewBeatLvlNbr: The new beat level number to include in the average.
     *
     * @returns A float.
     */
    function calcBeatLvlRollingAvg(inpNewBeatLvlNbr) {
		_rollingAvgBeatLvLs.shift();
		_rollingAvgBeatLvLs.push(inpNewBeatLvlNbr);

		var sumNbr = 0;

		for (var idx = 0, lvlCnt = _rollingAvgBeatLvLs.length; idx < lvlCnt; idx++) {
			sumNbr += _rollingAvgBeatLvLs[idx];
		}

		return sumNbr/_rollingAvgBeatLvLs.length;
	}



    /*
     * Linearly interpolates between two numbers.
     *
     * @param inpStartNbr: The number to start from.
     * @param inpEndNbr: The number to end at.
     * @param inpRatio: The ratio between the two number.
     *
     * @returns A float.
     */
    function calcLerp(inpStartNbr, inpEndNbr, inpPercent) {

		return inpStartNbr + (THREE.Math.clamp(inpPercent, 0, 1) * (inpEndNbr - inpStartNbr));
    }



    /*
     * Handles the Tween onUpdate event.
     */
	function handleTweenPathUpdate() {
		var currWaypoint = _camPathWaypointsSeq[_currWaypointIdx];
		var nextWaypointIdx = (_currWaypointIdx + 1 < _camPathWaypointsSeq.length) ? _currWaypointIdx + 1 : 0;
		var nextWaypoint = _camPathWaypointsSeq[nextWaypointIdx];

		var interpolatedQuat = new THREE.Quaternion();
		var newCamPos = new THREE.Vector3();


		if (currWaypoint instanceof OrbitWaypoint) {
			if (currWaypoint.orbitStartQuat !== null) {
				// If this waypoint has quaternions defined use them.
				THREE.Quaternion.slerp(currWaypoint.orbitStartQuat, currWaypoint.orbitEndQuat, interpolatedQuat, _currCamPathTweenDat.interpolantNbr);

				// This is the start point for the interpolated rotation. Note: the waypoint positions are already normalized
				newCamPos = currWaypoint.clone();
				newCamPos.applyQuaternion(interpolatedQuat);  // Apply the interpolated angle to the start position
			} else {
				var newCamPhiAndThetaRadianNbrs = currWaypoint.phiAndThetaRadianNbrs.clone();
				newCamPhiAndThetaRadianNbrs.lerp(nextWaypoint.phiAndThetaRadianNbrs, _currCamPathTweenDat.interpolantNbr);
				newCamPos.x = Math.sin(newCamPhiAndThetaRadianNbrs.x) * Math.sin(newCamPhiAndThetaRadianNbrs.y);
				newCamPos.y = Math.cos(newCamPhiAndThetaRadianNbrs.x);
				newCamPos.z = Math.sin(newCamPhiAndThetaRadianNbrs.x) * Math.cos(newCamPhiAndThetaRadianNbrs.y);
			}

		} else if (currWaypoint instanceof LinearWaypoint) {
			newCamPos = currWaypoint.clone().lerp(nextWaypoint, _currCamPathTweenDat.interpolantNbr);

		}


		newCamPos.multiplyScalar(CAM.ORBIT_RADIUS_NBR);  // Multiply the normalized camera position by the camera's orbit radius
		newCamPos.applyMatrix4(_camOrbitTranslationMatrix);  // Translate the position from the origin to the orbit center (i.e. the look-at position)
		_camera.position.copy(newCamPos);


		
		if (currWaypoint.orientationEndQuats.length === 0) {
			_camera.lookAt(CAM.LOOK_AT_POS);
		} else {
			if (currWaypoint.orientationTweensStartedInd === false) {
				currWaypoint.orientationTweens[0].start();
				currWaypoint.orientationTweensStartedInd = true;
			}
		}

		


		// Code that tries to keep camera from flipping to maintain UP vector. However, it just means the camera winds up upsidedown.
		/*
		var camLookAtDirection = CAM.LOOK_AT_POS.clone().sub(_camera.position).normalize();

		if (((rtrvNbrSign(camLookAtDirection.x) === -1 * rtrvNbrSign(_prevCamLookAtDirection.x))
				&& (camLookAtDirection.x !== 0 && _prevCamLookAtDirection.x !== 0) 
			|| (rtrvNbrSign(camLookAtDirection.z) === -1 * rtrvNbrSign(_prevCamLookAtDirection.z))
				&& (camLookAtDirection.z !== 0 && _prevCamLookAtDirection.z !== 0))
			&& Math.abs(camLookAtDirection.y) > 0.98) {
			_camera.up.y = -_camera.up.y;
		}
		
		_prevCamLookAtDirection.copy(camLookAtDirection);
		*/
	}



	/*
	 * Returns 1 if a number is positive, -1 if it is 0, and 0 if it is 0.
	 *
	 * @param inpNbr:  The number to check.
	 */
	function rtrvNbrSign(inpNbr) { 
		return inpNbr > 0 ? 1 : inpNbr < 0 ? -1 : 0; 
	}



	/*
	 * Handles the Tween onComplete event for path tweens.
	 */
	function handleTweenPathSegmentCompletion() {
		_currWaypointIdx++;

		if (_currWaypointIdx >= _camPathWaypointsSeq.length) {
			_currWaypointIdx = 0;
		}

		_currCamPathTweenDat.interpolantNbr = 0;
	}



	/*
	 * Handles the orientation start of the camera.
	 */
	function handleTweenOrientStart() {
		_camPathWaypointsSeq[_currWaypointIdx].camOrientationAtTweenStart = _camera.quaternion.clone();
	}



	/*
	 * Handles the orientation update of the camera.
	 */
	function handleTweenOrientUpdate() {
		var currWaypoint = _camPathWaypointsSeq[_currWaypointIdx];
		var interpolatedQuat = new THREE.Quaternion();

		if (currWaypoint.orientationStartQuat !== null) {
			THREE.Quaternion.slerp(currWaypoint.orientationStartQuats[currWaypoint.currOrientationIdx], currWaypoint.orientationEndQuats[currWaypoint.currOrientationIdx], interpolatedQuat, _currCamOrientTweenDat.interpolantNbr);

			var newCamOrientation = _camPathWaypointsSeq[_currWaypointIdx].camOrientationAtTweenStart.clone();
			newCamOrientation.multiply(interpolatedQuat);  // Apply the interpolated angle to the start orientation.
			_camera.quaternion.copy(newCamOrientation);
		} else {
			// We cannot process this waypoint.
		}
	}



	/*
	 * Handles the Tween onComplete event for orientation tweens.
	 */ 
	function handleTweenOrientCompletion() {
		_currCamOrientTweenDat.interpolantNbr = 0;

		_camPathWaypointsSeq[_currWaypointIdx].currOrientationIdx++;

		// Make sure to reset this waypoint's orientation index back to 0 so that we can loop the entire animation without rebuilding everything.
		if (_camPathWaypointsSeq[_currWaypointIdx].currOrientationIdx >= _camPathWaypointsSeq[_currWaypointIdx].orientationTweens.length) {
			_camPathWaypointsSeq[_currWaypointIdx].currOrientationIdx = 0;
		}
	}



	/*
	 * Handles the onFinish event from a SoundManager2 SMSound (i.e., Sound object).
	 */
	function handleAudioCompletion() {
		// Remove all Tweens from the "started" list.
		TWEEN.removeAll();

		for (var idx = 0, cnt = _camPathWaypointsSeq.length; idx < cnt; idx++) {
			_camPathWaypointsSeq[idx].orientationTweensStartedInd = false;
		}

		// You will only get eqData for a looped track if you destory and re-create it. This appears to be a problem in the source SoundManager2_SMSound_AS3.as.
		// The eqData object that flash passes to javascript is incorrect.
		// http://stackoverflow.com/questions/11642556/soundcloud-soundmanager2-eqdata
		loadSoundCloudTrack();
	}

} (window.Main = window.Main || {}, jQuery) );