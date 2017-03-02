/*
 * Cloth Simulation using a relaxed constraints solver
 */

// Suggested Readings

// Advanced Character Physics by Thomas Jakobsen Character
// http://freespace.virgin.net/hugo.elias/models/m_cloth.htm
// http://en.wikipedia.org/wiki/Cloth_modeling
// http://cg.alexandra.dk/tag/spring-mass-system/
// Real-time Cloth Animation http://www.darwin3d.com/gamedev/articles/col0599.pdf
var frameCount = 0;
var maxY =-1000;
var DAMPING = 0.03;
var DRAG = 1 - DAMPING;
var MASS = 0.1;
var restDistance = 25;
var xSegs = 50;
var ySegs = 50;
var clothFunction = plane( restDistance * xSegs, restDistance * ySegs );

var cloth = null;

var GRAVITY = 981 * 1.4;
var gravity = new THREE.Vector3( 0, - GRAVITY, 0 ).multiplyScalar( MASS );
var gravitacija=true;


var TIMESTEP = 18 / 1000;
var TIMESTEP_SQ = TIMESTEP * TIMESTEP;

var pins = [];

var wind = false;
var windStrength = 2;
var windForce = new THREE.Vector3( 0, 0, 0 );

var ballPosition = new THREE.Vector3( 0, - 45, 0 );
//var ballSize = 60; //40
var ballSize = 40; //40
var tmpForce = new THREE.Vector3();

var lastTime;
//temp variables
var prvicPogoj=true;

function plane( width, height ) {

	return function( u, v ) {

		var x = ( u - 0.5 ) * width;
		var y = ( v + 0.5 ) * height;
		var z = 0;

		return new THREE.Vector3( x, y, z );

	};

}

function Particle( x, y, z, mass ) {

	this.position = new THREE.Vector3( x, y, z ); // position
	this.previous = new THREE.Vector3( x, y, z ); // previous
	this.original = new THREE.Vector3( x, y, z );
	this.a = new THREE.Vector3( 0, 0, 0 ); // acceleration
	this.mass = mass;
	this.invMass = 1 / mass;
	this.tmp = new THREE.Vector3();
	this.tmp2 = new THREE.Vector3();

}

// Force -> Acceleration

Particle.prototype.addForce = function( force ) {

	this.a.add(
		this.tmp2.copy( force ).multiplyScalar( this.invMass )
	);

};


// Performs Verlet integration

Particle.prototype.integrate = function( timesq ) {

	var newPos = this.tmp.subVectors( this.position, this.previous );
	newPos.multiplyScalar( DRAG ).add( this.position );
	newPos.add( this.a.multiplyScalar( timesq ) );

	this.tmp = this.previous;
	this.previous = this.position;
	this.position = newPos;

	this.a.set( 0, 0, 0 );

};


var diff = new THREE.Vector3();

function satisifyConstraints( p1, p2, distance ) {

	diff.subVectors( p2.position, p1.position );
	var currentDist = diff.length();
	if ( currentDist === 0 ) return; // prevents division by 0
	var correction = diff.multiplyScalar( 1 - distance / currentDist );
	var correctionHalf = correction.multiplyScalar( 0.5 );
	p1.position.add( correctionHalf );
	p2.position.sub( correctionHalf );

}


