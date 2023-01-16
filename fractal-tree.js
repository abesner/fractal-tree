// import * as THREE from '../three.js-master/src/Three.js';
// import { OrbitControls } from '../three.js-master/examples/jsm/controls/OrbitControls.js';
// import { GLTFLoader } from '../three.js-master/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.121.1/src/Three.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/GLTFLoader.js';

const DEFAULT_Z_ANGLE_RAD = 60 * Math.PI / 180; // 60 degrees
const INITIAL_ANIMATION_INCREMENT = 10 * Math.PI / 180 * 0.001; // 10 degrees per second
const ROOT_BRANCH_LENGTH = 40;
const ROOT_BRANCH_RADIUS = 0.75;
const FLOWER_POT_MODEL_PATH = './assets/flower-pot.glb';
const SKYBOX_IMAGE_PATH = './assets/skybox.jpg';

class Branch {
    constructor(parent, length, radius, longitude, angleZ) {
        this.parent = parent;
        this.length = length;
        this.radius = radius;
        this.longitude = longitude;
        this.angleZ = angleZ;

        if (parent === null) {
            this.depthLevel = 0;
        } else {
            this.depthLevel = parent.depthLevel + 1;
        }

        this.children = new Set();
        this.cylinder = null;
    }
}

var renderer;
var scene;
var camera;
var controls;
var branchMaterial;
var tree = null;
var canvas;

var lastFrameTime = 0;
var isInAnimationMode = false;
var animationSpeed = INITIAL_ANIMATION_INCREMENT;

var isInBranchAdditionMode = true;
var pickingSphere;
var pickingBranch = null;
var isPickingBranch = false;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function init(canvasId) {
    canvas = document.querySelector(canvasId);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('click', onClick);

    renderer = new THREE.WebGLRenderer({ canvas });

    // frustum and camera
    const fov = 75;
    const aspect = 2;  // default canvas is 300x150
    const near = 0.1;
    const far = 1000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    controls = new OrbitControls(camera, renderer.domElement);

    controls.target.set(0, ROOT_BRANCH_LENGTH / 2, 0);

    // camera default position (looking down -Z axis with +Y up, right-handed)
    camera.position.set(0, 20, 30);
    controls.update();
    controls.saveState();

    scene = new THREE.Scene();

    // add a flower pot to visualize the origin point
    const modelLoader = new GLTFLoader();
    modelLoader.load(FLOWER_POT_MODEL_PATH, function (gltfModel) {
        scene.add(gltfModel.scene);
        gltfModel.scene.scale.set(3, 3, 3);
    });

    // load a skybox
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(SKYBOX_IMAGE_PATH, () => {
        const target = new THREE.WebGLCubeRenderTarget(texture.image.height);
        target.fromEquirectangularTexture(renderer, texture);
        scene.background = target.texture;
    });

    branchMaterial = new THREE.MeshPhongMaterial({ color: 0x367c35 });

    // add a sphere to the scene to preview where a branch will be added
    const pointerSphereMaterial = new THREE.MeshPhongMaterial({ color: 0xddfc62 });
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

    requestAnimationFrame(render);
}

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

function adjustCanvasToClient() {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
}

