/*
 * Based on three.js's CubeGeometry.
 */
BoxPattern = function ( width, height, depth) {

	THREE.Geometry.call( this );

	var scope = this;

	this.width = width;
	this.height = height;
	this.depth = depth;

	this.widthSegments = 1;
	this.heightSegments = 1;
	this.depthSegments = 1;

	var width_half = this.width / 2;
	var height_half = this.height / 2;
	var depth_half = this.depth / 2;

	buildPlane( 'z', 'y', - 1, - 1, this.depth, this.height, width_half, 0 ); // px
	buildPlane( 'z', 'y',   1, - 1, this.depth, this.height, - width_half, 1 ); // nx
	buildPlane( 'x', 'z',   1,   1, this.width, this.depth, height_half, 2 ); // py
	buildPlane( 'x', 'z',   1, - 1, this.width, this.depth, - height_half, 3 ); // ny
	buildPlane( 'x', 'y',   1, - 1, this.width, this.height, depth_half, 4 ); // pz
	buildPlane( 'x', 'y', - 1, - 1, this.width, this.height, - depth_half, 5 ); // nz

	function buildPlane( u, v, udir, vdir, width, height, depth, materialIndex ) {

		var w, ix, iy,
		gridX = scope.widthSegments,
		gridY = scope.heightSegments,
		width_half = width / 2,
		height_half = height / 2,
		offset = scope.vertices.length;

		if ( ( u === 'x' && v === 'y' ) || ( u === 'y' && v === 'x' ) ) {

			w = 'z';

		} else if ( ( u === 'x' && v === 'z' ) || ( u === 'z' && v === 'x' ) ) {

			w = 'y';
			gridY = scope.depthSegments;

		} else if ( ( u === 'z' && v === 'y' ) || ( u === 'y' && v === 'z' ) ) {

			w = 'x';
			gridX = scope.depthSegments;

		}

		var gridX1 = gridX + 1,
		gridY1 = gridY + 1,
		segment_width = width / gridX,
		segment_height = height / gridY,
		normal = new THREE.Vector3();

		normal[ w ] = depth > 0 ? 1 : - 1;

		for ( iy = 0; iy < gridY1; iy ++ ) {

			for ( ix = 0; ix < gridX1; ix ++ ) {

				var vector = new THREE.Vector3();
				vector[ u ] = ( ix * segment_width - width_half ) * udir;
				vector[ v ] = ( iy * segment_height - height_half ) * vdir;
				vector[ w ] = depth;

				scope.vertices.push( vector );

			}

		}

		for ( iy = 0; iy < gridY; iy++ ) {

			for ( ix = 0; ix < gridX; ix++ ) {

				var a = ix + gridX1 * iy;
				var b = ix + gridX1 * ( iy + 1 );
				var c = ( ix + 1 ) + gridX1 * ( iy + 1 );
				var d = ( ix + 1 ) + gridX1 * iy;

				var face = new THREE.Face4( a + offset, b + offset, c + offset, d + offset );
				face.normal.copy( normal );
				face.vertexNormals.push( normal.clone(), normal.clone(), normal.clone(), normal.clone() );
				face.materialIndex = materialIndex;

				scope.faces.push( face );
				scope.faceVertexUvs[ 0 ].push( [
							new THREE.Vector2( ix / gridX, 1 - iy / gridY ),
							new THREE.Vector2( ix / gridX, 1 - ( iy + 1 ) / gridY ),
							new THREE.Vector2( ( ix + 1 ) / gridX, 1- ( iy + 1 ) / gridY ),
							new THREE.Vector2( ( ix + 1 ) / gridX, 1 - iy / gridY )
						] );

			}

		}

	}

	this.computeCentroids();
	this.mergeVertices();

};

/*
 * Inherit from THREE.Geometry
 */
BoxPattern.prototype = Object.create( THREE.Geometry.prototype );



/*
 * Determines if a point lies within this shape.
 *
 * @param inpPoint: A THREE.Vector3 object representing the point to check
 * @returns A Boolean
 */
BoxPattern.prototype.isPointInside = function (inpPoint) {

	var rtnInd;
	
	if (inpPoint instanceof THREE.Vector3) {
		// continue
	} else {
		throw "inpPoint is not an instance of THREE.Vector3.";
	}

	var minX, minY, minZ, maxX, maxY, maxZ;

	for (var idx = 0; idx < this.worldVertices.length; idx++) {
		var vertex = this.worldVertices[idx];

		if (vertex.x < minX || minX == undefined) {
			minX = vertex.x;
		}

		/* We will ignore height for now.
		if (vertex.y < minY || minY == undefined) {
			minY = vertex.y;
		}
		*/

		if (vertex.z < minZ || minZ == undefined) {
			minZ = vertex.z;
		}

		if (vertex.x > maxX || maxX == undefined) {
			maxX = vertex.x;
		}

		/* We will ignore height for now.
		if (vertex.y > maxY || maxY == undefined) {
			maxY = vertex.y;
		}
		*/

		if (vertex.z > maxZ || maxZ == undefined) {
			maxZ = vertex.z;
		}
	}


	//if (inpPoint.x > minX && inpPoint.x < maxX && inpPoint.y > minY && inpPoint.y < maxY && inpPoint.z > minZ && inpPoint.z < maxZ) {
	// We will ignore height for now.
	if (inpPoint.x > minX && inpPoint.x < maxX && inpPoint.z > minZ && inpPoint.z < maxZ) {
		rtnInd = true;
	} else {
		rtnInd = false;
	}

	return rtnInd;
};




