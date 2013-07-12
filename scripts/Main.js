/*
 * Creates a kinetic sculpture comprised of lights.
 *
 * The light glow effect is based on http://bkcore.com/blog/3d/webgl-three-js-animated-selective-glow.html.
 *
 * This uses a Self-Executing Anonymous Function to declare the namespace "Main" and create public and private members within in.
 *
 * @author Kevin Dean
 */

/*
 * @param Main: Defines the namespace to use for public members of this class.
 * @param $: The shorthand to use for jQuery.
 * @param undefined: Nothing should be passed via this parameter. This ensures that you can use "undefined" here without worrying that another loaded
 * 			  script as redefined the global variable "undefined".
 */
(function(Main, $, undefined) {

	/*
	 * Constants
	 */
	var SCALE = 1;
	var CAM_COORD_NBRS = {POSN_X: -140, POSN_Y: 5, POSN_Z: 90, target_X: 0, target_Y: 65, target_Z: 0};
	var SCULPTURE_ROW_CNT = 15, SCULPTURE_COL_CNT = 38, SCULPTURE_LIGHT_SRC_INTRVL_NBR = 20;
	var SCULPTURE_LIGHT_WDTH_NBR = 3, SCULPTURE_LIGHT_HGHT_NBR = 3, SCULPTURE_LIGHT_DPTH_NBR = 0.5, SCULPTURE_LIGHT_MARGIN_NBR = 1;
	var EMITTER_FACE_NBR = 3;
	var SCULPTURE_LEFT_STRT_COORD_NBR = -(SCULPTURE_COL_CNT * (SCULPTURE_LIGHT_WDTH_NBR + SCULPTURE_LIGHT_MARGIN_NBR))/2 + SCULPTURE_LIGHT_MARGIN_NBR;
	var SCULPTURE_FAR_STRT_COORD_NBR = -(SCULPTURE_ROW_CNT * (SCULPTURE_LIGHT_HGHT_NBR + SCULPTURE_LIGHT_MARGIN_NBR))/2 + SCULPTURE_LIGHT_MARGIN_NBR;
	var LIGHT_CLRS = {ON: new THREE.Color(0xE5D9CA), OFF: new THREE.Color(0x090909)};   // ON: new THREE.Color(0xFFF1E0)
	var MAX_LIGHT_INTENSITY_NBR = 2.2, START_LIGHT_INTENSITY_NBR = 0.00, DIRECT_LIGHT_INTENSITY_NBR = 0.14;
	var MIN_LIGHT_HEIGHT_NBR = 65;

	// For patterns
	var PATTERN_NBRS = {MAX_SPEED: 15, MAX_INTENSITY_INCRMNT_RATIO: 1};
	var PATTERN_ID_PROP_TXT = "patternId";
	var BOX_MAX_NBRS = {HEIGHT: 100, WIDTH: 100, DEPTH: 100};



	/*
	 * Global variables
	 */
	var _camera, _scene, _renderer, _stats, _clock;
	var	__cameraControls, _effectController, _eyeTargetScale;
	var _canvasWidth = window.innerWidth, _canvasHeight = window.innerHeight;
	var _sculptureLightsources = [], _sculptureLightGeometries = [], _sculptureLights = [];
	var _lightHeightNbr, _lightHeightDirNbr, _lightHeightChgIncrmntNbr;
	var _availablePatterns = [], _activePatterns = [];


	/*
	 * Public methods
	 */
	Main.Init = function() {

		// Renderer
		_renderer = new THREE.WebGLDeferredRenderer( { antialias: true, scale: SCALE, brightness: 5, tonemapping: THREE.FilmicOperator } );
		//_renderer = new THREE.WebGL_renderer( { antialias: true, scale: SCALE } );
		_renderer.setSize(_canvasWidth, _canvasHeight);  // Cannot set size via constructor parameters for WebGL_renderer.
		// Gamma correction
		_renderer.gammaInput = true;
		_renderer.gammaOutput = true;
		
		_renderer.shadowMapEnabled = true;  // Shadows are enabled.

		var container = document.getElementById('container');
		container.appendChild( _renderer.domElement );

		// Stats
		_stats = new Stats();
		_stats.domElement.style.position = "absolute";
		_stats.domElement.style.top = "8px";
		_stats.domElement.style.zIndex = 100;
		container.appendChild(_stats.domElement);


		_scene = new THREE.Scene();

		initCamera();
		initLights();
		initGUI();
		addRoom();
		
		initPatterns();


		var cube;
		var cubeSizeLength = 10;
		var goldColor = "#FFDF00";
		var showFrame = true;
		var wireMaterial = new THREE.MeshPhongMaterial( { color: goldColor, ambient: goldColor } );

		var cubeGeometry = new THREE.CubeGeometry(cubeSizeLength, cubeSizeLength, cubeSizeLength);

		cube = new THREE.Mesh( cubeGeometry, wireMaterial );
		cube.position.x = -10;
		cube.position.y = cubeSizeLength / 2;
		cube.position.z = 0;
		cube.receiveShadow = true;
		_scene.add(cube);
				

		_clock = new THREE.Clock();

		
		$(window).load( function() {
			animate();
		});
	};



	/*
	 * Private methods
	 */

	function initCamera() {
		_camera = new THREE.PerspectiveCamera(46, _canvasWidth / _canvasHeight, 1, 1000);
		_camera.position.set(CAM_COORD_NBRS.POSN_X, CAM_COORD_NBRS.POSN_Y, CAM_COORD_NBRS.POSN_Z);
		//_scene.add(_camera);  // Do not need to add the _camera to the _scene if using EffectComposer.
		_cameraControls = new THREE.OrbitAndPanControls(_camera, _renderer.domElement);
		_cameraControls.target.set(CAM_COORD_NBRS.target_X, CAM_COORD_NBRS.target_Y, CAM_COORD_NBRS.target_Z);

		var startDirectionVect = new THREE.Vector3();
		startDirectionVect.subVectors( _camera.position, _cameraControls.target );
		_eyeTargetScale = Math.tan(_camera.fov * (Math.PI/180)/2) * startDirectionVect.length();
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
			intensity: START_LIGHT_INTENSITY_NBR
		};

		gui.add(_effectController, "intensity", 0.00, 1.00).step(0.01).onChange(onParmsChange);
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
			//_scene.add(lightSrc);
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
		floorMap.repeat.set(3, 3);
		floorMap.anisotropy = 4;

		// The lower the specular value is, the less shiny the material will be. The closer it is to the diffuse color, the more it will look like metal.
		var concreteMat = new THREE.MeshPhongMaterial({color: 0x808080, ambient: 0xFFFFFF, specular: 0x141414, shininess: 05, map: floorMap, bumpMap: floorMap, bumpScale: 0.05});
		var floor = new THREE.Mesh(new THREE.PlaneGeometry( 400, 300 ), concreteMat);
		//floor.rotation.y = Math.PI;  // The repetition of the pattern is less obvious from the side.
		floor.rotation.x = -Math.PI/2;
		floor.receiveShadow = true;
		_scene.add(floor);

		var longWallGeom = new THREE.PlaneGeometry(400, 80);
		
		var backWall = new THREE.Mesh(longWallGeom, concreteMat);
		backWall.position.set(0, 80/2, -300/2);
		backWall.receiveShadow = true;
		_scene.add(backWall);

		var shortWallGeom = new THREE.PlaneGeometry(300, 80);

		var leftWall = new THREE.Mesh(shortWallGeom, concreteMat);
		leftWall.position.set(-400/2, 80/2, 0);
		leftWall.rotation.y = Math.PI/2;
		leftWall.receiveShadow = true;
		_scene.add(leftWall);

		var rightWall = new THREE.Mesh(shortWallGeom, concreteMat);
		rightWall.position.set(400/2, 80/2, 0);
		rightWall.rotation.y = -Math.PI/2;
		rightWall.receiveShadow = true;
		_scene.add(rightWall);
	}



	function addEffects() {

		//_renderer.addEffect(new THREE.BloomPass( 0.65 ));
	}



	function initPatterns() {
		// Box pattern
		var thisPattern = crteRandomBoxPattern();

		var xPosnNbr = SCULPTURE_LEFT_STRT_COORD_NBR - 100;  // Start the pattern to the left of the lights
		var yPosnNbr = MIN_LIGHT_HEIGHT_NBR;  // We won't care about height for now.
		var zPosnNbr = rtrvRandomZCoordWithinSculpture();

		// Add a new property to the object
		thisPattern.position = new THREE.Vector3(xPosnNbr, yPosnNbr, zPosnNbr);

		// Add a new property to the object
		var xVelocity = Math.random() * PATTERN_NBRS.MAX_SPEED;
		//var yVelocity = rtrvRandomPlusOrMinusOne() * Math.random() * PATTERN_NBRS.MAX_SPEED;
		//var zVelocity = rtrvRandomPlusOrMinusOne() * Math.random() * PATTERN_NBRS.MAX_SPEED;
		var yVelocity = 0, zVelocity = 0;
		thisPattern.velocity = new THREE.Vector3(xVelocity, yVelocity, zVelocity);

		// Add new properties to the object
		thisPattern.lightIntensityRatioIncrmntNbr = Math.random() * PATTERN_NBRS.MAX_INTENSITY_INCRMNT_RATIO;
		thisPattern.renderLoopsCnt = 0;
		thisPattern.matrixWorld = new THREE.Matrix4();
		thisPattern.worldVertices = [];

		_availablePatterns.push(thisPattern);
	}



	/*
	 * Creates a randomly sized and positioned 
	 */
	function crteRandomBoxPattern() {
		var width = Math.max(1, Math.random() * BOX_MAX_NBRS.WIDTH);
		var height = Math.max(1, Math.random() * BOX_MAX_NBRS.HEIGHT);
		var depth = Math.max(1, Math.random() * BOX_MAX_NBRS.DEPTH);

		return new BoxPattern(width, height, depth);
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
	 * Returns a random Z coordinate that exists within the bounds of the light scuplture.
	 */
	function rtrvRandomZCoordWithinSculpture() {
		var zDstncFromCenterNbr = Math.random() * SCULPTURE_FAR_STRT_COORD_NBR;
		
		var zSideOfCenter = rtrvRandomPlusOrMinusOne();

		zDstncFromCenterNbr *= zSideOfCenter;

		return SCULPTURE_FAR_STRT_COORD_NBR + zDstncFromCenterNbr;
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
		window.requestAnimationFrame(animate);
		render();
		_stats.update();
	}



	function render() {
		var delta = _clock.getDelta();
		
		// Update _camera
		_cameraControls.update(delta);


		// Change light intensities
		animateLightIntensities();

		// Render
		_renderer.render(_scene, _camera);
	}



	/*
	 * Based on given patterns, changes the intensity of the sculptural lights.
	 */
	function animateLightIntensities() {
		if (_clock.getElapsedTime() % 2000 < 50) {
			var idx = Math.floor(Math.random() * _availablePatterns.length);

			_activePatterns.push(_availablePatterns[idx]);
		}

		var newActivePatterns = [];

		// Process the active patterns to accumulate their effects on the lights
		for (var idx = 0; idx < _activePatterns.length; idx++) {
			var thisPattern = _activePatterns[idx];
			thisPattern.renderLoopsCnt++;

			// Translate the pattern.
			thisPattern.position.add(thisPattern.velocity);
			thisPattern.matrixWorld.identity();
			thisPattern.matrixWorld.setPosition(thisPattern.position);

			// Calcucate the pattern's vertices in world coordinates (THREE.js stores vertices in object space)
			calcVerticesInWorldCoords(thisPattern);


			var patternLightIntensityEffectNbr;
			var thisPatternPropIdTxt = PATTERN_ID_PROP_TXT + thisPattern.id.toString();

			// Loop through all the lights to see if this pattern intersects each one
			for (var idx = 0; idx < _sculptureLightGeometries.length; idx++) {
				var thisLightGeom = _sculptureLightGeometries[idx];
				// Determine if any points lie within the pattern
				if (thisPattern.isPointInside(_sculptureLights[idx].position)) {

					// Update this pattern's existing effect on this light.
					if (thisLightGeom[thisPatternPropIdTxt] != "undefined") {
						thisLightGeom[thisPatternPropIdTxt] = Math.ceil(1, thisLightGeom[thisPatternPropIdTxt] + thisPattern.lightIntensityRatioIncrmntNbr);
					} else {
						thisLightGeom[thisPatternPropIdTxt] = 0;
					}

					/*
					// Calculate the effect on the light's intensity ratio this pattern will have this round. The light's ratio cannot exceed 1.
					patternLightIntensityEffectNbr = Math.floor(thisPattern.lightIntensityRatioIncrmntNbr,
														   		1 - thisLightGeom.lightIntensityRatioNbr + thisLightGeom.lightIntensityRatioDeltaNbr 
														   		- thisPattern.lightIntensityRatioIncrmntNbr);

					// Ensure this effect is not negative.
					patternLightIntensityEffectNbr = Math.ceil(patternLightIntensityEffectNbr, 0);

					// Update the count of this pattern's effect on this light.
					if (thisLightGeom["pattern" + thisPattern.id.toString()] != "undefined") {
						// We have a property for this pattern ID already
					} else {
						thisLightGeom["pattern" + thisPattern.id.toString()] = 0;
					}

					thisLightGeom["pattern" + thisPattern.id.toString()] += patternLightIntensityEffectNbr;


					// Update the light's new intensity ratio
					thisLightGeom.lightIntensityRatioDeltaNbr += patternLightIntensityEffectNbr;
					*/

					// Keep those patterns which have affected a light or which are early in their lives.
					if (newActivePatterns.indexOf(thisPattern) === -1 || thisPattern.renderLoopsCnt <= 20) {
						newActivePatterns.push(thisPattern);
					}
				
				} else if (thisLightGeom[thisPatternPropIdTxt] != undefined 
						   && thisLightGeom[thisPatternPropIdTxt] > 0) {
					// This light was previously touched by this pattern, so we must dim it accordingly.

					// Update this pattern's existing effect on this light.
					thisLightGeom[thisPatternPropIdTxt] = Math.ceil(0, thisLightGeom[thisPatternPropIdTxt] - thisPattern.lightIntensityRatioIncrmntNbr);
					
					/*
					// Calculate the effect on the light's intensity ratio this pattern will have this round. The light's ratio cannot fall below 0.
					patternLightIntensityEffectNbr = Math.floor(thisPattern.lightIntensityRatioIncrmntNbr,
														   	   (thisLightGeom.lightIntensityRatioNbr + thisLightGeom.lightIntensityRatioDeltaNbr 
														   		- thisPattern.lightIntensityRatioIncrmntNbr);

					// Ensure this effect is not negative.
					patternLightIntensityEffectNbr = Math.ceil(patternLightIntensityEffectNbr, 0);

					// Update the count of this pattern's effect on this light.
					thisLightGeom["pattern" + thisPattern.id.toString()] -= thisPattern.lightIntensityIncrmntNbr;

					// Update the light's new intensity ratio
					thisLightGeom.lightIntensityRatioDeltaNbr -= patternLightIntensityEffectNbr;
					*/

					// If this pattern's effect has been completely removed from the light, delete the pattern's property from it.
					if (thisLightGeom[thisPatternPropIdTxt] <= 0) {
						delete thisLightGeom[thisPatternPropIdTxt];
					} else {
						// Keep those patterns which have affected a light or which are early in their lives.
						if (newActivePatterns.indexOf(thisPattern) === -1) {
							newActivePatterns.push(thisPattern);
						}
					}
				}
			}
		}

		// Update our list of active patterns.
		_activePatterns = newActivePatterns;

		var newColor = new THREE.Color();

		// Now process the lights, accumulating the effects of the patterns of each one.
		for (var idx = 0; idx < _sculptureLightGeometries.length; idx++) {

			var thisLightGeom = _sculptureLightGeometries[idx];
			var intensityRatioNbr = 0;


			// Accumulate the effects of this light's affecting patterns.
			for (prop in thisLightGeom) {
				if (prop.indexOf(PATTERN_ID_PROP_TXT) > -1) {
					intensityRatioNbr += thisLightGeom[prop];

					// If we hit the maximum ratio, we can stop accumulating.
					if (intensityRatioNbr >= 1) {
						intensityRatioNbr = Math.floor(1, intensityRatioNbr);
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


} (window.Main = window.Main || {}, jQuery) );