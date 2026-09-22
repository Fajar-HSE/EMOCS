/**
 * Studio P26 pinwheel mark (ported from the attached login mockup).
 * Colors resolve against the login-scoped theme vars (--em-*), so the mark
 * follows the Terang/Gelap toggle automatically.
 */
export function EmocsMark({ className = "mark mark-spin" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Lambang EMOCS"
    >
      <defs>
        <path id="emocs-petal" d="M100,100 C96,60 68,32 28,30 C40,62 56,90 100,100 Z" />
      </defs>
      <g>
        <use href="#emocs-petal" fill="var(--em-magenta)" transform="rotate(0 100 100)" />
        <use href="#emocs-petal" fill="var(--em-amber)" transform="rotate(90 100 100)" />
        <use href="#emocs-petal" fill="var(--em-teal)" transform="rotate(180 100 100)" />
        <use href="#emocs-petal" fill="#2b3266" transform="rotate(270 100 100)" />
      </g>
      <circle cx="100" cy="100" r="34" fill="var(--em-navy-deep, #12172e)" />
      <path d="M91,84 L91,116 L118,100 Z" fill="#fff" />
      <circle cx="34" cy="34" r="8" fill="var(--em-amber)" />
      <circle cx="166" cy="34" r="8" fill="var(--em-magenta)" />
      <circle cx="166" cy="166" r="8" fill="#2b3266" />
      <circle cx="34" cy="166" r="8" fill="var(--em-teal)" />
    </svg>
  )
}
