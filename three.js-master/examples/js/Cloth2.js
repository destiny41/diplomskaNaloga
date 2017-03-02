/*
 * Cloth Simulation using a relaxed constraints solver
 */

// Suggested Readings

// Advanced Character Physics by Thomas Jakobsen Character
// http://freespace.virgin.net/hugo.elias/models/m_cloth.htm
// http://en.wikipedia.org/wiki/Cloth_modeling
// http://cg.alexandra.dk/tag/spring-mass-system/
// Real-time Cloth Animation http://www.darwin3d.com/gamedev/articles/col0599.pdf

function simCloth(mainClothes){
var frameCount = 0;
var maxY =-1000;
var DAMPING = 0.03;
var DRAG = 1 - DAMPING;
var MASS = 0.1;
var restDistance = 25;//lol

var xSegs = 50;
var ySegs = 50;

var clothFunction = plane( restDistance * xSegs, restDistance * ySegs );

var cloth = new Cloth(mainClothes);

var GRAVITY = 981 * 1.4;
var gravity = new THREE.Vector3( 0, - GRAVITY, 0 ).multiplyScalar( MASS );


var TIMESTEP = 18 / 1000;
var TIMESTEP_SQ = TIMESTEP * TIMESTEP;

var pins = [];


var wind = false;
var windStrength = 2;
var windForce = new THREE.Vector3( 0, 0, 0 );

var ballPosition = new THREE.Vector3( 0, - 45, 0 );
var ballSize = 60; //40

var tmpForce = new THREE.Vector3();

var lastTime;


function plane( width, height ) {

	return function( u, v ) {

		var x = ( u - 0.5 ) * width;
		var y = ( v + 0.5 ) * height;
		var z = 0;

		return new THREE.Vector3( x, y, z );

	};

}

/*function Particle( x, y, z, mass ) {

	this.position = clothFunction( x, y ); // position
	this.previous = clothFunction( x, y ); // previous
	this.original = clothFunction( x, y );
	this.a = new THREE.Vector3( 0, 0, 0 ); // acceleration
	this.mass = mass;
	this.invMass = 1 / mass;
	this.tmp = new THREE.Vector3();
	this.tmp2 = new THREE.Vector3();

}*/

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


function Cloth(model) {

	//mainClothes.children[0].getAttribute('position').array;


	var vertices;
	var particles = [];
	var constraints = [];

	var u, v;

	// Create particles
	for (var i = 0; i < model.children.length;i++){
		vertices = model.children[i].getAttribute('position').array;
		for ( var j = 0; j < vertices.length;j=j+3){
			particles.push(
				new Particle( vertices[j],vertices[j+1],vertices[j+2], MASS )
			);

		}

	}
	
	

	// Structural
	
	for (var i = 0; i < particles.length-1;i++){
			constraints.push( [
				particles[i],
				particles[i+1],
				restDistance
			] );
	}

	this.particles = particles;
	this.constraints = constraints;


	}
	
var time = Date.now();
simulate( time );

function simulate( time ) {
	
	

	if ( ! lastTime ) {

		lastTime = time;
		return;

	}

	var i, il, particles, particle, pt, constraints, constraint;

	// Aerodynamics forces

	if ( wind ) {
		windStrength = Math.cos( time / 7000 ) * 20 + 40;
		windForce.set( Math.sin( time / 2000 ), Math.cos( time / 3000 ), Math.sin( time / 1000 ) ).normalize().multiplyScalar( windStrength );
		var face, faces = clothGeometry.faces, normal;
		var faces = (new THREE.Geometry().fromBufferGeometry(mainClothes)).faces;
		particles = cloth.particles;

		for ( i = 0, il = faces.length; i < il; i ++ ) {

			face = faces[ i ];
			normal = face.normal;

			tmpForce.copy( normal ).normalize().multiplyScalar( normal.dot( windForce ) );
			particles[ face.a ].addForce( tmpForce );
			particles[ face.b ].addForce( tmpForce );
			particles[ face.c ].addForce( tmpForce );

		}

	}

	for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {

		particle = particles[ i ];
		particle.addForce( gravity );

		particle.integrate( TIMESTEP_SQ );

	}

	// Start Constraints

	constraints = cloth.constraints;
	il = constraints.length;

	for ( i = 0; i < il; i ++ ) {

		constraint = constraints[ i ];
		satisifyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );

	}

	// Ball Constraints

	//ballPosition.z = - Math.sin( Date.now() / 600 ) * 90 ; //+ 40;
	//ballPosition.x = Math.cos( Date.now() / 400 ) * 70;

	/*if ( sphere.visible ) {
		
		for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {

			particle = particles[ i ];
			pos = particle.position;
			diff.subVectors( pos, ballPosition );
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
	if(mainMesh){
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
		}
		if(frameCount == 0)
			console.log(maxWorldY);
		frameCount++;
	}
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
	
		for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i++ ) {
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
					if(pos.x > -90 && pos.x < 90 && pos.z < 180 && pos.z > -200 && pos.y < maxWorldY){
						pos.y = maxWorldY;
						//wind = true;
					}

		}
	
	// Floor Constraints

	/*for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {

		particle = particles[ i ];
		pos = particle.position;
		if ( pos.y < - 250 ) {

			pos.y = - 250;

		}

	}*/

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
		pinek.z=-202
		var p = particles[cloth.w/2];
		pinek.x=0;
		p.position.copy( pinek );
		p.previous.copy( pinek );
				var p = particles[cloth.w/2+20];
		pinek.x=90;
		p.position.copy( pinek );
		p.previous.copy( pinek );		var p = particles[cloth.w/2-20];
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
		p.previous.copy( pinek );
		
		
		//console.log(mainClothes.children[0].getAttribute('position').array;);

}

}