function Cloth(model){

	
	this.model = model;
	var particles = [];
	var constraints = [];

	var u, v;
	console.log("FKKKKKKKKKKK");
	console.log(model);
	console.log("---------------------------------------------------------");
	console.log(clothWorldMat);
	console.log("---------------------------------------------------------");
	// Create particles
	for (var i = 0; i < model.children.length;i++){
		vertices = model.children[i].geometry.getAttribute('position').array;
		for ( var j = 0; j < vertices.length;j=j+3){
			particles.push(
				new Particle( vertices[j],vertices[j+1],vertices[j+2], MASS )
			);

		}

	}
	
	var map=[];
		var niz="|";
		var heights=[];
		for(var j = 0; j < particles.length;j++){
			if(niz.indexOf(""+particles[j].position.y)<0){
				niz=niz+particles[j].position.y+"|";
				heights.push(particles[j].position.y);
			}
		}
		heights = heights.sort(function (a, b) {  return a - b;  });
		//console.log(heights);
		for(var k = 0; k < heights.length;k++){
			//var stevec=0;
			var prvic=true;
			for(var st = 0; st < particles.length;st++){
				if(heights[k]==particles[st].position.y){
					if(prvic){
						map.push([particles[st]]);
						prvic=false;
					}
					else{
						map[k].push(particles[st]);
					}
				}
			}
			//map.push(stevec);
		}
	//	console.log(map);
	var maxRazdalja=-9999999999;
	var stejem=0;
		var index = 0;
	//LETS DO THIIIIIIIIIIIIIIS!!!
	for(var i = 0; i < map.length-1;i++){
		for(var j = 0; j < map[i].length;j++){
			var delcek = map[i][j];
			var razdalja = 9999999999999999999;//pri 75 na 80  se je zmanjšal za 10
			for(var k = i+1;k < i+180;k++){//IZ 200 na 250 se število ni spremenilo, 166 je minimum za to oblacilo, ampak za splosnost bom dal na 180, v primeru napak na 200
				if(k < map.length){
					for(var l = 0; l < map[k].length;l++){
						var razdalja2 = delcek.position.distanceTo(map[k][l].position);
						if(razdalja2 < razdalja){
							razdalja = razdalja2;
							index=[k,l];
						}
					}
				}
			}
/*			if(razdalja > 1){
				//console.log();
				stejem++;
			}
			//console.log(razdalja);
			if(razdalja > maxRazdalja){
				maxRazdalja=razdalja;
			}*/
			constraints.push([delcek,map[index[0]][index[1]],razdalja]);
			
		}
	}
	//console.log(particles);

	// Structural
	/*
		for (var i = 0; i < particles.length-1;i++){
			constraints.push( [
				particles[i],
				particles[i+1],
				restDistance
			] );
	}*/
	
/*
	for ( v = 0; v < h; v ++ ) {

		for ( u = 0; u < w; u ++ ) {

			constraints.push( [
				particles[ index( u, v ) ],
				particles[ index( u, v + 1 ) ],
				restDistance
			] );

			constraints.push( [
				particles[ index( u, v ) ],
				particles[ index( u + 1, v ) ],
				restDistance
			] );

		}

	}

	for ( u = w, v = 0; v < h; v ++ ) {

		constraints.push( [
			particles[ index( u, v ) ],
			particles[ index( u, v + 1 ) ],
			restDistance

		] );

	}

	for ( v = h, u = 0; u < w; u ++ ) {

		constraints.push( [
			particles[ index( u, v ) ],
			particles[ index( u + 1, v ) ],
			restDistance
		] );

	}
*/

	// While many systems use shear and bend springs,
	// the relaxed constraints model seems to be just fine
	// using structural springs.
	// Shear
	// var diagonalDist = Math.sqrt(restDistance * restDistance * 2);


	// for (v=0;v<h;v++) {
	// 	for (u=0;u<w;u++) {

	// 		constraints.push([
	// 			particles[index(u, v)],
	// 			particles[index(u+1, v+1)],
	// 			diagonalDist
	// 		]);

	// 		constraints.push([
	// 			particles[index(u+1, v)],
	// 			particles[index(u, v+1)],
	// 			diagonalDist
	// 		]);

	// 	}
	// }


	this.particles = particles;
	this.constraints = constraints;

	/*function index( u, v ) {

		return u + v * ( w + 1 );

	}

	this.index = index;*/

}

