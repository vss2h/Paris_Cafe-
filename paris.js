var canvas;
var gl;

var zoomFactor = 2.5;
var translateFactorX = 0.2;
var translateFactorY = 0.2;

var numTimesToSubdivide = 5;
 
var pointsArray = [];
var normalsArray = [];

var sounds=[];

var left = -1;
var right = 1;
var ytop = 1;
var bottom = -1;
var near = -10;
var far = 10;
var deg=5;
var phi=30;  // camera rotating angles
var theta=20;
var Radius=1.5;  // radius of the sphere

var eye;
var at=[1, 0.4, 0.1];
var up=[0, 5, 0];

var program;
var cubeCount=36;
var sphereCount=0;
var cylinderCount=0;
var N = 60; 
var cylPoints=[];

var va = vec4(0.0, 0.0, -1.0,1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333,1);

var lightPosition = vec4(.2, 1, 1, 0 );
//var lightPosition = vec4(1, 1, 1, 0);

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4(.8, 0.8, 0.8, 1.0 );
var lightSpecular = vec4( .8, .8, .8, 1.0 );

var materialAmbient = vec4( .2, .2, .2, 1.0 );
var materialDiffuse = vec4( 0.0, 0.5, 1, 1.0);
var materialSpecular = vec4( 1, 1, 1, 1.0 );

var materialShininess = 50.0;

var ambientColor, diffuseColor, specularColor;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var mvMatrixStack=[];

var closeUmbrella= false;
var signAnim= false
var doorOpen= false;
var signDir= 1;
var signMov=0;
var doorDir=1;
var doorMov=0;
var sound= false;

var N;
var N_Flower;


var texCoordsArray = [];

// texture coordinates
/*var texCoord = [
    vec2(0, .2),
    vec2(0, 0),
    vec2(.2, .2),
    vec2(.2, 0),
];*/

var texCoord = [ 
    vec2(0, 0),
    vec2(0, 1), 
    vec2(1, 1),
    vec2(1, 0)];

var texture1, texture2;
var textS, textWh, textR, textWo, textY, textB, textSt, textD, textBl, textBr, textO, textC, textCu, textBlu;


window.onload = function init() 
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // generate the points/normals
    GeneratePrimitives();

    SendData();

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    SetupLightingMaterial();

    SetupUserInterface();
	
	EstablishTextures();

    sounds.push(new Audio("restaurant.mp3"));
    // keyboard handle
    window.onkeydown = HandleKeyboard;

    render();
}

function HandleKeyboard(event)
{
    switch (event.keyCode)
    {
    case 37:  // left cursor key
              phi += deg;
              break;
    case 39:   // right cursor key
              phi -= deg;
              break;
    case 38:   // up cursor key
              theta += deg;
              break;
    case 40:    // down cursor key
              theta -= deg;
              break;
    case 65:        // key A = animation
              closeUmbrella = !closeUmbrella;
              signAnim = !signAnim;
              doorOpen= !doorOpen;
              if (sound)
              {sounds[0].pause();}
              else 
              {sounds[0].play();}

              sound = !sound;
              break;
    case 66:        // key B = reset
            closeUmbrella= false;
            signAnim= false;
            sounds[0].pause();
            sounds[0].currentTime=0;
            signDir=1;
            signMov=0;
			zoomFactor = 2.5;
			translateFactorX = 0.2;
			translateFactorY = 0.2;
			phi=30;  // camera rotating angles
			theta=20;
			Radius=1.5;
            break;

    }
	
}

function SendData()
{
    // pass data onto GPU
    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );
    
    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
	
	   // set up texture buffer
    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );

    var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );
}

function SetupLightingMaterial()
{
    // set up lighting and material
    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv( gl.getUniformLocation(program, "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, "shininess"), materialShininess );
}

function SetupUserInterface()
{
     // support user interface
     document.getElementById("phiPlus").onclick=function(){phi += deg;};
    document.getElementById("phiMinus").onclick=function(){phi-= deg;};
    document.getElementById("thetaPlus").onclick=function(){theta+= deg;};
    document.getElementById("thetaMinus").onclick=function(){theta-= deg;};
     document.getElementById("zoomIn").onclick=function(){zoomFactor *= 0.95;};
     document.getElementById("zoomOut").onclick=function(){zoomFactor *= 1.05;};
     document.getElementById("left").onclick=function(){translateFactorX -= 0.1;};
     document.getElementById("right").onclick=function(){translateFactorX += 0.1;};
     document.getElementById("up").onclick=function(){translateFactorY += 0.1;};
     document.getElementById("down").onclick=function(){translateFactorY -= 0.1;};
 
}

// ******************************************
// Draw simple and primitive objects
// ******************************************

function GeneratePrimitives()
{
    GenerateCube();
    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);
    GenerateCone();
    GenerateCylinder();
    GenerateRestaurant();   
	flower();
}

function GenerateCone()
{
    var Radius=0.5;
    var height= 1;
    var stacks= 12;
    var slices = 16;

    var hypotenuse=Math.sqrt(height*height + Radius*Radius);
	var cosTheta = Radius/hypotenuse;
	var sinTheta = height/hypotenuse;

    // starting out with a single line in xy-plane
	var line=[];
	for (var p=0; p<=stacks; p++)  {
	    line.push(vec4(p*hypotenuse/stacks*cosTheta, p*hypotenuse/stacks*sinTheta, 0, 1));
    }

    prev = line;
    // rotate around y axis
    var m=rotate(360/slices+3, 0, 1, 0);
    for (var i=1; i<=slices; i++) {
        var curr=[]

        // compute the new set of points with one rotation
        for (var j=0; j<=stacks; j++) {
            var v4 = multiply(m, prev[j]);
            curr.push( v4 );
        }

        // triangle bottom of the cone
        triangle(prev[0], curr[1], prev[1]);

        // create the triangles for this slice
        for (var j=1; j<stacks; j++) {
            prev1 = prev[j];
            prev2 = prev[j+1];

            curr1 = curr[j];
            curr2 = curr[j+1];

            quad(prev1, curr1, curr2, prev2);
        }

        prev = curr;
    }
}

function GenerateCube()
{
    var cubeVertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5,  0.5,  0.5, 1.0 ),
        vec4( 0.5,  0.5,  0.5, 1.0 ),
        vec4( 0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4( 0.5,  0.5, -0.5, 1.0 ),
        vec4( 0.5, -0.5, -0.5, 1.0 )
    ];

    quad(cubeVertices[1], cubeVertices[0], cubeVertices[3], cubeVertices[2] );
    quad(cubeVertices[2], cubeVertices[3], cubeVertices[7], cubeVertices[6] );
    quad(cubeVertices[3], cubeVertices[0], cubeVertices[4], cubeVertices[7] );
    quad(cubeVertices[6], cubeVertices[5], cubeVertices[1], cubeVertices[2] );
    quad(cubeVertices[4], cubeVertices[5], cubeVertices[6], cubeVertices[7] );
    quad(cubeVertices[5], cubeVertices[4], cubeVertices[0], cubeVertices[1] );

}

function GenerateCylinder()
{
    var height = 2;
    var radius = 1.0;

    var angle = 2*Math.PI/N;

    cylPoints = [vec4(0,0,0,1)];
    for  (var i = N; i >= 0; i--) {
        cylPoints.push(vec4(radius * Math.cos(i * angle), 0,
            radius * Math.sin(i * angle), 1));
    }

    N=cylPoints.length;

    for  (var i = 0; i < N; i++) {
        cylPoints.push(vec4(cylPoints[i][0], cylPoints[i][1]+height,
            cylPoints[i][2], 1));
    }

    var basePoints=[];
    var topPoints=[];
 
    for (var j=0; j<N; j++)
    {
        quad(cylPoints[j], cylPoints[j+N], cylPoints[(j+1)%N+N], cylPoints[(j+1)%N]);  
        cylinderCount += 6;
    }

    basePoints.push(cylPoints[0]);
    for (var i=N-1; i>0; i--)
    {
        basePoints.push(cylPoints[i]);
    }
    polygon(basePoints);
    
    for (var i=0; i<N; i++)
    {
        topPoints.push(cylPoints[i+N]); 
    }

    polygon(topPoints);

}

