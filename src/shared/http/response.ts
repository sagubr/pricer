export function response<T>(data?: T, msg?: string, success = true) {
	if (data && success) {
		return { success: true, message: msg, data };
	}
	if (!success) {
		return { success: false, message: msg };
	}
	return { success: true, message: msg };
}
