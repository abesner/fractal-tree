import * as THREE from '../three.js-master/src/Three.js';
//import * as THREE from 'https://cdn.skypack.dev/three';

const DEFAULT_ANGLE_RAD = 60 * Math.PI / 180; // 60 degrees

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
    }
}

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

    const scene = new THREE.Scene();
    
    const material = new THREE.MeshPhongMaterial({color: 0x44aa88});
    
    const rootBranch = generateTree(3, 5, 6);
    console.log(rootBranch);

    function addSceneObject(parent, branch){
        const geometry = new THREE.CylinderGeometry(0.1, 0.1, branch.length, 20);
        const cylinder = new THREE.Mesh(geometry, material);

        geometry.translate(0, branch.length / 2, 0);
        cylinder.translateY(branch.longitude);
        cylinder.rotateZ(branch.angle);

        parent.add(cylinder);

        branch.children.forEach(child => {
            addSceneObject(cylinder, child);
        });
    }

    addSceneObject(scene, rootBranch);

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

    function render(time) {
        // responsive display
        if(resizeRendererToDisplaySize(renderer)){
            adjustCanvasToClient();
        }
        
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

function generateTree(minNbOfBranches, maxNbOfBranches, depth){
    const rootBranch = new Branch(null, 40, 0, 0);

    addBranches(rootBranch, minNbOfBranches, maxNbOfBranches, depth);

    return rootBranch;
}

function addBranches(parent, minNbOfBranches, maxNbOfBranches, depth){
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

            addBranches(child, minNbOfBranches, maxNbOfBranches, depth);
        }
    }
}

main();