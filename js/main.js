import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
let canvas, renderer;

const scenes = [];

const startTime = Date.now();
var maxObjRotate = 15;

var hoverScene;

init();
animate();

function init() {

    canvas = document.getElementById( 'c' );

    // const geometries = [
    //     new THREE.BoxGeometry( 1, 1, 1 ),
    //     new THREE.SphereGeometry( 0.5, 12, 8 ),
    //     new THREE.DodecahedronGeometry( 0.5 ),
    //     new THREE.CylinderGeometry( 0.5, 0.5, 1, 12 )
    // ];

    const content = document.getElementById( 'content' );

    

    renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );
    renderer.setClearColor( 0xffffff, 1 );
    renderer.setPixelRatio( window.devicePixelRatio );

}

function updateSize() {

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if ( canvas.width !== width || canvas.height !== height ) {

        renderer.setSize( width, height, false );

    }

}

function animate() {

    render();
    requestAnimationFrame( animate );

}

function render() {
    updateSize();

    canvas.style.transform = `translateY(${window.scrollY}px)`;

    renderer.setClearColor( 0xffffff );
    renderer.setScissorTest( false );
    renderer.clear();

    renderer.setClearColor( 0xe0e0e0 );
    renderer.setScissorTest( true );

    scenes.forEach( function ( scene ) {

        // so something moves
        for(var i = 0; i < scene.children.length; i++)
        {
            scene.children[i].rotation.y = Math.sin(((Date.now() - startTime) * 0.0005) + scene.startRot) * 0.5;
        }

        //Scale
        let lerp = scene.scale.x + (scene == hoverScene ? 0.5 : 0.1) * ( scene.userData.targetScale - scene.scale.x );
        scene.scale.set(lerp, lerp, lerp);
        
        // get the element that is a place holder for where we want to
        // draw the scene
        const element = scene.userData.element;

        // get its position relative to the page's viewport
        const rect = element.getBoundingClientRect();

        // check if it's offscreen. If so skip it
        if ( rect.bottom < 0 || rect.top > renderer.domElement.clientHeight ||
                rect.right < 0 || rect.left > renderer.domElement.clientWidth ) {
            return; // it's off screen

        }

        // set the viewport
        const width = rect.right - rect.left;
        const height = rect.bottom - rect.top;
        const left = rect.left;
        const bottom = renderer.domElement.clientHeight - rect.bottom;

        renderer.setViewport( left, bottom, width, height );
        renderer.setScissor( left, bottom, width, height );

        const camera = scene.userData.camera;

        //camera.aspect = width / height; // not changing in this example
        //camera.updateProjectionMatrix();

        //scene.userData.controls.update();

        renderer.render( scene, camera );

    } );

}

let licenseData;
function loadLicenseData(){
    fetch('./files/licenses.json')
    .then((response) => response.json())
    .then((json) => {
        try{
            licenseData = json;
            //console.log(`Loaded Licenses: ${JSON.stringify(licenseData)}`);
        }
        catch(e){
            console.log(`Unable to load license: ${e}` )
        }
    });
}
loadLicenseData();