function simulate( time ) {

	if ( ! lastTime ) {

		lastTime = time;
		return;

	}

	var i, il, particles, particle, pt, constraints, constraint;
	/*
	// Aerodynamics forces
	if ( wind ) {

		var face, faces = clothGeometry.faces, normal;

		particles = cloth.particles;

		for ( i = 0, il = faces.length; i < il; i ++ ) {

			face = faces[ i ];
			normal = face.normal;

			tmpForce.copy( normal ).normalize().multiplyScalar( normal.dot( windForce ) );
			particles[ face.a ].addForce( tmpForce );
			particles[ face.b ].addForce( tmpForce );
			particles[ face.c ].addForce( tmpForce );

		}

	}*/

	if(gravitacija){
		for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {

			particle = particles[ i ];
			//gravity.y=-10;
			gravity.y=-10;
			particle.addForce( gravity );

			particle.integrate( TIMESTEP_SQ );

			//particle.position.y= particle.position.y+10;

		}
	}
	
	
	
	//gravitacija = false;
	// Start Constraints

	constraints = cloth.constraints;
	il = constraints.length;

	for ( i = 0; i < il; i ++ ) {

		constraint = constraints[ i ];
		satisifyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );
	}

	
	
	sphere.visible=true;
	
	// Ball Constraints

	//ballPosition.z = - Math.sin( Date.now() / 600 ) * 90 ; //+ 40;
	//ballPosition.x = Math.cos( Date.now() / 400 ) * 70;
	//ballPosition.x = -135;
	//ballPosition.y=60;ballPosition.z=-35;
	ballPosition = new THREE.Vector3( 148, 20, -5 );
	//MY BALL CONSTRAINT ATTEMPT #1
	//for(particles = cloth.particles, i = 0, il = particles.length; i < il; i ++){
		
	//}
	if ( sphere.visible && !gravitacija ) {
		console.log("WTF");
		for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {

			particle = particles[ i ];
			pos = particle.position;
			var pos2 = new THREE.Vector3();
			pos2.copy(pos);
			pos2.applyMatrix4(clothWorldMat);
			
			diff.subVectors( pos2, ballPosition );
			if ( diff.length() < ballSize ) {

				// collided
				diff.normalize();
				var temp = new THREE.Vector3();
				temp.copy(diff);
				diff.multiplyScalar( ballSize );
				pos2.copy( ballPosition ).add( diff );
				//pos2.add(new THREE.Vector3(0.1,0.1,0.1));
				pos2.add(temp);
								pos2.add(temp);

				pos2.applyMatrix4(clothWorldMatInverse);
				pos.copy(pos2);
			}

		}
				if(prvicPogoj){
					for(var x = 0; x < constraints.length;x++){
						constraints[x][2]= constraints[x][0].position.distanceTo(constraints[x][1].position);
					}

				}
		prvicPogoj=false;
	}
	
	//sphere.visible = true;
	/*if(gravitacija)
		sphere.visible = true;
	if ( sphere.visible ) {
		console.log("WTF");
		for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {

			particle = particles[ i ];
			pos = particle.position;
			var vect = new THREE.Vector3(0,0,0);
			vect.copy(pos);
			var vect2 = new THREE.Vector3(0,0,0);
			vect2.copy(ballPosition);
			diff.subVectors( pos, ballPosition );
			if(gravitacija==false){
				vect.applyMatrix4(worldMat);
				vect2.applyMatrix4(worldMat);
				console.log(vect);
				console.log(vect2);
				//console.log(worldMat);
				sphere.visible = false;
				
			}
			//console.log(pos);
			//console.log(ballPosition);
			//console.log(diff.length());
			//console.log(ballSize);
			if ( diff.length() < ballSize ) {

				// collided
				diff.normalize().multiplyScalar( ballSize );
				pos.copy( ballPosition ).add( diff );

			}

		}

	}*/

	//MY constraint
	var table_vertices = null;
	var mainThingy;
	/*if(mainMesh){
		for(var i = 0; i < mainMesh.children.length;i++){
			mainThingy = mainMesh.children[i];
			table_vertices = mainThingy.geometry.getAttribute('position').array;
			if(frameCount==0){
				for(var j = 1; j <table_vertices.length;j=j+3){
					if(table_vertices[j]>maxY)
						maxY = table_vertices[j];
				}
				
			}
			
			
			
			/*for(var j = 1; j < table_vertices.length;j=j+3){
				for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {
					particle = particles[ i ];
					pos = particle.position;
					//diff.subVectors( pos, ballPosition );
					console.log(table_vertices[j]);
					console.log(pos.y);
					console.log("__________________");
					if ( pos.y == table_vertices[j]*200 ) {

						// collided
						//diff.normalize().multiplyScalar( ballSize );
						//pos.copy( ballPosition ).add( diff );
						pos.y = pos.y - 1;

					}

				}
			}*/
	/*	}
		if(frameCount == 0)
			console.log(maxWorldY);
		frameCount++;
	}*/
	/*			for(var j = 1; j < table_vertices.length;j=j+3){
				for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {
					particle = particles[ i ];
					pos = particle.position;
					//diff.subVectors( pos, ballPosition );
					console.log(table_vertices[j]);
					console.log(pos.y);
					console.log("__________________");
					if ( pos.y == table_vertices[j]*200 ) {

						// collided
						//diff.normalize().multiplyScalar( ballSize );
						//pos.copy( ballPosition ).add( diff );
						pos.y = pos.y - 1;

					}

				}
			}
	*/
	
	/*	for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i++ ) {
					particle = particles[ i ];
					pos = particle.position;
					/*if ( pos.y < maxWorldY) {
						// collided
						//diff.normalize().multiplyScalar( ballSize );
						//pos.copy( ballPosition ).add( diff );
						pos.y = maxWorldY;
						//gravity = new THREE.Vector3( 0, 1, 0 );
						wind = true;

					}*/
				/*	if(pos.x > -90 && pos.x < 90 && pos.z < 180 && pos.z > -200 && pos.y < maxWorldY){
						pos.y = maxWorldY;
						//wind = true;
					}

		}
	*/
	// Floor Constraints
	for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {

		particle = particles[ i ];
		pos = particle.position;
		/*if ( pos.y < -80 ) {

			pos.y = -80 ;
			gravity.y=1;
			gravitacija=false;
			//console.log(pos);

		}*/
		var compareVektor = new THREE.Vector3();
		compareVektor.copy(pos);
		compareVektor.applyMatrix4(clothWorldMat);
		if ( compareVektor.y < maxWorldY ) {
			//console.log("WTFFFFFFFF: "+pos.y);
			//console.log(maxWorldY);
			//pos.y = maxWorldY;
			compareVektor.y=maxWorldY;
			compareVektor.applyMatrix4(clothWorldMatInverse);
			pos.copy(compareVektor);
			gravity.y=1;
			gravitacija=false;
			//console.log(pos);
		}
	}

	// Pin Constraints

	/*for ( i = 0, il = pins.length; i < il; i ++ ) {
		if(frameCount==0){
			console.log(pins);
		}
		var xy = pins[ i ];
		var p = particles[ xy ];
		p.position.copy( p.original );
		p.previous.copy( p.original );

	}*/
	/*	pinek.z=-202
		var p = particles[0];
		pinek.x=0;
		p.position.copy( pinek );
		p.previous.copy( pinek );
				var p = particles[250];
		pinek.x=90;
		p.position.copy( pinek );
		p.previous.copy( pinek );		var p = particles[500];
		pinek.x=-90;
		p.position.copy( pinek );
		p.previous.copy( pinek );
		
		var p = particles[1000];
		pinek.x=90;
		pinek.z=180;
		p.position.copy( pinek );
		p.previous.copy( pinek );
		var p = particles[1500];
		pinek.x=0;
		pinek.z=180;
		p.position.copy( pinek );
		p.previous.copy( pinek );
				var p = particles[2000];
		pinek.x=-90;
		pinek.z=180;
		p.position.copy( pinek );
		p.previous.copy( pinek );*/
		


		


}
