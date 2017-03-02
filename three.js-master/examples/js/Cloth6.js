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
//var restDistance = 25;
var restDistance = 2;
//var restDistance = 4.141;
var xSegs = 50;
var ySegs = 50;
var clothFunction = plane( restDistance * xSegs, restDistance * ySegs );

var cloth = null;

//var GRAVITY = 981 * 1.4;
var GRAVITY = 0.981 * 1;
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
var prvic = true;
//temp variables
var prvicPogoj=true;var maxTest=-99999999999;var indexTest;
var shortestDistance=99999999999;
function plane( width, height ) {

	return function( u, v ) {

		var x = ( u - 0.5 ) * width;
		var y = ( v + 0.5 ) * height;
		var z = 0;

		return new THREE.Vector3( x, y, z );

	};

}

function Particle( x, y, z, mass ) {

	this.position = new THREE.Vector3( x, y, z ).applyMatrix4(clothWorldMaths[0]);; // position
	this.previous = new THREE.Vector3( x, y, z ).applyMatrix4(clothWorldMaths[0]);; // previous
	this.original = new THREE.Vector3( x, y, z ).applyMatrix4(clothWorldMaths[0]);;
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
	diff = new THREE.Vector3();
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

	// Create particles
	for (var i = 0; i < model.children.length;i++){
		vertices = model.children[i].geometry.getAttribute('position').array;
		for ( var j = 0; j < vertices.length;j=j+3){
			particles.push(
				new Particle( vertices[j],vertices[j+1],vertices[j+2], MASS )
			);

		}

	}

	for(var qwe=0; qwe<particles.length;qwe++){
		if(particles[qwe].position.y > maxTest){
			maxTest = particles[qwe].position.y;
			indexTest=qwe;
		}
	}

	for ( particles, i = 0, il = particles.length-1; i < il; i ++ ) {
		var razdalja = particles[i].position.distanceTo(particles[i+1].position);
		constraints.push( [
				particles[i],
				particles[i+1],
				razdalja
			] );
	}
	
	
	//EXPERIMENTTTTTTTTTTTTTTT
	/*var map=[];
	for(var i = 0; i < model.children.length;i++){
		vertices = model.children[i].geometry.getAttribute('position').array;
		var niz="|";
		var heights=[];
		for(var j = 1; j < vertices.length;j=j+3){
			if(niz.indexOf(""+vertices[j])<0){
				niz=niz+vertices[j]+"|";
				heights.push(vertices[j]);
			}
		}
		heights = heights.sort(function (a, b) {  return a - b;  });
		console.log(heights);
		for(var k = 0; k < heights.length;k++){
			var stevec=0;
			for(var st = 1; st < vertices.length;st=st+3){
				if(heights[k]==vertices[st]){
					particles.push(new Particle( vertices[st-1],vertices[st],vertices[st+1], MASS ));
					stevec++;
				}
			}
			map.push(stevec);
		}
		
	}
	console.log(map);*/
/*	
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
	var maxRazdalja=9999999999;
	var stejem=0;
		var index = 0;
	//LETS DO THIIIIIIIIIIIIIIS!!!
	for(var i = 0; i < map.length;i++){
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
					else{
						break;
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
/*				if(razdalja != 9999999999999999999){
					constraints.push([delcek,map[index[0]][index[1]],razdalja]);
				}
				razdalja = 9999999999999999999;
				for(var m = 0; m < map[i].length;m++){
					if(j != m){
						razdalja2 = delcek.position.distanceTo(map[i][m].position);
						if(razdalja2 < razdalja){
							razdalja = razdalja2;
							index=[i,m];
						}
					}
				}
				if(razdalja != 9999999999999999999)
					constraints.push([delcek,map[index[0]][index[1]],razdalja]);
			//	console.log("AAAAAAAAAAAAAAA");
			//	console.log(delcek.position);
			//	console.log("BBBBBBBBBBBBBBBB");
			//	console.log(map[index[0]][index[1]].position);
			}
	}
*/
	//console.log(stejem);
	
	//Structural constraints
	/*
	for(var i = 0; i < map.length;i++){
		for(var j = 0; j < map[i].length;j++){
			if(i+1<map.length){
				if(j<map[i+1].length){
					constraints.push([map[i][j],map[i+1][j],restDistance]);
				}
			}
			if(j+1<map[i].length){
			constraints.push([map[i][j],map[i][j+1],restDistance]);
			}
		}
	}*/
	
	//console.log(particles);

	// Structural
	
	/*	for (var i = 0; i < particles.length-1;i++){
			constraints.push( [
				particles[i],
				particles[i+1],
				restDistance
			] );
		}
	*/
		
	
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
	/*for(var i = 0; i < map.length;i++){
		for(var j = 0; j < map[i].length;j++){
			if(j+1<map[i].length && i+1<map.length){
					constraints.push([map[i][j],map[i+1][j+1],Math.sqrt(restDistance * restDistance * 2)]);
					constraints.push([map[i+1][j],map[i][j+1],Math.sqrt(restDistance * restDistance * 2)]);
				
			}
		}
	}*/

	this.particles = particles;
	this.constraints = constraints;

	/*function index( u, v ) {

		return u + v * ( w + 1 );

	}

	this.index = index;*/

}

