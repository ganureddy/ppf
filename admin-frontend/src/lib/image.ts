// Client-side image compression. Large product photos (6–10 MP PNGs) are
// downscaled and re-encoded to WebP/JPEG in the browser before upload so the
// stored file is a few KB and loads fast for customers — without a noticeable
// drop in quality.

interface CompressOptions {
	maxDim?: number; // longest edge in px
	quality?: number; // 0..1 for lossy encoders
}

let webpSupport: boolean | null = null;

function supportsWebp(): boolean {
	if (webpSupport !== null) return webpSupport;
	try {
		const c = document.createElement("canvas");
		webpSupport = c.toDataURL("image/webp").startsWith("data:image/webp");
	} catch {
		webpSupport = false;
	}
	return webpSupport;
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

function readAsDataURL(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const fr = new FileReader();
		fr.onload = () => resolve(fr.result as string);
		fr.onerror = reject;
		fr.readAsDataURL(file);
	});
}

/**
 * Compress an image file. Returns the original file untouched if it is not a
 * raster image, can't be processed, or would not get smaller.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
	const maxDim = opts.maxDim ?? 1600;
	const quality = opts.quality ?? 0.82;

	// Skip non-raster / animated / vector formats we shouldn't flatten.
	if (!file.type.startsWith("image/")) return file;
	if (file.type === "image/svg+xml" || file.type === "image/gif") return file;

	try {
		const img = await loadImage(await readAsDataURL(file));
		let { width, height } = img;
		if (!width || !height) return file;

		if (width > maxDim || height > maxDim) {
			const scale = Math.min(maxDim / width, maxDim / height);
			width = Math.round(width * scale);
			height = Math.round(height * scale);
		}

		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) return file;

		const type = supportsWebp() ? "image/webp" : "image/jpeg";
		// JPEG has no alpha channel — paint a white backdrop so transparent
		// PNGs don't turn black.
		if (type === "image/jpeg") {
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, width, height);
		}
		ctx.drawImage(img, 0, 0, width, height);

		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
		if (!blob || blob.size >= file.size) return file;

		const ext = type === "image/webp" ? "webp" : "jpg";
		const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
		return new File([blob], name, { type, lastModified: Date.now() });
	} catch {
		return file;
	}
}
