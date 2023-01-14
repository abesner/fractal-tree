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
            this.depthLevel = 0;
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

var isInBranchAdditionMode = true;
var pickingSphere;
var pickingBranch = null;
var isPickingBranch = false;

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
    
    branchMaterial = new THREE.MeshPhongMaterial({color: 0x367c35});

    const pointerSphereMaterial = new THREE.MeshPhongMaterial({color: 0xddfc62});
    const pointerSphereGeom = new THREE.SphereGeometry(0.4, 20, 20);
    pickingSphere = new THREE.Mesh(pointerSphereGeom, pointerSphereMaterial);
    pickingSphere.visible = false;
    scene.add(pickingSphere);

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

        if(isInBranchAdditionMode) {
            // update the picking ray with the camera and pointer position
            raycaster.setFromCamera(pointer, camera);
            
            if(tree !== null) {
                // calculate objects intersecting the picking ray
                const intersects = raycaster.intersectObject(tree.cylinder);
                
                if (intersects.length > 0) {
                    pickingSphere.position.copy(intersects[0].point);
                    
                    pickingBranch = intersects[0].object.userData.branch;
                    const scaleFactor = 1 / Math.pow(2, pickingBranch.depthLevel);
                    pickingSphere.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    
                    isPickingBranch = true;
                } else {
                    pickingBranch = null;
                    isPickingBranch = false;
                }
            }
        }
            
        pickingSphere.visible =  isInBranchAdditionMode && isPickingBranch;
        
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

        cylinder.userData.branch = branch;
        branch.cylinder = cylinder;

        geometry.translate(0, branch.length / 2, 0); // branch root is at local origin
        cylinder.translateY(branch.longitude); // move along the branch to longitude
        cylinder.rotateY(Math.random() * Math.PI * 2); // rotate randomly around the branch
        cylinder.rotateZ(branch.angle); // rotate away from parent branch
        
        parent.add(cylinder);

        branch.children.forEach(child => {
            addSceneObject(cylinder, child);
        });
    }

    addSceneObject(scene, tree);
}

function addBranches(parent, depth, minNbOfBranches, maxNbOfBranches) {
    if(parent.depthLevel < depth - 1){
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

function addBranch(){
    const branch = pickingBranch;
    
    if(branch === null) {
        return;
    }

    /* 
     * find longitude on branch (good enough approximation of the longitude even
     * though the picking sphere is located at the branch's surface)
     */
    const branchWorldPos = new THREE.Vector3();
    branch.cylinder.getWorldPosition(branchWorldPos);
    const pickingWorldPos = new THREE.Vector3();
    pickingSphere.getWorldPosition(pickingWorldPos);
    const longitude = branchWorldPos.distanceTo(pickingWorldPos);

    // find the rotation angle around the branch
    const pickingLocalPos = branch.cylinder.worldToLocal(pickingWorldPos);
    pickingLocalPos.y = 0; // place on the XZ plane
    let rotationAngle = pickingLocalPos.angleTo(new THREE.Vector3(1, 0, 0)); // smallest angle (correct in 2 first quadrants)
    if(pickingLocalPos.z > 0){
        // third and fourth quadrants
        rotationAngle = 2 * Math.PI - rotationAngle;
    }

    // add a child branch and its cylinder
    // TODO: remove code duplication
    const child = new Branch(branch, branch.length / 3, branch.radius / 2, longitude, DEFAULT_ANGLE_RAD);
    branch.children.add(child);

    const geometry = new THREE.CylinderGeometry(child.radius * 0.7, child.radius, child.length, 10);
    const cylinder = new THREE.Mesh(geometry, branchMaterial);

    cylinder.userData.branch = child;
    child.cylinder = cylinder;

    geometry.translate(0, child.length / 2, 0); // branch root is at local origin
    cylinder.translateY(child.longitude); // move along the branch to longitude
    cylinder.rotateY(rotationAngle); // rotate around the branch
    cylinder.rotateZ(-child.angle); // rotate away from parent branch
    
    branch.cylinder.add(cylinder);
}

function resetView(){
    controls.reset();
}

function onPointerMove(event) {
	/*
     * calculate pointer position in normalized device coordinates
     * (-1 to +1) for both component
     */
	pointer.x = ((event.clientX - canvas.offsetLeft) / canvas.width) * 2 - 1;
	pointer.y = - ((event.clientY - canvas.offsetTop) / canvas.height) * 2 + 1;
}

function onClick(event) {
    if(isInBranchAdditionMode && isPickingBranch) {
        addBranch();
    }
}

canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('click', onClick);

window.main = main;
window.generateTree = generateTree;
window.resetView = resetView;