function simulate( time ) {
	if(cloth==null)
		return;
	if ( ! lastTime ) {

		lastTime = time;
		return;

	}

	var i, il, particles, particle, pt, constraints, constraint;

	// Start Constraints
	//gravitacija=false;
		if(gravitacija){
			for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {
				//console.log("da fak");
				particle = particles[ i ];
				//gravity.y=-10;
				//gravity.y=-10;
				particle.addForce( gravity );

				particle.integrate( TIMESTEP_SQ );
				//var inverseGravity = new THREE.Vector3().copy(gravity);
				//inverseGravity.multiplyScalar(-1);
				//particle.addForce(inverseGravity);
				//particle.integrate( TIMESTEP_SQ );
				//particle.position.y= particle.position.y+10;

			}
	}
	
	
	constraints = cloth.constraints;
	if(constraints!=null){
		il = constraints.length;

		for ( i = 0; i < il; i ++ ) {

			constraint = constraints[ i ];
			satisifyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );

		}
		
	}
/*		for ( particles = cloth.particles, k = 0, il = particles.length; k < il; k ++ ) {
			var part = new THREE.Vector3().copy(particles[k].position);
			part.applyMatrix4(clothWorldMaths[0]);
			for(var i = 0; i < boxesList.length;i++){
				if(part.x <= boxesList[i].max.x && part.x >= boxesList[i].min.x)
				{
					if(part.y <= boxesList[i].max.y && part.y >= boxesList[i].min.y){
						if(part.z <= boxesList[i].max.z && part.z >= boxesList[i].min.z){
							for(var j = 0; j < boxesPoints[i].length;j++){
								/*var distance = part.distanceTo(boxesPoints[i][j]);
									if(distance < 0.001){//TODO test distances
										var tempVec = new THREE.Vector3().copy(boxesNormals[i][j]);
										part.add(tempVec.multiplyScalar(distance));
										part.applyMatrix4(clothWorldMathsInverses[0]);
										particles[k].copy(part);
										break;
									}*/
									
								//var diff = new THREE.Vector3();
								//diff.subVectors(part,boxesPoints[i]);
								//if(diff)
/*								var distance = part.distanceTo(boxesPoints[i][j]);	
							//	if(distance < shortestDistance){    0.056
							//		shortestDistance=distance;
							//	}
								//console.log(distance);
							//	console.log(distance);
								if(distance < 0.1){//TODO test distances
								//console.log(distance);
									//gravitacija=false;
									var diff = new THREE.Vector3();
									diff.subVectors(part,boxesPoints[i][j]);
									diff.normalize();
									//diff.multiplyScalar(10);
									part.copy(boxesPoints[i][j]).add(diff);
									part.applyMatrix4(clothWorldMathsInverses[0]);
									particles[k].position.copy(part);
									break;
								}
							}
							break;
						}
					}
				}
			}

		}
	//	console.log(shortestDistance);
*/
		//console.log(boxesNormals);
		
		var p = particles[indexTest];
		p.position.copy( p.original );
		p.previous.copy( p.original );
		//	console.log(p.position);
			
					var p = particles[0];
		p.position.copy( p.original );
		p.previous.copy( p.original );
			//console.log(p.position);
					var p = particles[500];
		p.position.copy( p.original );
		p.previous.copy( p.original );
			//console.log(p.position);
					var p = particles[1000];
		p.position.copy( p.original );
		p.previous.copy( p.original );
			//console.log(p.position);
					var p = particles[1500];
		p.position.copy( p.original );
		p.previous.copy( p.original );
			//console.log(p.position);
					var p = particles[2000];
		p.position.copy( p.original );
		p.previous.copy( p.original );
			//console.log(p.position);
					var p = particles[2500];
		p.position.copy( p.original );
		p.previous.copy( p.original );
			//console.log(p.position);

}
