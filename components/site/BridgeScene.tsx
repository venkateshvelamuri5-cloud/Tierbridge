'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { BRANCHES, BRANCH_COLOR, type Branch } from '@/content/site'

// Hero background: each branch sends a stream of particles across arcs to a
// cluster of job nodes. The selected branch's stream is highlighted.
export default function BridgeScene({ branch }: { branch: Branch }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const highlightRef = useRef<(b: Branch) => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    } catch {
      canvas.style.display = 'none'
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0b1220, 0.055)
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0.6, 11)
    const root = new THREE.Group()
    scene.add(root)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const spriteCanvas = document.createElement('canvas')
    spriteCanvas.width = spriteCanvas.height = 64
    const g = spriteCanvas.getContext('2d')!
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.25, 'rgba(255,255,255,.85)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 64, 64)
    const sprite = new THREE.CanvasTexture(spriteCanvas)

    const disposables: { dispose: () => void }[] = [sprite]
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)

    // Background dust
    const dustN = 900
    const dp = new Float32Array(dustN * 3)
    for (let i = 0; i < dustN; i++) {
      dp[i * 3] = (Math.random() - 0.5) * 30
      dp[i * 3 + 1] = (Math.random() - 0.5) * 16
      dp[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4
    }
    const dustGeo = track(new THREE.BufferGeometry())
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3))
    root.add(new THREE.Points(dustGeo, track(new THREE.PointsMaterial({ size: 0.05, color: 0x6c7894, transparent: true, opacity: 0.6, map: sprite, depthWrite: false }))))

    // Branch nodes on the left, job nodes on the right
    const left = BRANCHES.map((_, i) => new THREE.Vector3(-4.6, (i - (BRANCHES.length - 1) / 2) * 0.95, Math.sin(i * 1.7) * 0.8))
    const right: THREE.Vector3[] = []
    for (let i = 0; i < 10; i++) right.push(new THREE.Vector3(4.6 + Math.sin(i * 2.1) * 0.5, (i - 4.5) * 0.7, Math.cos(i * 1.3)))
    const nodeGeo = track(new THREE.SphereGeometry(0.09, 16, 16))
    const leftNodes = left.map((p, i) => {
      const color = BRANCH_COLOR[BRANCHES[i]]
      const mesh = new THREE.Mesh(nodeGeo, track(new THREE.MeshBasicMaterial({ color })))
      mesh.position.copy(p)
      root.add(mesh)
      const halo = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: sprite, color, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })))
      halo.scale.set(0.9, 0.9, 1)
      halo.position.copy(p)
      root.add(halo)
      return { mesh, halo }
    })
    const jobMat = track(new THREE.MeshBasicMaterial({ color: 0xeef1f7 }))
    right.forEach(p => {
      const m = new THREE.Mesh(nodeGeo, jobMat)
      m.position.copy(p)
      m.scale.setScalar(0.8)
      root.add(m)
    })

    // Arcs with particles flowing along them
    interface Flow { branch: Branch; curve: THREE.QuadraticBezierCurve3; pos: Float32Array; offs: number[]; geo: THREE.BufferGeometry; pm: THREE.PointsMaterial; lm: THREE.LineBasicMaterial; speed: number; target?: { p: number; l: number; s: number } }
    const flows: Flow[] = []
    BRANCHES.forEach((b, i) => {
      for (let k = 0; k < 3; k++) {
        const a = left[i]
        const end = right[(i * 3 + k * 2) % right.length]
        const mid = a.clone().add(end).multiplyScalar(0.5)
        mid.y += 2.2 + Math.random() * 1.2
        mid.z += (Math.random() - 0.5) * 2.5
        const curve = new THREE.QuadraticBezierCurve3(a, mid, end)
        const lm = track(new THREE.LineBasicMaterial({ color: BRANCH_COLOR[b], transparent: true, opacity: 0.14 }))
        root.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60))), lm))
        const n = 14
        const pos = new Float32Array(n * 3)
        const offs = Array.from({ length: n }, (_, j) => j / n + Math.random() * 0.04)
        const geo = track(new THREE.BufferGeometry())
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
        const pm = track(new THREE.PointsMaterial({ size: 0.16, color: BRANCH_COLOR[b], map: sprite, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }))
        root.add(new THREE.Points(geo, pm))
        flows.push({ branch: b, curve, pos, offs, geo, pm, lm, speed: 0.05 + Math.random() * 0.03 })
      }
    })

    highlightRef.current = (b: Branch) => {
      flows.forEach(f => {
        const on = f.branch === b
        f.target = { p: on ? 1 : 0.28, l: on ? 0.55 : 0.08, s: on ? 0.24 : 0.13 }
      })
      leftNodes.forEach(({ mesh, halo }, i) => {
        const on = BRANCHES[i] === b
        mesh.scale.setScalar(on ? 2 : 1)
        halo.material.opacity = on ? 0.95 : 0.35
        halo.scale.setScalar(on ? 1.8 : 0.8)
      })
      if (reduce) {
        // No animation loop: apply the highlight at once and redraw.
        flows.forEach(f => { if (f.target) { f.pm.opacity = f.target.p; f.lm.opacity = f.target.l; f.pm.size = f.target.s } })
        renderer.render(scene, camera)
      }
    }

    const resize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.position.z = w < 700 ? 15 : w < 1000 ? 12.5 : 11
      root.scale.setScalar(w < 900 ? 1 : 0.78)
      root.position.x = w < 900 ? 0 : 2.7
      root.position.y = w < 900 ? 1.2 : 0
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    let mx = 0
    let my = 0
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5 }
    window.addEventListener('pointermove', onMove, { passive: true })
    let visible = true
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting })
    io.observe(canvas)

    const clock = new THREE.Clock()
    let t = 0
    const step = (dt: number) => {
      t += dt
      for (const f of flows) {
        if (f.target) {
          f.pm.opacity += (f.target.p - f.pm.opacity) * 0.08
          f.lm.opacity += (f.target.l - f.lm.opacity) * 0.08
          f.pm.size += (f.target.s - f.pm.size) * 0.08
        }
        for (let j = 0; j < f.offs.length; j++) {
          const p = f.curve.getPoint((f.offs[j] + t * f.speed) % 1)
          f.pos[j * 3] = p.x
          f.pos[j * 3 + 1] = p.y
          f.pos[j * 3 + 2] = p.z
        }
        f.geo.attributes.position.needsUpdate = true
      }
      root.rotation.y += (mx * 0.35 + Math.sin(t * 0.15) * 0.08 - root.rotation.y) * 0.04
      root.rotation.x += (my * 0.12 - root.rotation.x) * 0.04
      renderer.render(scene, camera)
    }

    highlightRef.current(branch)
    let raf = 0
    if (reduce) {
      for (let i = 0; i < 60; i++) step(0.05)
    } else {
      const loop = () => {
        raf = requestAnimationFrame(loop)
        const dt = Math.min(clock.getDelta(), 0.05)
        if (visible && !document.hidden) step(dt)
      }
      loop()
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      disposables.forEach(d => d.dispose())
      renderer.dispose()
    }
    // The scene is built once; branch changes go through highlightRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { highlightRef.current(branch) }, [branch])

  return <canvas id="bridge" ref={canvasRef} aria-hidden="true" />
}
