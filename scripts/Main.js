/*
 * Creates a kinetic sculpture comprised of lights.
 *
 * The light glow effect is based on http://bkcore.com/blog/3d/webgl-three-js-animated-selective-glow.html.
 *
 * This uses a Self-Executing Anonymous Function to declare the namespace "Main" and create public and private members within in.
 */

/*
 * Main: Defines the namespace to use for public members of this class.
 * $: The shorthand to use for jQuery.
 * undefined: Nothing should be passed via this parameter. This ensures that you can use "undefined" here without worrying that another loaded
 * 			  script as redefined the global variable "undefined".
 */
(function(Main, $, undefined) {

	/*
	 * Constants
	 */
	var CAM_TARGET_Y_COORD_NBR = 25;
	var CAM_POS_Z_COORD_NBR = 175;
	var SCULPTURE_ROW_CNT = 9, SCULPTURE_COL_CNT = 21, SCULPTURE_LIGHT_SRC_INTRVL_NBR = 5;
	var SCULPTURE_LIGHT_WDTH_NBR = 5, SCULPTURE_LIGHT_HGHT_NBR = 5, SCULPTURE_LIGHT_DPTH_NBR = 0.5, SCULPTURE_LIGHT_MARGIN_NBR = 1;
	var SCULPTURE_LEFT_STRT_COORD_NBR = -(SCULPTURE_COL_CNT * (SCULPTURE_LIGHT_WDTH_NBR + SCULPTURE_LIGHT_MARGIN_NBR))/2 + SCULPTURE_LIGHT_MARGIN_NBR;
	var SCULPTURE_FAR_STRT_COORD_NBR = -(SCULPTURE_ROW_CNT * (SCULPTURE_LIGHT_HGHT_NBR + SCULPTURE_LIGHT_MARGIN_NBR))/2 + SCULPTURE_LIGHT_MARGIN_NBR;
	var SCALE = 1;
	//var WARM_LIGHT_CLR = new THREE.Color(0xFFF1E0);
	var WARM_LIGHT_CLR = new THREE.Color(0xE5D9CA), OFF_LIGHT_CLR = new THREE.Color(0x090909);
	var MAX_LIGHT_INTENSITY_NBR = 2.2, START_LIGHT_INTENSITY_NBR = 0.00, DIRECT_LIGHT_INTENSITY_NBR = 0.14;
	var MIN_LIGHT_HEIGHT_NBR = 50, MAX_LIGHT_HEIGHT_NBR = 55, MIN_LIGHT_HEIGHT_CHG_INCRMNT_NBR = 1, MAX_LIGHT_HEIGHT_CHG_INCRMNT_NBR = 4;


	/*
	 * Global variables
	 */
	var camera, scene, renderer, stats, clock;
	var	cameraControls, effectController, eyeTargetScale, target = new THREE.Vector3(0, 0, 0);
	var canvasWidth = window.innerWidth, canvasHeight = window.innerHeight;
	var canvasHalfX = window.innerWidth / 2, canvasHalfY = window.innerHeight / 2;
	var sculptureLightSources = [], sculptureLightGeometries = [], sculptureLights = [];
	var lightHeightNbr, lightHeightDirNbr, lightHeightChgIncrmntNbr;


	/*
	 * Public methods
	 */
	Main.Init = function() {

		// Renderer
		renderer = new THREE.WebGLDeferredRenderer( { antialias: true, scale: SCALE, brightness: 5, tonemapping: THREE.FilmicOperator } );
		//renderer = new THREE.WebGLRenderer( { antialias: true, scale: SCALE } );
		renderer.setSize(canvasWidth, canvasHeight);  // Cannot set size via constructor parameters for WebGLRenderer.
		// Gamma correction
		renderer.gammaInput = true;
		renderer.gammaOutput = true;
		
		renderer.shadowMapEnabled = true;  // Shadows are enabled.

		var container = document.getElementById('container');
		container.appendChild( renderer.domElement );

		// Stats
		stats = new Stats();
		stats.domElement.style.position = "absolute";
		stats.domElement.style.top = "8px";
		stats.domElement.style.zIndex = 100;
		container.appendChild(stats.domElement);


		scene = new THREE.Scene();

		initCamera();
		initLights();
		initGUI();
		addEnvironment();
		addEffects();


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
		scene.add(cube);
				

		clock = new THREE.Clock();

		
		$(window).load( function() {
			animate();
		});
	};



	/*
	 * Private methods
	 */

	function initCamera() {
		camera = new THREE.PerspectiveCamera(46, canvasWidth / canvasHeight, 1, 1000);
		camera.position.set(0, 5, CAM_POS_Z_COORD_NBR);
		//scene.add(camera);  // Do not need to add the camera to the scene if using EffectComposer.
		cameraControls = new THREE.OrbitAndPanControls(camera, renderer.domElement);
		cameraControls.target.set(0, CAM_TARGET_Y_COORD_NBR, 0);

		var startDirectionVect = new THREE.Vector3();
		startDirectionVect.subVectors( camera.position, cameraControls.target );
		eyeTargetScale = Math.tan(camera.fov * (Math.PI/180)/2) * startDirectionVect.length();
	}



	function initLights() {
		//AmbientLight is not currently supported in WebGLDeferredRenderer, so we are using a directional light instead.
		//scene.add(new THREE.AmbientLight(0xFFFFFF));

		var directionalLight = new THREE.HemisphereLight(WARM_LIGHT_CLR.getHex(), WARM_LIGHT_CLR.getHex(), DIRECT_LIGHT_INTENSITY_NBR);
		//directionalLight.position.set(-1, 1, 0);
		scene.add(directionalLight);

		for (var i = 0; i < SCULPTURE_ROW_CNT; i++) {

			// Randomly select each row's starting height, height change increment, and height change direction (i.e., sloping up or down)
			lightHeightNbr = (Math.random() * (MAX_LIGHT_HEIGHT_NBR - MIN_LIGHT_HEIGHT_NBR)) + MIN_LIGHT_HEIGHT_NBR;

			if (Math.random() <= 0.49) {
				lightHeightDirNbr = -1;
			} else {
				lightHeightDirNbr = 1;
			}

			lightHeightChgIncrmntNbr = (Math.random() * MAX_LIGHT_HEIGHT_CHG_INCRMNT_NBR) + MIN_LIGHT_HEIGHT_CHG_INCRMNT_NBR;


			for (var j = 0; j < SCULPTURE_COL_CNT; j++) {
				crteSculptureLight(i, j);

				lightHeightNbr += lightHeightDirNbr * lightHeightChgIncrmntNbr;

				if (lightHeightNbr <= MIN_LIGHT_HEIGHT_NBR) {
					lightHeightDirNbr = -lightHeightDirNbr;
				} else if (lightHeightNbr >= MAX_LIGHT_HEIGHT_NBR) {
					lightHeightDirNbr = -lightHeightDirNbr;
				}
			}
		}
	}



	function initGUI() {
		var gui = new dat.GUI();

		effectController = {
			intensity: START_LIGHT_INTENSITY_NBR
		};

		gui.add(effectController, "intensity", 0.00, 1.00).step(0.01).onChange(onParmsChange);
	}


	/*
	 * Creates a light for the sculpture.
	 *
	 * inpLightRowIdx: The index of this light's row.
	 * inpLightColIdx: The index of this light's column.
	 */
	function crteSculptureLight(inpLightRowIdx, inpLightColIdx) {

		var lightIdx = inpLightRowIdx * SCULPTURE_COL_CNT + inpLightColIdx;

		var lightSrc = new THREE.AreaLight(WARM_LIGHT_CLR.getHex(), START_LIGHT_INTENSITY_NBR);
		sculptureLightSources[lightIdx] = lightSrc;
		//lightSrc = new THREE.SpotLight(WARM_LIGHT_CLR.getHex(), sculptureLightIntensityNbr, 250);
		lightSrc.angle = Math.PI/2;  // Should not go past PI/2.
		lightSrc.castShadow = true;
		lightSrc.shadowCameraNear = 0.1;  // Set the near plane for the shadow camera frustum as close to the light as  possible.
		lightSrc.shadowCameraFov = 130;  // Default is 50.
		lightSrc.shadowCameraVisible = false;  // Does not apply to WebGLDeferredRenderer.

		var lightXCoordNbr = SCULPTURE_LEFT_STRT_COORD_NBR + (inpLightColIdx * (SCULPTURE_LIGHT_WDTH_NBR + SCULPTURE_LIGHT_MARGIN_NBR));
		var lightZCoordNbr = SCULPTURE_FAR_STRT_COORD_NBR + (inpLightRowIdx * (SCULPTURE_LIGHT_HGHT_NBR + SCULPTURE_LIGHT_MARGIN_NBR));

		lightSrc.position.set(lightXCoordNbr, lightHeightNbr, lightZCoordNbr);
		lightSrc.width = 1;
		lightSrc.height = 1;


		// Having many lights in a scene is expensive so we will only add a light source at a certain interval.
		if (lightIdx % SCULPTURE_LIGHT_SRC_INTRVL_NBR === 0) {
			scene.add(lightSrc);
		}


		var sculptureLightGeom = new THREE.CubeGeometry(SCULPTURE_LIGHT_WDTH_NBR, SCULPTURE_LIGHT_DPTH_NBR, SCULPTURE_LIGHT_HGHT_NBR);
		sculptureLightGeometries[lightIdx] = sculptureLightGeom;

		// Setting vertexColors = FaceColors allows you to set the color of each face independently.
		// NOTE: Set the mesh ambient and diffuse colors to the full intensity of the lights they represent; otherwise, they will not glow.
		var sculptureLightMat = new THREE.MeshBasicMaterial( {color: lightSrc.color.getHex(), ambient: lightSrc.color.getHex(), vertexColors: THREE.FaceColors} );

		// Now set ALL the faces to the desired "off" color and set colorsNeedUpdate to true. This will cause the lights to appear off upon first render.
		for (var i = 0; i < sculptureLightGeom.faces.length; i++) {
			sculptureLightGeom.faces[i].color.setHex(OFF_LIGHT_CLR.getHex());			
		}
		sculptureLightGeom.colorsNeedUpdate = true;

		var sculptureLight = new THREE.Mesh(sculptureLightGeom, sculptureLightMat);
		sculptureLights[lightIdx] = sculptureLight;

		sculptureLight.position = lightSrc.position;
		sculptureLight.rotation = lightSrc.rotation;
		sculptureLight.scale = lightSrc.scale;
		sculptureLight.receiveShadow = true;

		scene.add(sculptureLight);
	}



	/*
	 * 
	 */
	function addEnvironment() {
		var floorMap = THREE.ImageUtils.loadTexture( "textures/Ground_Concrete.jpg" );
		floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
		floorMap.repeat.set(3, 3);
		floorMap.anisotropy = 4;

		// The lower the specular value is, the less shiny the material will be. The closer it is to the diffuse color, the more it will look like metal.
		var floor = new THREE.Mesh( new THREE.PlaneGeometry( 300, 300 ), new THREE.MeshPhongMaterial( { color: 0x808080, ambient: 0xFFFFFF, specular: 0x141414, shininess: 05, map: floorMap, bumpMap: floorMap, bumpScale: 0.05 } ) );
		//floor.rotation.y = Math.PI;  // The repetition of the pattern is less obvious from the side.
		floor.rotation.x = -Math.PI/2;
		floor.receiveShadow = true;
		scene.add( floor );
	}



	function addEffects() {

		//renderer.addEffect(new THREE.BloomPass( 0.65 ));
	}



	/*
	 * For performance reasons we only want to update values when the user actually changes parameters.
	 */
	function onParmsChange() {
		// Update lights
		var newColor = new THREE.Color();
		newColor.copy(OFF_LIGHT_CLR);
		newColor.lerp(WARM_LIGHT_CLR, effectController.intensity);

		for (i = 0; i < sculptureLightSources.length; i++) {
			sculptureLightSources[i].intensity = effectController.intensity * MAX_LIGHT_INTENSITY_NBR;

			sculptureLightGeometries[i].faces[3].color.copy(newColor);
			sculptureLightGeometries[i].colorsNeedUpdate = true;
		}
	}



	function animate() {
		// Rendering loop.
		window.requestAnimationFrame(animate);
		render();
		stats.update();
	}



	function render() {
		var delta = clock.getDelta();
		
		// Update camera
		cameraControls.update(delta);


		// Render
		renderer.render(scene, camera);
	}



	function animateLights() {

		// Some starter code
		var heightChgNbr = (0.001 * clock.getElapsedTime()) % 15;
		var newHeightNbr = sculptureLightSources[9].position.y + (heightChgNbr * heightChgDirectionNbr);

		if (newHeightNbr <= 35) {
			newHeightNbr = 35;
			heightChgDirectionNbr = -heightChgDirectionNbr;
		} else if (newHeightNbr >= 65) {
			newHeightNbr = 65;
			heightChgDirectionNbr = -heightChgDirectionNbr;
		}

		sculptureLightSources[9].position.setY(newHeightNbr);
		sculptureLights[9].position.setY(newHeightNbr);
	}


} (window.Main = window.Main || {}, jQuery) );