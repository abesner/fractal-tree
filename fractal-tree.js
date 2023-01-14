import * as THREE from '../three.js-master/src/Three.js';
import { OrbitControls } from '../three.js-master/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '../three.js-master/examples/jsm/loaders/GLTFLoader.js';
// import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.121.1/src/Three.js';
// import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/OrbitControls.js';
// import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/GLTFLoader.js';

const DEFAULT_ANGLE_RAD = 60 * Math.PI / 180; // 60 degrees
const ROTATION_ANIMATION_INCREMENT = 10 * Math.PI / 180 * 0.001; // 10 degrees per second
const ROOT_BRANCH_LENGTH = 40;
const ROOT_BRANCH_RADIUS = 0.75;
const FLOWER_POT_MODEL_PATH = './assets/flower-pot.glb';
const SKYBOX_IMAGE_PATH = './assets/skybox.jpg';

class Branch {
    constructor(parent, length, radius, longitude, angle){
        this.parent = parent;
        this.length = length;
        this.radius = radius;
        this.longitude = longitude;
        this.angle = angle;
        
        if (parent === null) {
            this.depthLevel = 1;
        } else {
            this.depthLevel = parent.depthLevel + 1;
        }

        this.children = new Set();
        this.cylinder = null;
    }
}

var scene;
var controls;
var branchMaterial;
var tree = null;
var pointerSphere;

const canvas = document.querySelector('#c');
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function main(){
    const fullCircle = Math.PI * 2;

    const renderer = new THREE.WebGLRenderer({canvas});

    // frustum and camera
    const fov = 75;
    const aspect = 2;  // default canvas is 300x150
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    controls = new OrbitControls(camera, renderer.domElement);

    controls.target.set(0, ROOT_BRANCH_LENGTH / 2, 0);

    // camera default position (looking down -Z axis with +Y up, right-handed)
    camera.position.set(0, 20, 30);
    controls.update();
    controls.saveState();

    scene = new THREE.Scene();

    // add a flower pot to visualize the origin point
    const modelLoader = new GLTFLoader();
    modelLoader.load(FLOWER_POT_MODEL_PATH, function(gltfModel) {
        scene.add(gltfModel.scene);
        gltfModel.scene.scale.set(3,3,3);
    });

    // load a skybox
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(SKYBOX_IMAGE_PATH, () => {
        const target = new THREE.WebGLCubeRenderTarget(texture.image.height);
        target.fromEquirectangularTexture(renderer, texture);
        scene.background = target.texture;
    });
    
    branchMaterial = new THREE.MeshPhongMaterial({color: 0x44aa88});

    const pointerSphereMaterial = new THREE.MeshPhongMaterial({color: 0xddfc62});
    const pointerSphereGeom = new THREE.SphereGeometry(0.5, 20, 20);
    pointerSphere = new THREE.Mesh(pointerSphereGeom, pointerSphereMaterial);
    pointerSphere.visible = false;
    scene.add(pointerSphere);

    // add lights
    const ambientlight = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(ambientlight);
    
    const light = new THREE.DirectionalLight(0xFFFFFF, 1);
    light.position.set(-1, 2, 4);
    scene.add(light);

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if(needResize){
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    function adjustCanvasToClient(){
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    function animateBranches(parent, rotationAngle){
        // TODO: this is cheating, since it is the parent branch that is rotating on itself, and not the children rotation aroung the parent axis
        parent.cylinder.rotateY(rotationAngle);
        
        parent.children.forEach(child => {
            animateBranches(child, rotationAngle);
        })
    }

    let lastFrameTime = 0;

    function render(time) {
        // responsive display
        if(resizeRendererToDisplaySize(renderer)){
            adjustCanvasToClient();
        }
        
        const rotationAngle = ROTATION_ANIMATION_INCREMENT * (time - lastFrameTime);
        lastFrameTime = time;
        // animateBranches(rootBranch, rotationAngle);

        // update the picking ray with the camera and pointer position
        raycaster.setFromCamera(pointer, camera);

        if(tree !== null) {
            // calculate objects intersecting the picking ray
            const intersects = raycaster.intersectObject(tree.cylinder);
            
            if (intersects.length > 0) {
                pointerSphere.position.copy(intersects[0].point);
                pointerSphere.visible = true;
            } else {
                pointerSphere.visible = false;
            }
        }

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}


function generateTree(depth, minNbOfBranches, maxNbOfBranches) {
    if(tree !== null){
        scene.remove(tree.cylinder);
    }

    // recreate model
    tree = new Branch(null, ROOT_BRANCH_LENGTH, ROOT_BRANCH_RADIUS, 0, 0);
    addBranches(tree, depth, minNbOfBranches, maxNbOfBranches);
    
    // recreate the scene
    function addSceneObject(parent, branch){
        const geometry = new THREE.CylinderGeometry(branch.radius * 0.7, branch.radius, branch.length, 10);
        const cylinder = new THREE.Mesh(geometry, branchMaterial);

        branch.cylinder = cylinder;

        geometry.translate(0, branch.length / 2, 0);
        cylinder.translateY(branch.longitude);
        cylinder.rotateZ(branch.angle);

        const randomAngle = Math.random() * Math.PI * 2;
        cylinder.rotateY(randomAngle);

        parent.add(cylinder);

        branch.children.forEach(child => {
            addSceneObject(cylinder, child);
        });
    }

    addSceneObject(scene, tree);
}

function addBranches(parent, depth, minNbOfBranches, maxNbOfBranches) {
    if(parent.depthLevel < depth){
        const nbOfBranches = Math.round(Math.random() * (maxNbOfBranches - minNbOfBranches) + minNbOfBranches);
        const longitudeIncrement = parent.length / (nbOfBranches + 1);
        
        let angle = DEFAULT_ANGLE_RAD;
        if(Math.random() > 0.5){
            angle *= -1;
        }

        for(let i = 1; i <= nbOfBranches; i++){
            const child = new Branch(parent, parent.length / 3, parent.radius / 2, i * longitudeIncrement, angle);
            angle *= -1;

            parent.children.add(child);

            addBranches(child, depth, minNbOfBranches, maxNbOfBranches);
        }
    }
}

function resetView(){
    controls.reset();
}

function onPointerMove( event ) {
	/*
     * calculate pointer position in normalized device coordinates
     * (-1 to +1) for both component
     */
	pointer.x = ((event.clientX - canvas.offsetLeft) / canvas.width) * 2 - 1;
	pointer.y = - ((event.clientY - canvas.offsetTop) / canvas.height) * 2 + 1;
}

canvas.addEventListener('pointermove', onPointerMove);

window.main = main;
window.generateTree = generateTree;
window.resetView = resetView;