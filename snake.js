//caleb doiron and Andrew Hall snake game 
var canvas;
var shader_programs;
var gl;
var snake_scales;
var snake_head;
var color_loc;
var pos_loc;
var num_vertex = 7;

var turning_R;
var turning_L;
var speed; 
var angular_speed;//distance moved every frame 
var num_segments;//length of snake in body segments
var snake_spacing;//distance between the center of each body segment
var snake_length;// the length of the snake
var position_array;//array that holds the state of each segment
var position_array_length;
var radius = .03;
var view_loc;
var vpos_loc;
var bound_height = 2;
var bound_width = 2;
var bound_positions;
var vertex_positions;
var snake_head_m;
var scale_pos;
var mouse_target;
var stop;//
var last_time;//time of the last 
var delta;//time diference from last frame
var start= Date.now();
var old_head;
var snake_step;//how far the snake has moved from last frame
var angular_step;
//pellet variables 
var pellets;
var pellet_buffer;
var pellet_positions;
var maxPellets = 200;
var rangeMultiplier = 1.95;
var score;
var eatPellet = false;
var pelletMatrix;
var game_start;
var restart = 0;
var pellet_pos = 0;
function init(){
    
    //game 
    stop = 0;
    score = 0.0;
    document.getElementById("score").innerHTML= "score: "+parseFloat(score);
 //buffers for snake polygons and bound   
var poly_buffer  = setup_poly(num_vertex);
var bound_buffer = setup_bound();
var pellet_buffer = setup_poly(20);
//init gl
canvas = document.getElementById("gl-canvas");
gl = WebGLUtils.setupWebGL(canvas);
gl.viewport( 0, 0, window.innerWidth, window.innerHeight );  
//init shader 
shader_programs  = initShaders(gl,"vertex-shader","fragment-shader");
gl.useProgram(shader_programs);


gl.clearColor(0.0,1.0,1.0,1.0);
//buffer pellets
pellet_pos = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, pellet_pos);
gl.bufferData(gl.ARRAY_BUFFER,pellet_buffer,gl.STATIC_DRAW);
//buffer for bound perimeter
bound_positions = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, bound_positions);
gl.bufferData(gl.ARRAY_BUFFER, bound_buffer, gl.STATIC_DRAW);
gl.lineWidth(7);
//buffer the circle 
 vertex_positions = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_positions);
gl.bufferData(gl.ARRAY_BUFFER, poly_buffer, gl.STATIC_DRAW);

//enable positions attribute
vpos_loc = gl.getAttribLocation(shader_programs, "positions");
gl.vertexAttribPointer(vpos_loc,4,gl.FLOAT, false, 0,0);
gl.enableVertexAttribArray(vpos_loc);
//color uniform 
color_loc = gl.getUniformLocation(shader_programs,"color")
gl.uniform4f(color_loc,1,0,0,1);
//pos uniform
pos_loc  = gl.getUniformLocation(shader_programs,"transform");
gl.uniformMatrix4fv(pos_loc,false,flatten(translate(0,0,0)));
//view position
view_loc = gl.getUniformLocation(shader_programs,"view");
//scale position
scale_pos = gl.getUniformLocation(shader_programs,"scale");

//screen width for eye size
screen_width_pos = gl.getUniformLocation(shader_programs,"screen_width");

//set scaling to fit canvas dimensions



//initiate snake
speed = .008;//per 1/60 of a second
angular_speed = 6;//turns six degrees per 1/60th of a second
snake_head ={dir:90, x:0, y:0};
num_segments = 2;//initial number of segments 
snake_spacing = .04;//length between center of scales
snake_length  = snake_spacing * num_segments;
position_array_length = Math.round(snake_length/speed) + Math.round(snake_spacing/speed)+1;


//initialize positions
position_array = [];
 for( let i = 0 ; i < position_array_length; i++){
     position_array[i] = {dir:90, x:0, y:(-(i)*speed), step:(speed)};
 }
