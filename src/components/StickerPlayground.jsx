import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'

const storageKey = 'homepage-sticker-layout-v1'

export default function StickerPlayground({ stickers }) {
  const stageRef = useRef(null)
  const elementsRef = useRef(new Map())
  const bodiesRef = useRef(new Map())
  const dragRef = useRef(null)
  const engineRef = useRef(null)
  const saveTimer = useRef(null)
  const [selected, setSelected] = useState(stickers[0]?.id || '')
  const [pinned, setPinned] = useState({})

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !stickers.length) return undefined
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const engine = Matter.Engine.create({ gravity: { x: 0, y: reduced ? 0 : 0.82 } })
    const runner = Matter.Runner.create()
    engineRef.current = engine
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') } catch { saved = {} }
    const initialPinned = {}

    const build = () => {
      const width = stage.clientWidth
      const height = stage.clientHeight
      Matter.Composite.clear(engine.world, false)
      bodiesRef.current.clear()
      const walls = [
        Matter.Bodies.rectangle(width / 2, height + 18, width + 80, 36, { isStatic: true }),
        Matter.Bodies.rectangle(-18, height / 2, 36, height + 80, { isStatic: true }),
        Matter.Bodies.rectangle(width + 18, height / 2, 36, height + 80, { isStatic: true }),
        Matter.Bodies.rectangle(width / 2, -18, width + 80, 36, { isStatic: true }),
      ]
      Matter.Composite.add(engine.world, walls)
      stickers.forEach((sticker, index) => {
        const size = Math.min(170, Math.max(112, width / (stickers.length > 3 ? 5 : 3)))
        const previous = saved[sticker.id]
        const x = previous?.x ? previous.x * width : width * (.16 + (index % 4) * .22)
        const y = previous?.y ? previous.y * height : 75 + Math.floor(index / 4) * 90
        const vertices = sticker.shape?.length >= 3
          ? sticker.shape.map((point) => ({ x: (point.x - .5) * size, y: (point.y - .5) * size }))
          : null
        const options = { restitution: .72, friction: .18, frictionAir: .012, density: .0018, angle: previous?.angle ?? (index - 2) * .08 }
        const body = vertices
          ? Matter.Bodies.fromVertices(x, y, [vertices], options, true)
          : Matter.Bodies.rectangle(x, y, size * .82, size * .82, options)
        body.plugin.stickerId = sticker.id
        body.plugin.displaySize = size
        if (previous?.pinned || reduced) {
          Matter.Body.setStatic(body, true)
          initialPinned[sticker.id] = true
        }
        bodiesRef.current.set(sticker.id, body)
        Matter.Composite.add(engine.world, body)
      })
      setPinned(initialPinned)
    }

    build()
    Matter.Runner.run(runner, engine)
    const render = () => {
      bodiesRef.current.forEach((body, id) => {
        const element = elementsRef.current.get(id)
        if (!element) return
        const size = body.plugin.displaySize
        element.style.width = `${size}px`
        element.style.transform = `translate3d(${body.position.x - size / 2}px, ${body.position.y - size / 2}px, 0) rotate(${body.angle}rad)`
      })
      if (!saveTimer.current) {
        saveTimer.current = window.setTimeout(() => {
          const value = {}
          bodiesRef.current.forEach((body, id) => {
            value[id] = { x: body.position.x / stage.clientWidth, y: body.position.y / stage.clientHeight, angle: body.angle, pinned: body.isStatic }
          })
          localStorage.setItem(storageKey, JSON.stringify(value))
          saveTimer.current = null
        }, 500)
      }
    }
    Matter.Events.on(engine, 'afterUpdate', render)
    const observer = new ResizeObserver(build)
    observer.observe(stage)
    return () => {
      observer.disconnect()
      Matter.Events.off(engine, 'afterUpdate', render)
      Matter.Runner.stop(runner)
      Matter.Engine.clear(engine)
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [stickers])

  const togglePin = (id = selected) => {
    const body = bodiesRef.current.get(id)
    if (!body) return
    const next = !body.isStatic
    Matter.Body.setStatic(body, next)
    setPinned((value) => ({ ...value, [id]: next }))
  }

  const releaseAll = () => {
    bodiesRef.current.forEach((body) => Matter.Body.setStatic(body, false))
    setPinned({})
  }

  const reset = () => {
    localStorage.removeItem(storageKey)
    const stage = stageRef.current
    if (!stage) return
    bodiesRef.current.forEach((body, id) => {
      const index = stickers.findIndex((item) => item.id === id)
      Matter.Body.setStatic(body, false)
      Matter.Body.setPosition(body, { x: stage.clientWidth * (.16 + (index % 4) * .22), y: 70 + Math.floor(index / 4) * 90 })
      Matter.Body.setAngle(body, (index - 2) * .08)
      Matter.Body.setVelocity(body, { x: 0, y: 0 })
    })
    setPinned({})
  }

  const pointerDown = (event, id) => {
    const body = bodiesRef.current.get(id)
    if (!body) return
    setSelected(id)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id, x: event.clientX, y: event.clientY, time: performance.now(), wasStatic: body.isStatic, vx: 0, vy: 0 }
    Matter.Body.setStatic(body, true)
  }

  const pointerMove = (event) => {
    const drag = dragRef.current
    const body = drag && bodiesRef.current.get(drag.id)
    if (!drag || !body) return
    const rect = stageRef.current.getBoundingClientRect()
    const now = performance.now()
    const elapsed = Math.max(16, now - drag.time)
    drag.vx = (event.clientX - drag.x) / elapsed * 16
    drag.vy = (event.clientY - drag.y) / elapsed * 16
    drag.x = event.clientX; drag.y = event.clientY; drag.time = now
    Matter.Body.setPosition(body, { x: event.clientX - rect.left, y: event.clientY - rect.top })
  }

  const pointerUp = () => {
    const drag = dragRef.current
    const body = drag && bodiesRef.current.get(drag.id)
    if (drag && body && !drag.wasStatic) {
      Matter.Body.setStatic(body, false)
      Matter.Body.setVelocity(body, { x: drag.vx, y: drag.vy })
    }
    dragRef.current = null
  }

  const keyDown = (event, id) => {
    const body = bodiesRef.current.get(id)
    if (!body) return
    if (event.key === ' ') { event.preventDefault(); togglePin(id); return }
    const movement = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[event.key]
    if (movement) {
      event.preventDefault()
      Matter.Body.translate(body, { x: movement[0], y: movement[1] })
    }
  }

  return <div className="playground-shell">
    <div className="playground-toolbar" aria-label="Sticker controls">
      <span>{selected ? `${pinned[selected] ? 'Pinned' : 'Selected'} · ${stickers.find((item) => item.id === selected)?.title || 'sticker'}` : 'Pick up a sticker'}</span>
      <div>
        <button type="button" onClick={() => togglePin()} disabled={!selected}>{pinned[selected] ? 'Unpin' : 'Pin'}</button>
        <button type="button" onClick={releaseAll}>Release all</button>
        <button type="button" onClick={reset}>Reset</button>
      </div>
    </div>
    <div className="playground-stage" ref={stageRef} aria-label="Interactive physics sticker playground">
      <span className="playground-hint">drag · toss · pin</span>
      {stickers.map((sticker) => <button
        className={`physics-sticker ${selected === sticker.id ? 'is-selected' : ''}`}
        type="button" key={sticker.id} aria-label={`${sticker.title || 'Photo sticker'}. Use arrow keys to move and Space to pin.`}
        ref={(node) => node ? elementsRef.current.set(sticker.id, node) : elementsRef.current.delete(sticker.id)}
        onPointerDown={(event) => pointerDown(event, sticker.id)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}
        onKeyDown={(event) => keyDown(event, sticker.id)} onFocus={() => setSelected(sticker.id)}
      ><img src={sticker.src} alt={sticker.alt} draggable="false" /></button>)}
    </div>
  </div>
}

