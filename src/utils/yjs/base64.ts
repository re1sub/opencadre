export function uint8ArrayToBase64(buffer: Uint8Array): string {
	let binary = "";
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	// Use a chunked approach to avoid Maximum call stack size exceeded for large docs
	const chunk = 8192;
	for (let i = 0, j = len; i < j; i += chunk) {
		binary += String.fromCharCode.apply(
			null,
			bytes.slice(i, i + chunk) as unknown as number[],
		);
	}
	return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
	const binaryString = window.atob(base64);
	const len = binaryString.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
}