function GenerateRestaurant()
{
	var restVert = [
		vec4(0,3,0,1),	// A(0)
		vec4(0,0,0,1),	// B(1)
		vec4(4,3,0,1),	// C(2)
		vec4(4,0,0,1),	// D(3)
		vec4(0,3,1,1),	// E(4)
		vec4(0,0,1,1),	// F(5)
		vec4(4,3,1,1),	// G(6)
		vec4(4,0,1,1)	// H(7)
	];
	
	quad(restVert[2], restVert[3], restVert[1], restVert[0]);	// back CDBA
	quad(restVert[0], restVert[1], restVert[5], restVert[4]);	// right ABFE
	quad(restVert[4], restVert[5], restVert[7], restVert[6]);	// front EFHG
	quad(restVert[6], restVert[7], restVert[3], restVert[2]);	// left GHDC
	quad(restVert[0], restVert[4], restVert[6], restVert[2]);	// top AEGC

	var coverVert = [
		vec4(0,3,1,1),		// A(0)
		vec4(0,2.5,1,1),	// B(1)
		vec4(4,3,1,1),		// C(2)
		vec4(4,2.5,1,1),	// D(3)
		vec4(0,2.7,3,1),	// E(4)
		vec4(0,2.5,3,1),	// F(5)
		vec4(4,2.7,3,1),	// G(6)
		vec4(4,2.5,3,1)		// H(7)
	];
	
	quad(coverVert[0], coverVert[4], coverVert[6], coverVert[2]);	// top AEGC
	quad(coverVert[4], coverVert[5], coverVert[7], coverVert[6]);	// front EFHG
	quad(coverVert[0], coverVert[1], coverVert[5], coverVert[4]);	// right ABFE
	quad(coverVert[6], coverVert[7], coverVert[3], coverVert[2]);	// left GHDC
}

function DrawSolidSphere(radius)
{
	mvMatrixStack.push(modelViewMatrix);
	s=scale4(radius, radius, radius);   // scale to the given radius
        modelViewMatrix = mult(modelViewMatrix, s);
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	
 	// draw unit radius sphere
        for( var i=0; i<sphereCount; i+=3)
            gl.drawArrays( gl.TRIANGLES, cubeCount+i, 3 );
    
    
            
    modelViewMatrix=mvMatrixStack.pop();
    //console.log(sphereCount);
}

function DrawSolidCube(length)
{
	mvMatrixStack.push(modelViewMatrix);
	s=scale4(length, length, length );   // scale to the given width/height/depth 
        modelViewMatrix = mult(modelViewMatrix, s);
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	
        gl.drawArrays( gl.TRIANGLES, 0, 36);
        
    modelViewMatrix=mvMatrixStack.pop();
   // console.log(cubeCount);
}

function DrawSolidCone(length)
{
	mvMatrixStack.push(modelViewMatrix);
	s=scale4(length, length, length );   // scale to the given width/height/depth 
        modelViewMatrix = mult(modelViewMatrix, s);
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	 
        gl.drawArrays( gl.TRIANGLES, 12324, 1056);

	modelViewMatrix=mvMatrixStack.pop();
}

function DrawSolidCylinder(width, height)
{
	mvMatrixStack.push(modelViewMatrix);
	s=scale4(width, height, width );   // scale to the given width/height/depth 
        modelViewMatrix = mult(modelViewMatrix, s);
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	
        gl.drawArrays( gl.TRIANGLES, 13380, 780);

	modelViewMatrix=mvMatrixStack.pop();
}

function DrawWall(thickness)
{
	var s, t, r;
	
	//gl.uniform1i(gl.getUniformLocation(program, "texture"), 9);
	// draw thin wall with top = xz-plane, corner at origin
	mvMatrixStack.push(modelViewMatrix);

	t=translate(0.5, 0.5*thickness, 0.5);
	s=scale4(1.0, thickness, 1.0);
        modelViewMatrix=mult(mult(modelViewMatrix, t), s);
	gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	DrawSolidCube(1);

	modelViewMatrix=mvMatrixStack.pop();
}

// ******************************************
// Draw composite objects
// ******************************************

function DrawUmbrella()
{
      // draw the top umbrella
	  gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 1); 
	  //gl.uniform1i(gl.getUniformLocation(program, "texture"), 2);
      mvMatrixStack.push(modelViewMatrix);
      r=rotate(180, 0.5, 0, 0);

      s= scale4(0.5,0.6,0.5);
        t=translate(0.88, 0.85,0.9);
      modelViewMatrix=mult(mult(mult(modelViewMatrix, t), r), s);
      DrawSolidCone(0.3);
      modelViewMatrix=mvMatrixStack.pop();

      // draw bottom umbrella
      mvMatrixStack.push(modelViewMatrix);
      r=rotate(180, 0.5, 0,0);
      s= scale4(1.1,.8,1.1);
      t=translate(0.88, 0.7,0.9);
      modelViewMatrix=mult(mult(mult(modelViewMatrix, t), r), s);
      DrawSolidCone(0.3);
      modelViewMatrix=mvMatrixStack.pop();

}

function DrawTableLeg(thick, len)
{
    //draw leg
	//gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
	//gl.uniform1i(gl.getUniformLocation(program, "texture"), 3);
    mvMatrixStack.push(modelViewMatrix);

	t=translate(0, len/2, 0);
	var s=scale4(thick, len, thick);
        modelViewMatrix=mult(mult(modelViewMatrix, t), s);
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	DrawSolidCube(1);

	modelViewMatrix=mvMatrixStack.pop();
}

function DrawRoundTable(topWid, topThick, legThick, legLen)
{
    var s, t, r;
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 3);
    //draw top of the table 
	mvMatrixStack.push(modelViewMatrix);
    t=translate(0.13, 0.33,0.07);
    s= scale4(2.5,0.5,3);
	modelViewMatrix=mult(mult(modelViewMatrix, t),s);
	DrawSolidSphere(0.1);
    modelViewMatrix=mvMatrixStack.pop();

    // place the four table legs
	var dist = 0.80 * topWid / 2.0 - legThick / 1.0;
	mvMatrixStack.push(modelViewMatrix);
	t= translate(dist, 0, dist);
        modelViewMatrix = mult(modelViewMatrix, t);
	DrawTableLeg(legThick, legLen);
       
        // no push and pop between leg placements
	t=translate(0.13, 0, -1.5*dist);
        modelViewMatrix = mult(modelViewMatrix, t);
	DrawTableLeg(legThick, legLen);

	t=translate(-2*dist, 0, 1.7*dist);
        modelViewMatrix = mult(modelViewMatrix, t);
	DrawTableLeg(legThick, legLen);

	t=translate(0.13, 0, -1.6*dist);
        modelViewMatrix = mult(modelViewMatrix, t);
	DrawTableLeg(legThick, legLen);
	
    modelViewMatrix=mvMatrixStack.pop();
    
    // umbrella stand
    mvMatrixStack.push(modelViewMatrix);
	t=translate(0.15, 0.34,0.10);
        modelViewMatrix = mult(modelViewMatrix, t);
	DrawTableLeg(legThick, legLen);
    modelViewMatrix=mvMatrixStack.pop();

}

function DrawRightUmbrella()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 1); 
      // lighting and material for cone
      lightAmbient = vec4(0.4, 0.4, 0.4, 1);
      lightDiffuse = vec4(1, 1, 1, 1);
      lightSpecular = vec4(1, 1, 1, 1);
      materialAmbient = vec4( 0.7, 0, 0.1, 1.0);
      materialDiffuse = vec4( 0.7, 0, 0.1, 1.0);
      materialSpecular = vec4( 0.5, 0.5, 0.5, 1.0 );
      materialShininess = 100.0;
      SetupLightingMaterial();

  // right-umbrella
    mvMatrixStack.push(modelViewMatrix);
    t=translate(2.3, 0.05 ,0.2);
        modelViewMatrix = mult(modelViewMatrix, t);
    DrawUmbrella();
    modelViewMatrix=mvMatrixStack.pop(); 
}

