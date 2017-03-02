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
var DAMPING = 0.03;
var DRAG = 1 - DAMPING;
var MASS = 0.1;
//var restDistance = 25;
//var restDistance = 4.141;
//var clothFunction = plane( restDistance * xSegs, restDistance * ySegs );
var tmpForce = new THREE.Vector3();
var cloth = null;
var cloth2 = null;
var normal = new THREE.Vector3();
//var GRAVITY = 981 * 1.4;
var GRAVITY = 981 * 0.0014;
var gravity = new THREE.Vector3( 0, - GRAVITY, 0 ).multiplyScalar( MASS );
var gravitacija=true;
var tempPogoj = true;

var TIMESTEP = 18 / 1000;
var TIMESTEP_SQ = TIMESTEP * TIMESTEP;

//var pins = [];

//var wind = false;
//var windStrength = 2;
//var windForce = new THREE.Vector3( 0, 0, 0 );

//var ballPosition = new THREE.Vector3( 0, - 45, 0 );
//var ballSize = 60; //40
//var ballSize = 40; //40
//var tmpForce = new THREE.Vector3();

var lastTime;
//var prvic = true;
//temp variables
//var prvicPogoj=true;
//var maxTest=-99999999999;
//var indexTest;
//var shortestDistance=99999999999;
//var nizPremaknjenih="|";
//var ffsNO = true;

function Particle( x, y, z, mass,clothType ) {
	this.position = new THREE.Vector3( x, y, z ).applyMatrix4(clothWorldMaths[clothType]);; // position
	this.previous = new THREE.Vector3( x, y, z ).applyMatrix4(clothWorldMaths[clothType]);; // previous
	//this.original = new THREE.Vector3( -x, -y, -z ).applyMatrix4(clothWorldMaths[0]);;
	this.a = new THREE.Vector3( 0, 0, 0 ); // acceleration
	this.mass = mass;
	this.invMass = 1 / mass;
	this.tmp2 = new THREE.Vector3();

}

// Force -> Acceleration

Particle.prototype.addForce = function( force ) {

	this.a.add(
		this.tmp2.copy( force ).multiplyScalar( this.invMass )
	);

};


// Performs Verlet integration

/*Particle.prototype.integrate = function( timesq ) {

	var newPos = this.tmp.subVectors( this.position, this.previous );
	newPos.multiplyScalar( DRAG ).add( this.position );
	newPos.add( this.a.multiplyScalar( timesq ) );

	this.tmp = this.previous;
	this.previous = this.position;
	this.position = newPos;

	this.a.set( 0, 0, 0 );

};*/

Particle.prototype.integrate = function( timesq ) {
	var newPos = new THREE.Vector3();
	newPos.subVectors( this.position, this.previous );
	newPos.multiplyScalar( DRAG ).add( this.position );
	newPos.add( this.a.multiplyScalar( timesq ) );

	this.previous = new THREE.Vector3().copy(this.position);
	this.position = newPos;

	this.a.set( 0, 0, 0 );

};

function satisifyConstraints( p1, p2, distance ) {
	var diff = new THREE.Vector3();
	diff.subVectors( p2.position, p1.position );
	var currentDist = diff.length();
	if ( currentDist === 0 ) return; // prevents division by 0
	var correction = diff.multiplyScalar( 1 - distance / currentDist );
	var correctionHalf = correction.multiplyScalar( 0.5 );
	p1.position.add( correctionHalf );
	p2.position.sub( correctionHalf );


}


