
// Based on stemkoski.github.io/Three.js/Camera-Texture.html
// WebGLRenderTarget docs http://threejs.org/docs/api/renderers/WebGLRenderTarget.html

let THREE = window.THREE || require('three');

export default class CameraTexture {
  constructor (options) {
    let {
      renderer, scene,
      renderTargetSize = { width: window.innerWidth, height: window.innerHeight },
      renderTargetSizeMirrorsWindow = true,
      cameraProvider = () => {
        return new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 10000);
      }
    } = options;

    this.renderer = renderer;
    this.scene = scene;
    this.renderTargetSize = renderTargetSize;
    this.renderTargetSizeMirrorsWindow = renderTargetSizeMirrorsWindow;
    this.camera = cameraProvider();

    this.cameraParent = new THREE.Object3D();
    this.cameraParent.add(this.camera);
    this.scene.add(this.cameraParent);

    this.finalRenderTarget = new THREE.WebGLRenderTarget(renderTargetSize.width, renderTargetSize.height, { format: THREE.RGBFormat });
    this.texture = this.finalRenderTarget.texture;

    // This is all for fixing the mirrored texture we get directly from alt camera
    this.screenScene = new THREE.Scene();
    this.screenCamera = this._makeScreenCamera();
    this.screenScene.add(this.screenCamera);

    this.mirroredRenderTarget = new THREE.WebGLRenderTarget(renderTargetSize.width, renderTargetSize.height, { format: THREE.RGBFormat });
    this.screenMaterial = new THREE.MeshBasicMaterial({ map: this.mirroredRenderTarget.texture });

    this.screen = this._makeScreen();
    this.screenScene.add(this.screen);

    window.addEventListener('resize', this._resize.bind(this));
  }

  _resize () {
    if (this.renderTargetSizeMirrorsWindow) {
      let w = window.innerWidth;
      let h = window.innerHeight;
      this.finalRenderTarget.setSize(w, h);
      this.mirroredRenderTarget.setSize(w, h);
    }

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.screenScene.remove(this.screenCamera);
    this.screenCamera = this._makeScreenCamera();
    this.screenScene.add(this.screenCamera);

    this.screenScene.remove(this.screen);
    this.screen = this._makeScreen();
    this.screenScene.add(this.screen);
  }

  _makeScreenCamera () {
    var camera = new THREE.OrthographicCamera(
      window.innerWidth / -2, window.innerWidth / 2,
      window.innerHeight / 2, window.innerHeight / -2,
      -10000, 10000
    );
    camera.position.z = 1;
    return camera;
  }

  _makeScreen () {
    var screenGeometry = new THREE.PlaneBufferGeometry(window.innerWidth, window.innerHeight);
    return new THREE.Mesh(screenGeometry, this.screenMaterial);
  }

  update () {
    this.renderer.render(this.scene, this.camera, this.mirroredRenderTarget, true);
    this.renderer.render(this.screenScene, this.screenCamera, this.finalRenderTarget, true);
  }

  getCameraParent () {
    return this.cameraParent;
  }

  getCamera () {
    return this.camera;
  }
}