function DrawLeftUmbrella()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 1); 
    // lighting and material for cone
    lightAmbient = vec4(0.4, 0.4, 0.4, 1);
    lightDiffuse = vec4(1, 1, 1, 1);
    lightSpecular = vec4(1, 1, 1, 1);
    materialAmbient = vec4( 0.7, 0, 0.1, 1.0);
    materialDiffuse = vec4( 0.7, 0, 0.1, 1.0);
    materialSpecular = vec4( 0.5, 0.5, 0.5, 1.0 );
    materialShininess = 100.0;
    SetupLightingMaterial();

   // left-umbrella
   mvMatrixStack.push(modelViewMatrix);
   t=translate(-0.22, 0.045,0.2);
       modelViewMatrix = mult(modelViewMatrix, t);
  DrawUmbrella();
  modelViewMatrix=mvMatrixStack.pop(); 
}

function DrawRestaurant()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 1); 
	//gl.uniform1i(gl.getUniformLocation(program, "texture"), 5);
    // lighting and material for cone
    materialAmbient = vec4( 1, 0.5, 0.2, 1.0);
    materialDiffuse = vec4( 1, .6, 0.5, 1.0);
    materialSpecular = vec4( 0.6, 0.6, 0.6, 1.0 );
    materialShininess = 50.0;
    SetupLightingMaterial();

	mvMatrixStack.push(modelViewMatrix);
    
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

	//gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
    gl.drawArrays( gl.TRIANGLES, 14160, 54);

	modelViewMatrix=mvMatrixStack.pop();
}

function drawRoundTables()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 3);
      // lighting and material for sphere
    materialAmbient = vec4( 0.7, .3, .1, 1.0 );
    materialDiffuse = vec4(  0.7, .3, .1, 1.0);
    materialSpecular = vec4(  0.3, 0.3, 0.3, 1.0 );
    materialShiness=50;
    SetupLightingMaterial();

    // draw the round table #1
    mvMatrixStack.push(modelViewMatrix);
	t=translate(3, 0, 1);
        modelViewMatrix=mult(modelViewMatrix, t);
	DrawRoundTable(0.5, 0.02, 0.02, 0.3);
    modelViewMatrix=mvMatrixStack.pop();
    
       // lighting and material for sphere
    materialAmbient = vec4( 0.7, .3, .1, 1.0 );
    materialDiffuse = vec4( 0.7, .3, .1, 1.0);
    materialSpecular = vec4(  0.4, 0.4, 0.4, 1.0 );
    materialShiness=50;
    SetupLightingMaterial();

    // draw the round table #2
    mvMatrixStack.push(modelViewMatrix);
	t=translate(.5, 0, 1);
        modelViewMatrix=mult(modelViewMatrix, t);
	DrawRoundTable(0.5, 0.02, 0.02, 0.3);
	modelViewMatrix=mvMatrixStack.pop();
    
}

function DrawChair()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 13);
	// draw seat
	mvMatrixStack.push(modelViewMatrix);
	s=scale4(1,0.25,1);
	t=translate(0.26,0.42,0.35);
	modelViewMatrix= mult( mult(modelViewMatrix, t), s);
	DrawSolidSphere(0.25);
	modelViewMatrix=mvMatrixStack.pop();
	
	//t = translate(0.1,0,0);
	//modelViewMatrix = mult(modelViewMatrix,t);
	// draw right legs
	mvMatrixStack.push(modelViewMatrix);
	s=scale4(.5,.9,.5);
	r=rotate(-30, 0,0,1);
	t=translate(.15, 0,.3);
	modelViewMatrix = mult( (mult( (mult(modelViewMatrix, t)), r) ), s);
	DrawTableLeg(0.1, .5);
	
	t = translate(0, 0, .3);
	modelViewMatrix = mult(modelViewMatrix,t);
	DrawTableLeg(0.1, .5);
	modelViewMatrix = mvMatrixStack.pop();
	
	// draw left legs
	mvMatrixStack.push(modelViewMatrix);
	s=scale4(.5,.9,.5);
	r=rotate(30, 0,0,1);
	t=translate(.4, 0,.3);
	modelViewMatrix = mult( (mult( (mult(modelViewMatrix, t)), r) ), s);
	DrawTableLeg(0.1, .5);
	
	t = translate(0, 0, .3);
	r=rotate(0, 0, 0, 1);
	modelViewMatrix = mult(modelViewMatrix,t);
	//modelViewMatrix = mult(modelViewMatrix, r);
	DrawTableLeg(0.1, .5);
	modelViewMatrix = mvMatrixStack.pop();
}

function DrawStools()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 1); 
	//gl.uniform1i(gl.getUniformLocation(program, "texture"), 4);
     // lighting and material for cone
     materialAmbient = vec4( 1.2, 0.7, 0.4, 1.0);
     materialDiffuse = vec4( 1.2, 0.7, 0.4, 1.0);
     materialSpecular = vec4( 0.4,0.4,0.4, 1.0 );
     materialShininess = 50.0;
     SetupLightingMaterial();
  
    mvMatrixStack.push(modelViewMatrix);
    s= scale4(0.7,.7,0.7);
	t=translate(0.8,0,0.8);
    modelViewMatrix=mult(mult(modelViewMatrix, s),t);
	DrawChair();
    modelViewMatrix=mvMatrixStack.pop();

   
    mvMatrixStack.push(modelViewMatrix);
    s= scale4(0.7,.7,0.7);
	t=translate(1.5,0,0.2);
    modelViewMatrix=mult(mult(modelViewMatrix, s),t);
	DrawChair();
    modelViewMatrix=mvMatrixStack.pop();
   
    mvMatrixStack.push(modelViewMatrix);
    s= scale4(0.7,.7,0.7);
	t=translate(4,0,0.8);
    modelViewMatrix=mult(mult(modelViewMatrix, s),t);
	DrawChair();
    modelViewMatrix=mvMatrixStack.pop();

    mvMatrixStack.push(modelViewMatrix);
    s= scale4(0.7,.7,0.7);
	t=translate(5,0,0.2);
    modelViewMatrix=mult(mult(modelViewMatrix, s),t);
	DrawChair();
    modelViewMatrix=mvMatrixStack.pop();
       // lighting and material for cone
       materialAmbient = vec4( 1, 0.5, 0.2, 1.0);
       materialDiffuse = vec4( 1, 0.5, 0.2, 1.0);
       materialSpecular = vec4( 0.6, 0.6, 0.6, 1.0 );
       materialShininess = 100.0;
       SetupLightingMaterial();

    // draw stools
	mvMatrixStack.push(modelViewMatrix);
    s= scale4(1,1,1);
	t=translate(0.9,0,3.2);
    modelViewMatrix=mult(mult(modelViewMatrix, s),t);
	DrawChair();
    modelViewMatrix=mvMatrixStack.pop();

    // lighting and material for cone
    materialAmbient = vec4( 1.2, 0.7, 0.4, 1.0);
    materialDiffuse = vec4( 1.2, 0.7, 0.4, 1.0);
    materialSpecular = vec4( 0.4,0.4,0.4, 1.0 );
    materialShininess = 50.0;
    SetupLightingMaterial();

    mvMatrixStack.push(modelViewMatrix);
    s= scale4(1,1,1);
	t=translate(1.8,0,3.2);
    modelViewMatrix=mult(mult(modelViewMatrix, s),t);
	DrawChair();
    modelViewMatrix=mvMatrixStack.pop();

    mvMatrixStack.push(modelViewMatrix);
    s= scale4(1,1,1);
	t=translate(2.7,0,3.2);
    modelViewMatrix=mult(mult(modelViewMatrix, s),t);
	DrawChair();
    modelViewMatrix=mvMatrixStack.pop();



    mvMatrixStack.push(modelViewMatrix);
    s= scale4(1,1,1);
	t=translate(1.7,0,1.4);
    modelViewMatrix=mult(mult(modelViewMatrix, s),t);
	DrawChair();
    modelViewMatrix=mvMatrixStack.pop();


    mvMatrixStack.push(modelViewMatrix);
    s= scale4(1,1,1);
	t=translate(0.8,0,1.4);
    modelViewMatrix=mult(mult(modelViewMatrix, s),t);
	DrawChair();
    modelViewMatrix=mvMatrixStack.pop();

    mvMatrixStack.push(modelViewMatrix);
    s= scale4(1,1,1);
	t=translate(2.7,0,1.4);
    modelViewMatrix=mult(mult(modelViewMatrix, s),t);
	DrawChair();
    modelViewMatrix=mvMatrixStack.pop();
   
   
   
}

