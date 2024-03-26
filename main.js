import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
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

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.xr.enabled = true;

document.body.appendChild(VRButton.createButton(renderer));

const orbitControler = new OrbitControls(camera, renderer.domElement);
orbitControler.update();

controller1 = renderer.xr.getController(0);
scene.add(controller1);

let rayConfigured = false,
  handConfigured = false,
  handPointer1 = null,
  line = null;

const controllerModelFactory = new XRControllerModelFactory();

controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(
  controllerModelFactory.createControllerModel(controllerGrip1)
);
scene.add(controllerGrip1);

controller1.addEventListener("connected", function (event) {
  const hasHand = event.data.hand;

  if (!rayConfigured) {
    rayConfigured = true;

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);

    line = new THREE.Line(geometry);
    line.name = "line";
    line.scale.z = 5;

    controller1.add(line);
    //controller2.add( line.clone() );
  } else if (line) {
    line.visible = !hasHand;
  }

  if (event.data.hand && !handConfigured) {
    handConfigured = true;

    hand1 = renderer.xr.getHand(0);

    hand1.add(new OculusHandModel(hand1));
    handPointer1 = new OculusHandPointerModel(hand1, controller1);
    hand1.add(handPointer1);

    scene.add(hand1);

    hand1.addEventListener("connected", () => {
      handPointer1.setCursor(1.5);
      handPointer1.setAttached(false);
    });

    hand1.addEventListener("pinchstart", () => {
      const intersections = [orangeButton].filter((object) => {
        const intersections1 = handPointer1.intersectObject(object, false);
        return intersections1 && intersections1.length;
      });

      console.log("INTERSECT ", intersections);
    });
    hand1.addEventListener("pinchend", () => {});
  }
});

// pixel ratio = 2 => per CSS pixel will be renderd by 2x2 (4pixel) on physical display device
// renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));


function animate() {
  renderer.setAnimationLoop( render );

}

function render() {
  renderer.render( scene, camera );
}

animate();