function Cloth(model,clothType){

	
	this.model = model;
	var particles = [];
	var constraints = [];
	var constraintsIdentical = [];
	var u, v;
	var uniqParticles = [];
	var pantsBelt = [];
	// Create particles
	for (var i = 0; i < model.children.length;i++){
		vertices = model.children[i].geometry.vertices;
		for ( var j = 0; j < vertices.length;j++){
			var part = new Particle( vertices[j].x,vertices[j].y,vertices[j].z, MASS,clothType );
			particles.push(part);
			uniqParticles.push(part);
		}
	}
	//console.log(vertices.length);
	//console.log(particles.length);
	
	// OK 2 ideas, find a z median, and particles with z > project to front plane and
	//particles with z < project to rear plane 
	// idea 2, go trough all z and push particles in a map, and then go trough those particles and map x and z
	for(var i = 0; i < uniqParticles.length;i++){
		for(var j = 0; j < uniqParticles.length;j++){
			if(i == j){
				continue;
			}
			if(uniqParticles[i].position.distanceTo(uniqParticles[j].position) == 0){
				constraintsIdentical.push([uniqParticles[i],uniqParticles[j]]);
				uniqParticles.splice(j,1);
				j=j-1;
				
			}
			
		}
	}
	console.log(particles.length);
	console.log(uniqParticles.length);
	//console.log(uniqParticles);
	
	
	
	
	var maxZ = -99999999999;
	var minZ = 99999999999;
	for(var i = 0; i < uniqParticles.length;i++){
		var z = uniqParticles[i].position.z;
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
	for(var i = 0; i < uniqParticles.length;i++){
		var particle = uniqParticles[i];
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
	
	var map1 = [];var stevec = 0;
	var map2 = [];
	var vsota = 0;
	var pushingIndex = 0;
	var boundry = rearMapX[0]*10;var razlika = 0;
	boundry = parseInt(boundry);
	var prvic = true;
	var tempB=0;
		for(var k = 0; k < rearMapX.length;k++){
			stevec++;
			tempB = rearMapX[k]*10;
			tempB = parseInt(tempB);
			razlika = Math.abs(boundry-tempB);
			if(razlika > 10){
				prvic = true;
				pushingIndex++;
				boundry=tempB;
			}
			//var prvic=true;
			for(var st = 0; st < uniqParticles.length;st++){
				var particle = uniqParticles[st];
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
			razlika = Math.abs(boundry-tempB);
			if(razlika > 10){
				prvic = true;
				pushingIndex++;
				boundry=tempB;
			}
			for(var st = 0; st < uniqParticles.length;st++){
				var particle = uniqParticles[st];
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
	
			
	//console.log(map1);
	//console.log(map2);
	

	//console.log(podmapa2);
	//console.log(podmapa2.length);
	//console.log(map2.length);
	//console.log(map2);
	var part1 = null; var part2 = null;var razdalja = 0;
	//First tower constraints
	for(var i = 0; i < map1.length;i++){
		var dolzinaVrstice = map1[i].length;
		for(var j = 0; j < map1[i][dolzinaVrstice-1].length;j++){//loop trough all the hights
			for(var k = 0; k < map1[i][dolzinaVrstice-1][j].length-1;k++){//loop trough all the particles on the same hight
				part1 = map1[i][dolzinaVrstice-1][j][k];
				part2 = map1[i][dolzinaVrstice-1][j][k+1];
				razdalja = part1.position.distanceTo(part2.position);
				constraints.push([part1,part2,razdalja]);
				console.log("THIS SHOULD NEVER LOG");
			}
			var dolzina2 = map1[i][dolzinaVrstice-1][j].length;
			var pogoj = false;
			var pogoj2 = false;
			if(j+1 < map1[i][dolzinaVrstice-1].length){
				for(var iii = 0; iii < dolzina2;iii++){
					part1 = map1[i][dolzinaVrstice-1][j][iii];
					for(var jjj= 0; jjj < map1[i][dolzinaVrstice-1][j+1].length;jjj++){
						part2 = map1[i][dolzinaVrstice-1][j+1][jjj];
						razdalja = part1.position.distanceTo(part2.position);
		//				if(razdalja < 15){
							constraints.push([part1,part2,razdalja]);
							pogoj= true;
	//					}
					}
				}
			}
			if(i+1 < map1.length){
				part1 = map1[i][dolzinaVrstice-1][j][dolzina2-1];
				var razlika = 999999999999999999;
				var thisY = part1.position.y;
				var indexSecond = -1;
				if(i+1 < map1.length){
					for(var x = 0; x < map1[i+1][map1[i+1].length-1].length;x++){
							//var tempRazlika = Math.abs(thisY - map1[i+1][map1[i+1].length-1][x][0].position.y);
						var tempRazlika = part1.position.distanceTo(map1[i+1][map1[i+1].length-1][x][0].position);
						if(tempRazlika < razlika){
							razlika = tempRazlika;
							indexSecond = x;
						}
					}
				}
				
				//console.log(razlika);
				//TODO PROBI LOGGAT RAZLIKE, DA VIDMO ČE DELUJE AL JE TREBA SPREMENIT!
				if(clothType == 0){
					if(indexSecond != -1){// && razlika < 10){
						if(Math.abs(part1.position.y - map1[i+1][map1[i+1].length-1][indexSecond][0].position.y) < 5){
							constraints.push([part1,map1[i+1][map1[i+1].length-1][indexSecond][0],razlika]);
							stNonFail++;
							pogoj2 = true;
						}
					}
				}else{
					if(indexSecond != -1){// && razlika < 10){
						if(razlika < 5){
							constraints.push([part1,map1[i+1][map1[i+1].length-1][indexSecond][0],razlika]);
							stNonFail++;
							pogoj2 = true;
						}
					}
				}
					//diagonal attempt
					if(pogoj && pogoj2){
						part1 = map1[i][dolzinaVrstice-1][j+1][map1[i][dolzinaVrstice-1][j+1].length-1];
						part2 = map1[i+1][map1[i+1].length-1][indexSecond][0];
						var diagonalDist = part1.position.distanceTo(part2.position);
						constraints.push([part1,part2,diagonalDist]);
					}
					if(pogoj2){
						if(indexSecond+1 < map1[i+1][map1[i+1].length-1].length){
							part1 = map1[i][dolzinaVrstice-1][j][dolzina2-1];
							part2 = map1[i+1][map1[i+1].length-1][indexSecond+1][0];
							diagonalDist = part1.position.distanceTo(part2.position);
							constraints.push([part1,part2,diagonalDist]);
						}
					}
			}
		}
	}
	var stFaila = 0;var stNonFail = 0;
	var part1 = null; var part2 = null;var razdalja = 0;
	//First tower constraints
	var succ = 0;
	var fail = 0;var fail2 = 0;var nizFailov="";
	for(var i = 0; i < map2.length;i++){
		var dolzinaVrstice = map2[i].length;
		for(var j = 0; j < map2[i][dolzinaVrstice-1].length;j++){//loop trough all the hights
			for(var k = 0; k < map2[i][dolzinaVrstice-1][j].length-1;k++){//loop trough all the particles on the same hight
				part1 = map2[i][dolzinaVrstice-1][j][k];
				part2 = map2[i][dolzinaVrstice-1][j][k+1];
				razdalja = part1.position.distanceTo(part2.position);
				constraints.push([part1,part2,razdalja]);	
				console.log("THIS SHOULD NEVER LOG");
			}
			var dolzina2 = map2[i][dolzinaVrstice-1][j].length;
			var pogoj = false;
			var pogoj2 = false;
			if(j+1 < map2[i][dolzinaVrstice-1].length){
				for(var iii = 0; iii < dolzina2;iii++){
					part1 = map2[i][dolzinaVrstice-1][j][iii];
					for(var jjj= 0; jjj < map2[i][dolzinaVrstice-1][j+1].length;jjj++){
						part2 = map2[i][dolzinaVrstice-1][j+1][jjj];
						razdalja = part1.position.distanceTo(part2.position);
					//	if(razdalja < 15){
						constraints.push([part1,part2,razdalja]);
						pogoj= true;
					//	}
					}
				}
			}
			if(i+1 < map2.length){
				part1 = map2[i][dolzinaVrstice-1][j][dolzina2-1];
				var razlika = 999999999999999999;
				//var thisY = part1.position.y;
				var indexSecond = -1;
					if(i+1 < map2.length){
						for(var x = 0; x < map2[i+1][map2[i+1].length-1].length;x++){
							var tempRazlika = part1.position.distanceTo(map2[i+1][map2[i+1].length-1][x][0].position);
							if(tempRazlika < razlika){
								razlika = tempRazlika;						
								indexSecond = x;
							}
						}
					}
					if(clothType == 0){
						if(indexSecond != -1){// && razlika < 10){
							if(Math.abs(part1.position.y - map2[i+1][map2[i+1].length-1][indexSecond][0].position.y) < 5){
								constraints.push([part1,map2[i+1][map2[i+1].length-1][indexSecond][0],razlika]);
								stNonFail++;
								pogoj2 = true;
							}
						}
					}else{
						if(indexSecond != -1){// && razlika < 10){
							if(razlika < 5){
								constraints.push([part1,map2[i+1][map2[i+1].length-1][indexSecond][0],razlika]);
								stNonFail++;
								pogoj2 = true;
							}
						}
					}
					
					if(pogoj && pogoj2){
						part1 = map2[i][dolzinaVrstice-1][j+1][map2[i][dolzinaVrstice-1][j+1].length-1];
						part2 = map2[i+1][map2[i+1].length-1][indexSecond][0];
						var diagonalDist = part1.position.distanceTo(part2.position);
						constraints.push([part1,part2,diagonalDist]);
					}
					if(pogoj2){
						if(indexSecond+1 < map2[i+1][map2[i+1].length-1].length){
								part1 = map2[i][dolzinaVrstice-1][j][dolzina2-1];
								part2 = map2[i+1][map2[i+1].length-1][indexSecond+1][0];
								diagonalDist = part1.position.distanceTo(part2.position);
								constraints.push([part1,part2,diagonalDist]);
						}
					}
			}
		}
	}
	//pants belt pins
	if(clothType == 1){
		for(var i = 0; i < map1.length;i++){
			var dolzinaX = map1[i][map1[i].length-1].length;
			var part = map1[i][map1[i].length-1][dolzinaX-1][0];
			pantsBelt.push([part,part.position.y]);
			
		}
		for(var i = 0; i < map2.length;i++){
			var dolzinaX = map2[i][map2[i].length-1].length;
			var part = map2[i][map2[i].length-1][dolzinaX-1][0];
			pantsBelt.push([part,part.position.y]);
			
		}
	}
	
	
/*	for(var i = 0; i < map1.length;i++){
		for(var j = 0; j < map1[i][map1[i].length-1].length;j++){
			if(map1[i][map1[i].length-1][j].length != 1){
				console.log("WTF");
				console.log(i);
				console.log(j);
				console.log("FTW");
			}
			
		}
	}
*/
	var najkrajsaRazdalja = 9999999999999;
	for(var i = 0; i < map1.length;i++){
		for(var j = 0; j < map1[i].length-1;j++){
			for(var k = 0; k < map2.length;k++){
				for(var l = 0; l < map2[k].length-1;l++){
					var razdalja = map1[i][j].position.distanceTo(map2[k][l].position);
					if(razdalja < najkrajsaRazdalja){
						najkrajsaRazdalja = razdalja;
					}
				}
			}
		}
	}
//	najkrajsaRazdalja+= najkrajsaRazdalja;//to je 0.33
if(clothType == 0){
	najkrajsaRazdalja+= najkrajsaRazdalja;
	najkrajsaRazdalja*=10;
}else{
	najkrajsaRazdalja+= najkrajsaRazdalja;
	najkrajsaRazdalja*=5;
}
//	console.log(najkrajsaRazdalja);
	for(var i = 0; i < map1.length;i++){
		for(var j = 0; j < map1[i].length-1;j++){
			for(var k = 0; k < map2.length;k++){
				for(var l = 0; l < map2[k].length-1;l++){
					var razdalja = map1[i][j].position.distanceTo(map2[k][l].position);
					if(razdalja <= najkrajsaRazdalja){
						constraints.push([map1[i][j],map2[k][l],razdalja]);
					}
				}
			}
		}
	}
	
	/*console.log(map1.length);
	console.log(map2.length);
	console.log(constraints.length);
	console.log(frontMapX.length);
	console.log(rearMapX.length);
	console.log(podmapa1.length);
	console.log(podmapa2.length);
	if(clothWorldMaths[0] != [])
		console.log(clothWorldMaths[0].elements);
	if(clothWorldMaths.length > 1)
		console.log(clothWorldMaths[1].elements);*/
	this.particles = particles;
	this.constraints = constraints;
	this.constraintsIdentical = constraintsIdentical;
	this.uniqParticles = uniqParticles;
	this.pantsBelt=pantsBelt;
	frontMapX = null;
	rearMapX = null;
	map1 = null;
	map2 = null;
	whys = null;
	//podmapa1 = null;
	//podmapa2 = null;
	//delete frontMapX;
	//delete rearMapX;
	//delete map1;
	//delete map2;
	//delete whys;
	
	
	//console.log(map1);
	//console.log(map2);
	//console.log(particles.length);
	//console.log(uniqParticles.length);
	//console.log(constraintsIdentical.length);
	//console.log((uniqParticles.length+constraintsIdentical.length));

	/*function index( u, v ) {

		return u + v * ( w + 1 );

	}

	this.index = index;*/

}

function simulate( time ) {
//	if(cloth==null)
//		return;
	//console.log("HMMAMA");
	if ( ! lastTime ) {

		lastTime = time;
		return;

	}

	var k,i, il, uniqParticles, particle, pt, constraints, constraint,constraintIdentical,constraintsIdentical,cloth3;
	// Start Constraints
	//gravitacija=false;
//	if(frameCount > 30){
		//gravitacija=false;
//	}
for(var counter = 0; counter < 2;counter++){
	if(counter == 0){
		if(cloth != null){
			cloth3 = cloth;
		}else{
			continue;
		}
	}else{
		if(cloth2 != null){
			cloth3 = cloth2;
		}else{
			break;
		}
		
	}
	//console.log(cloth);
	//console.log(cloth2);
	//console.log(cloth3);
	if(frameCount != 0){
		if(gravitacija){
			for ( i = 0, il = cloth3.uniqParticles.length; i < il; i ++ ) {
				particle = cloth3.uniqParticles[ i ];
			//	if(particle.original.x != particle.position.x && particle.original.y != particle.position.y && particle.original.z != particle.position.z){
					particle.addForce( gravity );
					particle.integrate( TIMESTEP_SQ );
			//	}
			}
		}
		
		
//		constraints = cloth3.constraints;
		//constraints=null;
		if(cloth3.constraints!=null){
			il = cloth3.constraints.length;
			var meja = 0;
			if(counter == 0){
				meja = 8;
			}else{
				meja = 3;
			}
		//	for(var j = 0; j < 8; j++){//TO BE ARRANGED
			for(var j = 0; j < meja; j++){//TO BE ARRANGED
				for ( i = 0; i < il; i ++ ) {
					constraint = cloth3.constraints[ i ];
					satisifyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );
				}
			}
		

		}
	}
	/*	if(frameCount == 0){
			console.log("wtf man");
			console.log("lul");
			console.log(constraints);
			console.log(cloth3.constraints);
			console.log(uniqParticles);
			console.log(cloth3.uniqParticles);
		}*/
			var enota = 2.0/90.0;var maxRazdalja = 4;
			for (k = 0, il = cloth3.uniqParticles.length; k < il; k ++ ) {
				var part = cloth3.uniqParticles[k].position;var najden = false;
				for(var i = 0; i < boxesList.length;i++){
					if(boxesPoints[i].length == 0){
						continue;
					}
					if(part.x <= boxesList[i].max.x && part.x >= boxesList[i].min.x)
					{
						if(part.y <= boxesList[i].max.y && part.y >= boxesList[i].min.y){
							najden = true;
							if(part.z <= (boxesList[i].max.z) && part.z >= (boxesList[i].min.z)){
								var shortestDistance = 99999999;
								var ind = -1;
								for(var j = 0; j < boxesPoints[i].length;j++){
									var razdalja = part.distanceTo(boxesPoints[i][j]);
									//if(razdalja < 1.25){
									if(razdalja < maxRazdalja){
										if(razdalja < shortestDistance){
											shortestDistance = razdalja;
											ind = j;
										}
									}
								}
								if(ind != -1){
								var kot = 99999;//var kot2 = 9999; var kot3 = 99999;
									var bodyPart = boxesPoints[i][ind];
									//console.log("loop entrance");
									var first = true;
									var count = 0;
								while(kot > 90){
									//console.log("short distance");
									normal.copy(boxesNormals[i][ind]);
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
									
						//			if(first){
						//				first = false;
						//				if(kot < 90){
							//				break;
							//			}
							//		}
									//console.log(kot);
									//								console.log("--------------------");

									//if(razdaljaClothNormal > razdaljaBodyNormal && kot > 90){
										if(kot > 90){
											normal.sub(bodyPart);
												if(frameCount == 0 && counter == 0){
													normal.multiplyScalar(shortestDistance*2.5);
												}		
											if(kot < 135){
											part.add(normal);
											}
											else{
												if(shortestDistance > 1){
													normal.multiplyScalar(shortestDistance);
												}
												part.add(normal);
											}
												
											cloth3.uniqParticles[k].previous.copy(cloth3.uniqParticles[k].position);
			//								break;
										
											count++;
										}
										//memories
										/*											normal.sub(bodyPart);
											//normal.multiplyScalar(shortestDistance*1.4);
											if(count < 3){
												if(frameCount == 0){
													normal.multiplyScalar(shortestDistance*2.5);
												}
												else{
													var razmik = kot - 90.0;
													//normal.multiplyScalar(razmik*enota);
													var pushingFactor = (shortestDistance/90.0)*razmik;
													normal.multiplyScalar(pushingFactor);
												}
											}else{
												normal.multiplyScalar(shortestDistance*2.5);
											}
											part.add(normal);
											uniqParticles[k].previous.copy(uniqParticles[k].position);
			//								break;*/
									}
	//								console.log(count);
								}

								break;
							}
						}
					}
				}/*if(!najden){
					console.log("------------------");
				//	console.log(boxesList.length);
				//	for(var i = 0; i < boxesList.length;i++){
				//		console.log(boxesList[i].min);
				//		console.log(boxesList[i].max);
				//		console.log("::::::::::::::::");
				//	}	
					console.log("::::::::::::::::::");
					console.log(part);
					console.log("XDXDPROBLEMOXDXD");
				}*/
			}
			//console.log(boxesPoints[33].length);
	/*	if(counter == 1){
		if(frameCount % 5 == 0 && frameCount < 2001 && frameCount > 0){
			for(var i = 0; i < cloth3.constraints.length;i++){
				var con = cloth3.constraints[i];
				con[2]=con[1].position.distanceTo(con[0].position);
			}
		}
		}*/

		for(var i = 0; i < cloth3.constraintsIdentical.length;i++){
			constraintIdentical = cloth3.constraintsIdentical[i];
			var partInSimulation = constraintIdentical[0];
			var partOutOfSimulation = constraintIdentical[1];
			partOutOfSimulation.position.copy(partInSimulation.position);
		}
if(true){		
	for(var x = 0; x < cloth3.pantsBelt.length;x++){
		var atom = cloth3.pantsBelt[x][0];
		for(var i = 0; i < boxesList.length;i++){
			if(boxesPoints[i].length == 0){
				continue;
			}
			if(atom.position.x <= boxesList[i].max.x && atom.position.x >= boxesList[i].min.x)
			{
				if(atom.position.y <= boxesList[i].max.y && atom.position.y >= boxesList[i].min.y){
					var shortestDistance = 99999999;
					var ind = -1;
					for(var j = 0; j < boxesPoints[i].length;j++){
						var razdalja = atom.position.distanceTo(boxesPoints[i][j]);
						if(razdalja < shortestDistance){
							shortestDistance = razdalja;
							ind = j;
						}
					}
					if(ind != -1){
						//normal.copy(boxesNormals[i][ind]).sub(boxesPoints[i][ind]);
						normal.copy(boxesPoints[i][ind]).sub(boxesNormals[i][ind]);
						normal.multiplyScalar(0.1);
						var skalar = normal.dot(boxesNormals[i][ind]);
						if(skalar > 0){
							normal.multiplyScalar(-1);
						}
						//normal.multiplyScalar(-0.1);
						atom.position.add(normal);
						//atom.addForce(normal);
						
					}

					break;
				}
			}
		}
		
		atom.position.y = cloth3.pantsBelt[x][1];
		atom.previous.copy(atom.position);
	}
}
	
}
	//console.log(frameCount);	
	frameCount++;
	//console.log(frameCount);
	//if(frameCount % 100 == 0){
	//	gravitacija = true;
	//}
		
	//console.log(gravitacija);
	//console.log(frameCount);
	
	//	console.log(shortestDistance);

		//console.log(boxesNormals);
		
	/*	var p = particles[indexTest];
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
*/
	/*for(var i = 100; i < 151; i++){
		var p = particles[i];
		p.position.copy( p.original );
		p.previous.copy( p.original );
	}
		for(var i = 500; i < 551; i++){
		var p = particles[i];
		p.position.copy( p.original );
		p.previous.copy( p.original );
	}*/
}