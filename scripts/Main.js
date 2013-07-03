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


	/*
	 * Global variables
	 */
	var camera, scene, renderer, stats, clock;
	var	cameraControls, effectController, eyeTargetScale, target = new THREE.Vector3(0, 0, 0);
	var canvasWidth = window.innerWidth, canvasHeight = window.innerHeight;
	var canvasHalfX = window.innerWidth / 2, canvasHalfY = window.innerHeight / 2;
	var areaLight, mainSceneAreaLights = [];
	var	areaLightIntensityNbr = 20, areaLightOpacityNbr = 1;


	/*
	 * Public methods
	 */
	Main.Init = function() {

		// Renderer
		renderer = new THREE.WebGLDeferredRenderer( { antialias: true, width: canvasWidth, height: canvasHeight, scale: SCALE, tonemapping: THREE.FilmicOperator, brightness: 2.5 } );
		// Gamma correction
		renderer.gammaInput = true;
		renderer.gammaOutput = true;
		//renderer.setClearColorHex(0x0);  // Not available in WebGLDeferredRenderer
		
		renderer.shadowMapEnabled = true;  // Shadows are enabled.

		var container = document.getElementById('container');
		container.appendChild( renderer.domElement );

		// Main scene
		scene = new THREE.Scene();
		//scene.fog = new THREE.Fog( 0x0, 2000, 4000 );


		initCamera();
		initLights();
		initGUI();
		addEffects();


		var cube;
		var cubeSizeLength = 10;
		var goldColor = "#FFDF00";
		var showFrame = true;
		var wireMaterial = new THREE.MeshPhongMaterial( { color: goldColor } ) ;

		var cubeGeometry = new THREE.CubeGeometry(cubeSizeLength, cubeSizeLength, cubeSizeLength);

		cube = new THREE.Mesh( cubeGeometry, wireMaterial );
		cube.position.x = -10;	// centered at origin
		cube.position.y = 0;	// centered at origin
		cube.position.z = 0;	// centered at origin
		scene.add(cube);
				
		var floorMap = THREE.ImageUtils.loadTexture( "textures/Ground_Concrete.jpg" );
		floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
		floorMap.repeat.set(3, 3);
		floorMap.anisotropy = 4;

		//colors: 808080 - not bad, 323232
		var floor = new THREE.Mesh( new THREE.PlaneGeometry( 300, 300 ), new THREE.MeshPhongMaterial( { color: 0x808080, specular: 0x141414, shininess: 05, map: floorMap, bumpMap: floorMap, bumpScale: 0.05 } ) );
		//floor.rotation.y = Math.PI;  // The repetition of the pattern is less obvious from the side.
		floor.rotation.x = -Math.PI/2;
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
		camera.position.set( 0, 110, -250 );
		//scene.add(camera);  // Do not need to add the camera to the scene if using EffectComposer.
		cameraControls = new THREE.OrbitAndPanControls(camera, renderer.domElement);
		cameraControls.target.set(0, 0, 0);

		var startDirectionVect = new THREE.Vector3();
		startDirectionVect.subVectors( camera.position, cameraControls.target );
		eyeTargetScale = Math.tan(camera.fov * (Math.PI/180)/2) * startDirectionVect.length();
	}



	function initLights() {

		crteSculptureLight();
	}



	function initGUI() {
		var gui = new dat.GUI();

		effectController = {
			intensity: areaLightIntensityNbr,
			opaqueness: areaLightOpacityNbr
		};

		gui.add( effectController, "intensity", 0.0, 100.0 ).step(1.0);
		gui.add( effectController, "opaqueness", 0.0, 1.0).step(0.01);
	}



	function crteSculptureLight() {
		areaLight = new THREE.AreaLight(0xFFFFFF, areaLightIntensityNbr);

		areaLight.position.set(0, 100, 0);
		areaLight.rotation.set(20 * Math.PI/180, 0, 0);
		areaLight.width = 10;
		areaLight.height = 1;
		// Note: Setting the attenuation just makes the light turn off for some reason.
		scene.add(areaLight);	


		var lightGeom = new THREE.CubeGeometry(10, 1, 10);
		var lightMat = new THREE.MeshBasicMaterial( {color: areaLight.color.getHex(), vertexColors: THREE.FaceColors} );

		var backColorNbr = 0x222222;

		lightGeom.faces[5].color.setHex(backColorNbr);
		lightGeom.faces[4].color.setHex(backColorNbr);
		lightGeom.faces[2].color.setHex(backColorNbr);
		lightGeom.faces[1].color.setHex(backColorNbr);
		lightGeom.faces[0].color.setHex(backColorNbr);

		var lightMesh = new THREE.Mesh(lightGeom, lightMat);

		lightMesh.position = areaLight.position;
		lightMesh.rotation = areaLight.rotation;
		lightMesh.scale = areaLight.scale;

		scene.add(lightMesh);
	}



	function addEffects() {

		renderer.addEffect(new THREE.BloomPass( 0.65 ));
	}	



	function render() {
		//whiteTexture.needsUpdate = true;  // Not sure if this is needed in this situation...
		
		var delta = clock.getDelta();
		
		// Update camera
		cameraControls.update(delta);

		// Update light
		areaLight.intensity = effectController.intensity;

		renderer.render(scene, camera);
	}


} (window.Main = window.Main || {}, jQuery) );