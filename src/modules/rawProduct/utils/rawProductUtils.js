export const MAX_IMAGE_BYTES = 150 * 1024; // 150 KB, same limit as the server
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'svg', 'webp'];
export const IMAGE_ACCEPT = IMAGE_EXTENSIONS.map((e) => '.' + e).join(',');
