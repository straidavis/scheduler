export function USCGLogo({ className }) {
    return (
        <svg
            className={className}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Background Shield/Circle base */}
            <circle cx="50" cy="50" r="45" fill="#DC2626" stroke="currentColor" strokeWidth="2" />
            <circle cx="50" cy="50" r="35" fill="white" />
            <circle cx="50" cy="50" r="25" fill="#1E3A8A" />

            {/* Cross Anchors (Simplified) */}
            <path d="M30 30 L70 70 M70 30 L30 70" stroke="white" strokeWidth="8" strokeLinecap="round" />

            {/* Shield Stripes */}
            <path d="M45 45 H55 V55 H45 Z" fill="white" />
        </svg>
    );
}
