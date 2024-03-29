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

class Object3D extends Component {}

Object3D.schema = {
  object: { type: Types.Ref },
};

class Button extends Component {}

Button.schema = {
  // button states: [none, hovered, pressed]
  currState: { type: Types.String, default: "none" },
  prevState: { type: Types.String, default: "none" },
  action: { type: Types.Ref, default: () => {} },
};

class ButtonSystem extends System {
  execute(/* delta, time */) {
    this.queries.buttons.results.forEach((entity) => {
      const button = entity.getMutableComponent(Button);
      const buttonMesh = entity.getComponent(Object3D).object;
      if (button.currState == "none") {
        buttonMesh.scale.set(1, 1, 1);
      } else {
        buttonMesh.scale.set(1.1, 1.1, 1.1);
      }

      if (button.currState == "pressed" && button.prevState != "pressed") {
        button.action();
      }

      // preserve prevState, clear currState
      // HandRaySystem will update currState
      button.prevState = button.currState;
      button.currState = "none";
    });
  }
}

ButtonSystem.queries = {
  buttons: {
    components: [Button],
  },
};

class Intersectable extends TagComponent {}

class HandRaySystem extends System {
  init(attributes) {
    this.handPointers = attributes.handPointers;
  }

  execute(/* delta, time */) {
    this.handPointers.forEach((hp) => {
      let distance = null;
      let intersectingEntity = null;
      this.queries.intersectable.results.forEach((entity) => {
        const object = entity.getComponent(Object3D).object;
        const intersections = hp.intersectObject(object, false);
        if (intersections && intersections.length > 0) {
          if (distance == null || intersections[0].distance < distance) {
            distance = intersections[0].distance;
            intersectingEntity = entity;
          }
        }
      });
      if (distance) {
        hp.setCursor(distance);
        if (intersectingEntity.hasComponent(Button)) {
          const button = intersectingEntity.getMutableComponent(Button);
          if (hp.isPinched()) {
            button.currState = "pressed";
          } else if (button.currState != "pressed") {
            button.currState = "hovered";
          }
        }
      } else {
        hp.setCursor(1.5);
      }
    });
  }
}

HandRaySystem.queries = {
  intersectable: {
    components: [Intersectable],
  },
};

class Rotating extends TagComponent {}

class RotatingSystem extends System {
  execute(delta /*, time*/) {
    this.queries.rotatingObjects.results.forEach((entity) => {
      const object = entity.getComponent(Object3D).object;
      object.rotation.x += 0.4 * delta;
      object.rotation.y += 0.4 * delta;
    });
  }
}

RotatingSystem.queries = {
  rotatingObjects: {
    components: [Rotating],
  },
};

class HandsInstructionText extends TagComponent {}

class InstructionSystem extends System {
  init(attributes) {
    this.controllers = attributes.controllers;
  }

  execute(/* delta, time */) {
    let visible = false;
    this.controllers.forEach((controller) => {
      if (controller.visible) {
        visible = true;
      }
    });

    this.queries.instructionTexts.results.forEach((entity) => {
      const object = entity.getComponent(Object3D).object;
      object.visible = visible;
    });
  }
}

InstructionSystem.queries = {
  instructionTexts: {
    components: [HandsInstructionText],
  },
};

class OffsetFromCamera extends Component {}

OffsetFromCamera.schema = {
  x: { type: Types.Number, default: 0 },
  y: { type: Types.Number, default: 0 },
  z: { type: Types.Number, default: 0 },
};

class NeedCalibration extends TagComponent {}

class CalibrationSystem extends System {
  init(attributes) {
    this.camera = attributes.camera;
    this.renderer = attributes.renderer;
  }

  execute(/* delta, time */) {
    this.queries.needCalibration.results.forEach((entity) => {
      if (this.renderer.xr.getSession()) {
        const offset = entity.getComponent(OffsetFromCamera);
        const object = entity.getComponent(Object3D).object;
        const xrCamera = this.renderer.xr.getCamera();
        object.position.x = xrCamera.position.x + offset.x;
        object.position.y = xrCamera.position.y + offset.y;
        object.position.z = xrCamera.position.z + offset.z;
        entity.removeComponent(NeedCalibration);
      }
    });
  }
}

CalibrationSystem.queries = {
  needCalibration: {
    components: [NeedCalibration],
  },
};

