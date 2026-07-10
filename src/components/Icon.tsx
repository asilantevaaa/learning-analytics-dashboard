// Векторные иконки (inline SVG, наследуют currentColor). Замена эмодзи.
import type { CSSProperties } from 'react'

export type IconName =
  | 'home' | 'map' | 'target' | 'help' | 'chart' | 'gear' | 'book' | 'table' | 'link'
  | 'user' | 'users' | 'sun' | 'moon' | 'phone' | 'star' | 'calendar' | 'download'
  | 'trash' | 'check' | 'warn' | 'alert' | 'fire' | 'folder' | 'folderOpen' | 'file'
  | 'refresh' | 'external' | 'plus' | 'close' | 'search' | 'clipboard' | 'graduation'
  | 'menu' | 'key' | 'tools' | 'chat' | 'inbox' | 'dot'

const P: Record<IconName, string> = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .8-1 1.7"/><circle cx="12" cy="17" r="0.6"/>',
  chart: '<path d="M4 20V4M4 20h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  book: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2Z"/><path d="M9 4v14"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1.5-1.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 5a3.5 3.5 0 0 1 0 7M18 20c0-3 .5-5-2-6.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z"/>',
  phone: '<path d="M6 3h3l1.5 5-2 1.5a12 12 0 0 0 6 6l1.5-2 5 1.5v3a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2Z"/>',
  star: '<path d="m12 3 2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.5l1.1-6L3.4 9.3l6-.8Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"/>',
  check: '<path d="M4 12.5 9 17.5 20 6.5"/>',
  warn: '<path d="M12 4 2.5 20h19Z"/><path d="M12 10v4"/><circle cx="12" cy="17.5" r="0.6"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="16.5" r="0.6"/>',
  fire: '<path d="M12 3c1 3-1.5 4-1.5 6.5A2 2 0 0 1 8 8c-1.5 1.5-2.5 3.3-2.5 5.5a6.5 6.5 0 0 0 13 0c0-3-1.5-5-3-6.5-.5 2-2 2-2 .5C13.5 6 13 4.5 12 3Z"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  folderOpen: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2H3Z"/><path d="m3 9 2.2 9a1 1 0 0 0 1 1h12l2.3-8a1 1 0 0 0-1-1.2H4"/>',
  file: '<path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v4h4"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-1 5"/><path d="M20 4v6h-6"/>',
  external: '<path d="M14 5h5v5"/><path d="M19 5 11 13"/><path d="M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6 18 18M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="4" rx="1"/><path d="M9 11h6M9 15h6"/>',
  graduation: '<path d="m12 4 9 4-9 4-9-4Z"/><path d="M6 10v4c0 1.5 2.7 3 6 3s6-1.5 6-3v-4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  key: '<circle cx="8" cy="14" r="4"/><path d="m11 11 9-9M17 4l2 2M14 7l2 2"/>',
  tools: '<path d="M14 7a3.5 3.5 0 0 1 4.6 4.6l-9 9-4-4 9-9Z"/><path d="m9 12-4 4"/>',
  chat: '<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>',
  inbox: '<path d="M4 13 6 5h12l2 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path d="M4 13h5a3 3 0 0 0 6 0h5"/>',
  dot: '<circle cx="12" cy="12" r="5"/>',
}

interface Props {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
  filled?: boolean
}

export default function Icon({ name, size = 18, className, style, filled }: Props) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: P[name] }}
    />
  )
}