function render(time) {
    // responsive display
    if (resizeRendererToDisplaySize(renderer)) {
        adjustCanvasToClient();
    }

    const rotationAngle = animationSpeed * (time - lastFrameTime);
    lastFrameTime = time;
    if (isAnimating()) {
        animateBranches(rotationAngle);
    }

    if (isInBranchAdditionMode) {
        // update the picking ray with the camera and pointer position
        updateBranchPicking();
    }

    pickingSphere.visible = isInBranchAdditionMode && isPickingBranch;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function updateBranchPicking() {
    raycaster.setFromCamera(pointer, camera);

    if (tree !== null) {
        // calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObject(tree.cylinder, true);

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

function generateTree(depth, minNbOfBranches, maxNbOfBranches) {
    if (tree !== null) {
        scene.remove(tree.cylinder);
    }

    // recreate model
    tree = new Branch(null, ROOT_BRANCH_LENGTH, ROOT_BRANCH_RADIUS, 0, 0);
    addBranches(tree, depth, minNbOfBranches, maxNbOfBranches);

    // recreate the scene
    function addSceneObject(parent, branch) {
        addBranchToScene(parent, branch, Math.random() * Math.PI * 2)

        branch.children.forEach(child => {
            addSceneObject(branch.cylinder, child);
        });
    }

    addSceneObject(scene, tree);
}

function addBranches(parent, depth, minNbOfBranches, maxNbOfBranches) {
    if (parent.depthLevel < depth - 1) {
        const nbOfBranches = Math.round(Math.random() * (maxNbOfBranches - minNbOfBranches) + minNbOfBranches);
        const longitudeIncrement = parent.length / (nbOfBranches + 1);

        let angle = DEFAULT_Z_ANGLE_RAD;
        if (Math.random() > 0.5) {
            angle *= -1;
        }

        for (let i = 1; i <= nbOfBranches; i++) {
            const child = new Branch(parent, parent.length / 3, parent.radius / 2, i * longitudeIncrement, angle);
            angle *= -1;

            parent.children.add(child);

            addBranches(child, depth, minNbOfBranches, maxNbOfBranches);
        }
    }
}

function addBranch() {
    const parentBranch = pickingBranch;

    if (parentBranch === null) {
        return;
    }

    /* 
     * find longitude on branch (good enough approximation of the longitude even
     * though the picking sphere is located at the branch's surface)
     */
    const branchWorldPos = new THREE.Vector3();
    parentBranch.cylinder.getWorldPosition(branchWorldPos);
    const pickingWorldPos = new THREE.Vector3();
    pickingSphere.getWorldPosition(pickingWorldPos);
    const longitude = branchWorldPos.distanceTo(pickingWorldPos);

    // find the rotation angle around the branch
    const pickingLocalPos = parentBranch.cylinder.worldToLocal(pickingWorldPos);
    pickingLocalPos.y = 0; // place on the XZ plane
    let rotationAngle = pickingLocalPos.angleTo(new THREE.Vector3(1, 0, 0)); // smallest angle (correct in 2 first quadrants)
    if (pickingLocalPos.z > 0) {
        // third and fourth quadrants
        rotationAngle = 2 * Math.PI - rotationAngle;
    }

    const child = new Branch(parentBranch, parentBranch.length / 3, parentBranch.radius / 2, longitude, -DEFAULT_Z_ANGLE_RAD);
    parentBranch.children.add(child);

    addBranchToScene(parentBranch.cylinder, child, rotationAngle);
}

function addBranchToScene(sceneParent, branch, rotationYAngle) {
    const geometry = new THREE.CylinderGeometry(branch.radius * 0.7, branch.radius, branch.length, 10);
    const cylinder = new THREE.Mesh(geometry, branchMaterial);

    cylinder.userData.branch = branch;
    branch.cylinder = cylinder;

    geometry.translate(0, branch.length / 2, 0); // branch root is at local origin
    cylinder.translateY(branch.longitude); // move along the branch to longitude
    cylinder.rotateY(rotationYAngle); // rotate around the branch
    cylinder.rotateZ(branch.angleZ); // rotate away from parent branch

    sceneParent.add(cylinder);
}

function resetView() {
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
    if (isInBranchAdditionMode && isPickingBranch) {
        addBranch();
    }
}

function isAnimating() {
    return isInAnimationMode;
}

function startAnimation() {
    isInAnimationMode = true;
    isInBranchAdditionMode = false;
}

function pauseAnimation() {
    isInAnimationMode = false;
    isInBranchAdditionMode = true;
}

function animateBranches(stepAngle) {
    if (tree == null) {
        return;
    }

    animateBranch(tree, stepAngle);
}

function animateBranch(branch, stepAngle) {
    branch.children.forEach(child => {
        animateBranch(child, stepAngle);
    });

    const parent = branch.parent;
    if (parent !== null) {
        branch.cylinder.rotateZ(-branch.angleZ);
        branch.cylinder.rotateY(stepAngle);
        branch.cylinder.rotateZ(branch.angleZ);
    }
}

function setAnimationSpeed(speed) {
    animationSpeed = speed * Math.PI / 180 * 0.001;
}

window.init = init;
window.generateTree = generateTree;
window.resetView = resetView;
window.isAnimating = isAnimating;
window.startAnimation = startAnimation;
window.pauseAnimation = pauseAnimation;
window.setAnimationSpeed = setAnimationSpeed;