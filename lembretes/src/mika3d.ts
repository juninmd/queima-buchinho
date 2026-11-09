import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Mika (VRM) como pano de fundo: respira, pisca, olha para o ponteiro e mexe a boca quando fala. */
export class MikaBg {
  private renderer?: THREE.WebGLRenderer;
  private vrm?: VRM;
  private raf = 0;
  private speaking = false;
  private look = new THREE.Object3D();
  private mouse = new THREE.Vector2();

  constructor(private canvas: HTMLCanvasElement) {}

  async start(url = '/mika.vrm'): Promise<void> {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true }));
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
    scene.add(new THREE.AmbientLight(0xfff2f6, 1.1), this.look);
    const key = new THREE.DirectionalLight(0xfff0e6, 1.3); key.position.set(-0.8, 1.6, 2);
    const rim = new THREE.DirectionalLight(0xf472b6, 1.2); rim.position.set(1.5, 1.4, -1);
    scene.add(key, rim);
    const loader = new GLTFLoader().register((p) => new VRMLoaderPlugin(p));
    const gltf = await loader.loadAsync(url);
    const vrm = (this.vrm = gltf.userData.vrm as VRM);
    VRMUtils.rotateVRM0(vrm);
    scene.add(vrm.scene);
    const arm = (n: 'leftUpperArm' | 'rightUpperArm', z: number): void => { const b = vrm.humanoid.getNormalizedBoneNode(n); if (b) b.rotation.z = z; };
    arm('leftUpperArm', -1.2); arm('rightUpperArm', 1.2);
    if (vrm.lookAt) vrm.lookAt.target = this.look;
    addEventListener('pointermove', (e) => this.mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5));
    const clock = new THREE.Clock();
    const loop = (): void => {
      this.raf = requestAnimationFrame(loop);
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (this.canvas.width !== w * r.getPixelRatio()) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      const t = clock.elapsedTime, dt = clock.getDelta();
      const head = vrm.humanoid.getNormalizedBoneNode('head');
      const hy = head ? head.getWorldPosition(new THREE.Vector3()).y : 1.4;
      cam.position.set(0, hy - 0.2, 2.7); cam.lookAt(0, hy - 0.4, 0);
      this.look.position.set(this.mouse.x * 1.2, hy - this.mouse.y, 1.5);
      const spine = vrm.humanoid.getNormalizedBoneNode('chest'); if (spine) spine.rotation.x = Math.sin(t * 1.6) * 0.015;
      const em = vrm.expressionManager;
      if (em) {
        em.setValue('blink', Math.sin(t * 0.9) > 0.985 ? 1 : 0);
        em.setValue('happy', 0.25 + 0.1 * Math.sin(t * 0.5));
        em.setValue('aa', this.speaking ? 0.25 + 0.35 * Math.abs(Math.sin(t * 11)) : 0);
      }
      vrm.update(Math.min(dt, 1 / 30)); r.render(scene, cam);
    };
    loop();
  }
  setSpeaking(v: boolean): void { this.speaking = v; }
  stop(): void { cancelAnimationFrame(this.raf); this.renderer?.dispose(); }
}
