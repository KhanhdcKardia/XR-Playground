import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { XRButton } from "three/examples/jsm/webxr/XRButton";
import { OculusHandModel } from "three/examples/jsm/webxr/OculusHandModel";
import { createText } from "three/examples/jsm/webxr/Text2D";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { XRHandModelFactory } from "three/examples/jsm/webxr/XRHandModelFactory.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

var container;
var camera, scene, renderer;
var hand1, hand2;

var trail = [];
var i;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x505050);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.6, 3);

  scene.add(new THREE.HemisphereLight(0x606060, 0x404040));

  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(1, 1, -1).normalize();
  scene.add(light);

  // add a floor

  var color = new THREE.Color(0x8ec683);
  var floor = new THREE.GridHelper(8, 8, color, color);
  scene.add(floor);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // hand 1

  hand1 = renderer.xr.getHand(1);
  hand1.add(new OculusHandModel(hand1));
  scene.add(hand1);

  // hand 2

  hand2 = renderer.xr.getHand(0);
  hand2.add(new OculusHandModel(hand2));
  scene.add(hand2);

  window.addEventListener("resize", onWindowResize, false);

  // Make 100 boxes for trail[]

  for (i = 0; i < 100; i++) {
    var geometry = new THREE.BoxGeometry(0.005, 0.005, 0.005);
    trail[i] = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    trail[i].material.wireframe = true;
    trail[i].position.x = 0;
    trail[i].position.y = 0;
    trail[i].position.z = 0;
    scene.add(trail[i]);
  }

  i = 0;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  renderer.render(scene, camera);

  if (i && hand1.joints) {
    console.log('hand1: ', hand1);
    trail[i].position.x = hand1.joints["index-finger-tip"].position.x;
    trail[i].position.y = hand1.joints["index-finger-tip"].position.y;
    trail[i].position.z = hand1.joints["index-finger-tip"].position.z;
  }

  i++;
  if (i > 99) {
    i = 0;
  }
}
