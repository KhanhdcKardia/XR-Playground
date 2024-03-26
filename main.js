import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

const sizes = {
  width: innerWidth,
  height: innerHeight,
}

const canvas = document.getElementById("webgl");

const scene = new THREE.Scene();

const axesHelper = new THREE.AxesHelper( 5 );
scene.add( axesHelper );

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.x = 1;
camera.position.y = 1;
camera.position.z = 2;
scene.add(camera);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const mesh = new THREE.Mesh(geometry, material);

camera.lookAt(mesh.position)

// mesh.rotation.set(1, 2, 3);

scene.add(mesh);

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.xr.enabled = true;

document.body.appendChild(VRButton.createButton(renderer));

// pixel ratio = 2 => per CSS pixel will be renderd by 2x2 (4pixel) on physical display device
// renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
})