function makeButtonMesh( x, y, z, color ) {
  const geometry = new THREE.BoxGeometry(x, y, z);
  const material = new THREE.MeshPhongMaterial({ color: color });
  const buttonMesh = new THREE.Mesh(geometry, material);
  buttonMesh.castShadow = true;
  buttonMesh.receiveShadow = true;
  return buttonMesh;
}

// Hue
const room =
  "/model/room.glb";
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
    this.renderer.outputEncoding = THREE.sRGBEncoding;

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
    });

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
        // requiredFeatures: ["hand-tracking"],
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

    this.controller = this.renderer.xr.getController(0);
    this.controller.addEventListener("selectstart", onSelectStart);
    this.controller.addEventListener("selectend", onSelectEnd);
    this.controller.addEventListener("connected", function (event) {
      const mesh = self.buildController.call(self, event.data);
      mesh.scale.z = 0;
      this.add(mesh);
    });
    this.controller.addEventListener("disconnected", function () {
      this.remove(this.children[0]);
      self.controller = null;
      self.controllerGrip = null;
    });
    this.scene.add(this.controller);

    const controllerModelFactory = new XRControllerModelFactory();

    this.controllerGrip = this.renderer.xr.getControllerGrip(0);
    this.controllerGrip.add(
      controllerModelFactory.createControllerModel(this.controllerGrip)
    );
    this.scene.add(this.controllerGrip);

    this.dolly = new THREE.Object3D();
    // this.dolly.position.z = -15;
    // this.dolly.position.y = 0.5;
    this.dolly.add(this.camera);
    this.scene.add(this.dolly);

    this.dummyCam = new THREE.Object3D();
    this.camera.add(this.dummyCam);

    const hand1 = this.renderer.xr.getHand(1);
    hand1.add(new OculusHandModel(hand1));
    this.handPointer1 = new OculusHandPointerModel( hand1, this.controller );
		hand1.add( this.handPointer1 );
    this.dolly.add(hand1);
    // this.scene.add(hand1);

    // const menuGeometry = new THREE.PlaneGeometry( 0.24, 0.5 );
    // const menuMaterial = new THREE.MeshPhongMaterial( {
    //   opacity: 0,
    //   transparent: true,
    // } );
    // const menuMesh = new THREE.Mesh( menuGeometry, menuMaterial );
    // menuMesh.position.set( 0.4, 1, - 1 );
    // menuMesh.rotation.y = - Math.PI / 12;
    // this.scene.add( menuMesh );

    // const orangeButton = makeButtonMesh( 0.2, 0.1, 0.01, 0xffd3b5 );
    // orangeButton.position.set( 0, 1, 0 );
    // menuMesh.add( orangeButton );

    // this.world
    //   .registerComponent(Object3D)
    //   .registerComponent(Button)
    //   .registerComponent(Intersectable)
    //   .registerComponent(Rotating)
    //   .registerComponent(HandsInstructionText)
    //   .registerComponent(OffsetFromCamera)
    //   .registerComponent(NeedCalibration);

    // this.world
    //   .registerSystem(RotatingSystem)
    //   .registerSystem(InstructionSystem, {
    //     controllers: [this.controllerGrip],
    //   })
    //   .registerSystem(CalibrationSystem, {
    //     renderer: this.renderer,
    //     camera: this.camera,
    //   })
    //   .registerSystem(ButtonSystem)
    //   .registerSystem(HandRaySystem, {
    //     handPointers: [handPointer1],
    //   });

    // const menuEntity = this.world.createEntity();
    // menuEntity.addComponent(Intersectable);
    // menuEntity.addComponent(OffsetFromCamera, { x: 0.4, y: 0, z: -1 });
    // menuEntity.addComponent(NeedCalibration);
    // menuEntity.addComponent(Object3D, { object: menuMesh });

    // const obEntity = this.world.createEntity();
    // obEntity.addComponent(Intersectable);
    // obEntity.addComponent(Object3D, { object: orangeButton });
    // const obAction = function () {
    //   this.pressing = true;
    // };

    // obEntity.addComponent(Button, { action: obAction });
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

  handleController(controller, dt) {
    if ((this.handPointer1 && this.handPointer1.isPinched()) || controller.userData.selectPressed) {
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
    if (this.controller) this.handleController(this.controller, dt);
    this.renderer.render(this.scene, this.camera);
  }
}

export { App };
