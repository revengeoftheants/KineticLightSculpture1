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
(function( Main, $, undefined) {

	/*
	 * Constants
	 */
	var SCALE = 1;
	var WARM_LIGHT_CLR = new THREE.Color(0xFFF1E0);
	var OFF_LIGHT_CLR = new THREE.Color(0x151515);


	/*
	 * Global variables
	 */
	var camera, scene, renderer, stats, clock;
	var	cameraControls, effectController, eyeTargetScale, target = new THREE.Vector3(0, 0, 0);
	var canvasWidth = window.innerWidth, canvasHeight = window.innerHeight;
	var canvasHalfX = window.innerWidth / 2, canvasHalfY = window.innerHeight / 2;
	var sculptureLightSrc, mainScenesculptureLights = [];
	var	sculptureLightIntensityNbr = 2, sculptureLightOpacityNbr = 1, sculptureLightGrayscaleNbr = 1;
	var sculptureLightMat, sculptureLightGeom;
	var cnt = 0;


	/*
	 * Public methods
	 */
	Main.Init = function() {

		// Renderer
		//renderer = new THREE.WebGLDeferredRenderer( { antialias: true, scale: SCALE, brightness: 5, tonemapping: THREE.FilmicOperator } );
		renderer = new THREE.WebGLRenderer( { antialias: true, scale: SCALE } );
		renderer.setSize(canvasWidth, canvasHeight);  // Cannot set size via constructor parameters for WebGLRenderer.
		// Gamma correction
		renderer.gammaInput = true;
		renderer.gammaOutput = true;
		
		renderer.shadowMapEnabled = true;  // Shadows are enabled.

		var container = document.getElementById('container');
		container.appendChild( renderer.domElement );

		// Main scene
		scene = new THREE.Scene();


		initCamera();
		initLights();
		initGUI();
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
				

		clock = new THREE.Clock();
		
		$(window).load( function() {
			Main.Animate();
		});
	};



	Main.Animate = function() {
		// Rendering loop.
		window.requestAnimationFrame(Main.Animate);
		render();
	};





	/*
	 * Private methods
	 */

	function initCamera() {
		camera = new THREE.PerspectiveCamera(46, canvasWidth / canvasHeight, 1, 1000);
		camera.position.set( 0, 110, -100 );
		//scene.add(camera);  // Do not need to add the camera to the scene if using EffectComposer.
		cameraControls = new THREE.OrbitAndPanControls(camera, renderer.domElement);
		cameraControls.target.set(0, 0, 0);

		var startDirectionVect = new THREE.Vector3();
		startDirectionVect.subVectors( camera.position, cameraControls.target );
		eyeTargetScale = Math.tan(camera.fov * (Math.PI/180)/2) * startDirectionVect.length();
	}



	function initLights() {
		scene.add(new THREE.AmbientLight(0xFFFFFF));
		crteSculptureLight();
	}



	function initGUI() {
		var gui = new dat.GUI();

		effectController = {
			intensity: sculptureLightIntensityNbr,
			opaqueness: sculptureLightOpacityNbr,
			lightOnRatio: 1
		};

		gui.add( effectController, "intensity", 0, 5).step(0.1).onChange(onParmsChange);
		gui.add( effectController, "opaqueness", 0.0, 1.0).step(0.01).onChange(onParmsChange);
		gui.add( effectController, "lightOnRatio", 0.0, 1.0).step(0.01).onChange(onParmsChange);
	}



	function crteSculptureLight() {
		//sculptureLight = new THREE.sculptureLight(0xFFFFFF, sculptureLightIntensityNbr);
		sculptureLightSrc = new THREE.SpotLight(WARM_LIGHT_CLR.getHex(), sculptureLightIntensityNbr, 250);
		sculptureLightSrc.angle = Math.PI/2;  // Should not go past PI/2.
		sculptureLightSrc.castShadow = true;
		sculptureLightSrc.shadowCameraNear = 0.1;  // Set the near plane for the shadow camera frustum as close to the light as  possible.
		sculptureLightSrc.shadowCameraFov = 130;  // Default is 50.
		sculptureLightSrc.shadowCameraVisible = true;


		sculptureLightSrc.position.set(0, 25, 0);
		sculptureLightSrc.width = 1;
		sculptureLightSrc.height = 1;
		// Note: Setting the attenuation just makes the light turn off for some reason.
		scene.add(sculptureLightSrc);	


		sculptureLightGeom = new THREE.CubeGeometry(5, 0.5, 5);
		// Setting vertexColors = FaceColors allows you to set the color of each face independently.
		sculptureLightMat = new THREE.MeshBasicMaterial( {color: sculptureLightSrc.color.getHex(), vertexColors: THREE.FaceColors} );

		var backColorNbr = OFF_LIGHT_CLR;
		//var backColorNbr = 0x151515;

		sculptureLightGeom.faces[5].color.setHex(backColorNbr);
		sculptureLightGeom.faces[4].color.setHex(backColorNbr);
		sculptureLightGeom.faces[2].color.setHex(backColorNbr);
		sculptureLightGeom.faces[1].color.setHex(backColorNbr);
		sculptureLightGeom.faces[0].color.setHex(backColorNbr);

		var sculptureLight = new THREE.Mesh(sculptureLightGeom, sculptureLightMat);

		sculptureLight.position = sculptureLightSrc.position;
		sculptureLight.rotation = sculptureLightSrc.rotation;
		sculptureLight.scale = sculptureLightSrc.scale;

		scene.add(sculptureLight);


		/* Don't think I need any shades -- the lights in the video don't have shades.
		var shadeGeom = new THREE.CubeGeometry(10, 10, 1);
		var shadeMat = new THREE.MeshBasicMaterial( { color: 0x000000} );
		var shade = new THREE.Mesh(shadeGeom, shadeMat);
		shade.castShadow = true;
		//shade.position.set(sculptureLight.x - (sculptureLight.width/2), sculptureLight.y - (sculptureLight.height/2), sculptureLight.z);
		shade.position.set(sculptureLight.position.x + sculptureLightGeom.width/2, sculptureLight.position.y + shadeGeom.height/5, sculptureLight.position.z);
		shade.rotation.setY(Math.PI/2);
		scene.add(shade);
		*/

	}



	function addEffects() {

		//renderer.addEffect(new THREE.BloomPass( 0.65 ));
	}



	/*
	 * For performance reasons we only want to update values when the user actually changes parameters.
	 */
	function onParmsChange() {
		// Update light
		sculptureLightSrc.intensity = effectController.intensity;

		var newColor = new THREE.Color();
		newColor.copy(OFF_LIGHT_CLR);
		newColor.lerp(WARM_LIGHT_CLR, effectController.lightOnRatio);

		sculptureLightGeom.faces[3].color.copy(newColor);
		sculptureLightGeom.colorsNeedUpdate = true;
	}



	function render() {
		var delta = clock.getDelta();
		
		// Update camera
		cameraControls.update(delta);

		renderer.render(scene, camera);
	}


} (window.Main = window.Main || {}, jQuery) );