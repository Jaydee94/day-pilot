const ICON_PATHS = {
  home: (
    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z" />
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  tasks: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 12l2.5 2.5L15.5 10" />
    </>
  ),
  scheduler: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9h.1a1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.9.6z" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 4v6h-6" />
    </>
  ),
  weather: (
    <>
      <path d="M6 16a4 4 0 1 1 .8-7.9A5.5 5.5 0 0 1 18.5 10 3.5 3.5 0 0 1 18 17H7" />
      <path d="M10 19h8M12 22h6" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  droplet: <path d="M12 3s6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 6-10 6-10z" />,
  wind: (
    <>
      <path d="M4 10h10a2 2 0 1 0-2-2" />
      <path d="M2 14h14a2 2 0 1 1-2 2" />
      <path d="M6 18h8" />
    </>
  ),
  birthday: (
    <>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M12 11V7M7 11V8h10v3M9.5 7a1.75 1.75 0 1 1 0-3.5c1.8 0 2.5 2.1 2.5 3.5M14.5 7a1.75 1.75 0 1 0 0-3.5c-1.8 0-2.5 2.1-2.5 3.5" />
    </>
  ),
  briefing: (
    <>
      <path d="M6 19h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H9l-3 3v9a2 2 0 0 0 2 2z" />
      <path d="M9 5v3h-3M10 12h6M10 15h4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  event: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18M8 14h3" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6l-12 12" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
    </>
  ),
  bell: (
    <>
      <path d="M15 18H5l1.2-1.4A2.2 2.2 0 0 0 6.8 15v-3.3a5.2 5.2 0 1 1 10.4 0V15c0 .6.2 1.2.6 1.6L19 18h-4" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="4" width="6" height="10" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6" />
    </>
  ),
  pin: (
    <>
      <path d="M14.5 3.5l6 6-2.5 1-2.5-2.5-3.8 3.8 4.3 4.3-1.4 1.4-4.3-4.3-4.1 4.1a1 1 0 0 1-1.4 0l-.7-.7a1 1 0 0 1 0-1.4l4.1-4.1-4.3-4.3L6.5 5l4.3 4.3L14.6 5z" />
    </>
  ),
  robot: (
    <>
      <rect x="5" y="7" width="14" height="11" rx="3" />
      <circle cx="9.5" cy="12.5" r="1" />
      <circle cx="14.5" cy="12.5" r="1" />
      <path d="M12 7V4M8 18v2M16 18v2" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h12l2 2v14H5z" />
      <path d="M8 4v5h8V4M9 20v-6h6v6" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A11.6 11.6 0 0 1 12 6c6.5 0 10 6 10 6a18.8 18.8 0 0 1-4 4.5" />
      <path d="M6.3 7.3C3.8 9.1 2 12 2 12s3.5 6 10 6a10.5 10.5 0 0 0 4.1-.8" />
      <path d="M12 9.5a2.5 2.5 0 0 1 2.5 2.5" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </>
  ),
}

export default function AppIcon({ name, className = '', strokeWidth = 1.9 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name] || ICON_PATHS.briefing}
    </svg>
  )
}
