// Обобщённый рендер результата одной панели Grafana (произвольные columns/rows).
import type { PanelResult } from '../data/stats'

export default function PanelFrameTable({ panel }: { panel: PanelResult }) {
  if (panel.error) {
    return (
      <div className="callout callout--warn" style={{ margin: '8px 0' }}>
        Панель «{panel.title}»: {panel.error}
      </div>
    )
  }
  if (panel.skipped || !panel.frames?.length) {
    return (
      <div className="muted" style={{ margin: '8px 0' }}>
        «{panel.title}»: {panel.skipped || 'нет данных'}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{panel.title}</div>
      {panel.frames.map((frame, fi) => (
        <div className="table-wrap" key={frame.refId + fi}>
          <table className="data">
            <thead>
              <tr>
                {frame.columns.map((c, ci) => (
                  <th key={ci}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frame.rows.length === 0 ? (
                <tr>
                  <td colSpan={frame.columns.length || 1} className="muted">
                    Нет строк
                  </td>
                </tr>
              ) : (
                frame.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{cell ?? '—'}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
