/*
 * Creates a kinetic sculpture comprised of lights.
 *
 *
 * This uses a Self-Executing Anonymous Function to declare the namespace "Main" and create public and private members within in.
 *
 * @author Kevin Dean
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
	var CAM_NBRS = {POSN_X: -140, POSN_Y: 15, POSN_Z: 90, target_X: 0, target_Y: 65, target_Z: 0, FOV_ANGLE: 46, NEAR_PLANE: 1, FAR_PLANE: 5000};
	var SCULPTURE_ROW_CNT = 15, SCULPTURE_COL_CNT = 38; 
	var SCULPTURE_LIGHT_SRC_INTRVL_NBR = 34;  // Keep the number of lights low because they are expensive for the GPU to calculate
	var SCULPTURE_LIGHT_WDTH_NBR = 3, SCULPTURE_LIGHT_HGHT_NBR = 3, SCULPTURE_LIGHT_DPTH_NBR = 0.5, SCULPTURE_LIGHT_MARGIN_NBR = 1;
	var EMITTER_FACE_NBR = 3;
	var SCULPTURE_LEFT_STRT_COORD_NBR = -(SCULPTURE_COL_CNT * (SCULPTURE_LIGHT_WDTH_NBR + SCULPTURE_LIGHT_MARGIN_NBR))/2 + SCULPTURE_LIGHT_MARGIN_NBR;
	var SCULPTURE_FAR_STRT_COORD_NBR = -(SCULPTURE_ROW_CNT * (SCULPTURE_LIGHT_HGHT_NBR + SCULPTURE_LIGHT_MARGIN_NBR))/2 + SCULPTURE_LIGHT_MARGIN_NBR;
	var LIGHT_CLRS = {ON: new THREE.Color(0xE5D9CA), OFF: new THREE.Color(0x090909)};   // ON: new THREE.Color(0xFFF1E0)
	var MAX_LIGHT_INTENSITY_NBR = 3.5, START_LIGHT_INTENSITY_NBR = 0.00, DIRECT_LIGHT_INTENSITY_NBR = 0.2;
	var MIN_LIGHT_HEIGHT_NBR = 65;
	var ROOM_NBRS = {WIDTH: 800, DEPTH: 600, HEIGHT: 80};

	var SOUNDCLOUD = {CLIENT_ID: "ace41127a1d0a4904d5e548447130eee", TRACK_ID: 17889996};

	// For patterns
	var PATTERN_NBRS = {MIN_SPEED: 1.5, MAX_SPEED: 7, MAX_SPEED_SCALE: 1.3, MAX_INTENSITY_INCRMNT_RATIO: 0.1, START_POSITION_ARC_RADIUS: 100, MAX_CNT: 10};
	var PATTERN_ID_PROP_TXT = "patternId";
	var BOX_NBRS = {MIN_HEIGHT: 20, MIN_WIDTH: 20, MIN_DEPTH: 20, MAX_HEIGHT: 100, MAX_WIDTH: 100, MAX_DEPTH: 100};
	var SPHERE_NBRS = {MIN_RADIUS: 25, MAX_RADIUS: 75};



	/**********************
	 * Global variables
	 **********************/
	var _camera, _scene, _stats, _clock, _animationFrameId;
	var	__cameraControls, _effectController, _eyeTargetScale;
	var _canvasWidth = window.innerWidth, _canvasHeight = window.innerHeight;
	var _sculptureLightsources = [], _sculptureLightGeometries = [], _sculptureLights = [];
	var _lightHeightNbr, _lightHeightDirNbr, _lightHeightChgIncrmntNbr;
	var _availablePatterns = [], _activePatterns = [];
	var _patternIdCnt = 0;
	var _patternReleaseInd = false;
	var _prevPatternReleaseTm = 0;


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

		var chromeInd = navigator.userAgent.toLowerCase().indexOf("chrome") > -1;
		if (chromeInd === false) {
			compatibleInd = false;
			alert("Please use Google Chrome.");
		}

		if (Detector.webgl === false) {
			Detector.addGetWebGLMessage();
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
			initCameraAndScene();
			initLights();
			initGUI();
			addRoom();
			addSceneObjs();
			initPatterns();
			initStats();
			loadAudio();
			
			
			addContextLostListener();
			addOnUnloadListener();

			
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


	function initStats() {
		_stats = new Stats();
		_stats.domElement.style.position = "absolute";
		_stats.domElement.style.top = "8px";
		_stats.domElement.style.zIndex = 100;
		container.appendChild(_stats.domElement);
	}



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



	function initCameraAndScene() {
		_camera = new THREE.PerspectiveCamera(CAM_NBRS.FOV_ANGLE, _canvasWidth / _canvasHeight, CAM_NBRS.NEAR_PLANE, CAM_NBRS.FAR_PLANE);
		_camera.position.set(CAM_NBRS.POSN_X, CAM_NBRS.POSN_Y, CAM_NBRS.POSN_Z);
		//_scene.add(_camera);  // Do not need to add the _camera to the _scene if using EffectComposer.
		_cameraControls = new THREE.OrbitAndPanControls(_camera, _renderer.domElement);
		_cameraControls.target.set(CAM_NBRS.target_X, CAM_NBRS.target_Y, CAM_NBRS.target_Z);

		var startDirectionVect = new THREE.Vector3();
		startDirectionVect.subVectors( _camera.position, _cameraControls.target );
		_eyeTargetScale = Math.tan(_camera.fov * (Math.PI/180)/2) * startDirectionVect.length();

		_scene = new THREE.Scene();

		_clock = new THREE.Clock();
	}



	function initLights() {
		//AmbientLight is not currently supported in WebGLDeferred_renderer, so we are using a directional light instead.
		//_scene.add(new THREE.AmbientLight(0xFFFFFF));

		var directionalLight = new THREE.HemisphereLight(LIGHT_CLRS.ON.getHex(), LIGHT_CLRS.ON.getHex(), DIRECT_LIGHT_INTENSITY_NBR);
		_scene.add(directionalLight);

		for (var i = 0; i < SCULPTURE_ROW_CNT; i++) {

			for (var j = 0; j < SCULPTURE_COL_CNT; j++) {
				crteSculptureLight(i, j);
			}
		}
	}



	function initGUI() {
		var gui = new dat.GUI();

		_effectController = {
			intensity: START_LIGHT_INTENSITY_NBR,
			muteInd: false,
			patternCnt: 5
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

		var lightIdx = inpLightRowIdx * SCULPTURE_COL_CNT + inpLightColIdx;

		var lightSrc = new THREE.AreaLight(LIGHT_CLRS.ON.getHex(), START_LIGHT_INTENSITY_NBR);
		_sculptureLightsources[lightIdx] = lightSrc;
		//lightSrc = new THREE.SpotLight(LIGHT_CLRS.ON.getHex(), sculptureLightIntensityNbr, 250);
		lightSrc.angle = Math.PI/2;  // Should not go past PI/2.
		lightSrc.castShadow = true;
		lightSrc.shadow_cameraNear = 0.1;  // Set the near plane for the shadow _camera frustum as close to the light as  possible.
		lightSrc.shadow_cameraFov = 130;  // Default is 50.
		lightSrc.shadow_cameraVisible = false;  // Does not apply to WebGLDeferred_renderer.

		var lightXCoordNbr = SCULPTURE_LEFT_STRT_COORD_NBR + (inpLightColIdx * (SCULPTURE_LIGHT_WDTH_NBR + SCULPTURE_LIGHT_MARGIN_NBR));
		var lightZCoordNbr = SCULPTURE_FAR_STRT_COORD_NBR + (inpLightRowIdx * (SCULPTURE_LIGHT_HGHT_NBR + SCULPTURE_LIGHT_MARGIN_NBR));


		// Create a sine wave that transposes itself as the row number increases.
		// To make a more organic shape (i.e., get rid of diagonal peaks and troughs), create another sine wave that is influenced more by the column number.
		// Note: All of these numbers are rather arbitrary.
		_lightHeightNbr = (Math.sin(185 * ((inpLightRowIdx + inpLightColIdx) * 0.53)/360) * 3.3) + 
							(Math.sin(210 * ((inpLightRowIdx + (inpLightColIdx * 2.8)) * 0.45)/360) * 1.5) +
							MIN_LIGHT_HEIGHT_NBR;

		lightSrc.position.set(lightXCoordNbr, _lightHeightNbr, lightZCoordNbr);
		lightSrc.width = 1;
		lightSrc.height = 1;


		// Having many lights in a _scene is expensive so we will only add a light source at a certain interval.
		if (lightIdx % SCULPTURE_LIGHT_SRC_INTRVL_NBR === 0) {
			_scene.add(lightSrc);
		}


		// Ideally we would just use the same geometry for each light, but since we want to be able to alter the color of each light independently,
		// we will create an independent geometry for each. NOTE: The optimal solution would probably be to create one geometry for the 5-sided case
		// of each light and then just create unique plane geometries for each light.
		var sculptureLightGeom = new THREE.CubeGeometry(SCULPTURE_LIGHT_WDTH_NBR, SCULPTURE_LIGHT_DPTH_NBR, SCULPTURE_LIGHT_HGHT_NBR);
		_sculptureLightGeometries[lightIdx] = sculptureLightGeom;

		// Setting vertexColors = FaceColors allows you to set the color of each face independently.
		// NOTE: Set the mesh ambient and diffuse colors to the full intensity of the lights they represent; otherwise, they will not glow.
		var sculptureLightMat = new THREE.MeshBasicMaterial( {color: lightSrc.color.getHex(), ambient: lightSrc.color.getHex(), vertexColors: THREE.FaceColors} );

		// Now set ALL the faces to the desired "off" color and set colorsNeedUpdate to true. This will cause the lights to appear off upon first render.
		for (var i = 0; i < sculptureLightGeom.faces.length; i++) {
			sculptureLightGeom.faces[i].color.setHex(LIGHT_CLRS.OFF.getHex());			
		}
		sculptureLightGeom.colorsNeedUpdate = true;

		// Add new properties to the light geometry
		sculptureLightGeom.lightIntensityRatioNbr = 0;  // Range of 0-1 of how intensely this light is shining at this time.


		var sculptureLight = new THREE.Mesh(sculptureLightGeom, sculptureLightMat);
		_sculptureLights[lightIdx] = sculptureLight;

		sculptureLight.position = lightSrc.position;
		sculptureLight.rotation = lightSrc.rotation;
		sculptureLight.scale = lightSrc.scale;
		sculptureLight.receiveShadow = true;

		_scene.add(sculptureLight);
	}



	/*
	 * 
	 */
	function addRoom() {
		var floorMap = THREE.ImageUtils.loadTexture( "textures/Ground_Concrete.jpg" );
		floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
		floorMap.repeat.set(Math.round(ROOM_NBRS.WIDTH/100), Math.round(ROOM_NBRS.DEPTH/100));
		floorMap.anisotropy = 4;

		// The lower the specular value is, the less shiny the material will be. The closer it is to the diffuse color, the more it will look like metal.
		var concreteMat = new THREE.MeshPhongMaterial({color: 0x808080, ambient: 0xFFFFFF, specular: 0x141414, shininess: 05, map: floorMap, bumpMap: floorMap, bumpScale: 0.05});
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



	function addEffects() {

		//_renderer.addEffect(new THREE.BloomPass( 0.65 ));
	}



	function initPatterns() {
		// Box 
		_availablePatterns.push(crteRandomBoxPattern());

		// Sphere
		_availablePatterns.push(crteRandomSpherePattern());
	}



	function loadAudio() {
		soundManager.onready( function() {
			loadSoundCloudTrack(); 
		});
	}



	function loadSoundCloudTrack() {

		soundManager.stopAll();
		soundManager.destroySound('track');

		track = soundManager.createSound(
			{
				id: "track",
				url: "http://api.soundcloud.com/tracks/" + SOUNDCLOUD.TRACK_ID + "/stream?client_id=" + SOUNDCLOUD.CLIENT_ID,
				usePeakData: false,
				useEQData: true  // True: enables frequency spectrum data
			}
		);

		loopSound("track", { volume: 100, whileplaying: handleEQData});  
	}



	function loopSound(inpSoundId, inpOptions) {
		// http://getsatisfaction.com/schillmania/topics/looping_tracks_in_soundmanager_2

		// Initialize the analyzer.
		AudioAnalyzer.InitBeatRangeSamples();

		inpOptions.onfinish = function() {
			loopSound(inpSoundId, inpOptions); 
		};

		window.setTimeout(function() {
			soundManager.play(inpSoundId, inpOptions);
		}, 1);
	}



	/*
	 * Creates a randomly sized and positioned 
	 */
	function crteRandomBoxPattern() {
		var width = Math.max(BOX_NBRS.MIN_WIDTH, Math.random() * BOX_NBRS.MAX_WIDTH);
		var height = Math.max(BOX_NBRS.MIN_HEIGHT, Math.random() * BOX_NBRS.MAX_HEIGHT);
		var depth = Math.max(BOX_NBRS.MIN_DEPTH, Math.random() * BOX_NBRS.MAX_DEPTH);

		return new BoxPattern(width, height, depth);
	}



	function crteRandomSpherePattern() {

		return new SpherePattern(Math.max(SPHERE_NBRS.MIN_RADIUS, Math.random() * SPHERE_NBRS.MAX_RADIUS));
	}



	/*
	 * Randomly returns -1 or 1.
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
		var yPosnNbr = MIN_LIGHT_HEIGHT_NBR;  // We won't care about height for now.
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



	function addSceneObjs() {
		var cubeSizeLength = 10;
		//var goldColor = "0xFFDF00";
		var orangeRed = "#E8D8AD";  // For some reason this doesn't work if you use "0x" notation...
		var showFrame = true;
		var objMaterial = new THREE.MeshPhongMaterial( { color: orangeRed } );

		var cubeGeometry = new THREE.CubeGeometry(cubeSizeLength, cubeSizeLength, cubeSizeLength);

		var cube = new THREE.Mesh( cubeGeometry, objMaterial );
		cube.position.x = 0;
		cube.position.y = cubeSizeLength / 2;
		cube.position.z = 0;
		cube.receiveShadow = true;
		_scene.add(cube);


		//var sphereRadiusNbr = 10;
		//var sphereGeom = new THREE.SphereGeometry(sphereRadiusNbr, sphereRadiusNbr * 3, sphereRadiusNbr * 3, 0, Math.PI * 2, 0, Math.PI);
		//var sphere = new THREE.Mesh(sphereGeom, objMaterial);
		//sphere.position.set(0, sphereRadiusNbr * 2, 0);
		//sphere.receiveShadow = true;
		//_scene.add(sphere);

		/* Note: TorusKnot does not seem to work with deferred rendering.
		var torusKnotGeom = new THREE.TorusKnowGeometry(10, 8, 60, 10, 2, 3);
		var torusKnot = new THREE.Mesh(torusKnotGeom, objMaterial);
		torusKnot.position.set(0, 30, 0);
		torusKnot.receiveShadow = true;
		_scene.add(torusKnot);
		*/
	}



	/*
	 * For performance reasons we only want to update values when the user actually changes parameters.
	 */
	function onParmsChange() {
		// Update lights
		var newColor = new THREE.Color();
		newColor.copy(LIGHT_CLRS.OFF);
		newColor.lerp(LIGHT_CLRS.ON, _effectController.intensity);


		for (i = 0; i < _sculptureLightsources.length; i++) {
			_sculptureLightsources[i].intensity = _effectController.intensity * MAX_LIGHT_INTENSITY_NBR;

			_sculptureLightGeometries[i].faces[EMITTER_FACE_NBR].color.copy(newColor);
			_sculptureLightGeometries[i].colorsNeedUpdate = true;
		}
		
	}



	function animate() {
		// Rendering loop.
		_animationFrameId = window.requestAnimationFrame(animate);
		render();
		_stats.update();
	}



	function render() {
		var delta = _clock.getDelta();
		
		// Update _camera
		_cameraControls.update(delta);


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


		if (_renderer.getContext().isContextLost()) {
			console.log("Context lost!");
		}


		// Render
		_renderer.render(_scene, _camera);
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

		var newActivePatterns = [];
		var thisLightGeom;

		// Process the active patterns to accumulate their effects on the lights
		for (var patternIdx = 0; patternIdx < _activePatterns.length; patternIdx++) {
			var thisPattern = _activePatterns[patternIdx];
			thisPattern.renderLoopsCnt++;

			// Translate the pattern.
			thisPattern.position.add(thisPattern.velocity);
			thisPattern.matrixWorld.identity();
			thisPattern.matrixWorld.setPosition(thisPattern.position);

			// Calcucate the pattern's vertices in world coordinates (THREE.js stores vertices in object space)
			calcVerticesInWorldCoords(thisPattern);


			var thisPatternPropIdTxt = PATTERN_ID_PROP_TXT + thisPattern.id.toString();


			// Loop through all the lights to see if this pattern intersects each one
			for (var lightIdx = 0; lightIdx < _sculptureLightGeometries.length; lightIdx++) {
				thisLightGeom = _sculptureLightGeometries[lightIdx];
				// Determine if any points lie within the pattern
				if (thisPattern.isPointInside(_sculptureLights[lightIdx].position)) {

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
			}

			// Keep a pattern if it didn't affect any lights but is still early in its life.
			if (newActivePatterns.indexOf(thisPattern) === -1 && thisPattern.renderLoopsCnt <= 15) {
				newActivePatterns.push(thisPattern);
			}
		}


		var newColor = new THREE.Color();

		// Now process the lights, accumulating the effects of the patterns of each one.
		// NOTE: You always want to perform this loop because it will ensure a light's intensity ratio number always gets set to 0.
		for (idx = 0; idx < _sculptureLightGeometries.length; idx++) {

			thisLightGeom = _sculptureLightGeometries[idx];
			var intensityRatioNbr = 0;


			// Accumulate the effects of this light's affecting patterns.
			for (var prop in thisLightGeom) {
				if (prop.indexOf(PATTERN_ID_PROP_TXT) > -1) {
					intensityRatioNbr += thisLightGeom[prop];

					// If we hit the maximum ratio, we can stop accumulating.
					if (intensityRatioNbr >= 1) {
						intensityRatioNbr = Math.min(1, intensityRatioNbr);
						break;
					}
				}
			}

			thisLightGeom.lightIntensityRatioNbr = intensityRatioNbr;

			// Update the emitter face color
			newColor.copy(LIGHT_CLRS.OFF);
			newColor.lerp(LIGHT_CLRS.ON, thisLightGeom.lightIntensityRatioNbr);
			thisLightGeom.faces[EMITTER_FACE_NBR].color.copy(newColor);
			thisLightGeom.colorsNeedUpdate = true;

			// Update the area light's intensity
			_sculptureLightsources[idx].intensity = thisLightGeom.lightIntensityRatioNbr * MAX_LIGHT_INTENSITY_NBR;
		}


		// Update our list of active patterns.
		_activePatterns = newActivePatterns;
	}



	/*
	 * Convert an object's vertices from object to world coordinates.
	 */
	function calcVerticesInWorldCoords (inpObj) {
		for (var idx = 0; idx < inpObj.vertices.length; idx++) {
			inpObj.worldVertices[idx] = inpObj.vertices[idx].clone();
			inpObj.worldVertices[idx].applyMatrix4(inpObj.matrixWorld);
		}
	}



	/*
	 * Physically changes location of the sculptural lights.
	 */
	function transformLights() {

		// Some starter code...
		var heightChgNbr = (0.001 * _clock.getElapsedTime()) % 15;
		var newHeightNbr = _sculptureLightsources[9].position.y + (heightChgNbr * heightChgDirectionNbr);

		if (newHeightNbr <= 35) {
			newHeightNbr = 35;
			heightChgDirectionNbr = -heightChgDirectionNbr;
		} else if (newHeightNbr >= 65) {
			newHeightNbr = 65;
			heightChgDirectionNbr = -heightChgDirectionNbr;
		}

		_sculptureLightsources[9].position.setY(newHeightNbr);
		_sculptureLights[9].position.setY(newHeightNbr);
	}



	function addContextLostListener() {
		this._renderer.domElement.addEventListener("webglcontextlost", function(inpEvent) {
			handleContextLost(inpEvent);
		}, false);
	}



	function addOnUnloadListener() {
		window.addEventListener("unload", function(inpEvent) {
			//this._renderer.domElement.loseContext();
		}, false);
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
			} else {
				_patternReleaseInd = false;
			}

			console.log(beatDetectNbr);
        }

        //(AudioAnalyzer.RtrvFallEqData(this.eqData));
    }


} (window.Main = window.Main || {}, jQuery) );