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
//var clothFunction = plane( restDistance * xSegs, restDistance * ySegs );

var cloth = null;

//var GRAVITY = 981 * 1.4;
var GRAVITY = 981 * 0.0014;
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
var nizPremaknjenih="|";
var ffsNO = true;

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
	this.previous = new THREE.Vector3().copy(this.position);
	this.position = new THREE.Vector3().copy(newPos);

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
	
	
	// OK 2 ideas, find a z median, and particles with z > project to front plane and
	//particles with z < project to rear plane 
	// idea 2, go trough all z and push particles in a map, and then go trough those particles and map x and z
	
	
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
	var mapX = [];
	var mapNiz="|";
	var mapY=[];
	for(var i = 0; i < particles.length;i++){
		var particle = particles[i];
		//var cifra = Math.floor(particle.position.x*1000); //na koliko decimalk natančno???
		//cifra=cifra/1000.0;
		var cifra = particle.position.x;
		//var cifra = particle.position.x*10;
		//	cifra = parseInt(cifra);
		if(mapNiz.indexOf("|"+cifra+"|")<0){
			mapNiz=mapNiz+cifra+"|";
			mapX.push(cifra);
		}
	}
	mapX = mapX.sort(function (a, b) {  return a - b;  });
	console.log(mapX);
	console.log(particles.length);
	var map1 = [];
	var vsota = 0;
	var pushingIndex = 0;
	var boundry = mapX[0]*10;
	boundry = parseInt(boundry);
	var prvic = true;
	var tempB=0;
		for(var k = 0; k < mapX.length;k++){
			tempB = mapX[k]*10;
			tempB = parseInt(tempB);
			razlika = Math.abs(boundry - tempB);
			if(razlika > 4){
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
				if(mapX[k]==posi){
					if(prvic){
						map1.push([particle]);
						prvic=false;						}
					else{
						map1[pushingIndex].push(particle);
					}
				}
			}
		}


	var vsota3 = 0;
	var podmapa1 = [];
	var minY = 9999999;
	var maxY = -999999;
	
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
		pushingIndex = 0;
		boundry = whys[0]*10;
		boundry = parseInt(boundry);
		if(whys[0] < minY){
			minY = whys[0];
		}
		if(whys[whys.length-1] > maxY){
			maxY = whys[whys.length-1];
		}
		podmapa1.push(whys);
		map1[i].push([]);
		var dolzina = map1[i].length;
		var prvic=true;
		for(var k = 0; k < whys.length;k++){
			tempB = whys[k]*10;
			tempB = parseInt(tempB);
			razlika = Math.abs(boundry - tempB);
			if(razlika > 4){
				prvic = true;
				pushingIndex++;
				boundry = tempB;
			}
			for(var st = 0; st < dolzina-1;st++){
				if(whys[k]==map1[i][st].position.y){
					if(prvic){
						map1[i][dolzina-1].push([map1[i][st]]);
						prvic=false;
						vsota3++;
					}
					else{
						map1[i][dolzina-1][pushingIndex].push(map1[i][st]);
						vsota3++;
					}
				}
			}
		}
	}
	console.log(vsota3);
	console.log(map1);
	console.log(maxY);
	console.log(minY);
	stNonFail = 0;stFaila=0;
	
	var part1 = null; var part2 = null;var razdalja = 0;
	//First tower constraints
	for(var i = 0; i < map1.length;i++){
		var dolzinaVrstice = map1[i].length;
		for(var j = 0; j < map1[i][dolzinaVrstice-1].length;j++){//loop trough all the hights
			for(var k = 0; k < map1[i][dolzinaVrstice-1][j].length-1;k++){//loop trough all the particles on the same hight
				part1 = map1[i][dolzinaVrstice-1][j][k];
				part2 = map1[i][dolzinaVrstice-1][j][k+1];
				razdalja = part1.position.distanceTo(part2.position);
				if(razdalja == 0){
					constraints.push([part2,part1,razdalja]);
				}
				if(razdalja <= 4){
					constraints.push([part1,part2,razdalja]);
				}
				else{
					//	console.log("___________________");
					//		console.log(part1.position);
					//		console.log(part2.position);
					//	console.log("___________________");
					var stevec = k+2;
					while(razdalja > 4 && stevec < map1[i][dolzinaVrstice-1][j].length){
						part2 = map1[i][dolzinaVrstice-1][j][stevec];
						razdalja = part1.position.distanceTo(part2.position);
						if(razdalja <= 4){
							constraints.push([part1,part2,razdalja]);
						}
						else{
					//	console.log("___________________");
					//		console.log(part1.position);
					//		console.log(part2.position);
					//	console.log("___________________");
						}
						stevec++;
						
					}
				}

				//mogoče bi tole izvedo sam za zadn particle na isti višini dodaj if
			}
			var dolzina2 = map1[i][dolzinaVrstice-1][j].length;
			if(j+1 < map1[i][dolzinaVrstice-1].length){
				for(var iii = 0; iii < dolzina2;iii++){
					part1 = map1[i][dolzinaVrstice-1][j][iii];
					for(var jjj= 0; jjj < map1[i][dolzinaVrstice-1][j+1].length;jjj++){
						part2 = map1[i][dolzinaVrstice-1][j+1][jjj];
						razdalja = part1.position.distanceTo(part2.position);
						if(razdalja < 4){
							constraints.push([part1,part2,razdalja]);
						}
						else{
					//		console.log("------------");
					//		console.log(part1.position);
					//		console.log(part2.position);
					//		console.log("------------");
						}
					}
				}
			}
			if(i+1 < map1.length){
				part1 = map1[i][dolzinaVrstice-1][j][dolzina2-1];
				var razlika = 999999999999999999;
				var thisY = part1.position.y;
				var indexSecond = -1;
				var indexZ = -1;
					if(i+1 < map1.length){
						for(var x = 0; x < map1[i+1][map1[i+1].length-1].length;x++){
							//var tempRazlika = Math.abs(thisY - map1[i+1][map1[i+1].length-1][x][0].position.y);
							for(var z = 0; z < map1[i+1][map1[i+1].length-1][x].length;z++){
								var tempRazlika = part1.position.distanceTo(map1[i+1][map1[i+1].length-1][x][z].position);
								if(tempRazlika < razlika){
									razlika = tempRazlika;
									indexSecond = x; 
									indexZ=z;
								}
							}
						}
					}
				
				//console.log(razlika);
				//TODO PROBI LOGGAT RAZLIKE, DA VIDMO ČE DELUJE AL JE TREBA SPREMENIT!
				if(indexSecond != -1 && razlika < 4){
					razdalja = part1.position.distanceTo(map1[i+1][map1[i+1].length-1][indexSecond][indexZ].position);
					constraints.push([part1,map1[i+1][map1[i+1].length-1][indexSecond][indexZ],razdalja]);
					stNonFail++;
				}
				else{
					stFaila++;
				}
			}
		}
	}