//initialize the index for each scale
snake_scales = [];
for(let i = 0 ; i < num_segments; i++){
    snake_scales[i] = {color:{r:0,g:0,b:0}, distance:(i+1)*snake_spacing};//distance from head

}


turning_L = 0;
turning_R = 0;

//randomize scale colors
for(let i = 0; i < num_segments; i++){
    snake_scales[i].color = {r:Math.random(), g:Math.random(),b:Math.random()};
}
last_time = Date.now()- 1000/60;
start = Date.now();
pellets=[];
resize_canvas();
render_scene();
game_start = 0;
stop = 1;
if(restart == 0){
document.getElementById("menu").style.display = "block";
}
else{
stop = 0;
game_start= 1;
}
}
function setup_bound(){
    var bound_buffer = [-bound_width,bound_height,0,1.0,
                        bound_width, bound_height, 0,1.0,
                        bound_width, -bound_height, 0,1.0,
                        -bound_width, -bound_height, 0, 1.0];
                        return new Float32Array(bound_buffer);
}

function setup_poly(num_v)
{
var vertex_buffer = [0,0,0,1];

num_circ_vertex = num_v -1;
i  = 0;
for( i ; i < num_circ_vertex ; i++)
{
    vertex_buffer.push(radius*Math.cos(2*Math.PI*i/(num_circ_vertex-1)) );//x value
    vertex_buffer.push(radius*Math.sin(2*Math.PI*i/(num_circ_vertex-1)) );
    vertex_buffer.push(0.0);
    vertex_buffer.push(1.0);
}
//snake eyes drawn as points
vertex_buffer.push(radius/2);//x value
vertex_buffer.push(-radius/2);//y value
vertex_buffer.push(0.0);
vertex_buffer.push(1.0);

vertex_buffer.push(radius/2);//x value
vertex_buffer.push(radius/2);//y value
vertex_buffer.push(0.0);
vertex_buffer.push(1.0);

return new Float32Array(vertex_buffer);



}
function render_scene(){
    gl.clear(gl.COLOR_BUFFER_BIT);
    delta  = Date.now()-last_time;
    last_time = Date.now();
   
   
   render_snake(); 
   renderPellets();
   render_bounds();
   detect_collision();
   if(stop == 0){
requestAnimationFrame(render_scene);
   }
   
}