/*
 * Based on three.js's SphereGeometry.
 */
SpherePattern = function ( radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength ) {

	THREE.Geometry.call( this );

	this.radius = radius = radius || 50;
	this.radiusSquaredNbr = Math.pow(this.radius, 2);

	this.widthSegments = widthSegments = Math.max( 3, Math.floor( widthSegments ) || 8 );
	this.heightSegments = heightSegments = Math.max( 2, Math.floor( heightSegments ) || 6 );

	this.phiStart = phiStart = phiStart !== undefined ? phiStart : 0;
	this.phiLength = phiLength = phiLength !== undefined ? phiLength : Math.PI * 2;

	this.thetaStart = thetaStart = thetaStart !== undefined ? thetaStart : 0;
	this.thetaLength = thetaLength = thetaLength !== undefined ? thetaLength : Math.PI;

	var x, y, vertices = [], uvs = [];

	for ( y = 0; y <= heightSegments; y ++ ) {

		var verticesRow = [];
		var uvsRow = [];

		for ( x = 0; x <= widthSegments; x ++ ) {

			var u = x / widthSegments;
			var v = y / heightSegments;

			var vertex = new THREE.Vector3();
			vertex.x = - radius * Math.cos( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );
			vertex.y = radius * Math.cos( thetaStart + v * thetaLength );
			vertex.z = radius * Math.sin( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );

			this.vertices.push( vertex );

			verticesRow.push( this.vertices.length - 1 );
			uvsRow.push( new THREE.Vector2( u, 1 - v ) );

		}

		vertices.push( verticesRow );
		uvs.push( uvsRow );

	}

	for ( y = 0; y < this.heightSegments; y ++ ) {

		for ( x = 0; x < this.widthSegments; x ++ ) {

			var v1 = vertices[ y ][ x + 1 ];
			var v2 = vertices[ y ][ x ];
			var v3 = vertices[ y + 1 ][ x ];
			var v4 = vertices[ y + 1 ][ x + 1 ];

			var n1 = this.vertices[ v1 ].clone().normalize();
			var n2 = this.vertices[ v2 ].clone().normalize();
			var n3 = this.vertices[ v3 ].clone().normalize();
			var n4 = this.vertices[ v4 ].clone().normalize();

			var uv1 = uvs[ y ][ x + 1 ].clone();
			var uv2 = uvs[ y ][ x ].clone();
			var uv3 = uvs[ y + 1 ][ x ].clone();
			var uv4 = uvs[ y + 1 ][ x + 1 ].clone();

			if ( Math.abs( this.vertices[ v1 ].y ) === this.radius ) {

				this.faces.push( new THREE.Face3( v1, v3, v4, [ n1, n3, n4 ] ) );
				this.faceVertexUvs[ 0 ].push( [ uv1, uv3, uv4 ] );

			} else if ( Math.abs( this.vertices[ v3 ].y ) === this.radius ) {

				this.faces.push( new THREE.Face3( v1, v2, v3, [ n1, n2, n3 ] ) );
				this.faceVertexUvs[ 0 ].push( [ uv1, uv2, uv3 ] );

			} else {

				this.faces.push( new THREE.Face4( v1, v2, v3, v4, [ n1, n2, n3, n4 ] ) );
				this.faceVertexUvs[ 0 ].push( [ uv1, uv2, uv3, uv4 ] );

			}

		}

	}

	this.computeCentroids();
	this.computeFaceNormals();

	this.boundingSphere = new THREE.Sphere( new THREE.Vector3(), radius );

};

/*
 * Inherit from THREE.Geometry
 */
SpherePattern.prototype = Object.create( THREE.Geometry.prototype );



/*
 * Determines if a point lies within this shape.
 *
 * @param inpPoint: A THREE.Vector3 object representing the point to check
 * @returns A Boolean
 */
SpherePattern.prototype.isPointInside = function (inpPoint) {

	var rtnInd = false;
	
	var distSquaredNbr = Math.pow(inpPoint.x - this.position.x, 2) + Math.pow(inpPoint.y - this.position.y , 2) + Math.pow(inpPoint.z - this.position.z , 2);

	if (distSquaredNbr <= this.radiusSquaredNbr) {
		rtnInd = true;
	}

	return rtnInd;
};