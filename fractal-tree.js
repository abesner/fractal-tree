import * as THREE from '../three.js-master/src/Three.js';
//import * as THREE from 'https://cdn.skypack.dev/three';

const DEFAULT_ANGLE_RAD = 60 * Math.PI / 180; // 60 degrees
const ROTATION_ANIMATION_INCREMENT = 10 * Math.PI / 180 * 0.001; // 10 degrees per second

class Branch {
    constructor(parent, length, longitude, angle){
        this.parent = parent;
        this.length = length;
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
var branchMaterial;
var tree = null;

function main(){
    const fullCircle = Math.PI * 2;

    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({canvas});

    // frustum and camera
    const fov = 75;
    const aspect = 2;  // default canvas is 300x150
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    // camera default position (looking down -Z axis with +Y up, right-handed)
    camera.position.z = 30;
    camera.position.y = 20;

    scene = new THREE.Scene();
    
    branchMaterial = new THREE.MeshPhongMaterial({color: 0x44aa88});

    // add lighting
    const color = 0xFFFFFF; // white light
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);

    light.position.set(-1, 2, 4);

    scene.add(light);

    scene.add(new THREE.AxesHelper(3));

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
    tree = new Branch(null, 40, 0, 0);
    addBranches(tree, depth, minNbOfBranches, maxNbOfBranches);
    
    // recreate the scene
    function addSceneObject(parent, branch){
        const geometry = new THREE.CylinderGeometry(0.1, 0.1, branch.length, 20);
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
            const child = new Branch(parent, parent.length / 3, i * longitudeIncrement, angle);
            angle *= -1;

            parent.children.add(child);

            addBranches(child, depth, minNbOfBranches, maxNbOfBranches);
        }
    }
}

window.main = main;
window.generateTree = generateTree;