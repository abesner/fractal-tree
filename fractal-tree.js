import * as THREE from '../three.js-master/src/Three.js';
//import * as THREE from 'https://cdn.skypack.dev/three';

function main(){
    const fullCircle = Math.PI * 2;

    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({canvas});

    // frustum and camera
    const fov = 75;
    const aspect = 2;  // default canvas is 300x150
    const near = 0.1;
    const far = 5;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    // camera default position (looking down -Z axis with +Y up, right-handed)
    camera.position.z = 2;

    const scene = new THREE.Scene();

    const boxWidth = 1;
    const boxHeight = 1;
    const boxDepth = 1;
    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    const material = new THREE.MeshPhongMaterial({color: 0x44aa88});

    const cube = new THREE.Mesh(geometry, material);

    scene.add(cube);

    // add lighting
    const color = 0xFFFFFF; // white light
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);

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

    function rotateCube(time){
        let seconds = time *= 0.001;
    
        cube.rotation.x = seconds % fullCircle;
        cube.rotation.y = seconds % fullCircle;
    }

    function render(time) {
        // responsive display
        if(resizeRendererToDisplaySize(renderer)){
            adjustCanvasToClient();
        }

        // scene animation
        rotateCube(time);
        
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();