function DrawWalls()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
     // lighting and material for cone
     materialAmbient = vec4( 0, 0.2, 0.4, 1.0);
     materialDiffuse = vec4( 0, 0.2, 0.4, 1.0);
     materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
     materialShininess = 50.0;
     SetupLightingMaterial();

    	// wall # 1: in xz-plane
        gl.uniform1i(gl.getUniformLocation(program, "texture"), 11);
	 mvMatrixStack.push(modelViewMatrix);
     s = scale4(4.0, 1.0, 6);
     t= translate(0,-0.015, 0);
     modelViewMatrix = mult(mult(modelViewMatrix, s), t);
     DrawWall(0.02); 
     modelViewMatrix = mvMatrixStack.pop();
     
     // wall #2: in yz-plane
     gl.uniform1i(gl.getUniformLocation(program, "texture"), 9);
     mvMatrixStack.push(modelViewMatrix);
     s = scale4(2.0, 0.9, 6);
     r=rotate(90.0, 0.0, 0.0, 1.0);
         modelViewMatrix=mult(mult(modelViewMatrix, r), s);
     DrawWall(0.02); 
     //modelViewMatrix=mvMatrixStack.pop();
     
     // wall #3: in xy-plane
     gl.uniform1i(gl.getUniformLocation(program, "texture"), 9);
     //mvMatrixStack.push(modelViewMatrix);
     s = scale4(1.0, 0.2, 4.0);
     r=rotate(90, 1.0, 0.0, 0.0);
         modelViewMatrix=mult(mult(modelViewMatrix, r),s);
	   //modelViewMatrix=mult(modelViewMatrix,r);
     DrawWall(0.02); 
     modelViewMatrix=mvMatrixStack.pop();
 

}

function DrawSign()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 1); 
	//gl.uniform1i(gl.getUniformLocation(program, "texture"), 4);
       // lighting and material for cone
       materialAmbient = vec4( 0.1, 0.1, 0, 1.0);
       materialDiffuse = vec4( 0.1, 0.1, 0, 1.0);
       materialSpecular = vec4( 0.8, 0.8, 0.8, 1.0 );
       materialShininess = 10.0;
       SetupLightingMaterial();

    mvMatrixStack.push(modelViewMatrix);
     s = scale4(0.5, -3, .3);
     r=rotate(90+signMov, 1.0, 0.0, 0.0);
     t=translate(1.22,1.4,0.73);
         modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
     DrawWall(0.01); 
     modelViewMatrix=mvMatrixStack.pop();
    
}

function DrawSignHolder()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 1); 
	//gl.uniform1i(gl.getUniformLocation(program, "texture"), 1);
     // lighting and material for cone
     materialAmbient = vec4( 1, 1, 0.7, 1.0);
     materialDiffuse = vec4( 1, 1, 0.7, 1.0);
     materialSpecular = vec4( 0.5, 0.5, 0.5, 1.0 );
     materialShininess = 100.0;
     SetupLightingMaterial();

      //draw #1
      mvMatrixStack.push(modelViewMatrix);

      t=translate(0, .35, -0.1);
      var s=scale4(0, 0.2, 0.02);
          modelViewMatrix=mult(mult(modelViewMatrix, t), s);
          gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
      DrawSolidCube(1);
  
      modelViewMatrix=mvMatrixStack.pop();

       // #2
    mvMatrixStack.push(modelViewMatrix);

	t=translate(0.54, .35, -0.1);
	var s=scale4(0, 0.2, 0.02);
        modelViewMatrix=mult(mult(modelViewMatrix, t), s);
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	DrawSolidCube(1);

    modelViewMatrix=mvMatrixStack.pop();
}

function DrawBeerGlass()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 1);
    // right table
     // draw glass 1
    // lighting and material for cone
    materialAmbient = vec4( 1, 1, 0.7, 1.0);
    materialDiffuse = vec4( 1, 1, 0.7, 1.0);
    materialSpecular = vec4( 0.5, 0.5, 0.5, 1.0 );
    materialShininess = 100.0;
    SetupLightingMaterial();

    // long table (6 glasses)
    // 3 back left to right
    mvMatrixStack.push(modelViewMatrix);
    t=translate(1.2, 0.45, 3.2);
   modelViewMatrix=mult(modelViewMatrix, t);
   DrawSolidCylinder(0.03, 0.07);
   modelViewMatrix=mvMatrixStack.pop();

   mvMatrixStack.push(modelViewMatrix);
    t=translate(2.2, 0.45, 3.2);
   modelViewMatrix=mult(modelViewMatrix, t);
   DrawSolidCylinder(0.03, 0.07);
   modelViewMatrix=mvMatrixStack.pop();

   mvMatrixStack.push(modelViewMatrix);
    t=translate(3, 0.45, 3.2);
   modelViewMatrix=mult(modelViewMatrix, t);
   DrawSolidCylinder(0.03, 0.07);
   modelViewMatrix=mvMatrixStack.pop();

    // 3 front left to right

    mvMatrixStack.push(modelViewMatrix);
    t=translate(1.2, 0.45, 3.7);
   modelViewMatrix=mult(modelViewMatrix, t);
   DrawSolidCylinder(0.03, 0.07);
   modelViewMatrix=mvMatrixStack.pop();

   mvMatrixStack.push(modelViewMatrix);
    t=translate(2.2, 0.45, 3.7);
   modelViewMatrix=mult(modelViewMatrix, t);
   DrawSolidCylinder(0.03, 0.07);
   modelViewMatrix=mvMatrixStack.pop();

   mvMatrixStack.push(modelViewMatrix);
    t=translate(3, 0.45, 3.7);
   modelViewMatrix=mult(modelViewMatrix, t);
   DrawSolidCylinder(0.03, 0.07);
   modelViewMatrix=mvMatrixStack.pop();

     // right table
     mvMatrixStack.push(modelViewMatrix);
     t=translate(0.8, 0.36, 1);
    modelViewMatrix=mult(modelViewMatrix, t);
    DrawSolidCylinder(0.03, 0.05);
    modelViewMatrix=mvMatrixStack.pop();
 
    // draw glass 2
    mvMatrixStack.push(modelViewMatrix);
        t=translate(0.5, 0.36, 1.21);
    modelViewMatrix=mult(modelViewMatrix, t);
    DrawSolidCylinder(0.03, 0.05);
    modelViewMatrix=mvMatrixStack.pop();

     // left table
     // draw glass 1
     mvMatrixStack.push(modelViewMatrix);
     t=translate(3.3, 0.36, 1);
    modelViewMatrix=mult(modelViewMatrix, t);
    DrawSolidCylinder(0.03, 0.05);
    modelViewMatrix=mvMatrixStack.pop();
 
     // draw glass 2
    mvMatrixStack.push(modelViewMatrix);
        t=translate(3, 0.36, 1.22);
    modelViewMatrix=mult(modelViewMatrix, t);
    DrawSolidCylinder(0.03, 0.05);
    modelViewMatrix=mvMatrixStack.pop();
}