function render_bounds(){
//bound position buffer



gl.bindBuffer(gl.ARRAY_BUFFER, bound_positions);
gl.vertexAttribPointer(vpos_loc,4,gl.FLOAT, false, 0,0);

    

    
    gl.uniformMatrix4fv(pos_loc,false,flatten(translate(0,0,0)));
    gl.uniformMatrix4fv(view_loc,false, flatten(inverse4(snake_head_m)));
    gl.uniform4f(color_loc,1,0,0,1);
    gl.drawArrays( gl.LINE_LOOP, 0,4);


}
function render_snake(){
    
   snake_step = speed*delta/(1000/60);
    angular_step = angular_speed*delta/(1000/60);

gl.bindBuffer(gl.ARRAY_BUFFER, vertex_positions);
gl.vertexAttribPointer(vpos_loc,4,gl.FLOAT, false, 0,0);


//
if(stop == 0  ){
old_head = {dir:90, x:0, y:0, step:snake_step};
old_head.x =  snake_head.x;
old_head.y = snake_head.y;
old_head.dir = snake_head.dir;



//draw all the scales/body segments 
if(turning_L){
    //rotate snake head direction 
    snake_head.dir = (snake_head.dir + angular_step)%360;
}
if(turning_R){
    snake_head.dir = (snake_head.dir + (360 - angular_step))%360;
}
else if(mouse_target >= 0){
    if(snake_head.dir >= mouse_target && snake_head.dir - mouse_target <= 180)
   snake_head.dir = Math.max((snake_head.dir  - angular_step), mouse_target); 
   else if(snake_head.dir < mouse_target &&  mouse_target - snake_head.dir <= 180)
   snake_head.dir = Math.min((snake_head.dir + angular_step), mouse_target); 
   else{
       if(snake_head.dir < mouse_target)
       snake_head.dir = (snake_head.dir + (360 - angular_step))%360;
       else 
       snake_head.dir = (snake_head.dir + angular_step)%360;
   }
}
}

//new location/position 
if(stop == 0 ){
snake_head.x = snake_head.x + snake_step*Math.cos(2*Math.PI*snake_head.dir/360);
snake_head.y = snake_head.y + snake_step*Math.sin(2*Math.PI*snake_head.dir/360);
snake_head.step = 0;
snake_head_m = translate(snake_head.x,snake_head.y,0);
gl.uniformMatrix4fv(view_loc,false, flatten(inverse4(snake_head_m)));

for( let i = position_array_length-1; i > 0; --i){
    position_array[i] = position_array[i-1];
}
position_array[0] = old_head;

}
for(let i = num_segments-1; i >= 0; i-- ){
    if((Math.round(Math.random()*100)%50 == 0)){

        snake_scales[i].color.r = Math.random();
        snake_scales[i].color.g = Math.random();
        snake_scales[i].color.b = Math.random();

    } 
    gl.uniform4f(color_loc,snake_scales[i].color.r,snake_scales[i].color.g,snake_scales[i].color.b,1);
    //find positioning of scale
    let pos_sm = snake_head;
    let pos_lg = position_array[0];
    let dis = 0;

    for(let j = 1; j < position_array_length; j++){
        dis += pos_lg.step;
        
        
        if(dis >= snake_scales[i].distance){
            break;
        }
        
        pos_sm = position_array[j-1];
        pos_lg = position_array[j];
    }
    let offset = dis - snake_scales[i].distance;
    let sposx = pos_lg.x + offset*Math.cos(2*Math.PI*pos_sm.dir/360);
    let sposy = pos_lg.y + offset*Math.sin(2*Math.PI*pos_sm.dir/360);

    //let s = position_array[snake_scales[i].index];
    m_translation = translate(sposx,sposy,0);
    m_rotation = rotate(pos_sm.dir, [0,0,1]);
    gl.uniformMatrix4fv(pos_loc,false,flatten(mult(m_translation,m_rotation)));
    gl.drawArrays(  gl.TRIANGLE_FAN, 0,num_vertex);
    if(i > 3){
        if(Math.abs(sposx-snake_head.x)<radius && Math.abs(sposy-snake_head.y) < radius){
        stop = 1;
        
        document.getElementById("menu").style.display = "block";
        restart = 1;
        restartmenu();
        }

    }
}

var m_rotation = rotate(snake_head.dir, [0,0,1]);
gl.uniformMatrix4fv(pos_loc,false,flatten(mult(snake_head_m,m_rotation)));
//set head color

gl.uniform4f(color_loc,1,0,0,1);
gl.drawArrays(  gl.TRIANGLE_FAN, 0,num_vertex);
//set eye color 
gl.uniform4f(color_loc,0,0,0,1);

gl.drawArrays(gl.POINT,num_vertex, 2);//last vertexes are eyes
//update the positoins 
}

function detect_collision(){
if(snake_head.x >= bound_width - radius || snake_head.x <= -bound_width +radius || snake_head.y >= (bound_height- radius) || snake_head.y <= -bound_height+radius )
{
stop = 1;
document.getElementById("menu").style.display = "block";
restart = 1;
restartmenu();
}
}

function start_turn(e){
if(e.keyCode == 65){
turning_L = 1;
}
if(e.keyCode == 68){
turning_R = 1;
}

document.body.style.cursor= "none";
mouse_target = -1;
}


