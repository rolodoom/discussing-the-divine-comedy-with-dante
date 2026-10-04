const PAINTING_RATIO = 26 / 11.27
const MIN_SCALE = 1
const MAX_SCALE = 4

type PointerPosition = {
  x: number
  y: number
}

export function initPaintingViewer() {
  const viewer = document.querySelector<HTMLElement>('#painting-viewer')
  const canvas = document.querySelector<HTMLElement>('#painting-canvas')

  if (!viewer || !canvas) return

  canvas.style.transformOrigin = 'top left'

  let x = 0
  let y = 0
  let scale = 1

  let dragging = false
  let pointerId: number | null = null

  let startPointerX = 0
  let startPointerY = 0
  let startX = 0
  let startY = 0

  let pinchStartDistance = 0
  let pinchStartScale = 1
  let pinchStartX = 0
  let pinchStartY = 0
  let pinchStartMidpointX = 0
  let pinchStartMidpointY = 0
  let pinchAnchorX = 0
  let pinchAnchorY = 0

  const pointers = new Map<number, PointerPosition>()

  const getDistance = (a: PointerPosition, b: PointerPosition) => {
    return Math.hypot(b.x - a.x, b.y - a.y)
  }

  const getMidpoint = (a: PointerPosition, b: PointerPosition) => {
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    }
  }

  const constrain = () => {
    const viewerWidth = viewer.clientWidth
    const viewerHeight = viewer.clientHeight
    const canvasWidth = canvas.clientWidth * scale
    const canvasHeight = canvas.clientHeight * scale

    const minX = Math.min(0, viewerWidth - canvasWidth)
    const minY = Math.min(0, viewerHeight - canvasHeight)

    x = Math.max(minX, Math.min(0, x))
    y = Math.max(minY, Math.min(0, y))
  }

  const applyTransform = () => {
    canvas.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
  }

  const updateCanvasSize = () => {
    const viewerWidth = viewer.clientWidth
    const viewerHeight = viewer.clientHeight
    const viewerRatio = viewerWidth / viewerHeight

    let width: number
    let height: number

    if (viewerRatio < PAINTING_RATIO) {
      height = viewerHeight
      width = height * PAINTING_RATIO
    } else {
      width = viewerWidth
      height = width / PAINTING_RATIO
    }

    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    scale = 1

    x = (viewerWidth - width) / 2
    y = (viewerHeight - height) / 2

    constrain()
    applyTransform()
  }

  const startPinch = () => {
    const [first, second] = [...pointers.values()]

    if (!first || !second) return

    const midpoint = getMidpoint(first, second)

    pinchStartDistance = getDistance(first, second)
    pinchStartScale = scale

    pinchStartX = x
    pinchStartY = y

    pinchStartMidpointX = midpoint.x
    pinchStartMidpointY = midpoint.y

    pinchAnchorX = (pinchStartMidpointX - pinchStartX) / pinchStartScale

    pinchAnchorY = (pinchStartMidpointY - pinchStartY) / pinchStartScale
  }

  const handlePointerDown = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest('button')) return

    if (event.pointerType === 'mouse' && event.button !== 0) return

    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    })

    viewer.setPointerCapture(event.pointerId)

    if (pointers.size === 1) {
      dragging = true
      pointerId = event.pointerId

      startPointerX = event.clientX
      startPointerY = event.clientY
      startX = x
      startY = y
    }

    if (pointers.size === 2) {
      dragging = false
      pointerId = null

      startPinch()
    }
  }

  const handlePointerMove = (event: PointerEvent) => {
    const pointer = pointers.get(event.pointerId)

    if (!pointer) return

    pointer.x = event.clientX
    pointer.y = event.clientY

    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()]

      if (!first || !second) return

      const distance = getDistance(first, second)
      const midpoint = getMidpoint(first, second)

      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, pinchStartScale * (distance / pinchStartDistance))
      )

      scale = nextScale

      x = midpoint.x - pinchAnchorX * scale
      y = midpoint.y - pinchAnchorY * scale

      constrain()
      applyTransform()

      return
    }

    if (!dragging || event.pointerId !== pointerId) return

    x = startX + event.clientX - startPointerX
    y = startY + event.clientY - startPointerY

    constrain()
    applyTransform()
  }

  const handlePointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId)

    if (pointers.size === 0) {
      dragging = false
      pointerId = null

      constrain()
      applyTransform()

      return
    }

    if (pointers.size === 1) {
      const remaining = pointers.entries().next().value

      if (!remaining) return

      const [remainingId, remainingPointer] = remaining

      dragging = true
      pointerId = remainingId

      startPointerX = remainingPointer.x
      startPointerY = remainingPointer.y
      startX = x
      startY = y
    }
  }

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault()

    const rect = viewer.getBoundingClientRect()

    const pointerX = event.clientX - rect.left
    const pointerY = event.clientY - rect.top

    const zoomFactor = Math.exp(-event.deltaY * 0.001)

    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * zoomFactor))

    if (nextScale === scale) return

    const anchorX = (pointerX - x) / scale
    const anchorY = (pointerY - y) / scale

    scale = nextScale

    x = pointerX - anchorX * scale
    y = pointerY - anchorY * scale

    constrain()
    applyTransform()
  }

  viewer.addEventListener('pointerdown', handlePointerDown)
  viewer.addEventListener('pointermove', handlePointerMove)
  viewer.addEventListener('pointerup', handlePointerUp)
  viewer.addEventListener('pointercancel', handlePointerUp)
  viewer.addEventListener('wheel', handleWheel, { passive: false })

  viewer.style.touchAction = 'none'
  viewer.style.cursor = 'grab'

  updateCanvasSize()

  window.addEventListener('resize', updateCanvasSize)
}