function addModel(data){
    const scene = new THREE.Scene();

    // make a list item
    const element = document.createElement( 'div' );
    element.className = 'list-item';

    const sceneElement = document.createElement( 'div' );
    element.appendChild( sceneElement );
    //Mouse Over
    sceneElement.onmouseover = function(){handleMouseOver(scene);}
    sceneElement.onmouseleave = function(){handleMouseOver(null);}

    const descriptionElement = document.createElement( 'div' );

    var likes = 0;
    if (like_data){
        likes = like_data[data.folder_name].likes;
        //console.log(likes);
    }

    descriptionElement.innerHTML = 
    `<b>${data.name}</b><br>
    <small>Created by:</small><a href="${data.creator_url}"target="_blank"> ${data.creator_name}</a><br>
    <div class="likes-container">
        <span class="likes-button material-icons">
            <a href="#" class="likes-heart">favorite_border</a>
        </span>
        <span class="likes-count" id="${data.folder_name}">${likes.toString()}</span>
    </div>
    <a href="${licenseData[data.license].url}"target="_blank"><img src="${licenseData[data.license].img}" class="attribution-image"></a>
    `;

    descriptionElement.addEventListener('click', function(){
        if(!data.liked){
            data.liked = true;
        }
        else{
            return;
        }
        console.log("Like clicked " + data.name);
        like(data);
        var el = descriptionElement.getElementsByClassName("likes-heart")[0];
        el.innerText = 'favorite_fill';
        el.classList.add('liked');
    });

    element.appendChild( descriptionElement );

    // the element that represents the area we want to render the scene
    scene.userData.element = sceneElement;
    scene.userData.targetScale = 1;
    content.appendChild( element );

    const camera = new THREE.PerspectiveCamera( 50, 1, 0.1, 1000 );
    camera.position.z = 5;
    scene.userData.camera = camera;

    //=====================================================
    // Load models
    //=====================================================

    var loader;
    var mdlType;

    if(data.model_name.endsWith('glb')){
        loader = new GLTFLoader();
        mdlType = 'gltf';
    }
    else if(data.model_name.endsWith('fbx')){
        loader = new FBXLoader();
        mdlType = 'fbx';
    }
    const path = `./files/${data.folder_name}/${data.model_name}`;
    console.log(`Loading ${data.name} from ${path}`);

    loader.load(path, async function ( mdl ) {
        const model = mdlType == 'gltf' ? mdl.scene : mdl;
        model.position.set( 0, data.model_height_offset != "" ? data.model_height_offset : 0, 0 );
        model.rotation.set(0, Math.random() * maxObjRotate * (Math.random() > 0.5 ? -1 : 1), 0);
        model.scale.set( data.default_scale != "" ? data.default_scale : 1,
        data.default_scale != "" ? data.default_scale : 1,
        data.default_scale != "" ? data.default_scale : 1);

        //MATERIAL
        const textureLoader = new THREE.TextureLoader();
        const diffuseMap = textureLoader.load(`./files/${data.folder_name}/${data.material_diffusion}`);
        diffuseMap.colorSpace = THREE.SRGBColorSpace;
        const displacement = textureLoader.load(`./files/${data.folder_name}/${data.material_height}`);
        const aomap = textureLoader.load(`./files/${data.folder_name}/${data.material_ao}`);
        const normalMap = textureLoader.load( `./files/${data.folder_name}/${data.material_normal}`);
        const mat = new THREE.MeshStandardMaterial({
            roughness: 0.95,
            metalness: 0.1,
            map: data.material_diffusion != "" ? diffuseMap: null,
            normalMap: data.material_normal != "" ? normalMap: null,
            aoMap: data.material_ao != "" ? aomap : null,
            normalScale: new THREE.Vector2( 0.05, 0.05 ),
            displacementMap: data.height != "" ? displacement : null,
            displacementScale: 0.01
          })

        scene.startRot = model.rotation.y;

        let directionalLight = new THREE.DirectionalLight( 0xffffff, 10 );
        directionalLight.position.set( 1, 1, 2 );
        scene.add( directionalLight );

        scene.add( model );

        if(!data.textures_baked)
        {
            model.traverse((o) => {
                if (o.isMesh) o.material = mat;
            });
        }

        //mixer = new THREE.AnimationMixer( model );
        //mixer.clipAction( gltf.animations[ 0 ] ).play();
    }, undefined, function ( e ) {

        console.error( e );

    } );
    

    //===========================================================

    scene.add( new THREE.HemisphereLight( 0x9e5da6, 0xf5b351, 0.1 ) );

    const light = new THREE.DirectionalLight( 0xf5f1d7, 2 );
    light.position.set( 0, 7, 3 );
    scene.add( light );
    //scene.add(new THREE.AxesHelper(1))
    scenes.push( scene );
}

function handleMouseOver(scene){
    if(hoverScene){
        hoverScene.userData.targetScale = 1;
    }
    hoverScene = scene;
    if(scene){
        hoverScene.userData.targetScale = 1.15;
    }
}

//Loads models from data.json file. Each model should point to a directory with it's own data.json
function loadModels(){
    fetch('./files/data.json')
    .then((response) => response.json())
    .then((json) => {
        console.log(`Loading models: ${json.models}`);
        for(let i = 0; i < json.models.length; i++){

            fetch(`./files/${json.models[i]}/data.json`)
            .then((response) => response.json())
            .then((j) => {
                //Verify data
                try{
                    //console.log(j);
                    JSON.parse(JSON.stringify(j));
                    addModel(j); //Pass object
                }
                catch(e){
                    console.log(`Unable to parse data for ${json.models[i]}: ${e }`)
                }
        });}
    });
}

loadModels();

function updateLikes(){
    const like_elements = document.getElementsByClassName("likes-count");
    //Loop through like counts on page to update with new like data
    Array.from(like_elements).forEach((el) => {
        //Only update if new value
        if(el.innerHTML != like_data[el.id].likes.toString()){
            // console.log(`Like compare: ${oldLikes} / ${like_data[el.id].likes}`)
            // console.log(`LIKE DATA: ${el.id} / ${like_data[el.id].likes}`)
            el.innerHTML = `${like_data[el.id].likes}`
            var newone = el.cloneNode(true);
            el.parentNode.replaceChild(newone, el);
            newone.style.animation="ani-pop 0.2s linear 1 forwards";
        }
    });
}

var like_data; //JSON from FB
async function get_likes() {
    await fetch("https://quinnipiac-mocapwebsite-default-rtdb.firebaseio.com/data.json")
        .then(function (response) {
        if (response.status !== 200) {
            console.log(
            'Looks like there was a problem. Status Code: ' + response.status
            );
            return;
        }
        response.json().then(function (data) {
            //console.log(data);
            like_data = data;
            updateLikes();
        });
        })
        .catch(function (err) {
        console.log('Fetch Error :-S', err);
        });
}

function like(item_data){
    console.log("Posting data")
    fetch(`https://quinnipiac-mocapwebsite-default-rtdb.firebaseio.com/data/${item_data.folder_name}/likes.json`, {
        method: 'PUT', //GET, PUT, POST, PATCH
        body: JSON.stringify({".sv": {"increment": 1 }}),
        headers: {
        'Content-type': 'application/json; charset=UTF-8'
        }
    }).then(function (response) {
        if (response.ok) {
        return response.json();
        }
        return Promise.reject(response);
    }).then(function (data) {
        console.log(`PUT response: ${JSON.stringify(item_data.folder_name)} / ${data}`);
        like_data[`${item_data.folder_name}`].likes = data;
        //console.log(like_data);
        updateLikes();
    }).catch(function (error) {
        console.warn('Something went wrong.', error);
    });
}



get_likes();