function DrawFlower()
{
	//gl.uniform1i(gl.getUniformLocation(program, "texture"), 2);
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 1); 
     // lighting and material for cone
     lightAmbient = vec4(0.4, 0.4, 0.4, 1);
     lightDiffuse = vec4(1, 1, 1, 1);
     lightSpecular = vec4(1, 1, 1, 1);
     materialAmbient = vec4( 0.7, 0, 0.1, 1.0);
     materialDiffuse = vec4( 0.7, 0, 0.1, 1.0);
     materialSpecular = vec4( 0.5, 0.5, 0.5, 1.0 );
     materialShininess = 50.0;
     SetupLightingMaterial();

	N=N_Flower;
	mvMatrixStack.push(modelViewMatrix);
	s=scale4(0.02,0.03,0.03);
	r=rotate(90+signMov,1,0,0);
	t=translate(1.4,1.35,0.7);
    modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
	//modelViewMatrix=mult(modelViewMatrix, s);
	gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	gl.drawArrays( gl.TRIANGLES, 14214, 192);
    modelViewMatrix=mvMatrixStack.pop();
}

function DrawLongTable(topWid, topThick, legThick, legLen)
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 3);
    mvMatrixStack.push(modelViewMatrix);
    s = scale4(2.5, 0.6, 0.9);
    t=translate(.8, 0.4, 1.8);
    modelViewMatrix = mult(mult(modelViewMatrix, t),s);
    DrawWall(0.07); 
    modelViewMatrix = mvMatrixStack.pop();


    //var dist = 0.95 * topWid / 2.0 - legThick / 2.0;
	mvMatrixStack.push(modelViewMatrix);
	t= translate(0.88, 0, 2.7);
        modelViewMatrix = mult(modelViewMatrix, t);
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	DrawTableLeg(legThick, legLen);
    // leg 2   
	t= translate(-0.05, 0, -0.5);
        modelViewMatrix = mult(modelViewMatrix, t);
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	DrawTableLeg(legThick, legLen);
    // leg 3
    t= translate(2.47, 0.03, -0.35);
        modelViewMatrix = mult(modelViewMatrix, t);
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    DrawTableLeg(legThick, legLen);
    // leg 4
    t= translate(-0.018, 0, 0.8);
        modelViewMatrix = mult(modelViewMatrix, t);
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
	DrawTableLeg(legThick, legLen);
	
	modelViewMatrix=mvMatrixStack.pop();
    
    
}

function DrawOuterDoor()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
  gl.uniform1i(gl.getUniformLocation(program, "texture"), 8);
    // corner doors
     // lighting and material for cone
     materialAmbient = vec4( 0.1, 0.2, 0.7, 1.0);
     materialDiffuse = vec4( 0.1, 0.2, 0.7, 1.0);
     materialSpecular = vec4( 0.1, 0.2, 0.7, 1.0 );
     materialShininess = 100.0;
     SetupLightingMaterial();
 
     mvMatrixStack.push(modelViewMatrix);
     s = scale4(0.55, 1, 1.2);
     r=rotate(90, 1.0, 0.0, 0.0);
     t=translate(0.6,1.2,0.32);
         modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
     DrawWall(0.02); 
     modelViewMatrix=mvMatrixStack.pop();
 
     mvMatrixStack.push(modelViewMatrix);
     s = scale4(0.5, 1, 1.2);
     r=rotate(90, 1.0, 0.0, 0.0);
     t=translate(2.17,1.2,0.32);
         modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
     DrawWall(0.02); 
     modelViewMatrix=mvMatrixStack.pop();

    
   

}

function DrawCenterTable()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
    materialAmbient = vec4( 0.7, .3, .1, 1.0 );
    materialDiffuse = vec4(  0.7, .3, .1, 1.0);
    materialSpecular = vec4(  0.3, 0.3, 0.3, 1.0 );
    materialShiness=50;
    SetupLightingMaterial();

    mvMatrixStack.push(modelViewMatrix);
    s=scale4(1,0,1);
	t=translate(1.6, 0.47, 3.5);
	modelViewMatrix=mult(mult(modelViewMatrix, t),s);
    DrawSolidSphere(0.2, 0.3);
    modelViewMatrix=mvMatrixStack.pop();
    
    mvMatrixStack.push(modelViewMatrix);
    s=scale4(1,0,1);
	t=translate(2.6, 0.47, 3.5);
	modelViewMatrix=mult(mult(modelViewMatrix, t),s);
	DrawSolidSphere(0.2, 0.3);
	modelViewMatrix=mvMatrixStack.pop();
}

function DrawOranges()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 10);
    lightAmbient = vec4(0.4, 0.4, 0.4, 1);
     lightDiffuse = vec4(1, 1, 1, 1);
     lightSpecular = vec4(1, 1, 1, 1);
     materialAmbient = vec4( 0.7, 0, 0.1, 1.0);
     materialDiffuse = vec4( 0.7, 0, 0.1, 1.0);
     materialSpecular = vec4( 0.5, 0.5, 0.5, 1.0 );
     materialShininess = 50.0;
     SetupLightingMaterial();

    mvMatrixStack.push(modelViewMatrix);
	t=translate(1.68, 0.54, 3.5);
	modelViewMatrix=mult(modelViewMatrix, t);
    DrawSolidSphere(0.06, 0.1);
    modelViewMatrix=mvMatrixStack.pop();


    mvMatrixStack.push(modelViewMatrix);
	t=translate(1.57, 0.54, 3.6);
	modelViewMatrix=mult(modelViewMatrix, t);
    DrawSolidSphere(0.06, 0.1);
    modelViewMatrix=mvMatrixStack.pop();

    mvMatrixStack.push(modelViewMatrix);
	t=translate(1.55, 0.54, 3.4);
	modelViewMatrix=mult(modelViewMatrix, t);
    DrawSolidSphere(0.06, 0.1);
    modelViewMatrix=mvMatrixStack.pop();
    
}

function DrawInnerLeftDoor()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 7);
      // lighting and material for cone
   materialAmbient = vec4( 0.1, 0.1, 0, 1.0);
   materialDiffuse = vec4( 0.1, 0.1, 0, 1.0);
   materialSpecular = vec4( 0.8, 0.8, 0.8, 1.0 );
   materialShininess = 10.0;
   SetupLightingMaterial();

   // inner door
   mvMatrixStack.push(modelViewMatrix);
   s = scale4(0.53, 0.1, 1.2);
   r=rotate(90, 1.0, 0.0, 0.0);
   t=translate(1.15,1.2,0.32);
       modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
   DrawWall(0.02); 
   modelViewMatrix=mvMatrixStack.pop();

   

}

function DrawInnerRightDoor()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 7);
        // lighting and material for cone
   materialAmbient = vec4( 0.1, 0.1, 0, 1.0);
   materialDiffuse = vec4( 0.1, 0.1, 0, 1.0);
   materialSpecular = vec4( 0.8, 0.8, 0.8, 1.0 );
   materialShininess = 10.0;
   SetupLightingMaterial();

   mvMatrixStack.push(modelViewMatrix);


	modelViewMatrix=mvMatrixStack.pop();
   mvMatrixStack.push(modelViewMatrix);
   s = scale4(0.53, 0.1, 1.2);
   r=rotate(90, 1.0, 0.0, 0.0);
   t=translate(1.66,1.2,0.32);
       modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
   DrawWall(0.02); 
   modelViewMatrix=mvMatrixStack.pop();


}

function DrawInnerCurtains()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 12);
    materialAmbient = vec4( 1.2, 1.2, 1.2, 1.0);
    materialDiffuse = vec4( 1.2, 1.2, 1.2, 1.0);
    materialSpecular = vec4( 1.2,1.2,1.2, 1.0 );
    materialShininess = 50.0;
    SetupLightingMaterial();

    mvMatrixStack.push(modelViewMatrix);
    s = scale4(0.4, 0.5, 0.6);
    r=rotate(90, 1.0, 0.0, 0.0);
    t=translate(1.72,1.05,0.36);
        modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
    DrawWall(0.02); 
    modelViewMatrix=mvMatrixStack.pop();

    mvMatrixStack.push(modelViewMatrix);
    s = scale4(0.4, 0.5, 0.6);
    r=rotate(90, 1.0, 0.0, 0.0);
    t=translate(1.25,1.05,0.36);

        modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
    DrawWall(0.02); 
    modelViewMatrix=mvMatrixStack.pop();
}

