import { type VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { LipFrame } from '../lip-sync-track';
import { mulberry32 } from './rng';
import { BlinkDriver } from './vendor/blink';
import { tuneAnimeMaterials } from './vendor/materials';
import { VisemeSmoother, VOWEL_PRESET, visemeTargets } from './vendor/mouth';
import { forceImgTextureLoader, type TextureLoaderHost } from './vendor/texture-loader';

/** Quão do alto da cabeça (fração da altura do modelo) o rosto fica centrado, e o recorte vertical. */
const FACE_CENTER = 0.046;
const FACE_SPAN = 0.225;
const MAX_SPRING_STEP = 1 / 30;
const ARM_DOWN = 1.2;

async function loadVrm(url: string): Promise<VRM> {
    const loader = new GLTFLoader();
    loader.register(parser => { forceImgTextureLoader(parser as unknown as TextureLoaderHost); return { name: 'img-texture-loader' }; });
    loader.register(parser => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm as VRM;
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    VRMUtils.rotateVRM0(vrm);
    return vrm;
}

/** Mika em close: a mesma cadeia do mika (visemas por vogal, piscada, MToon anime), sem relógio de parede. */
export class MikaFace {
    readonly scene = new THREE.Scene();
    readonly camera = new THREE.PerspectiveCamera(22, 1, 0.05, 10);
    private vrm!: VRM;
    private readonly mouth = new VisemeSmoother();
    private readonly blink = new BlinkDriver(mulberry32(7));
    private readonly gaze = new THREE.Object3D();
    private focus = new THREE.Vector3();
    private distance = 1;
    private envelope = 0;

    constructor(private readonly renderer: THREE.WebGLRenderer) {
        this.scene.add(new THREE.AmbientLight(0xfff2f6, 1.0));
        const key = new THREE.DirectionalLight(0xfff0e6, 1.25);
        key.position.set(-0.8, 1.6, 2);
        const rim = new THREE.DirectionalLight(0xffb4d8, 0.8);
        rim.position.set(1.5, 1.5, -1);
        this.scene.add(key, rim, this.gaze);
    }

    async load(url: string): Promise<void> {
        this.vrm = await loadVrm(url);
        tuneAnimeMaterials(this.vrm.scene);
        this.scene.add(this.vrm.scene);
        this.bone('leftUpperArm').rotation.z = -ARM_DOWN;
        this.bone('rightUpperArm').rotation.z = ARM_DOWN;
        if (this.vrm.lookAt) this.vrm.lookAt.target = this.gaze;
        this.vrm.update(0);
        this.frameFace();
    }

    private bone(name: Parameters<NonNullable<VRM['humanoid']>['getNormalizedBoneNode']>[0]): THREE.Object3D {
        return this.vrm.humanoid.getNormalizedBoneNode(name) as THREE.Object3D;
    }

    /** Enquadra o rosto: centro e recorte saem da altura do próprio modelo, então serve a qualquer VRM. */
    private frameFace(): void {
        this.vrm.scene.updateMatrixWorld(true);
        const height = new THREE.Box3().setFromObject(this.vrm.scene).getSize(new THREE.Vector3()).y;
        const head = this.vrm.humanoid.getRawBoneNode('head')!.getWorldPosition(new THREE.Vector3());
        this.focus.set(head.x, head.y + height * FACE_CENTER, head.z);
        this.distance = (height * FACE_SPAN) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    }

    /** Estado da Mika no instante `t` — determinístico: o mesmo `t` sempre produz o mesmo quadro. */
    pose(t: number, dt: number, lip: LipFrame): void {
        const speaking = lip.open > 0.04;
        this.envelope += (lip.open - this.envelope) * (1 - Math.exp(-dt * 10));
        const beat = this.envelope;
        const head = this.bone('head'), neck = this.bone('neck');
        head.rotation.set(
            0.025 * Math.sin(t * 1.1) + 0.07 * beat,
            0.09 * Math.sin(t * 0.7) + 0.05 * Math.sin(t * 2.3) * beat,
            0.035 * Math.sin(t * 0.55 + 1),
        );
        neck.rotation.set(head.rotation.x * 0.4, head.rotation.y * 0.5, head.rotation.z * 0.5);
        this.bone('spine').rotation.x = 0.012 * Math.sin(t * 1.7);
        const em = this.vrm.expressionManager!;
        em.setValue('happy', 0.28 + 0.14 * Math.sin(t * 0.45) + (speaking ? 0.12 : 0));
        em.setValue('blink', this.blink.advance(dt, em.getValue('happy') ?? 0));
        const open = this.mouth.advance(visemeTargets(lip.vowels, lip.open, speaking), dt);
        for (const preset of Object.values(VOWEL_PRESET)) em.setValue(preset, open[preset]);
        this.gaze.position.set(0.04 * Math.sin(t * 1.9) * (1 + beat), this.focus.y + 0.015 * Math.sin(t * 1.3), this.focus.z + 1.5);
        this.step(dt);
        this.aimCamera(t);
    }

    /** Física das mechas em subpassos de ≤ 1/30 s, como o `stepVrm` do mika. */
    private step(dt: number): void {
        const vrm = this.vrm;
        vrm.humanoid.update();
        vrm.lookAt?.update(dt);
        vrm.expressionManager?.update();
        vrm.nodeConstraintManager?.update();
        const steps = Math.max(1, Math.ceil(dt / MAX_SPRING_STEP - 1e-9));
        for (let i = 0; i < steps; i++) vrm.springBoneManager?.update(dt / steps);
        for (const m of vrm.materials ?? []) (m as { update?: (d: number) => void }).update?.(dt);
    }

    /** Câmera com órbita mínima e dolly lento: close que respira sem parecer foto parada. */
    private aimCamera(t: number): void {
        const yaw = 0.07 * Math.sin(t * 0.4), dist = this.distance * (1 - 0.025 * Math.sin(t * 0.3));
        this.camera.position.set(this.focus.x + Math.sin(yaw) * dist, this.focus.y + 0.012, this.focus.z + Math.cos(yaw) * dist);
        this.camera.lookAt(this.focus);
        this.camera.updateProjectionMatrix();
    }

    render(): void { this.renderer.render(this.scene, this.camera); }
}
