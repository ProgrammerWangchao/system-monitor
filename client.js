window.__ModuleLoader__.load({
  id: '@local/system-monitor',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const CR = 2 * Math.PI * 16; // ring radius 16
    const EDGE_PAD = 8;
    const SNAP_PX = 60;

    const containerStyle = {
      position: 'fixed',
      display: 'flex',
      gap: '16px',
      padding: '10px 14px',
      borderRadius: '14px',
      background: 'rgba(20, 20, 26, 0.82)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
      pointerEvents: 'auto',
      userSelect: 'none',
      cursor: 'grab',
      touchAction: 'none',
      zIndex: 9999,
      fontFamily: 'var(--dsw-font-sans, system-ui, sans-serif)',
    };
    const itemStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center' };
    const ringStyle = { position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
    const textStyle = { position: 'absolute', fontSize: '9px', fontWeight: 600, color: '#ffffff', lineHeight: 1, textAlign: 'center' };
    const labelStyle = { marginTop: '4px', fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.72)' };
    const trackColor = 'rgba(255,255,255,0.16)';

    // Snap a dragged panel to the nearest viewport edge when it is close.
    function settle(left, top, w, h) {
      const vw = window.innerWidth,
        vh = window.innerHeight;
      left = Math.max(-w + 80, Math.min(left, vw - 80));
      top = Math.max(0, Math.min(top, vh - 80));
      const dL = left,
        dR = vw - left - w,
        dT = top,
        dB = vh - top - h;
      if (Math.min(dL, dR) < SNAP_PX) left = dL <= dR ? EDGE_PAD : vw - w - EDGE_PAD;
      if (Math.min(dT, dB) < SNAP_PX) top = dT <= dB ? EDGE_PAD : vh - h - EDGE_PAD;
      return { left, top };
    }

    function Ring({ value, color, label }) {
      const p = typeof value === 'number' ? Math.max(0, Math.min(100, value)) : null;
      const offset = p == null ? CR : CR * (1 - p / 100);
      const shown = p == null ? 'N/A' : `${Math.round(p)}%`;
      return h(
        'div',
        { style: itemStyle },
        h(
          'div',
          { style: ringStyle },
          h(
            'svg',
            { width: 44, height: 44, viewBox: '0 0 44 44' },
            h('circle', { cx: 22, cy: 22, r: 16, fill: 'none', stroke: trackColor, strokeWidth: 4 }),
            h('circle', {
              cx: 22, cy: 22, r: 16, fill: 'none', stroke: color, strokeWidth: 4,
              strokeLinecap: 'round', strokeDasharray: CR, strokeDashoffset: offset,
              transform: 'rotate(-90 22 22)',
            }),
          ),
          h('span', { style: textStyle }, shown),
        ),
        h('span', { style: labelStyle }, label),
      );
    }

    function SystemMonitor() {
      const [stats, setStats] = React.useState(null);
      const [pos, setPos] = React.useState(null); // null = docked bottom-left
      const drag = React.useRef(null);
      const node = React.useRef(null);

      React.useEffect(() => {
        let alive = true;
        async function poll() {
          try {
            const res = await fetch('api/system-monitor', { cache: 'no-store' });
            if (!res.ok) return;
            const j = await res.json();
            if (alive) setStats(j);
          } catch {}
        }
        poll();
        const timer = setInterval(poll, 1000);
        return () => {
          alive = false;
          clearInterval(timer);
        };
      }, []);

      function onDown(e) {
        const el = node.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setPos({ left: r.left, top: r.top });
        drag.current = { mx: e.clientX, my: e.clientY, left: r.left, top: r.top };
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
      }
      function onMove(e) {
        const d = drag.current;
        if (!d) return;
        setPos({ left: d.left + e.clientX - d.mx, top: d.top + e.clientY - d.my });
      }
      function onUp(e) {
        drag.current = null;
        setPos((prev) =>
          prev && node.current ? settle(prev.left, prev.top, node.current.offsetWidth, node.current.offsetHeight) : prev,
        );
      }

      const outer = pos == null
        ? Object.assign({}, containerStyle, { left: 14, bottom: 14 })
        : Object.assign({}, containerStyle, { left: pos.left, top: pos.top });

      return h(
        'div',
        {
          ref: node,
          style: outer,
          onPointerDown: onDown,
          onPointerMove: onMove,
          onPointerUp: onUp,
          onPointerCancel: onUp,
        },
        h(Ring, { value: stats && stats.cpu, color: '#3b82f6', label: 'CPU' }),
        h(Ring, { value: stats && stats.gpu, color: '#22c55e', label: 'GPU' }),
        h(Ring, { value: stats && stats.mem, color: '#f97316', label: 'MEM' }),
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            { name: 'shell.overlay', id: 'system-monitor', order: 1000 },
            SystemMonitor,
          ),
        );
      },
    };
  },
});
