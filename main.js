import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRButton } from 'three/examples/jsm/webxr/XRButton';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const sizes = {
  width: innerWidth,
  height: innerHeight,
}

let hand1, hand2;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

const canvas = document.getElementById("webgl");
const coitho = "https://storage.googleapis.com/assets-fygito/images/CoVatHue/CoiThoBangBac.glb"
const room = "https://storage.googleapis.com/assets-fygito/gallery-verse/hue-v6.2.glb"
const roomUpsize = "https://storage.googleapis.com/assets-fygito/gallery-verse/hue-upsize_200MB.glb"

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const gltf = new GLTFLoader();
gltf.setDRACOLoader(dracoLoader);

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

// scene.add(mesh);

const ambientLight = new THREE.AmbientLight("#ffffff", 10);
scene.add(ambientLight);

gltf.load(room, (gltf) => {
  scene.add(gltf.scene)
})

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.xr.enabled = true;

document.body.appendChild(XRButton.createButton(renderer, {
  requiredFeatures: [ 'hand-tracking' ]
}));

// const orbitControler = new OrbitControls(camera, renderer.domElement);
// orbitControler.update();

// controllers

controller1 = renderer.xr.getController( 0 );
scene.add( controller1 );

controller2 = renderer.xr.getController( 1 );
scene.add( controller2 );

const controllerModelFactory = new XRControllerModelFactory();
const handModelFactory = new XRHandModelFactory();

// Hand 1
controllerGrip1 = renderer.xr.getControllerGrip( 0 );
controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
scene.add( controllerGrip1 );

hand1 = renderer.xr.getHand( 0 );
hand1.add( handModelFactory.createHandModel( hand1 ) );

scene.add( hand1 );

// Hand 2
controllerGrip2 = renderer.xr.getControllerGrip( 1 );
controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
scene.add( controllerGrip2 );

hand2 = renderer.xr.getHand( 1 );
hand2.add( handModelFactory.createHandModel( hand2 ) );
scene.add( hand2 );

//

const geometry2 = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 1 ) ] );

const line = new THREE.Line( geometry2 );
line.name = 'line';
line.scale.z = 5;

controller1.add( line.clone() );
controller2.add( line.clone() );

function animate() {
  renderer.setAnimationLoop( render );

}

function render() {
  renderer.render( scene, camera );
}

animate();