//	console.log(map1[59][51].position);
//	console.log(map1[59][52].position);
//	console.log(map1[59][51].position.distanceTo(map1[59][52].position));
//	console.log(map1[59][53].position);
//	console.log(stFaila);
//	console.log(stNonFail);
	//console.log(fail);
	//console.log(succ);
	//console.log(fail2);
	//console.log(nizFailov);
	

	
	
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
//	if(frameCount > 30){
		//gravitacija=false;
//	}


	
	/*if(gravitacija){
		for ( particles = cloth.particles, k = 0, il = particles.length; k < il; k ++ ) {
				var part = particles[k].position;
				for(var i = 0; i < boxesList.length;i++){
					if(part.x <= boxesList[i].max.x && part.x >= boxesList[i].min.x)
					{
						if(part.y <= boxesList[i].max.y && part.y >= boxesList[i].min.y){
							if(part.z <= boxesList[i].max.z && part.z >= boxesList[i].min.z){
								for(var j = 0; j < boxesPoints[i].length;j++){
									var razdalja = part.distanceTo(boxesPoints[i][j]);
									if(razdalja < 0.1){
										gravitacija = false;
										break;
									}
								}
								break;
							}
						}
					}
				}
		}
	}*/
	//console.log(constraints);
	
	
if(frameCount != 0){		
	if(gravitacija){
		for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {
			particle = particles[ i ];
			particle.addForce( gravity );
			particle.integrate( TIMESTEP_SQ );
		}
	}
	
	
	constraints = cloth.constraints;
	//constraints=null;
	if(constraints!=null){
		il = constraints.length;
			for ( i = 0; i < il; i ++ ) {

				constraint = constraints[ i ];
				satisifyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );
			}		
	}	

	for ( particles = cloth.particles, k = 0, il = particles.length; k < il; k ++ ) {
			var part = particles[k].position;		
			for(var i = 0; i < boxesList.length;i++){
				if(part.x <= boxesList[i].max.x && part.x >= boxesList[i].min.x)
				{
					if(part.y <= boxesList[i].max.y && part.y >= boxesList[i].min.y){
						if(part.z <= boxesList[i].max.z && part.z >= boxesList[i].min.z){
							var shortestDistance = 99999999;
							var ind = -1;
							var nacin = 0;
							var xo = 0; var zg = 0;
							if(i % 3 == 1){
								nacin= 0;
								if(i-4 >= 0){
									xo = i-4;
									zg = i+4;
									
								}
								else{
									xo = 0;
									zg = i+4;
								}
							}
							if(i % 3 == 0){
								nacin = 1;
								if(i-3 >= 0){
									xo = i-3;
									zg = i+4;
								}
								else{
									xo = 0;
									zg = i+4;
								}
							}
							if(i % 3 == 2){
								nacin = 2;
								if(i-3 >= 0){
									xo = i-4;
									zg = i+3;
								}
								else{
									xo = 0;
									zg = i+3;
								}
							}
							while(xo <= zg){
								if(nacin == 1){
									if(xo == i-1){
										continue;
									}
									if(xo == i+2){
										continue;
									}
								}
								if(nacin == 2){
									if(xo == i-2){
										continue;
									}
									if(xo == i+1){
										continue;
									}
								}
								for(var j = 0; j < boxesPoints[xo].length;j++){
									var razdalja = part.distanceTo(boxesPoints[xo][j]);
									if(razdalja < 1.25){
										if(razdalja < shortestDistance){
											shortestDistance = razdalja;
											ind = j;
										}
									}
								}
								xo++;
							}
							if(ind != -1){
							var kot = 99999;var kot2 = 9999; var kot3 = 99999;
								var bodyPart = boxesPoints[i][ind];
								//console.log("loop entrance");
								var first = true;
								//console.log("short distance");
								var normal = new THREE.Vector3().copy(boxesNormals[i][ind]);
								var razdaljaBodyNormal = bodyPart.distanceTo(normal);
								shortestDistance = part.distanceTo(bodyPart);
								//console.log(normal);
								var razdaljaClothNormal = part.distanceTo(normal);
								
								var a = Math.pow(razdaljaBodyNormal,2);
								var b = Math.pow(shortestDistance,2);
								var c = Math.pow(razdaljaClothNormal,2);
								//console.log("--------------------");
								//console.log(bodyPart);
								//console.log(a);console.log(b);console.log(c);
								var levaStranEnacbe = (c-a-b)*(-1);
								levaStranEnacbe /= 2*razdaljaBodyNormal*shortestDistance;
								kot = Math.acos(levaStranEnacbe)*180/Math.PI;
								
								/*var levastran2 = (b-c-a)*(-1);
								levastran2 /= 2*razdaljaClothNormal*razdaljaBodyNormal;
								kot2 = Math.acos(levastran2)*180/Math.PI;
								
								var levastran3 = (a-b-c)*(-1);
								levastran3 /= 2*shortestDistance*razdaljaClothNormal;
								kot3 = Math.acos(levastran3)*180/Math.PI;*/
								

								//if(razdaljaClothNormal > razdaljaBodyNormal && kot > 90){
									if(kot > 90){
										//console.log(kot);
									//	console.log("WRONG POSITION");
										//normal.sub(bodyPart);
										//normal.multiplyScalar(shortestDistance*1.4);
										//part.add(normal);
										part.copy(particles[k].previous);
										//if(gravitacija){
										//	gravitacija = false;
										//	frameCount = 0;
										//}


									}
							}
							

							break;
						}
					}
				}
			}
		}

	
}else{/*
	console.log("this should print only once");

	
		for ( particles = cloth.particles, k = 0, il = particles.length; k < il; k ++ ) {
			var part = particles[k].position;		
			for(var i = 0; i < boxesList.length;i++){
				if(part.x <= boxesList[i].max.x && part.x >= boxesList[i].min.x)
				{
					if(part.y <= boxesList[i].max.y && part.y >= boxesList[i].min.y){
						if(part.z <= boxesList[i].max.z && part.z >= boxesList[i].min.z){
							var shortestDistance = 99999999;
							var ind = -1;
							for(var j = 0; j < boxesPoints[i].length;j++){
								var razdalja = part.distanceTo(boxesPoints[i][j]);
								if(razdalja < 1.25){
									if(razdalja < shortestDistance){
										shortestDistance = razdalja;
										ind = j;
									}
								}
							}
							if(ind != -1){
							var kot = 99999;var kot2 = 9999; var kot3 = 99999;
								var bodyPart = boxesPoints[i][ind];
								//console.log("loop entrance");
								var first = true;
							while(kot > 90){
								//console.log("short distance");
								var normal = new THREE.Vector3().copy(boxesNormals[i][ind]);
								var razdaljaBodyNormal = bodyPart.distanceTo(normal);
								shortestDistance = part.distanceTo(bodyPart);
								//console.log(normal);
								var razdaljaClothNormal = part.distanceTo(normal);
								
								var a = Math.pow(razdaljaBodyNormal,2);
								var b = Math.pow(shortestDistance,2);
								var c = Math.pow(razdaljaClothNormal,2);
								//console.log("--------------------");
								//console.log(bodyPart);
								//console.log(a);console.log(b);console.log(c);
								var levaStranEnacbe = (c-a-b)*(-1);
								levaStranEnacbe /= 2*razdaljaBodyNormal*shortestDistance;
								kot = Math.acos(levaStranEnacbe)*180/Math.PI;
								
								var levastran2 = (b-c-a)*(-1);
								levastran2 /= 2*razdaljaClothNormal*razdaljaBodyNormal;
								kot2 = Math.acos(levastran2)*180/Math.PI;
								
								var levastran3 = (a-b-c)*(-1);
								levastran3 /= 2*shortestDistance*razdaljaClothNormal;
								kot3 = Math.acos(levastran3)*180/Math.PI;
								

								//if(razdaljaClothNormal > razdaljaBodyNormal && kot > 90){
									if(kot > 90){
										//console.log(kot);
									//	console.log("WRONG POSITION");
										normal.sub(bodyPart);
										normal.multiplyScalar(shortestDistance*1.4);
										part.add(normal);
										//if(gravitacija){
										//	gravitacija = false;
										//	frameCount = 0;
										//}


									}
								}
							}

							break;
						}
					}
				}
			}
		}
		*/
	}
		
	frameCount++;
	//if(frameCount % 20 == 0){
	//	gravitacija = true;
	//}
		
	//console.log(gravitacija);
	//console.log(frameCount);
	

}