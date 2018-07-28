import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  PointLight
} from 'three'
import loop from 'raf-loop'
import WAGNER from '@superguigui/wagner'
import BloomPass from '@superguigui/wagner/src/passes/bloom/MultiPassBloomPass'
import FXAAPass from '@superguigui/wagner/src/passes/fxaa/FXAAPass'
import resize from 'brindille-resize'
import Torus from './objects/Torus'
import OrbitControls from './controls/OrbitControls'
// import gui from './utils/debug'
// let THREE = require('three');

console.log()

Ammo().then(() => {

  /* Custom settings */
  const SETTINGS = {
    useComposer: false
  }

  /* Init Variables */

  /* Init renderer and canvas */
  const container = document.body
  const renderer = new WebGLRenderer({
    antialias: true
  })
  // renderer.setClearColor(0x323232)
  container.style.overflow = 'hidden'
  container.style.margin = 0
  container.appendChild(renderer.domElement)

  /* Composer for special effects */
  const composer = new WAGNER.Composer(renderer)
  const bloomPass = new BloomPass()
  const fxaaPass = new FXAAPass()

  // - Global variables -
  var totalCloths = 6;
  var spacing = 3.5;

  // Graphics variables
  var camera, controls, scene;
  var textureLoader;
  var particleLights = []
  var clock = new THREE.Clock();

  // Physics variables
  var gravityConstant = -9.8;
  var collisionConfiguration;
  var dispatcher;
  var broadphase;
  var solver, softBodySolver;;
  var physicsWorld;
  var rigidBodies = [];
  var margin = 0.05;
  var cloths = [],
    hinges = [],
    powers = [];
  var transformAux1 = new Ammo.btTransform();

  var time = 0;
  var armMovement = 0;

  // - Main code -

  init();
  animate();


  // - Functions -

  function init() {

    initGraphics();

    initPhysics();

    for (var i = 0; i < totalCloths; i++) {
      createCloth(new THREE.Vector3((i - (totalCloths / 2)) * spacing, 3, 1));
      console.log('cloth ' + i + ' created')
    }


    initInput();
    // gui.add(SETTINGS, 'useComposer')

  }

  function initGraphics() {

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);

    scene = new THREE.Scene();

    camera.position.x = (totalCloths * spacing / 2) + 1;
    camera.position.y = 5;
    camera.position.z = -1;
    camera.lookAt(new THREE.Vector3((totalCloths / 2) * 6, 3, 0))

    controls = new THREE.OrbitControls( camera );
    controls.target.y = 2;

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    textureLoader = new THREE.TextureLoader();

    // var ambientLight = new THREE.AmbientLight( 0x404040 );
    // scene.add( ambientLight );

    var light = new THREE.DirectionalLight(0xffffff, 0.3);
    light.position.set(-7, 10, 15);
    light.castShadow = true;
    var d = 10;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;

    light.shadow.camera.near = 2;
    light.shadow.camera.far = 50;

    light.shadow.mapSize.x = 1024;
    light.shadow.mapSize.y = 1024;

    light.shadow.bias = -0.01;

    scene.add(light);

    var particleColors = [0x5e8eec, 0xff0000, 0x02f213, 0xd701fa]

    particleColors.forEach(color => {
      createParticleLight(color)
    })

    function createParticleLight(color) {
      let particleLight = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({
        color: color
      }));
      scene.add(particleLight);
      let pointLight = new THREE.PointLight(color, 2, 800, 100);
      particleLight.add(pointLight);
      particleLights.push(particleLight)
      return particleLight
    }



    //

    window.addEventListener('resize', onWindowResize, false);

  }

  function initPhysics() {

    // Physics configuration

    collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    softBodySolver = new Ammo.btDefaultSoftBodySolver();
    physicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
    physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
    physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));

  }

  function createCloth(vec) {

    var pos = new THREE.Vector3();
    var quat = new THREE.Quaternion();

    // Ground
    pos.set(0, -0.5, 0);
    quat.set(0, 0, 0, 1);

    textureLoader.load("../textures/grid.png", function(texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(40, 40);
      ground.material.map = texture;
      ground.material.needsUpdate = true;
    });


    // The cloth
    // Cloth graphic object
    var clothWidth = 4;
    var clothHeight = 3;
    var clothNumSegmentsZ = clothWidth * 5;
    var clothNumSegmentsY = clothHeight * 5;
    var clothSegmentLengthZ = clothWidth / clothNumSegmentsZ;
    var clothSegmentLengthY = clothHeight / clothNumSegmentsY;
    var clothPos = vec || new THREE.Vector3(0, 3, 0);

    //var clothGeometry = new THREE.BufferGeometry();
    var clothGeometry = new THREE.PlaneBufferGeometry(clothWidth, clothHeight, clothNumSegmentsZ, clothNumSegmentsY);
    clothGeometry.rotateY(Math.PI * 0.5)
    clothGeometry.translate(clothPos.x, clothPos.y + clothHeight * 0.5, clothPos.z - clothWidth * 0.5)
    //var clothMaterial = new THREE.MeshLambertMaterial( { color: 0x0030A0, side: THREE.DoubleSide } );
    // Make half opacity?
    var clothMaterial = new THREE.MeshLambertMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    clothMaterial.transparent = true;
    clothMaterial.opacity = 0.6;
    var cloth = new THREE.Mesh(clothGeometry, clothMaterial);
    cloth.castShadow = true;
    cloth.receiveShadow = true;
    scene.add(cloth);
    textureLoader.load("../textures/grid.png", function(texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(clothNumSegmentsZ, clothNumSegmentsY);
      cloth.material.map = texture;
      cloth.material.needsUpdate = true;
    });


    // Cloth physic object
    var softBodyHelpers = new Ammo.btSoftBodyHelpers();
    var clothCorner00 = new Ammo.btVector3(clothPos.x, clothPos.y + clothHeight, clothPos.z);
    var clothCorner01 = new Ammo.btVector3(clothPos.x, clothPos.y + clothHeight, clothPos.z - clothWidth);
    var clothCorner10 = new Ammo.btVector3(clothPos.x, clothPos.y, clothPos.z);
    var clothCorner11 = new Ammo.btVector3(clothPos.x, clothPos.y, clothPos.z - clothWidth);
    var clothSoftBody = softBodyHelpers.CreatePatch(physicsWorld.getWorldInfo(), clothCorner00, clothCorner01, clothCorner10, clothCorner11, clothNumSegmentsZ + 1, clothNumSegmentsY + 1, 0, true);
    var sbConfig = clothSoftBody.get_m_cfg();
    sbConfig.set_viterations(10);
    sbConfig.set_piterations(10);

    clothSoftBody.setTotalMass(0.9, false)
    Ammo.castObject(clothSoftBody, Ammo.btCollisionObject).getCollisionShape().setMargin(margin * 3);
    physicsWorld.addSoftBody(clothSoftBody, 1, -1);
    cloth.userData.physicsBody = clothSoftBody;
    // Disable deactivation
    clothSoftBody.setActivationState(4);

    cloths.push(cloth)


    // The base
    var armMass = 2;
    var armLength = 3 + clothWidth;
    var pylonHeight = clothPos.y + clothHeight;
    var baseMaterial = new THREE.MeshLambertMaterial({
      color: 0x000000
    });
    pos.set(clothPos.x, 0.1, clothPos.z - armLength);
    quat.set(0, 0, 0, 1);
    var base = createParalellepiped(1, 0.2, 1, 0, pos, quat, baseMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    pos.set(clothPos.x, 0.5 * pylonHeight, clothPos.z - armLength);
    var pylon = createParalellepiped(0.4, pylonHeight, 0.4, 0, pos, quat, baseMaterial);
    pylon.castShadow = true;
    pylon.receiveShadow = true;
    pos.set(clothPos.x, pylonHeight + 0.2, clothPos.z - 0.5 * armLength);
    var arm = createParalellepiped(0.4, 0.4, armLength + 0.4, armMass, pos, quat, baseMaterial);
    arm.castShadow = true;
    arm.receiveShadow = true;

    // Glue the cloth to the arm
    var influence = 0.5;
    clothSoftBody.appendAnchor(0, arm.userData.physicsBody, false, influence);
    clothSoftBody.appendAnchor(clothNumSegmentsZ, arm.userData.physicsBody, false, influence);

    // Hinge constraint to move the arm
    var pivotA = new Ammo.btVector3(0, pylonHeight * 0.5, 0);
    var pivotB = new Ammo.btVector3(0, -0.2, -armLength * 0.5);
    var axis = new Ammo.btVector3(0, 1, 0);
    var hinge = new Ammo.btHingeConstraint(pylon.userData.physicsBody, arm.userData.physicsBody, pivotA, pivotB, axis, axis, true);
    physicsWorld.addConstraint(hinge, true);
    hinges.push(hinge)

  }

  function createParalellepiped(sx, sy, sz, mass, pos, quat, material) {

    var threeObject = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material);
    var shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
    shape.setMargin(margin);

    createRigidBody(threeObject, shape, mass, pos, quat);

    return threeObject;

  }

  function createRigidBody(threeObject, physicsShape, mass, pos, quat) {

    threeObject.position.copy(pos);
    threeObject.quaternion.copy(quat);

    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    var motionState = new Ammo.btDefaultMotionState(transform);

    var localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(mass, localInertia);

    var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
    var body = new Ammo.btRigidBody(rbInfo);

    threeObject.userData.physicsBody = body;

    scene.add(threeObject);

    if (mass > 0) {
      rigidBodies.push(threeObject);

      // Disable deactivation
      body.setActivationState(4);
    }

    physicsWorld.addRigidBody(body);

  }

  function createRandomColor() {
    return Math.floor(Math.random() * (1 << 24));
  }

  function createMaterial() {
    return new THREE.MeshPhongMaterial({
      color: createRandomColor()
    });
  }

  function initInput() {

    nudgeCloths(5000, 300)
    nudgeCloths(15000, 500, -1)
    nudgeCloths(20000, 800, 1)
    nudgeCloths(30000, 800, -1)


    function nudgeCloths(delay, time = 300, direction = 1) {
      setTimeout(() => {
        console.log('nudging for ' + time + ' milliseconds')
        armMovement = direction
      }, delay)
      setTimeout(() => {
        armMovement = 0
      }, delay + time)
    }

    window.addEventListener('keydown', function(event) {

      switch (event.keyCode) {
        // Q
        case 81:
          armMovement = 1;
          break;

          // A
        case 65:
          armMovement = -1;
          break;
      }

    }, false);

    window.addEventListener('keyup', function(event) {

      armMovement = 0;

    }, false);

    for (var i = 0; i < hinges.length; i++) {
      powers.push(Math.random())
    }

  }

  function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

  }

  function animate() {

    requestAnimationFrame(animate);

    render()
  }

  function render() {

    var deltaTime = clock.getDelta();
    var timer = Date.now() * 0.00025;

    particleLights.forEach((particle, index) => {
      particle.position.x = Math.sin(timer * (2 + index)) * (4 * totalCloths + index/3);
      particle.position.y = Math.cos(timer * (5 + index)) * (5 + index/3) + 3;
      particle.position.z = Math.cos(timer * (3 + index)) * (4 + index/3);
    })


    if (time > 25 && particleLights[0].children[0].decay > 10){
      console.log(particleLights[0].children[0].decay)
      particleLights.forEach( (particle, index) => {
        let pointLight = particle.children[0]
        pointLight.decay = pointLight.decay / 1.0005;
      })
    }

    updatePhysics(deltaTime);

    controls.update(deltaTime);

    renderer.render(scene, camera);

    time += deltaTime;

  }

  function updatePhysics(deltaTime) {



    // Hinge control
    hinges.forEach((hinge, index) => {
      hinge.enableAngularMotor(true, 0.8 * armMovement * powers[index], 50);
    })

    // Step world
    physicsWorld.stepSimulation(deltaTime, 10);

    // Update cloth
    cloths.forEach((cloth) => {
      var softBody = cloth.userData.physicsBody;
      var clothPositions = cloth.geometry.attributes.position.array;
      var numVerts = clothPositions.length / 3;
      var nodes = softBody.get_m_nodes();
      var indexFloat = 0;
      for (var i = 0; i < numVerts; i++) {

        var node = nodes.at(i);
        var nodePos = node.get_m_x();
        clothPositions[indexFloat++] = nodePos.x();
        clothPositions[indexFloat++] = nodePos.y();
        clothPositions[indexFloat++] = nodePos.z();

      }
      cloth.geometry.computeVertexNormals();
      cloth.geometry.attributes.position.needsUpdate = true;
      cloth.geometry.attributes.normal.needsUpdate = true;
    })

    // Update rigid bodies
    for (var i = 0, il = rigidBodies.length; i < il; i++) {
      var objThree = rigidBodies[i];
      var objPhys = objThree.userData.physicsBody;
      var ms = objPhys.getMotionState();
      if (ms) {

        ms.getWorldTransform(transformAux1);
        var p = transformAux1.getOrigin();
        var q = transformAux1.getRotation();
        objThree.position.set(p.x(), p.y(), p.z());
        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

      }
    }

  }

  /* Various event listeners */
  resize.addListener(onResize)

  /* create and launch main loop */

  /* some stuff with gui */


  /* -------------------------------------------------------------------------------- */

  /**
    Resize canvas
  */
  function onResize() {
    camera.aspect = resize.width / resize.height
    camera.updateProjectionMatrix()
    renderer.setSize(resize.width, resize.height)
    composer.setSize(resize.width, resize.height)
  }

  /**
    Render loop
  */

});