function stop_turn(e){

    if(e.keyCode == 65){
        turning_L = 0;
        }
    if(e.keyCode == 68){
            turning_R = 0;
        }
 


}
function increase_snake_size(increase_segment){
    
   //initialize the index for each scale
   
   for(let i = num_segments ; i < num_segments+increase_segment; i++){
       snake_scales[i] = {color:{r:Math.random(),g:Math.random(),b:Math.random()}, distance:(i+1)*snake_spacing};//distance from head
   
   }
   
    num_segments += increase_segment;
    snake_length  += snake_spacing * increase_segment;
    let old_length  = position_array_length;
    position_array_length += Math.round(increase_segment/speed);
    for( let i = old_length ; i < position_array_length; i++){
        position_array[i] = position_array[old_length-1];
    }
    score+=increase_segment;
    document.getElementById("score").innerHTML= "score: "+parseFloat(score);
}
function mouse_change_(e){
document.body.style.cursor = "default";
var clipx = 2.0*(e.clientX)/canvas.width - 1.0;
var clipy = -(2.0*(e.clientY)/ canvas.height -1.0);
if(clipx >= 0)
mouse_target = Math.atan(clipy/clipx)*180/(Math.PI);
else 
mouse_target = Math.atan(clipy/clipx)*180/(Math.PI)+180;
if(mouse_target < 0)
mouse_target = mouse_target + 360;

//document.getElementById("angle").innerHTML= parseFloat(mouse_target);
}
function resize_canvas(){
    canvas.width = window.innerWidth;
    canvas.height= window.innerHeight;
    let xscale = canvas.height/canvas.width;
    gl.uniformMatrix4fv(scale_pos,false,flatten(scalem(xscale,1,0)));
    
    gl.viewport(0,0,window.innerWidth,window.innerHeight);
    if(stop == 1 || game_start == 0){
     gl.clear(gl.COLOR_BUFFER_BIT);
    render_snake(); 
    renderPellets();
    render_bounds();
    }

}

function getSign() {
	if(Math.random() >= 0.5)
		return 1;
	else
		return -1;
}

//checks if the snake is on a pellet
function eat(pellets) {
	//if(pellets[0] - radius >= snake_head.x - radius && pellets[0] <= snake_head.x + radius && pellets[1] >= snake_head.y - radius && pellets[1] <= snake_head.y + radius) {
        if( Math.abs(pellets[0] - snake_head.x) <= radius*1.5 && Math.abs(pellets[1] - snake_head.y) <= radius*1.5){
		score++;
//		console.log(score);
		eatPellet = true;
	}	
}

function renderPellets() { 
//	gl.bindBuffer( gl.ARRAY_BUFFER, pellet_positions);
gl.bindBuffer(gl.ARRAY_BUFFER, pellet_pos);
gl.vertexAttribPointer(vpos_loc,4,gl.FLOAT, false, 0,0);
	for(let i = 0; i < maxPellets; i++) {
		
		if(pellets.length < maxPellets ){
			var pelletcoords = vec2(rangeMultiplier * Math.random() * getSign(),rangeMultiplier * Math.random() * getSign());//gets random coordinates for pellet
			pellets.push(pelletcoords);
		}

		eat(pellets[i]);
		if(eatPellet == true) {
			pellets[i] = vec2(rangeMultiplier * Math.random() * getSign(),rangeMultiplier * Math.random() * getSign());
            eatPellet = false;
            increase_snake_size(2);
		}
		
		pelletMatrix = translate(pellets[i][0],pellets[i][1],0);	
		gl.uniformMatrix4fv(pos_loc,false,flatten(pelletMatrix));
		gl.uniform4f(color_loc,1,1,0,1);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 20 );
	}
}
function start_game(){
    last_time = Date.now();
game_start = 1;
stop = 0;
document.getElementById("menu").style.display = "none";
if(restart == 0){
render_scene();
}
else
{
    init();
}
}

function restartmenu(){
document.getElementById("scoremenu").innerText = "Your score was: "+parseFloat(score);
document.getElementById("button").innerText = "Restart";

}
