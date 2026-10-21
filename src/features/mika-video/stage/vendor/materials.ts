// Cópia de juninmd/mika (apps/desktop/src/renderer/src) — mantenha em sincronia com a origem.
/** Acabamento anime aplicado em runtime aos MToon de qualquer VRM VRoid. */
import type * as THREE from 'three'

type MToonLike = THREE.Material & {
  isMToonMaterial?: boolean
  isOutline?: boolean
  shadeColorFactor?: THREE.Color
  shadingShiftFactor?: number
  parametricRimColorFactor?: THREE.Color
  customProgramCacheKey: () => string
}

const EYE = /^Eye(Iris|White|Highlight)/i
const FACE_SKIN = /^Face_\d+_SKIN/i
const SKIN = /_SKIN$/i
/** Sombra no rosto só na borda: cortar bochecha e canto do olho é o que mais "desanimiza" um VRoid. */
export const FACE_SHADING_SHIFT_MIN = 0.5
/** Coral quente: pele com sombra cinza lê como boneco de plástico. */
const WARM_SKIN_HUE = 0.985
const WARM_SKIN_PULL = 0.6
const SKIN_SHADE_MIN_SATURATION = 0.32
/** Quanto o contorno engrossa na silhueta, onde a normal fica de lado para a câmera. */
export const SILHOUETTE_INK_BOOST = 0.6

const OUTLINE_ANCHOR = 'vec3 outlineOffset = outlineWidthFactor * worldNormalLength * objectNormal;'
const OUTLINE_PATCH = `${OUTLINE_ANCHOR}
    outlineOffset *= 1.0 + ( 1.0 - abs( normalize( transformedNormal ).z ) ) * ${SILHOUETTE_INK_BOOST.toFixed(2)};`

export type MaterialRole = 'eye' | 'face' | 'skin' | 'other'

export function materialRole(name: string): MaterialRole {
  if (EYE.test(name)) return 'eye'
  if (FACE_SKIN.test(name)) return 'face'
  if (SKIN.test(name)) return 'skin'
  return 'other'
}

/** Puxa a sombra da pele para o coral mantendo a luminância autoral. */
export function warmSkinShade(color: THREE.Color): void {
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  const delta = ((WARM_SKIN_HUE - hsl.h + 1.5) % 1) - 0.5
  const hue = (hsl.h + delta * WARM_SKIN_PULL + 1) % 1
  color.setHSL(hue, Math.max(hsl.s, SKIN_SHADE_MIN_SATURATION), hsl.l)
}

function tuneRole(material: MToonLike, role: MaterialRole): void {
  if (role === 'eye') {
    // Olho sempre iluminado: íris e brilho com sombra ficam opacos, sem vida.
    material.shadeColorFactor?.setRGB(1, 1, 1)
    material.shadingShiftFactor = 1
    material.parametricRimColorFactor?.setRGB(0, 0, 0)
  } else if (role === 'face') {
    material.shadingShiftFactor = Math.max(material.shadingShiftFactor ?? 0, FACE_SHADING_SHIFT_MIN)
    material.parametricRimColorFactor?.setRGB(0, 0, 0)
    if (material.shadeColorFactor) warmSkinShade(material.shadeColorFactor)
  } else if (role === 'skin' && material.shadeColorFactor) {
    warmSkinShade(material.shadeColorFactor)
  }
}

/** Traço que engrossa na silhueta e afina de frente: leitura de desenho, não de casca inflada. */
function patchOutline(material: MToonLike): void {
  const compile = material.onBeforeCompile
  const cacheKey = material.customProgramCacheKey
  material.onBeforeCompile = (shader, renderer) => {
    compile.call(material, shader, renderer)
    shader.vertexShader = shader.vertexShader.replace(OUTLINE_ANCHOR, OUTLINE_PATCH)
  }
  material.customProgramCacheKey = () => `${cacheKey.call(material)},mika-silhouette-ink`
}

export function tuneAnimeMaterials(root: THREE.Object3D): void {
  const seen = new Set<THREE.Material>()
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as MToonLike[]) {
      if (seen.has(material) || !material.isMToonMaterial) continue
      seen.add(material)
      const role = materialRole(material.name)
      if (material.isOutline) patchOutline(material)
      else tuneRole(material, role)
      material.needsUpdate = true
    }
  })
}
