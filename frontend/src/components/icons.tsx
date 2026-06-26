import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
	...props,
});

export const HomeIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" />
		<path d="M9 22v-7h6v7" />
	</svg>
);

export const RupeeIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M6 4h12M6 8h12M6 4c7 0 7 8 0 8 3 0 6 4 8 8M6 8h6" />
	</svg>
);

export const BagIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M6 7h12l-1 13H7L6 7Z" />
		<path d="M9 7a3 3 0 0 1 6 0" />
	</svg>
);

export const UserIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<circle cx="12" cy="8" r="4" />
		<path d="M4 21a8 8 0 0 1 16 0" />
	</svg>
);

export const PlusIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M12 5v14M5 12h14" />
	</svg>
);

export const MinusIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M5 12h14" />
	</svg>
);

export const SearchIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<circle cx="11" cy="11" r="7" />
		<path d="m21 21-4.3-4.3" />
	</svg>
);

export const BellIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M6 9a6 6 0 0 1 12 0c0 7 2 8 2 8H4s2-1 2-8Z" />
		<path d="M10 21a2 2 0 0 0 4 0" />
	</svg>
);

export const CartIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<circle cx="9" cy="20" r="1.5" />
		<circle cx="18" cy="20" r="1.5" />
		<path d="M2 3h3l2.4 12.4a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 7H6" />
	</svg>
);

export const ChevronRightIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="m9 6 6 6-6 6" />
	</svg>
);

export const PowerIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M12 4v8" />
		<path d="M6.3 7.3a8 8 0 1 0 11.4 0" />
	</svg>
);

export const PackageIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
		<path d="m3 8 9 5 9-5M12 13v8" />
	</svg>
);

export const InfoIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<circle cx="12" cy="12" r="9" />
		<path d="M12 8h.01M11 12h1v4h1" />
	</svg>
);

export const SupportIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<circle cx="12" cy="12" r="9" />
		<path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4" />
		<path d="M12 17h.01" />
	</svg>
);

export const LocationIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M12 21s7-6.3 7-11a7 7 0 0 0-14 0c0 4.7 7 11 7 11Z" />
		<circle cx="12" cy="10" r="2.5" />
	</svg>
);

export const SlidersIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M4 6h16M4 12h16M4 18h16" />
		<circle cx="9" cy="6" r="2" fill="currentColor" />
		<circle cx="15" cy="12" r="2" fill="currentColor" />
		<circle cx="8" cy="18" r="2" fill="currentColor" />
	</svg>
);

export const HeartIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M12 20s-7-4.6-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7-1.5C19 5.5 19 6.5 19 7a4.5 4.5 0 0 1 0 3.5C18 15.4 12 20 12 20Z" />
	</svg>
);

export const GridIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<rect x="3" y="3" width="7" height="7" rx="1.5" />
		<rect x="14" y="3" width="7" height="7" rx="1.5" />
		<rect x="3" y="14" width="7" height="7" rx="1.5" />
		<rect x="14" y="14" width="7" height="7" rx="1.5" />
	</svg>
);

export const BackIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M15 6l-6 6 6 6" />
	</svg>
);

export const CheckIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M5 12l5 5L20 7" />
	</svg>
);

export const TruckIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" />
		<circle cx="7" cy="18" r="1.6" />
		<circle cx="17.5" cy="18" r="1.6" />
	</svg>
);

export const CloseIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M6 6l12 12M18 6 6 18" />
	</svg>
);

export const EmptyDocIcon = (p: IconProps) => (
	<svg {...base(p)} width={96} height={96} strokeWidth={1.5}>
		<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7" />
		<path d="M14 3v5h5" />
		<circle cx="17" cy="16" r="4" />
		<path d="m20 19 2 2" />
		<path d="M9.5 13a1.5 2 0 0 1 3 0" />
	</svg>
);
