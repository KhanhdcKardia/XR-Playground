import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { XRButton } from "three/examples/jsm/webxr/XRButton";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { OculusHandPointerModel } from 'three/examples/jsm/webxr/OculusHandPointerModel';
import { XRHandModelFactory } from "three/examples/jsm/webxr/XRHandModelFactory.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OculusHandModel } from "three/examples/jsm/webxr/OculusHandModel";
import { createText } from 'three/examples/jsm/webxr/Text2D';
import { World, System, Component, TagComponent, Types } from 'three/examples/jsm/libs/ecsy.module.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'

// Hue
const room =
  "/hue-webp-v8-4k.glb";
class App {
  constructor() {
    const canvas = document.getElementById("webgl");
    this.pressing = false;

    this.clock = new THREE.Clock();
    this.world = new World();

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 1.6, 5);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x505050);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x404040));

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    this.scene.add(light);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.6, 0);
    this.controls.update();

    // this.stats = new Stats();

    this.raycaster = new THREE.Raycaster();
    this.workingMatrix = new THREE.Matrix4();
    this.workingVector = new THREE.Vector3();
    this.origin = new THREE.Vector3();

    this.initScene();
    this.setupVR();

    window.addEventListener("resize", this.resize.bind(this));

    const ctx = THREE.AudioContext.getContext();
    ctx.addEventListener("statechange", async () => {
      if (ctx.state === "suspended" || ctx.state === "interrupted") {
        ctx
          .resume()
          .then(() => {
            console.log("AudioContext resumed");
          })
          .catch((err) => {
            console.error("AudioContext couldn't be resumed", err);
          });
      }
    });

    this.renderer.setAnimationLoop(this.render.bind(this));
  }

  random(min, max) {
    return Math.random() * (max - min) + min;
  }

  initScene() {
    const backgroundMusic =
      "https://storage.googleapis.com/assets-fygito/gallery-verse/hue-sound.mp3";

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(room, (gltf) => {
      this.scene.add(gltf.scene);

      this.updateAllMaterials();
    });

    const exrLoader = new EXRLoader();
    exrLoader.load('https://storage.googleapis.com/assets-fygito/gallery-verse/ReflectionProbe-1.exr', (environmentMap) =>
    {
      environmentMap.mapping = THREE.EquirectangularReflectionMapping;
      environmentMap.colorSpace = THREE.SRGBColorSpace;
      environmentMap.anisotropy = 10;

      // this.scene.background = environmentMap
      this.scene.environment = environmentMap
    })

    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    this.sound = new THREE.PositionalAudio(this.listener);

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(backgroundMusic, (buffer) => {
      this.sound.setBuffer(buffer);
      this.sound.setLoop(true);
      this.sound.setVolume(0.3);
    });
  }

  setupVR() {
    this.renderer.xr.enabled = true;

    document.body.appendChild(
      XRButton.createButton(this.renderer, {
        requiredFeatures: ["hand-tracking"],
      })
    );

    document.getElementById("XRButton").addEventListener("click", () => {
      if (this.sound) {
        this.sound.play();

        const ctx = THREE.AudioContext.getContext();
        ctx.addEventListener("statechange", async () => {
          if (ctx.state === "suspended" || ctx.state === "interrupted") {
            ctx
              .resume()
              .then(() => {
                console.log("AudioContext resumed");
              })
              .catch((err) => {
                console.error("AudioContext couldn't be resumed", err);
              });
          }
        });
      }
    });

    const self = this;

    function onSelectStart() {
      this.userData.selectPressed = true;
    }

    function onSelectEnd() {
      this.userData.selectPressed = false;
    }

    // controllers
    this.controller1 = this.renderer.xr.getController( 0 );
    this.scene.add( this.controller1 );

    this.controller2 = this.renderer.xr.getController( 1 );
    this.scene.add( this.controller2 );

    const controllerModelFactory = new XRControllerModelFactory();

    this.dolly = new THREE.Object3D();
    this.dolly.position.z = -3;
    this.dolly.position.y = 1;
    this.dolly.add(this.camera);
    this.scene.add(this.dolly);

    this.dummyCam = new THREE.Object3D();
    this.camera.add(this.dummyCam);

    const controllerGrip1 = this.renderer.xr.getControllerGrip( 0 );
    controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
    this.scene.add( controllerGrip1 );

    const hand1 = this.renderer.xr.getHand( 0 );
    hand1.add( new OculusHandModel( hand1 ) );
    this.handPointer1 = new OculusHandPointerModel( hand1, this.controller1 );
    hand1.add( this.handPointer1 );
    this.dolly.add(hand1);

    const controllerGrip2 = this.renderer.xr.getControllerGrip( 1 );
    controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
    this.scene.add( controllerGrip2 );

    const hand2 = this.renderer.xr.getHand( 1 );
    hand2.add( new OculusHandModel( hand2 ) );
    this.handPointer2 = new OculusHandPointerModel( hand2, this.controller2 );
    hand2.add( this.handPointer2 );
    this.dolly.add(hand2);
  }

  buildController(data) {
    let geometry, material;

    switch (data.targetRayMode) {
      case "tracked-pointer":
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
        );
        geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
        );

        material = new THREE.LineBasicMaterial({
          vertexColors: true,
          blending: THREE.AdditiveBlending,
        });

        return new THREE.Line(geometry, material);

      case "gaze":
        geometry = new THREE.RingBufferGeometry(0.02, 0.04, 32).translate(
          0,
          0,
          -1
        );
        material = new THREE.MeshBasicMaterial({
          opacity: 0.5,
          transparent: true,
        });
        return new THREE.Mesh(geometry, material);
    }
  }

  handleController(dt) {
    if (!this.handPointer1 || !this.handPointer2) return;
    if (this.handPointer1.isPinched() || this.handPointer2.isPinched()) {
      const wallLimit = 1.3;
      const speed = 1;
      let pos = this.dolly.position.clone();
      pos.y += 1;

      let dir = new THREE.Vector3();
      //Store original dolly rotation
      const quaternion = this.dolly.quaternion.clone();
      //Get rotation for movement from the headset pose
      this.dolly.quaternion.copy(
        this.dummyCam.getWorldQuaternion(new THREE.Quaternion())
      );
      this.dolly.getWorldDirection(dir);
      dir.negate();
      this.raycaster.set(pos, dir);

      let blocked = false;

      let intersect = this.raycaster.intersectObjects([]);
      if (intersect.length > 0) {
        if (intersect[0].distance < wallLimit) blocked = true;
      }

      if (!blocked) {
        this.dolly.translateZ(-dt * speed);
        pos = this.dolly.getWorldPosition(this.origin);
      }

      //cast left
      dir.set(-1, 0, 0);
      dir.applyMatrix4(this.dolly.matrix);
      dir.normalize();
      this.raycaster.set(pos, dir);

      intersect = this.raycaster.intersectObjects([]);
      if (intersect.length > 0) {
        if (intersect[0].distance < wallLimit)
          this.dolly.translateX(wallLimit - intersect[0].distance);
      }

      //cast right
      dir.set(1, 0, 0);
      dir.applyMatrix4(this.dolly.matrix);
      dir.normalize();
      this.raycaster.set(pos, dir);

      intersect = this.raycaster.intersectObjects([]);
      if (intersect.length > 0) {
        if (intersect[0].distance < wallLimit)
          this.dolly.translateX(intersect[0].distance - wallLimit);
      }

      this.dolly.position.y = 0;

      //Restore the original rotation
      this.dolly.quaternion.copy(quaternion);
    }
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    const ngaiHoangDe = this.scene.getObjectByName("NgaiCuaHoangDe");
    if (ngaiHoangDe) {
      ngaiHoangDe.add(this.sound);
    }

    const dt = this.clock.getDelta();
    // this.stats.update();
    if (this.controller1 && this.controller2) this.handleController(dt);
    this.renderer.render(this.scene, this.camera);
  }

  updateAllMaterials() {
    this.scene.traverse((child) => {
      if (child.isMesh && child.material.isMeshStandardMaterial) {
        child.material.envMapIntensity = 1;
        child.material.map.anisotropy = 10;
      }
    });
  }
}

export { App };
