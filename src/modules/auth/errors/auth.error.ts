import { ApiError } from "@/shared/http/api.error";

export class EmailAlreadyRegisteredError extends ApiError {
	constructor(message = "Email already registered") {
		super(message, 409);
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = "EmailAlreadyRegisteredError";
	}
}

export class AppVersionOutdatedError extends ApiError {
	constructor(message = "App version is outdated. Please update and login again.") {
		super(message, 410);
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = "AppVersionOutdatedError";
	}
}

export class InvalidSessionError extends ApiError {
	constructor(message = "Session is invalid or expired") {
		super(message, 401);
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = "InvalidSessionError";
	}
}