function DrawInnerWindows()
{
    gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 1); 
    // inside inner door
    // lighting and material for cone
    materialAmbient = vec4( 1.2, 0.7, 0.4, 1.0);
    materialDiffuse = vec4( 1.2, 0.7, 0.4, 1.0);
    materialSpecular = vec4( 0.4,0.4,0.4, 1.0 );
    materialShininess = 50.0;
    SetupLightingMaterial();

   mvMatrixStack.push(modelViewMatrix);
   s = scale4(0.4, 0.5, 0.6);
   r=rotate(90, 1.0, 0.0, 0.0);
   t=translate(1.72,1.05,0.36);
       modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
   DrawWall(0.02); 
   modelViewMatrix=mvMatrixStack.pop();


    mvMatrixStack.push(modelViewMatrix);
    s = scale4(0.4, 0.5, 0.6);
    r=rotate(90, 1.0, 0.0, 0.0);
    t=translate(1.25,1.05,0.36);

        modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
    DrawWall(0.02); 
    modelViewMatrix=mvMatrixStack.pop();
   
   // end
}

function DrawCurtains()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 2); 
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 12);
    materialAmbient = vec4( 1.2, 1.2, 1.2, 1.0);
    materialDiffuse = vec4( 1.2, 1.2, 1.2, 1.0);
    materialSpecular = vec4( 1.2,1.2,1.2, 1.0 );
    materialShininess = 50.0;
    SetupLightingMaterial();

    mvMatrixStack.push(modelViewMatrix);
    s = scale4(0.36, 1, 0.8);
    r=rotate(90, 1.0, 0.0, 0.0);
        t=translate(0.71,1.05,0.36);
        modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
    DrawWall(0.02); 
    modelViewMatrix=mvMatrixStack.pop();

    mvMatrixStack.push(modelViewMatrix);
    s = scale4(0.36, 1, 0.8);
    r=rotate(90, 1.0, 0.0, 0.0);
    t=translate(2.25,1.04,0.36);
        modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
    DrawWall(0.02); 
    modelViewMatrix=mvMatrixStack.pop();
   // end
}

function DrawOuterDoorWindows()
{
	gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 1);
    materialAmbient = vec4( 1.2, 0.7, 0.4, 1.0);
    materialDiffuse = vec4( 1.2, 0.7, 0.4, 1.0);
    materialSpecular = vec4( 0.4,0.4,0.4, 1.0 );
    materialShininess = 50.0;
    SetupLightingMaterial();

    mvMatrixStack.push(modelViewMatrix);
    s = scale4(0.36, 1, 0.8);
    r=rotate(90, 1.0, 0.0, 0.0);
        t=translate(0.71,1.05,0.36);
        modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
    DrawWall(0.02); 
    modelViewMatrix=mvMatrixStack.pop();

    mvMatrixStack.push(modelViewMatrix);
    s = scale4(0.36, 1, 0.8);
    r=rotate(90, 1.0, 0.0, 0.0);
    t=translate(2.25,1.04,0.36);
        modelViewMatrix=mult(mult(mult(modelViewMatrix, t),r),s);
    DrawWall(0.02); 
    modelViewMatrix=mvMatrixStack.pop();
   // end
 

}

function render()
{
	var s, t, r;
	//gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
	//gl.uniform1i(gl.getUniformLocation(program, "textFlag"), 1); 
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 

   	// set up view and projection
   	projectionMatrix = ortho(left*zoomFactor-translateFactorX, right*zoomFactor-translateFactorX, bottom*zoomFactor-translateFactorY, ytop*zoomFactor-translateFactorY, near, far);
       eye=vec3(
        Radius*Math.cos(theta*Math.PI/180.0)*Math.cos(phi*Math.PI/180.0),
        Radius*Math.sin(theta*Math.PI/180.0),
        Radius*Math.cos(theta*Math.PI/180.0)*Math.sin(phi*Math.PI/180.0) 
       );

    modelViewMatrix=lookAt(eye, at, up);
 	gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
	gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // draw restaurant
     mvMatrixStack.push(modelViewMatrix);
     s= scale4(0.6,.6,0.2);
     t=translate(0.9,0,0.5);
     modelViewMatrix=mult(mult(modelViewMatrix, s),t);
     DrawRestaurant();
     modelViewMatrix=mvMatrixStack.pop();
   // end restaurant

    // draw round tables
    mvMatrixStack.push(modelViewMatrix);
    drawRoundTables();
    modelViewMatrix = mvMatrixStack.pop();
    // end round table 

    // draw left umbrella and animate
    mvMatrixStack.push(modelViewMatrix);

   if(closeUmbrella)
   {
    s= scale4(1.8, 0.8, 1.8);
    t= translate(-0.3,0.3,-0.5);
     modelViewMatrix = mult(mult(modelViewMatrix,s),t);      
   } 
    DrawLeftUmbrella();
    modelViewMatrix = mvMatrixStack.pop();

    // draw right umbrella and animate
    mvMatrixStack.push(modelViewMatrix);
   if(closeUmbrella)
   {
    s= scale4(1.8, 0.8, 1.8);
    t= translate(-1.42,0.3,-0.5);
     modelViewMatrix = mult(mult(modelViewMatrix, s),t);      
   } 
    DrawRightUmbrella();
    modelViewMatrix = mvMatrixStack.pop();

    // draw walls
    mvMatrixStack.push(modelViewMatrix);
    DrawWalls();
    modelViewMatrix = mvMatrixStack.pop();
   // end walls

   // draw stools
    mvMatrixStack.push(modelViewMatrix);
    t=translate(-0.1,0,0.8);
        modelViewMatrix=mult(modelViewMatrix,t);
    DrawStools();
    modelViewMatrix = mvMatrixStack.pop();
   // end stools 

   // drawBeerGlasses
    mvMatrixStack.push(modelViewMatrix);
    DrawBeerGlass();
    modelViewMatrix = mvMatrixStack.pop();
	// end beer glasses
    
      // draw sign holder
   mvMatrixStack.push(modelViewMatrix);
   t=translate(1.2,1.1,0.8);
     modelViewMatrix=mult(modelViewMatrix,t);
   DrawSignHolder();
   modelViewMatrix = mvMatrixStack.pop();
   // end sign holder

	// draw flower on left sign
	mvMatrixStack.push(modelViewMatrix);
	DrawFlower();
	modelViewMatrix = mvMatrixStack.pop();
	//end flower
    
    // left moving sign
    mvMatrixStack.push(modelViewMatrix);
   if (signAnim) 
   {
        if (signMov > 20 || signMov < -20) {
            signDir *= -1;
            signMov += signDir * 3;
        }
        else { 
            signMov += signDir * 3; 
        }
    }
    DrawSign();
    modelViewMatrix = mvMatrixStack.pop();
    // end sign

    // draw long table
    mvMatrixStack.push(modelViewMatrix);
    t=translate(-0.1,0,1.2);
        modelViewMatrix=mult(modelViewMatrix,t);
    DrawLongTable(1, 0.05, 0.04, 0.4);
    modelViewMatrix= mvMatrixStack.pop();
    // end long table

    // draw doors and windows

   mvMatrixStack.push(modelViewMatrix);
   
   DrawOuterDoor();
   modelViewMatrix = mvMatrixStack.pop();

   mvMatrixStack.push(modelViewMatrix);
  if (doorOpen)
  {
    
      DrawInnerWindows();
  } 
  DrawInnerCurtains();
  modelViewMatrix= mvMatrixStack.pop();

  mvMatrixStack.push(modelViewMatrix);
   DrawInnerLeftDoor();
   modelViewMatrix = mvMatrixStack.pop();

   mvMatrixStack.push(modelViewMatrix);
   
   DrawInnerRightDoor();
   modelViewMatrix = mvMatrixStack.pop();

   mvMatrixStack.push(modelViewMatrix);  
   
   if (doorOpen)
   { 
        DrawOuterDoorWindows();
   }
   DrawCurtains();
   modelViewMatrix = mvMatrixStack.pop();
 // end doors and windows


 // draw oranges and plates  
   mvMatrixStack.push(modelViewMatrix);
    DrawCenterTable();
   modelViewMatrix=mvMatrixStack.pop();

   mvMatrixStack.push(modelViewMatrix);
   DrawOranges();
  modelViewMatrix=mvMatrixStack.pop();

  mvMatrixStack.push(modelViewMatrix);
  t= translate(1,0,0);
    modelViewMatrix=mult(modelViewMatrix,t);
  DrawOranges();
  modelViewMatrix=mvMatrixStack.pop();
 // end oranges and plates


    window.requestAnimFrame(render);
}

