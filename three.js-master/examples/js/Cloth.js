/*
 * Cloth Simulation using a relaxed constraints solver
 */

// Suggested Readings

// Advanced Character Physics by Thomas Jakobsen Character
// http://freespace.virgin.net/hugo.elias/models/m_cloth.htm
// http://en.wikipedia.org/wiki/Cloth_modeling
// http://cg.alexandra.dk/tag/spring-mass-system/
// Real-time Cloth Animation http://www.darwin3d.com/gamedev/articles/col0599.pdf

//var DAMPING = 0.03;
var DAMPING = 0.03;
var DRAG = 1 - DAMPING;
//var MASS = 0.1;
var MASS = 0.1;
var restDistance = 25;

var xSegs = 10;
var ySegs = 10;

var clothFunction = plane( restDistance * xSegs, restDistance * ySegs );

var cloth = new Cloth( xSegs, ySegs );

var GRAVITY = 981 * 1.4;
var gravity = new THREE.Vector3( 0, - GRAVITY, 0 ).multiplyScalar( MASS );


var TIMESTEP = 18 / 1000;
var TIMESTEP_SQ = TIMESTEP * TIMESTEP;

var pins = [];


var wind = true;
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

function Particle( x, y, z, mass ) {

	this.position = clothFunction( x, y ); // position
	this.previous = clothFunction( x, y ); // previous
	this.original = clothFunction( x, y );
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


function Cloth( w, h ) {

	w = w || 10;
	h = h || 10;
	this.w = w;
	this.h = h;

	var particles = [];
	var constraints = [];
	var u, v;

	// Create particles
	for ( v = 0; v <= h; v ++ ) {

		for ( u = 0; u <= w; u ++ ) {

			particles.push(
				new Particle( u / w, v / h, 0, MASS )
			);

		}

	}
	console.log(particles.length);
	// Structural
	


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
console.log(constraints.length);


	// While many systems use shear and bend springs,
	// the relaxed constraints model seems to be just fine
	// using structural springs.
	// Shear
	/*
	 var diagonalDist = Math.sqrt(restDistance * restDistance * 2);


	 for (v=0;v<h;v++) {
	 	for (u=0;u<w;u++) {

	 		constraints.push([
	 			particles[index(u, v)],
	 			particles[index(u+1, v+1)],
	 			diagonalDist
	 		]);

	 		constraints.push([
	 			particles[index(u+1, v)],
	 			particles[index(u, v+1)],
	 			diagonalDist
	 		]);

	 	}
	 }
	
	*/
	/*
		var maxZ = -99999999999;
	var minZ = 99999999999;
	for(var i = 0; i < particles.length;i++){
		var z = particles[i].position.z;
		if(z < minZ)
			minZ = z;
		if(z > maxZ)
			maxZ = z;
	}
	
	var median = (maxZ+minZ)/2.0;
	var frontMapX = [];
	var rearMapX = [];
	var frontNiz="|";var rearNiz="|";
	var rearY=[];var frontY=[];
	for(var i = 0; i < particles.length;i++){
		var particle = particles[i];
		//var cifra = Math.floor(particle.position.x*1000); //na koliko decimalk natančno???
		//cifra=cifra/1000.0;
		var cifra = particle.position.x;
		//var cifra = particle.position.x*10;
		//	cifra = parseInt(cifra);
		if(particle.position.z < median){
			if(rearNiz.indexOf("|"+cifra+"|")<0){
				rearNiz=rearNiz+cifra+"|";
				rearMapX.push(cifra);
			}
		}
		else{
			if(frontNiz.indexOf("|"+cifra+"|")<0){
				frontNiz=frontNiz+cifra+"|";
				frontMapX.push(cifra);
			}
		}
	}
	frontMapX = frontMapX.sort(function (a, b) {  return a - b;  });
	rearMapX = rearMapX.sort(function (a, b) {  return a - b;  });
	console.log(frontMapX);
	console.log(rearMapX);
	console.log(particles.length);
	var map1 = [];
	var map2 = [];
	var vsota = 0;
	var pushingIndex = 0;
	var boundry = rearMapX[0]*10;
	boundry = parseInt(boundry);
	var prvic = true;
	var tempB=0;
		for(var k = 0; k < rearMapX.length;k++){
			tempB = rearMapX[k]*10;
			tempB = parseInt(tempB);
			if(tempB != boundry){
				prvic = true;
				pushingIndex++;
				boundry = tempB;
			}
			//var prvic=true;
			for(var st = 0; st < particles.length;st++){
				var particle = particles[st];
				//var posi = Math.floor(particle.position.x*1000);
				//posi = posi/1000.0;
				var posi = particle.position.x;
			//	var posi2 = particle.position.x*10;
			//	posi2 = parseInt(posi);
			//	if(posi2 != boundry){
			//		continue;
			//	}
				if(particle.position.z < median){
					if(rearMapX[k]==posi){
						if(prvic){
							map1.push([particle]);
							prvic=false;						}
						else{
							map1[pushingIndex].push(particle);
						}
					}
				}
			}
		}
	var pushingIndex = 0;
	prvic = true;
	var boundry = frontMapX[0]*10;
	boundry = parseInt(boundry);
	var tempB=0;
		for(var k = 0; k < frontMapX.length;k++){
			tempB = frontMapX[k]*10;
			tempB = parseInt(tempB);
			if(tempB != boundry){
				prvic = true;
				pushingIndex++;
				boundry = tempB;
			}
			for(var st = 0; st < particles.length;st++){
				var particle = particles[st];
				//var posi = Math.floor(particle.position.x*1000);
				//posi = posi/1000.0;
				var posi = particle.position.x;
				//var posi = particle.position.x*10;
				//posi = parseInt(posi);
				if(particle.position.z >= median){
					if(frontMapX[k]==posi){
						if(prvic){
							map2.push([particle]);
							prvic=false;
						}
						else{
							map2[pushingIndex].push(particle);
						}
					}
				}
			}
		}

	var vsota3 = 0;
	var podmapa1 = [];
	for(var i = 0; i < map1.length;i++){
		var niz="|";
		var whys=[];
		for(var j = 0; j < map1[i].length;j++){
			if(niz.indexOf("|"+map1[i][j].position.y+"|")<0){
				niz=niz+map1[i][j].position.y+"|";
				whys.push(map1[i][j].position.y);
			}
		}
		whys = whys.sort(function (a, b) {  return a - b;  });
		podmapa1.push(whys);
		map1[i].push([]);
		var dolzina = map1[i].length;
		for(var k = 0; k < whys.length;k++){
			var prvic=true;
			for(var st = 0; st < dolzina-1;st++){
				if(whys[k]==map1[i][st].position.y){
					if(prvic){
						map1[i][dolzina-1].push([map1[i][st]]);
						prvic=false;
						vsota3++;
					}
					else{
						map1[i][dolzina-1][k].push(map1[i][st]);
						vsota3++;
					}
				}
			}
		}
	}
	var podmapa2 = [];
	for(var i = 0; i < map2.length;i++){
		var niz="|";
		var whys=[];
		for(var j = 0; j < map2[i].length;j++){
			if(niz.indexOf("|"+map2[i][j].position.y+"|")<0){
				niz=niz+map2[i][j].position.y+"|";
				whys.push(map2[i][j].position.y);
			}
		}
		whys = whys.sort(function (a, b) {  return a - b;  });
		podmapa2.push(whys);
		map2[i].push([]);
		var dolzina = map2[i].length;
		for(var k = 0; k < whys.length;k++){
			var prvic=true;
			for(var st = 0; st < dolzina-1;st++){
				if(whys[k]==map2[i][st].position.y){
					if(prvic){
						map2[i][dolzina-1].push([map2[i][st]]);
						prvic=false;
						vsota3++;
					}
					else{
						map2[i][dolzina-1][k].push(map2[i][st]);
						vsota3++;
					}
				}
			}
		}
	}
	
	console.log(vsota3);
	console.log(podmapa2);
	console.log(podmapa2.length);
	console.log(map2.length);
	console.log(map2);
	var part1 = null; var part2 = null;var razdalja = 0;
	//First tower constraints

	for(var i = 0; i < map1.length;i++){
		var dolzinaVrstice = map1[i].length;
		console.log(map1[i][dolzinaVrstice-1].length);
		for(var j = 0; j < map1[i][dolzinaVrstice-1].length;j++){//loop trough all the hights
			for(var k = 0; k < map1[i][dolzinaVrstice-1][j].length-1;k++){//loop trough all the particles on the same hight
				part1 = map1[i][dolzinaVrstice-1][j][k];
				part2 = map1[i][dolzinaVrstice-1][j][k+1];
				razdalja = part1.position.distanceTo(part2.position);
				constraints.push([part1,part2,razdalja]);
				if(razdalja == 0){
					constraints.push([part2,part1,razdalja]);
				}
				//mogoče bi tole izvedo sam za zadn particle na isti višini dodaj if
			}
			var st = 0;
			var dolzina2 = map1[i][dolzinaVrstice-1][j].length;
			if(j+1 < map1[i][dolzinaVrstice-1].length){
							console.log(dolzina2);
				for(var iii = 0; iii < dolzina2;iii++){
					part1 = map1[i][dolzinaVrstice-1][j][iii];
					for(var jjj= 0; jjj < map1[i][dolzinaVrstice-1][j+1].length;jjj++){
						part2 = map1[i][dolzinaVrstice-1][j+1][jjj];
						razdalja = part1.position.distanceTo(part2.position);
						console.log(st);
						st++;
						constraints.push([part1,part2,razdalja]);
					}
				}
			}
			if(i+1 < map1.length){
				part1 = map1[i][dolzinaVrstice-1][j][dolzina2-1];
				var razlika = 999999999999999999;
				var thisY = part1.position.y;
				var indexSecond = -1;
				for(var y = 0; y < 10;y++){
					if(i+1+y < map1.length){
						for(var x = 0; x < map1[i+1+y][map1[i+1+y].length-1].length;x++){
							//var tempRazlika = Math.abs(thisY - map1[i+1][map1[i+1].length-1][x][0].position.y);
							var tempRazlika = part1.position.distanceTo(map1[i+1+y][map1[i+1+y].length-1][x][0].position);
							if(tempRazlika < razlika){
								razlika = tempRazlika;
								indexSecond = x;
								indexY=y;
							}
						}
					}
				}
				//console.log(razlika);
				//TODO PROBI LOGGAT RAZLIKE, DA VIDMO ČE DELUJE AL JE TREBA SPREMENIT!
				if(indexSecond != -1 && razlika < 2){
					razdalja = part1.position.distanceTo(map1[i+1+indexY][map1[i+1+indexY].length-1][indexSecond][0].position);
					constraints.push([part1,map1[i+1+indexY][map1[i+1+indexY].length-1][indexSecond][0],razdalja]);
				}
			}
		}
	}
	var stFaila = 0;var stNonFail = 0;
	var part1 = null; var part2 = null;var razdalja = 0;
	//First tower constraints
	for(var i = 0; i < map2.length;i++){
		var dolzinaVrstice = map2[i].length;
		for(var j = 0; j < map2[i][dolzinaVrstice-1].length;j++){//loop trough all the hights
			console.log("normal check");
			for(var k = 0; k < map2[i][dolzinaVrstice-1][j].length-1;k++){//loop trough all the particles on the same hight
				part1 = map2[i][dolzinaVrstice-1][j][k];
				console.log("to se ne sme nikol izpisat");
				part2 = map2[i][dolzinaVrstice-1][j][k+1];
				razdalja = part1.position.distanceTo(part2.position);
				console.log("tole se ne sme nikol loggat");
				constraints.push([part1,part2,razdalja]);
				//if razdalja == 0, push constraint part2, part1
				//mogoče bi tole izvedo sam za zadn particle na isti višini dodaj if
				if(razdalja == 0){
					constraints.push([part2,part1,razdalja]);
				}
			}
			var dolzina2 = map2[i][dolzinaVrstice-1][j].length;
			//var stes = 0;
			if(j+1 < map2[i][dolzinaVrstice-1].length){
				for(var iii = 0; iii < dolzina2;iii++){
					part1 = map2[i][dolzinaVrstice-1][j][iii];
					for(var jjj= 0; jjj < map2[i][dolzinaVrstice-1][j+1].length;jjj++){
						part2 = map2[i][dolzinaVrstice-1][j+1][jjj];
						//console.log(stes);
						//stes++;
						razdalja = part1.position.distanceTo(part2.position);
						constraints.push([part1,part2,razdalja]);
					}
				}
			}
			console.log(razdalja);
			if(i+1 < map2.length){
				part1 = map2[i][dolzinaVrstice-1][j][dolzina2-1];
				var razlika = 999999999999999999;
				var thisY = part1.position.y;
				var indexSecond = -1;var indexY=-1;
				for(var y = 0; y < 10;y++){
					if(i+1+y < map2.length){
						for(var x = 0; x < map2[i+1+y][map2[i+1+y].length-1].length;x++){
							//var tempRazlika = Math.abs(thisY - map2[i+1+y][map2[i+1+y].length-1][x][0].position.y);
							var tempRazlika = part1.position.distanceTo(map2[i+1+y][map2[i+1+y].length-1][x][0].position);
							if(tempRazlika < razlika){
								razlika = tempRazlika;
								indexSecond = x;
								indexY=y;
							}
						}
					}
				}
				console.log("------");
				console.log(razlika);
				console.log(part1.position.distanceTo(map2[i+1][map2[i+1].length-1][j][0].position));
				console.log(i+","+j+","+(dolzina2-1));
				console.log(indexY+","+indexSecond);
				console.log("_______");
					//TODO PROBI LOGGAT RAZLIKE, DA VIDMO ČE DELUJE AL JE TREBA SPREMENIT!
					if(indexSecond != -1 && razlika < 26){//prejt je blo < 2
						razdalja = part1.position.distanceTo(map2[i+1+indexY][map2[i+1+indexY].length-1][indexSecond][0].position);
						constraints.push([part1,map2[i+1+indexY][map2[i+1+indexY].length-1][indexSecond][0],razdalja]);
						stNonFail++;
						console.log("amm:" + razdalja);
					}
					else{
						//console.log(razlika);
						stFaila++;
					}
					
			}
		}
	}
	 
	 	console.log(stFaila);
	console.log(stNonFail);
	 console.log(constraints.length);
	 console.log(constraints);*/
	this.particles = particles;
	this.constraints = constraints;

	function index( u, v ) {

		return u + v * ( w + 1 );

	}

	this.index = index;

}

function simulate( time ) {

	if ( ! lastTime ) {

		lastTime = time;
		return;

	}

	var i, il, particles, particle, pt, constraints, constraint;

	// Aerodynamics forces

	/*if ( wind ) {

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
		satisifyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );
		satisifyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );
		satisifyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );
		satisifyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );

	}

	// Ball Constraints

/*	ballPosition.z = - Math.sin( Date.now() / 600 ) * 90 ; //+ 40;
	ballPosition.x = Math.cos( Date.now() / 400 ) * 70;

	if ( sphere.visible ) {

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

	}

*/
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

		var xy = pins[ i ];
		var p = particles[ xy ];
		p.position.copy( p.original );
		p.previous.copy( p.original );

	}*/
	var p = particles[100];
			p.position.copy( p.original );
		p.previous.copy( p.original );


}
