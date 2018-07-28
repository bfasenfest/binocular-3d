import { WebGLRenderer, Scene, PerspectiveCamera, PointLight } from 'three'
import loop from 'raf-loop'
import WAGNER from '@superguigui/wagner'
import BloomPass from '@superguigui/wagner/src/passes/bloom/MultiPassBloomPass'
import FXAAPass from '@superguigui/wagner/src/passes/fxaa/FXAAPass'
import resize from 'brindille-resize'
import Torus from './objects/Torus'
import OrbitControls from './controls/OrbitControls'
import { gui } from './utils/debug'
let THREE = require('three');

/* Custom settings */
const SETTINGS = {
  useComposer: false
}

/* Init Variables */
const TORUS_ROTATION = {
  X:0.05,
  Y:0.03,
}

/* Init renderer and canvas */
const container = document.body
const renderer = new WebGLRenderer({antialias: true})
// renderer.setClearColor(0x323232)
container.style.overflow = 'hidden'
container.style.margin = 0
container.appendChild(renderer.domElement)

/* Composer for special effects */
const composer = new WAGNER.Composer(renderer)
const bloomPass = new BloomPass()
const fxaaPass = new FXAAPass()

/* Main scene and camera */
const scene = new Scene()
const camera = new PerspectiveCamera(50, resize.width / resize.height, 0.1, 1000)
const controls = new OrbitControls(camera, {element: renderer.domElement, parent: renderer.domElement, distance: 10, phi: Math.PI * 0.5})

/* Lights */
const frontLight = new PointLight(0xFFFFFF, 1)
const backLight = new PointLight(0xFFFFFF, 0.5)
// scene.add(frontLight)
// scene.add(backLight)
frontLight.position.x = 20
backLight.position.x = -20

var particleLights = []

var particleColors = [0x5e8eec, 0x800000]

particleColors.forEach( color => {
  createParticleLight(color)
})

// const particleColors =  {
//   a: 0x5e8eec,
//   b: 0x800000
// }
//
// var particleColor1 = 0x5e8eec
// var particleColor2 = 0x800000
//
// var particleLight = new THREE.Mesh( new THREE.SphereGeometry( 0.2, 8, 8 ), new THREE.MeshBasicMaterial( { color: particleColors.a } ) );
// scene.add( particleLight );
//
// var pointLight = new THREE.PointLight( particleColors.a, 2, 800 );
// particleLight.add( pointLight );
//
// var particleLight2 = new THREE.Mesh( new THREE.SphereGeometry( 0.2, 8, 8 ), new THREE.MeshBasicMaterial( { color: particleColors.b} ) );
// scene.add( particleLight2 );
//
// var pointLight2 = new THREE.PointLight( particleColors.b, 2, 800 );
// particleLight2.add( pointLight2 )


function createParticleLight(color) {
  let particleLight = new THREE.Mesh( new THREE.SphereGeometry( 0.2, 8, 8 ), new THREE.MeshBasicMaterial( { color: color } ) );
  scene.add( particleLight );
  let pointLight = new THREE.PointLight( color, 2, 800 );
  particleLight.add( pointLight );
  particleLights.push(particleLight)
  return particleLight
}

/* Actual content of the scene */
const torus = new Torus()

scene.add(torus)

/* Various event listeners */
resize.addListener(onResize)

/* create and launch main loop */
const engine = loop(render)
engine.start()

/* some stuff with gui */
gui.add(SETTINGS, 'useComposer')
gui.add(TORUS_ROTATION, 'X', {
  min:      0, // default is 0
  max:      1, // default is 100
  step:   0.05, // default is 1
  label: 'Torus X Rotation', // default is target property's name (here "a")
  watch: false // default is false
})
gui.add(TORUS_ROTATION, 'Y', {
  min:      0, // default is 0
  max:      1, // default is 100
  step:   0.05, // default is 1
  label: 'Torus X Rotation', // default is target property's name (here "a")
  watch: false // default is false
})

const addNewParticle = {add: () => {
  let color = "0x" + Math.floor(Math.random()*16777215).toString(16);
  console.log(color)
  let particle = createParticleLight(color)
  let pointLight = particle.children[0]
  gui.addColorPicker(pointLight, 'color').on('update', value => {
    particle.material.color = pointLight.color
  })
}}

gui.add(addNewParticle, 'add', {
  label: 'Create New Particle', // default is target property's name (here "a")
  watch: false // default is false
})

particleLights.forEach( (particle, index) => {
  let pointLight = particle.children[0]
  gui.addColorPicker(pointLight, 'color').on('update', value => {
    particle.material.color = pointLight.color
  })
})




// gui.addColorPicker(pointLight, 'color').on('update', value => {
//   particleLight.material.color = pointLight.color
// })
// gui.addColorPicker(pointLight2, 'color').on('update', value => {
//   particleLight2.material.color = pointLight2.color
// })


/* -------------------------------------------------------------------------------- */

/**
  Resize canvas
*/
function onResize () {
  camera.aspect = resize.width / resize.height
  camera.updateProjectionMatrix()
  renderer.setSize(resize.width, resize.height)
  composer.setSize(resize.width, resize.height)
}

/**
  Render loop
*/
function render (dt) {
  var timer = Date.now() * 0.00025;

  controls.update()
  torus.rotation.x += TORUS_ROTATION.X;
  torus.rotation.y += TORUS_ROTATION.Y;

  particleLights.forEach( (particle, index) => {
    particle.position.x = Math.sin( timer * ( 7 + index ) ) * (1 + index/3);
    particle.position.y = Math.cos( timer * ( 4 + index ) ) * (1 + index/3);
    particle.position.z = Math.cos( timer * ( 1.5 + index ) ) * (1 + index/3);
  })

  if (SETTINGS.useComposer) {
    composer.reset()
    composer.render(scene, camera)
    composer.pass(bloomPass)
    composer.pass(fxaaPass)
    composer.toScreen()
  }else {
    renderer.render(scene, camera)
  }
}