// ******************************************
// supporting functions below this:
// ******************************************
function triangle(a, b, c) 
{
     normalsArray.push(vec3(a[0], a[1], a[2]));
     normalsArray.push(vec3(b[0], b[1], b[2]));
     normalsArray.push(vec3(c[0], c[1], c[2]));
     
     pointsArray.push(a);
     pointsArray.push(b);      
     pointsArray.push(c);
	 
	 texCoordsArray.push(texCoord[0]);
	 texCoordsArray.push(texCoord[1]);
	 texCoordsArray.push(texCoord[2]);

     sphereCount += 3;
}

function divideTriangle(a, b, c, count) 
{
    if ( count > 0 ) 
    {
        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);
                
        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);
                                
        divideTriangle( a, ab, ac, count - 1 );
        divideTriangle( ab, b, bc, count - 1 );
        divideTriangle( bc, c, ac, count - 1 );
        divideTriangle( ab, bc, ac, count - 1 );
    }
    else { 
        triangle( a, b, c );
    }
}

function tetrahedron(a, b, c, d, n) 
{
    	divideTriangle(a, b, c, n);
    	divideTriangle(d, c, b, n);
    	divideTriangle(a, d, b, n);
    	divideTriangle(a, c, d, n);
}

function quad(a, b, c, d) 
{
    var points=[a, b, c, d];
    var normal = Newell(points);

 // triangle abc
    pointsArray.push(a);
    normalsArray.push(normal);
    pointsArray.push(b);
    normalsArray.push(normal);
    pointsArray.push(c);
    normalsArray.push(normal);
	
	texCoordsArray.push(texCoord[0]);
	 texCoordsArray.push(texCoord[1]);
	 texCoordsArray.push(texCoord[2]);

 // triangle acd
    pointsArray.push(a);
    normalsArray.push(normal);
    pointsArray.push(c);
    normalsArray.push(normal);
    pointsArray.push(d);
    normalsArray.push(normal);  
	
	texCoordsArray.push(texCoord[0]);
	 texCoordsArray.push(texCoord[2]);
	 texCoordsArray.push(texCoord[3]);
         
}

// a 4x4 matrix multiple by a vec4
function multiply(m, v)
{
    var vv=vec4(
     m[0][0]*v[0] + m[0][1]*v[1] + m[0][2]*v[2]+ m[0][3]*v[3],
     m[1][0]*v[0] + m[1][1]*v[1] + m[1][2]*v[2]+ m[1][3]*v[3],
     m[2][0]*v[0] + m[2][1]*v[1] + m[2][2]*v[2]+ m[2][3]*v[3],
     m[3][0]*v[0] + m[3][1]*v[1] + m[3][2]*v[2]+ m[3][3]*v[3]);
    return vv;
}

function Newell(vertices)
{
    var L=vertices.length;
    var x=0, y=0, z=0;
    var index, nextIndex;
 
    for (var i=0; i<L; i++)
    {
        index=i;
        nextIndex = (i+1)%L;
        
        x += (vertices[index][1] - vertices[nextIndex][1])*
             (vertices[index][2] + vertices[nextIndex][2]);
        y += (vertices[index][2] - vertices[nextIndex][2])*
             (vertices[index][0] + vertices[nextIndex][0]);
        z += (vertices[index][0] - vertices[nextIndex][0])*
             (vertices[index][1] + vertices[nextIndex][1]);
    }
 
    return (normalize(vec3(x, y, z)));
}

function polygon(vertices)
{
    var L=vertices.length;
    var normal=Newell(vertices);

    var prev=1;
    var next=2;
    // triangles:
    // a-b-c
    // a-c-d
    // a-d-e
    // ...

    for (var i=0; i<L-2; i++)
    {
        pointsArray.push(vertices[0]);
        normalsArray.push(normal);

        pointsArray.push(vertices[prev]);
        normalsArray.push(normal);

        pointsArray.push(vertices[next]);
        normalsArray.push(normal);
		
		// HELP
		texCoordsArray.push(texCoord[0]);
	 texCoordsArray.push(texCoord[1]);
	 texCoordsArray.push(texCoord[2]);

        cylinderCount += 3;
        prev=next;
        next=next+1;
    }
}

function pentagon(a, b, c, d, e) {

    var points=[a, b, c, d, e];
    var normal = Newell(points);

    pointsArray.push(a);
    normalsArray.push(normal);
    pointsArray.push(b);
    normalsArray.push(normal);
    pointsArray.push(c);
    normalsArray.push(normal);
	
	//HELP
	texCoordsArray.push(texCoord[0]);
	 texCoordsArray.push(texCoord[1]);
	 texCoordsArray.push(texCoord[2]);
  

    pointsArray.push(a);
    normalsArray.push(normal);
    pointsArray.push(c);
    normalsArray.push(normal);
    pointsArray.push(d);
    normalsArray.push(normal);
	
	// HELP
	texCoordsArray.push(texCoord[0]);
	 texCoordsArray.push(texCoord[2]);
	 texCoordsArray.push(texCoord[3]);
 

    pointsArray.push(a);
    normalsArray.push(normal);
    pointsArray.push(d);
    normalsArray.push(normal);
    pointsArray.push(e);
    normalsArray.push(normal);
	
	// HELP
	texCoordsArray.push(texCoord[0]);
	 texCoordsArray.push(texCoord[3]);
	 texCoordsArray.push(texCoord[2]);

}

function scale4(a, b, c) {
   	var result = mat4();
   	result[0][0] = a;
   	result[1][1] = b;
   	result[2][2] = c;
   	return result;
}

// ******************************************
// Draw extruded shape
// ******************************************

function quad2(a, b, c, d, vertices) {

     var indices=[a, b, c, d];
     var normal = Newell2(indices, vertices);

     // triangle a-b-c
     pointsArray.push(vertices[a]); 
     normalsArray.push(normal); 

     pointsArray.push(vertices[b]); 
     normalsArray.push(normal); 

     pointsArray.push(vertices[c]); 
     normalsArray.push(normal);   
	 
	 // HELP
	 texCoordsArray.push(texCoord[0]);
	 texCoordsArray.push(texCoord[1]);
	 texCoordsArray.push(texCoord[2]);

     // triangle a-c-d
     pointsArray.push(vertices[a]);  
     normalsArray.push(normal); 

     pointsArray.push(vertices[c]); 
     normalsArray.push(normal); 

     pointsArray.push(vertices[d]); 
     normalsArray.push(normal);    
	 
	 //HELP
	 texCoordsArray.push(texCoord[0]);
	 texCoordsArray.push(texCoord[2]);
	 texCoordsArray.push(texCoord[3]);
}

