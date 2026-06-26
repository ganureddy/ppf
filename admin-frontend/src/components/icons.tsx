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

export const ListIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
	</svg>
);

export const DollarDocIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
		<path d="M14 3v5h5" />
		<path d="M12 11c-1.5 0-2 .8-2 1.5s.7 1.2 2 1.5 2 .8 2 1.5-.6 1.5-2 1.5m0-7.5v.9m0 6.2v.9" />
	</svg>
);

export const TruckIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" />
		<circle cx="7" cy="18" r="1.5" />
		<circle cx="17.5" cy="18" r="1.5" />
	</svg>
);

export const ReceiptIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z" />
		<path d="M9 7h6M9 11h6" />
	</svg>
);

export const MenuIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M3 6h18M3 12h18M3 18h18" />
	</svg>
);

export const SearchIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<circle cx="11" cy="11" r="7" />
		<path d="m21 21-4.3-4.3" />
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

export const PrintIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M6 9V3h12v6" />
		<path d="M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" />
		<path d="M6 14h12v7H6z" />
	</svg>
);

export const CalendarIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<rect x="3" y="4" width="18" height="18" rx="2" />
		<path d="M3 9h18M8 2v4M16 2v4" />
	</svg>
);

export const PlusIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M12 5v14M5 12h14" />
	</svg>
);

export const StoreIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M3 9 4 4h16l1 5M4 9v11h16V9M4 9h16" />
		<path d="M9 20v-6h6v6" />
	</svg>
);

export const EditIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M12 20h9" />
		<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
	</svg>
);

export const TrashIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
	</svg>
);

export const EyeIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
		<circle cx="12" cy="12" r="3" />
	</svg>
);

export const CloseIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M6 6l12 12M18 6 6 18" />
	</svg>
);

export const PowerIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M12 4v8" />
		<path d="M6.3 7.3a8 8 0 1 0 11.4 0" />
	</svg>
);

export const ChartIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M3 3v18h18" />
		<path d="M7 15v-4M12 15V7M17 15v-6" />
	</svg>
);

export const UserIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<circle cx="12" cy="8" r="4" />
		<path d="M4 21a8 8 0 0 1 16 0" />
	</svg>
);

export const BoxIcon = (p: IconProps) => (
	<svg {...base(p)}>
		<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
		<path d="m3 8 9 5 9-5M12 13v8" />
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
