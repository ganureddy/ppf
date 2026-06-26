import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavState {
	ids: string[];
	toggle: (itemCode: string) => void;
	has: (itemCode: string) => boolean;
}

export const useFavorites = create<FavState>()(
	persist(
		(set, get) => ({
			ids: [],
			toggle: (itemCode) =>
				set((s) => ({
					ids: s.ids.includes(itemCode)
						? s.ids.filter((i) => i !== itemCode)
						: [...s.ids, itemCode],
				})),
			has: (itemCode) => get().ids.includes(itemCode),
		}),
		{ name: "ppf-favorites" },
	),
);