function polygon2(indices, vertices)
{
    // for indices=[a, b, c, d, e, f, ...]
    var M=indices.length;
    var normal=Newell2(indices, vertices);

    var prev=1;
    var next=2;
    // triangles:
    // a-b-c
    // a-c-d
    // a-d-e
    // ...
    for (var i=0; i<M-2; i++)
    {
        pointsArray.push(vertices[indices[0]]);
        normalsArray.push(normal);

        pointsArray.push(vertices[indices[prev]]);
        normalsArray.push(normal);

        pointsArray.push(vertices[indices[next]]);
        normalsArray.push(normal);
		
		// HELP
		texCoordsArray.push(texCoord[0]);
	 texCoordsArray.push(texCoord[1]);
	 texCoordsArray.push(texCoord[2]);

        prev=next;
        next=next+1;
    }
}

function Newell2(indices, vertices)
{
   var L=indices.length;
   var x=0, y=0, z=0;
   var index, nextIndex;
	//console.log(vertices);
	//index=indices[i];
	//console.log(vertices[index][0]);
   for (var i=0; i<L; i++)
   {
       index=indices[i];
       nextIndex = indices[(i+1)%L];
       
       x += (vertices[index][1] - vertices[nextIndex][1])*
            (vertices[index][2] + vertices[nextIndex][2]);
       y += (vertices[index][2] - vertices[nextIndex][2])*
            (vertices[index][0] + vertices[nextIndex][0]);
       z += (vertices[index][0] - vertices[nextIndex][0])*
            (vertices[index][1] + vertices[nextIndex][1]);
   }

   return (normalize(vec3(x, y, z)));
}

function flower()
{
	var height = 2;
	var vertices = [
		
		vec4(3,0,6,1),	// top petal, rest follow clockwise
		vec4(4,0,5,1),
		vec4(5,0,5,1),
		vec4(5,0,4,1),
		vec4(6,0,3,1),
		vec4(5,0,2,1),
		vec4(5,0,1,1),
		vec4(4,0,1,1),
		vec4(3,0,0,1),
		vec4(2,0,1,1),
		vec4(1,0,1,1),
		vec4(1,0,2,1),
		vec4(0,0,3,1),
		vec4(1,0,4,1),
		vec4(1,0,5,1),
		vec4(2,0,5,1),
		vec4(3,0,6,1)
		
	];
	N=N_Flower = vertices.length;
	
	// add the second set of points
    for (var i=0; i<N; i++)
    {
        vertices.push(vec4(vertices[i][0], vertices[i][1]+height, vertices[i][2], 1));
		// HELP
		texCoordsArray.push(texCoord[0]);
    }

    ExtrudedShape(vertices);
	
}

function ExtrudedShape(vertices)
{
    var basePoints=[];
    var topPoints=[];
	//console.log(N);
    // create the face list 
    // add the side faces first --> N quads
    for (var j=0; j<N; j++)
    {
		//console.log(j);
		//console.log(j+N);
        quad2(j, j+N, (j+1)%N+N, (j+1)%N, vertices);   
    }

    // the first N vertices come from the base 
    basePoints.push(0);
    for (var i=N-1; i>0; i--)
    {
        basePoints.push(i);  // index only
    }
    // add the base face as the Nth face
    polygon2(basePoints, vertices);

    // the next N vertices come from the top 
    for (var i=0; i<N; i++)
    {
        topPoints.push(i+N); // index only
    }
    // add the top face
    polygon2(topPoints, vertices);
}


function loadTexture(texture, whichTexture)
{
    // Flip the image's y axis
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Enable texture unit 1
    gl.activeTexture(whichTexture);

    // bind the texture object to the target
    gl.bindTexture( gl.TEXTURE_2D, texture);

    // set the texture image
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texture.image );

    // version 1 (combination needed for images that are not powers of 2
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

    // set the texture parameters
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

}

function EstablishTextures()
{
    // ========  Establish Textures =================
    // --------create texture object 1----------
   /* texture1 = gl.createTexture();

    // create the image object
    texture1.image = new Image();

    // Tell the broswer to load an image
    texture1.image.src='icecream-chocholate.jpg';

    // register the event handler to be called on loading an image
    texture1.image.onload = function() {  loadTexture(texture1, gl.TEXTURE0); }

    // -------create texture object 2------------
    texture2 = gl.createTexture();

    // create the image object
    texture2.image = new Image();

    // Tell the broswer to load an image
    texture2.image.src='icecream-waffle.jpg';

    // register the event handler to be called on loading an image
    texture2.image.onload = function() {  loadTexture(texture2, gl.TEXTURE1); }*/

	textS = gl.createTexture();
	textS.image = new Image();
	gl.activeTexture(gl.TEXTURE0);
	textS.image.onload = function() {  loadTexture(textS, gl.TEXTURE0); }
	textS.image.src='ceramic.jpg';
	
	textWh = gl.createTexture();
	textWh.image = new Image();
	gl.activeTexture(gl.TEXTURE1);
	textWh.image.onload = function() {  loadTexture(textWh, gl.TEXTURE1); }
	textWh.image.src='window.jpg';
	
	textR = gl.createTexture();	
	textR.image = new Image();	
	gl.activeTexture(gl.TEXTURE2);
	textR.image.onload = function() {  loadTexture(textR, gl.TEXTURE2); }
	textR.image.src='red.jpg';	
	
	textWo = gl.createTexture();
	textWo.image = new Image();
	gl.activeTexture(gl.TEXTURE3);
	textWo.image.onload = function() {  loadTexture(textWo, gl.TEXTURE3); }
	textWo.image.src='wood.jpg';
	
	textY = gl.createTexture();
	textY.image = new Image();
	gl.activeTexture(gl.TEXTURE4);
	textY.image.onload = function() {  loadTexture(textY, gl.TEXTURE4); }
	textY.image.src='yellow.jpg';
	
	textB = gl.createTexture();
	textB.image = new Image();
	gl.activeTexture(gl.TEXTURE5);
	textB.image.onload = function() {  loadTexture(textB, gl.TEXTURE5); }
	textB.image.src='brown.jpg';
	
	
	textSt = gl.createTexture();
	textSt.image = new Image();
	gl.activeTexture(gl.TEXTURE6);
	textSt.image.onload = function() {  loadTexture(textSt, gl.TEXTURE6); }
	textSt.image.src='bluewhite.png';
	
	
	textD = gl.createTexture();
	textD.image = new Image();
	gl.activeTexture(gl.TEXTURE7);
	textD.image.onload = function() {  loadTexture(textD, gl.TEXTURE7); }
	textD.image.src='door.jpg';
	
	textBl = gl.createTexture();
	textBl.image = new Image();
	gl.activeTexture(gl.TEXTURE8);
	textBl.image.onload = function() {  loadTexture(textBl, gl.TEXTURE8); }
	textBl.image.src='bluewindow.jpg';
	
	textBr = gl.createTexture();
	textBr.image = new Image();
	gl.activeTexture(gl.TEXTURE9);
	textBr.image.onload = function() {  loadTexture(textBr, gl.TEXTURE9); }
	textBr.image.src='brick.jpg';
	
	textO = gl.createTexture();
	textO.image = new Image();
	gl.activeTexture(gl.TEXTURE10);
	textO.image.onload = function() {  loadTexture(textO, gl.TEXTURE10); }
	textO.image.src='orange.jpg';
	
	textC = gl.createTexture();
	textC.image = new Image();
	gl.activeTexture(gl.TEXTURE11);
	textC.image.onload = function() {  loadTexture(textC, gl.TEXTURE11); }
	textC.image.src='mosaic.jpg';
	
	textCu = gl.createTexture();
	textCu.image = new Image();
	gl.activeTexture(gl.TEXTURE12);
	textCu.image.onload = function() {  loadTexture(textCu, gl.TEXTURE12); }
	textCu.image.src='curtains.jpg';
	
	textBlu = gl.createTexture();
	textBlu.image = new Image();
	gl.activeTexture(gl.TEXTURE13);
	textBlu.image.onload = function() {  loadTexture(textBlu, gl.TEXTURE13); }
	textBlu.image.src='gold.jpg';


}

